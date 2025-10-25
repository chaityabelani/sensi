import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, RefreshCw, Target as TargetIcon, Timer, MousePointerClick, Percent, Move, Waves } from 'lucide-react';
import HitTimeChart from './HitTimeChart';
import MissScatterPlot from './MissScatterPlot';
import HitTimeDistributionChart from './HitTimeDistributionChart';
import RecoilPatternDisplay from './RecoilPatternDisplay';

// Types
type GameMode = 'static' | 'moving' | 'recoil';

interface TargetState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spawnTime: number;
}

interface MissData {
    offsetX: number;
    offsetY: number;
}

interface SprayPoint {
    id: number;
    x: number;
    y: number;
}

// Props
interface AimTrainerProps {
  onBack: () => void;
}

// Constants
const GAME_DURATION = 30; // 30 seconds for static/moving
const TARGET_SIZE = 50; // pixels
const TARGET_SPEED = 3; // pixels per frame for moving targets
const RECOIL_TARGET_SIZE = 30;

// Recoil Mode Constants
const RECOIL_ROUND_DURATION = 15;
const TOTAL_RECOIL_DURATION = RECOIL_ROUND_DURATION * 2;
const SPRAY_INTERVAL = 80; // ms between "shots"

// Realistic recoil patterns for a more authentic training experience
const scalePattern = (pattern: {x:number, y:number}[], scale: number) => pattern.map(p => ({ x: p.x * scale, y: p.y * scale }));

// Vertical Round: Target moves mostly up, with slight horizontal sway. User must pull down.
const VERTICAL_RECOIL_PATTERN_RAW = Array.from({ length: 40 }, (_, i) => ({
  x: Math.sin(i / 5) * i * 0.1,
  y: -i * 1.2,
}));
const VERTICAL_RECOIL_PATTERN = scalePattern(VERTICAL_RECOIL_PATTERN_RAW, 2.5);

// Horizontal Round: Target moves side-to-side, with slight upward drift. User must counteract horizontally.
const HORIZONTAL_RECOIL_PATTERN_RAW = Array.from({ length: 40 }, (_, i) => ({
  x: Math.sin(i / 2.5) * i * 0.6,
  y: -i * 0.2,
}));
const HORIZONTAL_RECOIL_PATTERN = scalePattern(HORIZONTAL_RECOIL_PATTERN_RAW, 2.5);

const getActivePattern = (round: 'horizontal' | 'vertical' | null) => {
    if (round === 'horizontal') return HORIZONTAL_RECOIL_PATTERN;
    if (round === 'vertical') return VERTICAL_RECOIL_PATTERN;
    return [];
};


const AimTrainer: React.FC<AimTrainerProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'results'>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('static');
  
  // Static/Moving state
  const [targets, setTargets] = useState<TargetState[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [missData, setMissData] = useState<MissData[]>([]);
  
  // Recoil state
  const [recoilRound, setRecoilRound] = useState<'horizontal' | 'vertical' | null>(null);
  const [roundTransition, setRoundTransition] = useState<{show: boolean, text: string}>({show: false, text: ''});
  const [sprayDataHorizontal, setSprayDataHorizontal] = useState<MissData[]>([]);
  const [sprayDataVertical, setSprayDataVertical] = useState<MissData[]>([]);
  const [recoilControlScoreHorizontal, setRecoilControlScoreHorizontal] = useState(0);
  const [recoilControlScoreVertical, setRecoilControlScoreVertical] = useState(0);
  const [recoilTargetPosition, setRecoilTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentSprayPoints, setCurrentSprayPoints] = useState<SprayPoint[]>([]);

  // Shared state
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  
  // Refs
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sprayIntervalRef = useRef<number | null>(null);
  const sprayStartTimeRef = useRef<number | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    if (sprayIntervalRef.current) window.clearInterval(sprayIntervalRef.current);
    timerRef.current = null;
    countdownTimerRef.current = null;
    animationFrameRef.current = null;
    sprayIntervalRef.current = null;
  }, []);
  
  const spawnTarget = useCallback(() => {
    requestAnimationFrame(() => {
        if (!gameAreaRef.current) return;
        const { width, height } = gameAreaRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        
        let newVx = 0, newVy = 0;
        if (gameMode === 'moving') {
            const angle = Math.random() * 2 * Math.PI;
            newVx = Math.cos(angle) * TARGET_SPEED;
            newVy = Math.sin(angle) * TARGET_SPEED;
        }

        setTargets([{
            id: Date.now(),
            x: Math.random() * (width - TARGET_SIZE * 2) + TARGET_SIZE,
            y: Math.random() * (height - TARGET_SIZE * 2) + TARGET_SIZE,
            vx: newVx, vy: newVy, size: TARGET_SIZE, spawnTime: performance.now(),
        }]);
    });
  }, [gameMode]);
  
  const resetGameStats = useCallback(() => {
    clearTimers();
    setTargets([]); setScore(0); setHits(0); setMisses(0);
    setTimeLeft(gameMode === 'recoil' ? TOTAL_RECOIL_DURATION : GAME_DURATION); 
    setCountdown(3);
    setHitTimes([]); setMissData([]);
    setSprayDataHorizontal([]); setSprayDataVertical([]);
    setCurrentSprayPoints([]); 
    setRecoilControlScoreHorizontal(0); setRecoilControlScoreVertical(0);
    setRecoilTargetPosition(null);
    setRecoilRound(null);
  }, [clearTimers, gameMode]);

  const startGame = useCallback(() => {
    resetGameStats();
    if (gameMode === 'recoil') {
        setRecoilRound('horizontal');
    }
    setGameState('countdown');
    countdownTimerRef.current = window.setInterval(() => setCountdown(prev => prev - 1), 1000);
  }, [resetGameStats, gameMode]);

  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
        if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setGameState('playing');
        if (gameMode === 'static' || gameMode === 'moving') spawnTarget();
        timerRef.current = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
  }, [gameState, countdown, spawnTarget, gameMode]);
  
   useEffect(() => {
    if (gameState === 'playing' && gameMode === 'moving') {
      const loop = () => {
        setTargets(currentTargets => {
          if (currentTargets.length === 0 || !gameAreaRef.current) return [];
          const target = currentTargets[0], { width, height } = gameAreaRef.current.getBoundingClientRect();
          if (width === 0) return currentTargets;
          let newX = target.x + target.vx, newY = target.y + target.vy;
          let newVx = target.vx, newVy = target.vy;
          if (newX <= 0 || newX >= width - target.size) newVx = -newVx;
          if (newY <= 0 || newY >= height - target.size) newVy = -newVy;
          newX = Math.max(0, Math.min(width - target.size, newX));
          newY = Math.max(0, Math.min(height - target.size, newY));
          return [{ ...target, x: newX, y: newY, vx: newVx, vy: newVy }];
        });
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [gameState, gameMode]);

  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
        clearTimers();
        setGameState('results');
    }
    if (gameMode === 'recoil' && timeLeft === RECOIL_ROUND_DURATION && recoilRound === 'horizontal') {
        setRecoilRound('vertical');
        setRoundTransition({show: true, text: 'Round 2: Vertical Control'});
        setTimeout(() => setRoundTransition({show: false, text: ''}), 1500);
    }
  }, [timeLeft, gameState, clearTimers, gameMode, recoilRound]);
  
  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleTargetClick = (targetId: number, spawnTime: number) => {
    setHitTimes(prev => [...prev, performance.now() - spawnTime]);
    setHits(prev => prev + 1);
    setScore(prev => prev + (gameMode === 'moving' ? 150 : 100));
    setTargets([]);
    spawnTarget();
  };
  
  const handleMiss = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current || e.target !== gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
    let missOffset: MissData = { offsetX: 0, offsetY: 0 };
    if (targets.length > 0) {
        const target = targets[0];
        missOffset = { offsetX: clickX - (target.x + target.size / 2), offsetY: clickY - (target.y + target.size / 2) };
    }
    setMissData(prev => [...prev, missOffset]);
    setMisses(prev => prev + 1);
    setScore(prev => Math.max(0, prev - 25));
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleSprayStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current || sprayIntervalRef.current) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    sprayStartTimeRef.current = performance.now();
    
    sprayIntervalRef.current = window.setInterval(() => {
        if (!sprayStartTimeRef.current || !mousePositionRef.current || !gameAreaRef.current || !recoilRound) return;

        const elapsedTime = performance.now() - sprayStartTimeRef.current;
        const bulletIndex = Math.floor(elapsedTime / SPRAY_INTERVAL);
        const activePattern = getActivePattern(recoilRound);

        if (bulletIndex >= activePattern.length) {
            handleSprayEnd();
            return;
        }

        const rect = gameAreaRef.current.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const recoilOffset = activePattern[bulletIndex];
        
        // Target moves with recoil
        const targetAbsolutePos = { x: center.x + recoilOffset.x, y: center.y + recoilOffset.y };
        setRecoilTargetPosition({ x: targetAbsolutePos.x - rect.left, y: targetAbsolutePos.y - rect.top });
        
        // User tries to track the target
        const userAbsolutePos = mousePositionRef.current;
        const errorDistance = Math.sqrt(Math.pow(userAbsolutePos.x - targetAbsolutePos.x, 2) + Math.pow(userAbsolutePos.y - targetAbsolutePos.y, 2));
        const pointScore = Math.max(0, Math.floor(100 - errorDistance * 2)); // Higher penalty for distance

        const userSprayPoint = {
            offsetX: userAbsolutePos.x - center.x,
            offsetY: userAbsolutePos.y - center.y
        };

        if (recoilRound === 'horizontal') {
            setSprayDataHorizontal(prev => [...prev, userSprayPoint]);
            setRecoilControlScoreHorizontal(prev => prev + pointScore);
        } else {
            setSprayDataVertical(prev => [...prev, userSprayPoint]);
            setRecoilControlScoreVertical(prev => prev + pointScore);
        }

        setCurrentSprayPoints(prev => [...prev, {
            id: Date.now() + Math.random(),
            x: userAbsolutePos.x - rect.left,
            y: userAbsolutePos.y - rect.top,
        }]);

    }, SPRAY_INTERVAL);
  };

  const handleSprayEnd = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    if (sprayIntervalRef.current) clearInterval(sprayIntervalRef.current);
    sprayIntervalRef.current = null;
    sprayStartTimeRef.current = null;
    mousePositionRef.current = null;
    setRecoilTargetPosition(null);
    setTimeout(() => setCurrentSprayPoints([]), 500);
  };
  
  const avgHitTime = hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0;
  const accuracy = (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 0;
  
  const totalShotsHorizontal = sprayDataHorizontal.length;
  const avgScoreHorizontal = totalShotsHorizontal > 0 ? Math.round(recoilControlScoreHorizontal / totalShotsHorizontal) : 0;
  const totalShotsVertical = sprayDataVertical.length;
  const avgScoreVertical = totalShotsVertical > 0 ? Math.round(recoilControlScoreVertical / totalShotsVertical) : 0;


  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return (
          <div className="text-center animate-fade-in-up">
            <h2 className="text-4xl font-bold tracking-tighter text-brand-text sm:text-5xl">Simulation Chamber</h2>
            <p className="mt-4 text-lg leading-8 text-brand-text-muted max-w-2xl mx-auto">Select a challenge to test your skills.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <button onClick={() => setGameMode('static')} className={`p-6 rounded-lg border-2 transition-all duration-300 ${gameMode === 'static' ? 'bg-brand-primary/20 border-brand-primary' : 'bg-brand-panel/50 border-brand-panel hover:border-brand-text-muted'}`}>
                    <MousePointerClick size={32} className="mx-auto text-brand-text"/>
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">Static Clicking</h3>
                    <p className="mt-1 text-sm text-brand-text-muted">Test raw click-timing on stationary targets.</p>
                </button>
                <button onClick={() => setGameMode('moving')} className={`p-6 rounded-lg border-2 transition-all duration-300 ${gameMode === 'moving' ? 'bg-brand-primary/20 border-brand-primary' : 'bg-brand-panel/50 border-brand-panel hover:border-brand-text-muted'}`}>
                    <Move size={32} className="mx-auto text-brand-text"/>
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">Dynamic Tracking</h3>
                    <p className="mt-1 text-sm text-brand-text-muted">Track and eliminate moving targets.</p>
                </button>
                <button onClick={() => setGameMode('recoil')} className={`p-6 rounded-lg border-2 transition-all duration-300 ${gameMode === 'recoil' ? 'bg-brand-primary/20 border-brand-primary' : 'bg-brand-panel/50 border-brand-panel hover:border-brand-text-muted'}`}>
                    <Waves size={32} className="mx-auto text-brand-text"/>
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">Recoil Control</h3>
                    <p className="mt-1 text-sm text-brand-text-muted">Master spray patterns by tracking a recoiling target.</p>
                </button>
            </div>
            <button onClick={startGame} className="mt-8 flex items-center justify-center mx-auto px-8 py-4 bg-brand-primary text-black rounded-lg hover:bg-cyan-300 transition-colors duration-300 font-semibold text-xl transform hover:-translate-y-1">
              <Play size={24} className="mr-2" />Begin Simulation
            </button>
          </div>
        );
      case 'countdown':
        return <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20"><span className="text-9xl font-bold text-white animate-spawn-target">{countdown}</span></div>;
      case 'results':
        return (
          <div className="w-full animate-fade-in-up">
            <h2 className="text-3xl font-bold text-brand-text tracking-tighter text-center">Simulation Results</h2>
            <p className="text-center text-brand-text-muted mt-1">Mode: <span className="font-semibold text-brand-primary">{gameMode === 'static' ? 'Static Clicking' : gameMode === 'moving' ? 'Dynamic Tracking' : 'Recoil Control'}</span></p>
            {gameMode === 'recoil' ? (
                <div className="mt-6 space-y-8">
                    {/* Horizontal Results */}
                    <div className="bg-brand-bg/30 p-4 sm:p-6 rounded-lg border border-brand-panel">
                        <h3 className="text-2xl font-semibold text-brand-primary mb-4 text-center">Horizontal Control Results</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mb-6">
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Avg. Precision</h3><p className="text-3xl font-bold text-brand-text mt-1">{avgScoreHorizontal}<span className="text-lg">%</span></p></div>
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><MousePointerClick size={14} className="mr-2"/>Shots Tracked</h3><p className="text-3xl font-bold text-brand-text mt-1">{totalShotsHorizontal}</p></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><MissScatterPlot misses={sprayDataHorizontal} targetSize={RECOIL_TARGET_SIZE*2} title="Your Tracking Pattern"/></div>
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><RecoilPatternDisplay pattern={HORIZONTAL_RECOIL_PATTERN} title="Target Path" /></div>
                        </div>
                    </div>
                     {/* Vertical Results */}
                    <div className="bg-brand-bg/30 p-4 sm:p-6 rounded-lg border border-brand-panel">
                        <h3 className="text-2xl font-semibold text-brand-primary mb-4 text-center">Vertical Control Results</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center mb-6">
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Avg. Precision</h3><p className="text-3xl font-bold text-brand-text mt-1">{avgScoreVertical}<span className="text-lg">%</span></p></div>
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><MousePointerClick size={14} className="mr-2"/>Shots Tracked</h3><p className="text-3xl font-bold text-brand-text mt-1">{totalShotsVertical}</p></div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><MissScatterPlot misses={sprayDataVertical} targetSize={RECOIL_TARGET_SIZE*2} title="Your Tracking Pattern"/></div>
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><RecoilPatternDisplay pattern={VERTICAL_RECOIL_PATTERN} title="Target Path" /></div>
                        </div>
                    </div>
                </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Final Score</h3><p className="text-3xl font-bold text-brand-text mt-1">{score}</p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Percent size={14} className="mr-2"/>Accuracy</h3><p className="text-3xl font-bold text-brand-text mt-1">{accuracy.toFixed(1)}%</p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Timer size={14} className="mr-2"/>Avg. Time-to-Hit</h3><p className="text-3xl font-bold text-brand-text mt-1">{avgHitTime.toFixed(0)}<span className="text-lg">ms</span></p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><MousePointerClick size={14} className="mr-2"/>Hits / Misses</h3><p className="text-3xl font-bold text-brand-text mt-1">{hits} / {misses}</p></div>
                </div>
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><HitTimeChart hitTimes={hitTimes} avgHitTime={avgHitTime} /></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><MissScatterPlot misses={missData} targetSize={TARGET_SIZE} title="Miss Distribution" /></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><HitTimeDistributionChart hitTimes={hitTimes} /></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><RecoilPatternDisplay pattern={missData.map(m => ({x: m.offsetX, y: m.offsetY}))} title="Aim Drift Pattern"/></div>
                </div>
              </>
            )}
            <div className="flex justify-center mt-8 space-x-4">
                <button onClick={startGame} className="flex items-center justify-center px-6 py-3 bg-brand-primary text-black rounded-lg hover:bg-cyan-300 transition-colors duration-300 font-semibold"><RefreshCw size={18} className="mr-2" />Play Again</button>
                <button onClick={onBack} className="flex items-center justify-center px-6 py-3 bg-brand-panel text-brand-text rounded-lg hover:bg-slate-600 transition-colors duration-300 font-semibold"><ArrowLeft size={18} className="mr-2" />Exit Trainer</button>
            </div>
          </div>
        );
      default: return null;
    }
  };
  
  const isPlaying = gameState === 'playing' || gameState === 'countdown';
  const gameAreaHandlers = gameMode === 'recoil'
    ? { onMouseDown: handleSprayStart, onMouseUp: handleSprayEnd, onMouseLeave: handleSprayEnd }
    : { onMouseDown: handleMiss };

  return (
    <div className={`relative w-full flex flex-col items-center justify-center transition-all duration-300 ${isPlaying ? 'p-0 sm:p-0' : 'p-4 sm:p-6'}`}>
       <div className={`w-full bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-brand-panel ${isPlaying ? 'border-none' : ''}`}>
          <button onClick={onBack} className="absolute top-4 left-4 text-brand-text-muted hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-brand-panel z-30" aria-label="Go back to menu"><ArrowLeft size={24} /></button>
          {gameState === 'idle' || gameState === 'results' ? (
            <div className="w-full p-4 sm:p-6">{renderContent()}</div>
          ) : (
             <div className={`w-full relative cursor-crosshair ${isPlaying ? 'h-screen' : 'h-[85vh]'}`}>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around text-brand-text p-2 bg-black/30 rounded-lg text-lg font-semibold z-10">
                <span>Time: {timeLeft}s</span>
                {gameMode === 'recoil' ? <span>Round: <span className="text-brand-primary capitalize">{recoilRound}</span></span> : <><span>Score: {score}</span><span>Acc: {accuracy.toFixed(1)}%</span></>}
              </div>

              {roundTransition.show && <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20"><span className="text-5xl font-bold text-white animate-fade-in-up">{roundTransition.text}</span></div>}

              <div ref={gameAreaRef} className="w-full h-full bg-brand-bg/50 overflow-hidden" {...gameAreaHandlers}>
                {recoilTargetPosition && (
                    <div className="absolute rounded-full bg-brand-primary border-2 border-cyan-200 -translate-x-1/2 -translate-y-1/2" style={{ left: recoilTargetPosition.x, top: recoilTargetPosition.y, width: RECOIL_TARGET_SIZE, height: RECOIL_TARGET_SIZE, boxShadow: '0 0 15px 0px #22d3ee' }} />
                )}
                {currentSprayPoints.map(p => <div key={p.id} className="absolute w-2 h-2 bg-yellow-300 rounded-full -translate-x-1/2 -translate-y-1/2 animate-destroy-target" style={{ left: p.x, top: p.y }} />)}
                {targets.map(target => (
                  <div key={target.id} className="absolute rounded-full bg-lime-400 border-2 border-lime-200 cursor-crosshair" style={{ left: target.x, top: target.y, width: target.size, height: target.size, boxShadow: '0 0 15px 0px #a3e635', animation: gameState === 'playing' && gameMode === 'static' ? 'spawn-target 0.2s ease-out forwards' : 'none' }}
                    onMouseDown={(e) => { e.stopPropagation(); handleTargetClick(target.id, target.spawnTime); }}/>
                ))}
              </div>
              {gameState === 'countdown' && renderContent()}
            </div>
          )}
        </div>
    </div>
  );
};

export default AimTrainer;