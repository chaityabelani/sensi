import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, RefreshCw, Target as TargetIcon, Timer, MousePointerClick, Percent, Move } from 'lucide-react';
import HitTimeChart from './HitTimeChart';
import MissScatterPlot from './MissScatterPlot';
import HitTimeDistributionChart from './HitTimeDistributionChart';
import RecoilPatternDisplay from './RecoilPatternDisplay';

// Types
type GameMode = 'static' | 'moving';

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

// Props
interface AimTrainerProps {
  onBack: () => void;
}

const GAME_DURATION = 30; // 30 seconds
const TARGET_SIZE = 50; // pixels
const TARGET_SPEED = 3; // pixels per frame for moving targets

const AimTrainer: React.FC<AimTrainerProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'results'>('idle');
  const [gameMode, setGameMode] = useState<GameMode>('static');
  const [targets, setTargets] = useState<TargetState[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  
  // Stats
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [missData, setMissData] = useState<MissData[]>([]);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    timerRef.current = null;
    countdownTimerRef.current = null;
    animationFrameRef.current = null;
  }, []);
  
  const spawnTarget = useCallback(() => {
    requestAnimationFrame(() => {
        if (!gameAreaRef.current) return;
        const { width, height } = gameAreaRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return; // Don't spawn if area not rendered
        
        let newVx = 0;
        let newVy = 0;
        if (gameMode === 'moving') {
            const angle = Math.random() * 2 * Math.PI;
            newVx = Math.cos(angle) * TARGET_SPEED;
            newVy = Math.sin(angle) * TARGET_SPEED;
        }

        const newTarget: TargetState = {
            id: Date.now(),
            x: Math.random() * (width - TARGET_SIZE * 2) + TARGET_SIZE,
            y: Math.random() * (height - TARGET_SIZE * 2) + TARGET_SIZE,
            vx: newVx,
            vy: newVy,
            size: TARGET_SIZE,
            spawnTime: performance.now(),
        };
        setTargets([newTarget]); // Only one target at a time
    });
  }, [gameMode]);
  
  const resetGameStats = useCallback(() => {
    clearTimers();
    setTargets([]);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(GAME_DURATION);
    setCountdown(3);
    setHitTimes([]);
    setMissData([]);
  }, [clearTimers]);

  const startGame = useCallback(() => {
    resetGameStats();
    setGameState('countdown');
    countdownTimerRef.current = window.setInterval(() => {
        setCountdown(prev => prev - 1);
    }, 1000);
  }, [resetGameStats]);

  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
        if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setGameState('playing');
        spawnTarget();
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
    }
  }, [gameState, countdown, spawnTarget]);
  
   useEffect(() => {
    // Game loop for moving targets
    if (gameState === 'playing' && gameMode === 'moving') {
      const loop = () => {
        setTargets(currentTargets => {
          if (currentTargets.length === 0 || !gameAreaRef.current) return [];
          
          const target = currentTargets[0];
          const { width, height } = gameAreaRef.current.getBoundingClientRect();
          if (width === 0) return currentTargets; // Guard against unmounted ref

          let newX = target.x + target.vx;
          let newY = target.y + target.vy;
          let newVx = target.vx;
          let newVy = target.vy;

          if (newX <= 0 || newX >= width - target.size) {
            newVx = -newVx;
          }
          if (newY <= 0 || newY >= height - target.size) {
            newVy = -newVy;
          }
          
          newX = Math.max(0, Math.min(width - target.size, newX));
          newY = Math.max(0, Math.min(height - target.size, newY));

          return [{ ...target, x: newX, y: newY, vx: newVx, vy: newVy }];
        });
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameMode]);

  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
        clearTimers();
        setGameState('results');
    }
  }, [timeLeft, gameState, clearTimers]);
  
  useEffect(() => {
      // Cleanup on unmount
      return () => clearTimers();
  }, [clearTimers]);

  const handleTargetClick = (targetId: number, spawnTime: number) => {
    const hitTime = performance.now() - spawnTime;
    setHitTimes(prev => [...prev, hitTime]);
    setHits(prev => prev + 1);
    setScore(prev => prev + (gameMode === 'moving' ? 150 : 100));
    setTargets([]); // Clear target immediately
    spawnTarget(); // Spawn next one
  };
  
  const handleMiss = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    
    // Ignore clicks on non-game-area elements (like stats bar)
    if (e.target !== gameAreaRef.current) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let missOffset: MissData = { offsetX: 0, offsetY: 0 };
    if (targets.length > 0) {
        const target = targets[0];
        const targetCenterX = target.x + target.size / 2;
        const targetCenterY = target.y + target.size / 2;
        missOffset = {
            offsetX: clickX - targetCenterX,
            offsetY: clickY - targetCenterY
        };
    }
    
    setMissData(prev => [...prev, missOffset]);
    setMisses(prev => prev + 1);
    setScore(prev => Math.max(0, prev - 25));
  };
  
  const avgHitTime = hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0;
  const accuracy = (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 0;
  
  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return (
          <div className="text-center animate-fade-in-up">
            <h2 className="text-4xl font-bold tracking-tighter text-brand-text sm:text-5xl">Simulation Chamber</h2>
            <p className="mt-4 text-lg leading-8 text-brand-text-muted max-w-2xl mx-auto">
              Select a {GAME_DURATION}-second challenge to test your reaction and precision.
            </p>
             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                    onClick={() => setGameMode('static')}
                    className={`p-6 rounded-lg border-2 transition-all duration-300 ${gameMode === 'static' ? 'bg-brand-primary/20 border-brand-primary' : 'bg-brand-panel/50 border-brand-panel hover:border-brand-text-muted'}`}
                >
                    <MousePointerClick size={32} className="mx-auto text-brand-text"/>
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">Static Clicking</h3>
                    <p className="mt-1 text-sm text-brand-text-muted">Test your raw click-timing on stationary targets.</p>
                </button>
                <button
                    onClick={() => setGameMode('moving')}
                    className={`p-6 rounded-lg border-2 transition-all duration-300 ${gameMode === 'moving' ? 'bg-brand-primary/20 border-brand-primary' : 'bg-brand-panel/50 border-brand-panel hover:border-brand-text-muted'}`}
                >
                    <Move size={32} className="mx-auto text-brand-text"/>
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">Dynamic Tracking</h3>
                    <p className="mt-1 text-sm text-brand-text-muted">Improve your tracking on constantly moving targets.</p>
                </button>
            </div>
            <button
              onClick={startGame}
              className="mt-8 flex items-center justify-center mx-auto px-8 py-4 bg-brand-primary text-black rounded-lg hover:bg-cyan-300 transition-colors duration-300 font-semibold text-xl transform hover:-translate-y-1"
            >
              <Play size={24} className="mr-2" />
              Begin Simulation
            </button>
          </div>
        );
      case 'countdown':
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
              <span className="text-9xl font-bold text-white animate-spawn-target">{countdown}</span>
            </div>
        );
      case 'results':
        const userMissPattern = missData.map(miss => ({ x: miss.offsetX, y: miss.offsetY }));
        return (
          <div className="w-full animate-fade-in-up">
            <h2 className="text-3xl font-bold text-brand-text tracking-tighter text-center">Simulation Results</h2>
             <p className="text-center text-brand-text-muted mt-1">
                Mode: <span className="font-semibold text-brand-primary">{gameMode === 'static' ? 'Static Clicking' : 'Dynamic Tracking'}</span>
             </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel">
                  <h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Final Score</h3>
                  <p className="text-3xl font-bold text-brand-text mt-1">{score}</p>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel">
                  <h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Percent size={14} className="mr-2"/>Accuracy</h3>
                  <p className="text-3xl font-bold text-brand-text mt-1">{accuracy.toFixed(1)}%</p>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel">
                  <h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Timer size={14} className="mr-2"/>Avg. Time-to-Hit</h3>
                  <p className="text-3xl font-bold text-brand-text mt-1">{avgHitTime.toFixed(0)}<span className="text-lg">ms</span></p>
              </div>
               <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel">
                  <h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><MousePointerClick size={14} className="mr-2"/>Hits / Misses</h3>
                  <p className="text-3xl font-bold text-brand-text mt-1">{hits} / {misses}</p>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><HitTimeChart hitTimes={hitTimes} avgHitTime={avgHitTime} /></div>
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><MissScatterPlot misses={missData} targetSize={TARGET_SIZE}/></div>
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><HitTimeDistributionChart hitTimes={hitTimes} /></div>
              <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]"><RecoilPatternDisplay pattern={userMissPattern} /></div>
            </div>
            
             <div className="flex justify-center mt-8 space-x-4">
                <button
                onClick={startGame}
                className="flex items-center justify-center px-6 py-3 bg-brand-primary text-black rounded-lg hover:bg-cyan-300 transition-colors duration-300 font-semibold"
                >
                <RefreshCw size={18} className="mr-2" />
                Play Again
                </button>
                <button
                onClick={onBack}
                className="flex items-center justify-center px-6 py-3 bg-brand-panel text-brand-text rounded-lg hover:bg-slate-600 transition-colors duration-300 font-semibold"
                >
                <ArrowLeft size={18} className="mr-2" />
                Exit Trainer
                </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  const isPlaying = gameState === 'playing' || gameState === 'countdown';

  return (
    <div className={`relative w-full flex flex-col items-center justify-center transition-all duration-300 ${isPlaying ? 'p-0 sm:p-0' : 'p-4 sm:p-6'}`}>
       <div className={`w-full bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-brand-panel ${isPlaying ? 'border-none' : ''}`}>
          <button
            onClick={onBack}
            className="absolute top-4 left-4 text-brand-text-muted hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-brand-panel z-30"
            aria-label="Go back to menu"
          >
            <ArrowLeft size={24} />
          </button>

          {gameState === 'idle' || gameState === 'results' ? (
            <div className="w-full p-4 sm:p-6">{renderContent()}</div>
          ) : (
             <div className={`w-full relative cursor-crosshair ${isPlaying ? 'h-screen' : 'h-[85vh]'}`}>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full max-w-md flex justify-around text-brand-text p-2 bg-black/30 rounded-lg text-lg font-semibold z-10">
                <span>Score: {score}</span>
                <span>Time: {timeLeft}s</span>
                <span>Acc: {accuracy.toFixed(1)}%</span>
              </div>
              <div
                ref={gameAreaRef}
                className="w-full h-full bg-brand-bg/50 overflow-hidden"
                onMouseDown={handleMiss}
              >
                {targets.map(target => (
                  <div
                    key={target.id}
                    className="absolute rounded-full bg-lime-400 border-2 border-lime-200 cursor-crosshair"
                     style={{
                      left: target.x,
                      top: target.y,
                      width: target.size,
                      height: target.size,
                      boxShadow: '0 0 15px 0px #a3e635',
                      animation: gameState === 'playing' && gameMode === 'static' ? 'spawn-target 0.2s ease-out forwards' : 'none'
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        handleTargetClick(target.id, target.spawnTime);
                    }}
                  />
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