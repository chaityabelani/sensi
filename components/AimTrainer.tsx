import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, RefreshCw, Target as TargetIcon, Timer, MousePointerClick, Percent, Move, Waves, Flame, Bot, X } from 'lucide-react';
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

// Props
interface AimTrainerProps {
  onBack: () => void;
}

// Constants
const TARGET_SIZE = 50; // pixels
const RECOIL_TARGET_SIZE = 30;
const SPRAY_INTERVAL = 80; // ms between "shots" - now used for pattern timing
const DURATION_OPTIONS = [20, 30, 60, 90, 120];

const SENSITIVITY_PRESETS: Record<string, { label: string; value: string }> = {
  low: { label: 'Low', value: '0.20' },
  medium: { label: 'Medium', value: '0.40' },
  high: { label: 'High', value: '0.80' },
};

const TARGET_SPEEDS: Record<string, { name: string; value: number }> = {
    slow: { name: 'Slow', value: 2 },
    medium: { name: 'Medium', value: 4 },
    fast: { name: 'Fast', value: 6 },
};

// Realistic recoil patterns for a more authentic training experience
const scalePattern = (pattern: {x:number, y:number}[], scale: number) => pattern.map(p => ({ x: p.x * scale, y: p.y * scale }));

// Assault Rifle: Classic '7' pattern. Strong vertical, then veers right.
const AR_PATTERN_RAW = Array.from({ length: 30 }, (_, i) => ({
  x: i > 10 ? (i - 10) * 0.8 : Math.sin(i / 5) * 0.5,
  y: -i * 1.5,
}));

// SMG: Fast, erratic horizontal sway with moderate vertical climb.
const SMG_PATTERN_RAW = Array.from({ length: 40 }, (_, i) => ({
  x: Math.sin(i / 2) * i * 0.4,
  y: -i * 0.8,
}));

// LMG: Slow initial climb, then accelerates with heavy, wide sway.
const LMG_PATTERN_RAW = Array.from({ length: 50 }, (_, i) => ({
    x: i > 15 ? Math.sin(i / 4) * (i - 15) * 0.5 : 0,
    y: -Math.pow(i, 1.2) * 0.8
}));

const RECOIL_PATTERNS: Record<string, { name: string; pattern: {x: number, y: number}[] }> = {
    ar: {
        name: 'Assault Rifle',
        pattern: scalePattern(AR_PATTERN_RAW, 2.8),
    },
    smg: {
        name: 'SMG',
        pattern: scalePattern(SMG_PATTERN_RAW, 2.5),
    },
    lmg: {
        name: 'LMG',
        pattern: scalePattern(LMG_PATTERN_RAW, 2.2),
    },
};

const getSenseiObservation = (
    sensitivity: string,
    missData: MissData[],
    accuracy: number
  ): string => {
    const sens = parseFloat(sensitivity);
    if (isNaN(sens)) {
      return "Enter your sensitivity before the session to receive personalized feedback on your aim patterns.";
    }

    if (accuracy > 97) {
      return "Exceptional accuracy! Your sensitivity appears to be perfectly dialed in for this challenge. Keep up the great work.";
    }

    if (missData.length < 5) {
      return "There's not enough miss data to provide a detailed analysis. Try another session and we'll see what we can learn!";
    }

    const avgOffsetX = missData.reduce((sum, miss) => sum + miss.offsetX, 0) / missData.length;
    
    // Check for horizontal bias
    const horizontalBiasThreshold = TARGET_SIZE * 0.3; // Misses are on average 30% of target size to one side
    if (Math.abs(avgOffsetX) > horizontalBiasThreshold) {
      const direction = avgOffsetX > 0 ? "right" : "left";
      const correctiveDirection = avgOffsetX > 0 ? "left" : "right";
      
      if (sens > 0.6) {
        return `You consistently missed to the ${direction}, suggesting you're over-aiming. Your sensitivity might be too high. Try lowering it by 10-15% to improve fine control.`;
      } else if (sens < 0.25) {
        return `Your misses are clustered to the ${direction}. With a low sensitivity, this might mean you're struggling to catch up to targets. Consider a small increase to make flicks feel less strenuous.`;
      } else {
        return `There's a noticeable pattern of misses to the ${direction}. This indicates an aiming bias. Focus on centering your aim by consciously pulling slightly to the ${correctiveDirection} as you acquire a target.`;
      }
    }
    
    // Check for vertical bias
    const avgOffsetY = missData.reduce((sum, miss) => sum + miss.offsetY, 0) / missData.length;
    const verticalBiasThreshold = TARGET_SIZE * 0.3;
     if (Math.abs(avgOffsetY) > verticalBiasThreshold) {
      const direction = avgOffsetY > 0 ? "below" : "above"; // Y is inverted on screens, but my offset calc is correct (clickY - targetCenterY). So positive is down.
      if (sens > 0.6) {
         return `You have a tendency to miss ${direction} the target. This often happens with high sensitivity where small vertical movements are exaggerated. A slight reduction could help stabilize your vertical aim.`;
      } else {
         return `Your misses are frequently ${direction} the target. Ensure your posture and wrist position are consistent. This type of pattern can sometimes be ergonomic rather than purely a sensitivity issue.`;
      }
    }

    if (accuracy < 85) {
      return "Your misses are scattered, indicating general inconsistency. This could mean your sensitivity is in a range that you haven't built muscle memory for yet. Consistent practice is key. Focus on smooth mouse movements rather than jerky flicks.";
    }

    return "Your performance is solid. Your sensitivity seems to be in a good range. Continue practicing to build even stronger muscle memory and push your scores higher!";
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
  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [targetSpeed, setTargetSpeed] = useState(TARGET_SPEEDS.medium.value);

  // Recoil state
  const [selectedPattern, setSelectedPattern] = useState<string>('ar');
  const [isTracking, setIsTracking] = useState(false);
  const [crosshairPath, setCrosshairPath] = useState<{x: number, y: number}[]>([]);
  const [trackingScore, setTrackingScore] = useState(0);
  const [trackingSamples, setTrackingSamples] = useState(0);
  const [recoilTargetPosition, setRecoilTargetPosition] = useState<{ x: number; y: number } | null>(null);

  // Shared state
  const [gameDuration, setGameDuration] = useState(30);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [countdown, setCountdown] = useState(3);
  const [sensitivity, setSensitivity] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  // Refs
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const trackStartTimeRef = useRef<number | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);

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
        if (width === 0 || height === 0) return;
        
        let newVx = 0, newVy = 0;
        if (gameMode === 'moving') {
            const angle = Math.random() * 2 * Math.PI;
            newVx = Math.cos(angle) * targetSpeed;
            newVy = Math.sin(angle) * targetSpeed;
        }

        setTargets([{
            id: Date.now(),
            x: Math.random() * (width - TARGET_SIZE * 2) + TARGET_SIZE,
            y: Math.random() * (height - TARGET_SIZE * 2) + TARGET_SIZE,
            vx: newVx, vy: newVy, size: TARGET_SIZE, spawnTime: performance.now(),
        }]);
    });
  }, [gameMode, targetSpeed]);
  
  const resetGameStats = useCallback(() => {
    clearTimers();
    setTargets([]); setScore(0); setHits(0); setMisses(0);
    setTimeLeft(gameDuration); 
    setCountdown(3);
    setHitTimes([]); setMissData([]);
    setCurrentCombo(0); setMaxCombo(0);
    // Recoil
    setIsTracking(false);
    setCrosshairPath([]);
    setTrackingScore(0);
    setTrackingSamples(0);
    setRecoilTargetPosition(null);
  }, [clearTimers, gameDuration]);

  const startGame = useCallback(() => {
    resetGameStats();
    setGameState('countdown');
    countdownTimerRef.current = window.setInterval(() => setCountdown(prev => prev - 1), 1000);
  }, [resetGameStats]);

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

  // Recoil Mode Game Loop
  useEffect(() => {
    if (gameState !== 'playing' || gameMode !== 'recoil') return;
    
    let gameStartTime = performance.now();
    const activePattern = RECOIL_PATTERNS[selectedPattern]?.pattern || [];
    
    const loop = () => {
        if (!gameAreaRef.current) {
            animationFrameRef.current = requestAnimationFrame(loop);
            return;
        };

        const elapsedTime = performance.now() - gameStartTime;
        const patternIndex = Math.floor(elapsedTime / SPRAY_INTERVAL);

        if (patternIndex >= activePattern.length) { // End of pattern
            setRecoilTargetPosition(prev => prev);
        } else {
            const rect = gameAreaRef.current.getBoundingClientRect();
            const center = { x: rect.width / 2, y: rect.height / 2 };
            const recoilOffset = activePattern[patternIndex];
            
            const targetPos = { x: center.x + recoilOffset.x, y: center.y + recoilOffset.y };
            setRecoilTargetPosition(targetPos);

            if (isTracking && mousePositionRef.current) {
                const userMouseRelative = {
                    x: mousePositionRef.current.x - rect.left,
                    y: mousePositionRef.current.y - rect.top
                };
                
                const crosshairPointForPath = {
                    x: userMouseRelative.x - center.x,
                    y: userMouseRelative.y - center.y,
                };

                const errorDistance = Math.sqrt(Math.pow(userMouseRelative.x - targetPos.x, 2) + Math.pow(userMouseRelative.y - targetPos.y, 2));
                const pointScore = Math.max(0, 100 - errorDistance);

                setCrosshairPath(prev => [...prev, crosshairPointForPath]);
                setTrackingScore(prev => prev + pointScore);
                setTrackingSamples(prev => prev + 1);
            }
        }

        animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [gameState, gameMode, isTracking, selectedPattern]);


  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
        setMaxCombo(prev => Math.max(prev, currentCombo));
        clearTimers();
        setGameState('results');
    }
  }, [timeLeft, gameState, clearTimers, currentCombo]);
  
  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleTargetClick = (targetId: number, spawnTime: number) => {
    const timeToHit = performance.now() - spawnTime;
    setHitTimes(prev => [...prev, timeToHit]);
    setHits(prev => prev + 1);
    const timeBonus = Math.max(0, 100 - Math.floor(timeToHit / 10));
    setScore(prev => prev + (gameMode === 'moving' ? 150 : 100) + (currentCombo * 10) + timeBonus);
    setCurrentCombo(prev => prev + 1);
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

    setMaxCombo(prev => Math.max(prev, currentCombo));
    setCurrentCombo(0);

    setMisses(prev => prev + 1);
    setScore(prev => Math.max(0, prev - 25));
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (gameAreaRef.current) {
        mousePositionRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleTrackStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    document.addEventListener('mousemove', handleMouseMove);
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    trackStartTimeRef.current = performance.now();
    setIsTracking(true);
  };

  const handleTrackEnd = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    setIsTracking(false);
    trackStartTimeRef.current = null;
    mousePositionRef.current = null;
  };
  
  const handlePresetClick = (presetKey: string) => {
    const preset = SENSITIVITY_PRESETS[presetKey];
    setSensitivity(preset.value);
    setActivePreset(presetKey);
  };
  
  const handleClearSensitivity = () => {
      setSensitivity('');
      setActivePreset(null);
  }
  
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      setSensitivity(value);
      const matchingPreset = Object.keys(SENSITIVITY_PRESETS).find(
        key => SENSITIVITY_PRESETS[key].value === value
      );
      setActivePreset(matchingPreset || null);
  };

  const avgHitTime = hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0;
  const accuracy = (hits + misses) > 0 ? (hits / (hits + misses)) * 100 : 0;
  
  const trackingAccuracy = trackingSamples > 0 ? Math.round(trackingScore / trackingSamples) : 0;

  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return (
          <div className="text-center animate-fade-in-up">
            <h2 className="text-4xl font-bold tracking-tighter text-brand-text sm:text-5xl">Simulation Chamber</h2>
            <p className="mt-4 text-lg leading-8 text-brand-text-muted max-w-2xl mx-auto">Select a challenge and configure your settings to begin.</p>
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
                    <p className="mt-1 text-sm text-brand-text-muted">Master spray patterns by tracking a moving target.</p>
                </button>
                 {gameMode === 'moving' && (
                  <div className="md:col-span-3 mt-4 animate-fade-in-up">
                    <h4 className="text-lg font-semibold text-brand-text-muted">Select Target Speed:</h4>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {Object.entries(TARGET_SPEEDS).map(([id, { name, value }]) => (
                        <button
                          key={id}
                          onClick={() => setTargetSpeed(value)}
                          className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all duration-200 ${targetSpeed === value ? 'bg-brand-secondary border-brand-secondary text-white' : 'bg-brand-panel border-brand-panel text-brand-text-muted hover:border-brand-text-muted'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                 {gameMode === 'recoil' && (
                  <div className="md:col-span-3 mt-4 animate-fade-in-up">
                    <h4 className="text-lg font-semibold text-brand-text-muted">Select Recoil Pattern:</h4>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {Object.entries(RECOIL_PATTERNS).map(([id, { name }]) => (
                        <button
                          key={id}
                          onClick={() => setSelectedPattern(id)}
                          className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all duration-200 ${selectedPattern === id ? 'bg-brand-secondary border-brand-secondary text-white' : 'bg-brand-panel border-brand-panel text-brand-text-muted hover:border-brand-text-muted'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="md:col-span-3 mt-4 animate-fade-in-up">
                    <h4 className="text-lg font-semibold text-brand-text-muted">Select Duration:</h4>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {DURATION_OPTIONS.map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setGameDuration(duration)}
                          className={`px-6 py-2 rounded-lg border-2 font-semibold transition-all duration-200 ${gameDuration === duration ? 'bg-brand-secondary border-brand-secondary text-white' : 'bg-brand-panel border-brand-panel text-brand-text-muted hover:border-brand-text-muted'}`}
                        >
                          {duration}s
                        </button>
                      ))}
                    </div>
                </div>
                <div className="md:col-span-3 mt-6 animate-fade-in-up">
                    <label htmlFor="sensitivity" className="block text-lg font-semibold text-brand-text-muted mb-2 flex items-center justify-center">
                        <TargetIcon size={20} className="mr-2 text-brand-secondary" />
                        In-Game Sensitivity (Optional)
                    </label>
                    <div className="max-w-xs mx-auto">
                        <input
                            type="number"
                            name="sensitivity"
                            id="sensitivity"
                            value={sensitivity}
                            onChange={handleSensitivityChange}
                            className="bg-brand-bg border border-brand-panel text-brand-text text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-3 placeholder-brand-text-muted/50 text-center"
                            placeholder="e.g., 0.45"
                            step="0.01"
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        {Object.entries(SENSITIVITY_PRESETS).map(([key, { label }]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handlePresetClick(key)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors border ${
                              activePreset === key 
                              ? 'bg-brand-secondary/20 border-brand-secondary text-brand-secondary' 
                              : 'bg-brand-panel border-transparent text-brand-text-muted hover:bg-slate-600'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        {sensitivity && (
                          <button 
                            type="button"
                            onClick={handleClearSensitivity}
                            className="flex items-center justify-center h-6 w-6 rounded-full bg-brand-panel text-brand-text-muted hover:bg-red-900/50 hover:text-red-400 transition-colors"
                            aria-label="Clear sensitivity"
                          >
                            <X size={14} />
                          </button>
                        )}
                    </div>
                </div>
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
                    <div className="bg-brand-bg/30 p-4 sm:p-6 rounded-lg border border-brand-panel">
                        <h3 className="text-2xl font-semibold text-brand-primary mb-4 text-center">
                            {RECOIL_PATTERNS[selectedPattern]?.name || 'Recoil'} Control Results
                        </h3>
                         <div className="grid grid-cols-1 gap-4 text-center mb-6 max-w-xs mx-auto">
                            <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Tracking Accuracy</h3><p className="text-3xl font-bold text-brand-text mt-1">{trackingAccuracy}<span className="text-lg">%</span></p></div>
                        </div>
                        <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel h-[350px]">
                            <RecoilPatternDisplay pattern={RECOIL_PATTERNS[selectedPattern]?.pattern || []} userPattern={crosshairPath} title="Target Path vs. Your Crosshair" />
                        </div>
                    </div>
                </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Final Score</h3><p className="text-3xl font-bold text-brand-text mt-1">{score}</p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Percent size={14} className="mr-2"/>Accuracy</h3><p className="text-3xl font-bold text-brand-text mt-1">{accuracy.toFixed(1)}%</p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Timer size={14} className="mr-2"/>Avg. Time-to-Hit</h3><p className="text-3xl font-bold text-brand-text mt-1">{avgHitTime.toFixed(0)}<span className="text-lg">ms</span></p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><MousePointerClick size={14} className="mr-2"/>Hits / Misses</h3><p className="text-3xl font-bold text-brand-text mt-1">{hits} / {misses}</p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><Flame size={14} className="mr-2 text-orange-400"/>Highest Combo</h3><p className="text-3xl font-bold text-brand-text mt-1">{maxCombo}x</p></div>
                  <div className="bg-brand-bg/50 p-4 rounded-lg border border-brand-panel"><h3 className="text-sm font-semibold text-brand-text-muted flex items-center justify-center"><TargetIcon size={14} className="mr-2"/>Sensitivity</h3><p className="text-3xl font-bold text-brand-text mt-1">{sensitivity || 'N/A'}</p></div>
                </div>
                
                 <div className="mt-8 bg-brand-bg/30 p-4 sm:p-6 rounded-lg border border-brand-panel border-l-4 border-l-brand-secondary">
                    <h3 className="text-xl font-semibold text-brand-text mb-3 flex items-center">
                        <Bot size={20} className="mr-3 text-brand-secondary" />
                        Sensei's Observation
                    </h3>
                    <p className="text-brand-text-muted">
                        {getSenseiObservation(sensitivity, missData, accuracy)}
                    </p>
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
    ? { onMouseDown: handleTrackStart, onMouseUp: handleTrackEnd, onMouseLeave: handleTrackEnd }
    : { onMouseDown: handleMiss };

  return (
    <div className={`relative w-full flex flex-col items-center justify-center transition-all duration-300 ${isPlaying ? 'p-0 sm:p-0' : 'p-4 sm:p-6'}`}>
       <div className={`w-full bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-brand-panel ${isPlaying ? 'border-none' : ''}`}>
          <button onClick={onBack} className="absolute top-4 left-4 text-brand-text-muted hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-brand-panel z-30" aria-label="Go back to menu"><ArrowLeft size={24} /></button>
          {gameState === 'idle' || gameState === 'results' ? (
            <div className="w-full p-4 sm:p-6">{renderContent()}</div>
          ) : (
             <div className={`w-full relative cursor-crosshair ${isPlaying ? 'h-screen' : 'h-[85vh]'}`}>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full max-w-lg flex justify-around items-center text-brand-text p-2 bg-black/30 rounded-lg text-lg font-semibold z-10">
                <span>Time: {timeLeft}s</span>
                {gameMode === 'recoil' ? (
                    <span>Accuracy: <span className="text-brand-primary capitalize">{trackingAccuracy}%</span></span>
                ) : (
                    <>
                        <span>Score: {score}</span>
                        <span key={currentCombo} className={`text-yellow-400 font-bold min-w-[120px] text-center ${currentCombo > 1 ? 'animate-pop-in' : ''}`}>
                            {currentCombo > 1 && `${currentCombo}x Combo`}
                        </span>
                        <span>Acc: {accuracy.toFixed(1)}%</span>
                    </>
                )}
              </div>

              <div ref={gameAreaRef} className="w-full h-full bg-brand-bg/50 overflow-hidden" {...gameAreaHandlers}>
                {gameMode === 'recoil' && (
                    <>
                        <div className="absolute w-2 h-2 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '50%' }} />
                        {recoilTargetPosition && (
                            <div className="absolute rounded-full bg-brand-primary border-2 border-cyan-200 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: recoilTargetPosition.x, top: recoilTargetPosition.y, width: RECOIL_TARGET_SIZE, height: RECOIL_TARGET_SIZE, boxShadow: '0 0 15px 0px #22d3ee' }} />
                        )}
                    </>
                )}
                
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