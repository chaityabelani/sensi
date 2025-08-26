
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Timer, CheckCircle, XCircle, Home, Play, RefreshCw, MousePointerClick, Clock, Bot, ChevronsRight, ChevronsLeft, Move, Shuffle } from 'lucide-react';

// --- DATA STRUCTURES & TYPES ---

interface TargetState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  createdAt: number;
}

interface ScenarioConfig {
  targetSize: [number, number]; // min, max
  movementPattern: 'static' | 'linear' | 'strafe';
  targetSpeed: [number, number]; // min, max
  spawnBehavior: 'on-hit' | 'grid';
  maxTargetsOnScreen: number;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  config: ScenarioConfig;
}

interface TrainingCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  scenarios: Scenario[];
}

const TRAINING_SCENARIOS: TrainingCategory[] = [
  {
    id: 'flicking',
    name: 'Flicking',
    icon: <MousePointerClick size={24} />,
    scenarios: [
      { id: 'flick_static', name: 'Static Dots', description: 'The classic. Targets appear one by one. Flick and click.', config: { targetSize: [40, 40], movementPattern: 'static', targetSpeed: [0, 0], spawnBehavior: 'on-hit', maxTargetsOnScreen: 1 } },
      { id: 'flick_large', name: 'Large Targets', description: 'Practice wide-angle flicks to large, stationary targets.', config: { targetSize: [80, 80], movementPattern: 'static', targetSpeed: [0, 0], spawnBehavior: 'on-hit', maxTargetsOnScreen: 1 } },
      { id: 'flick_variable', name: 'Variable Size', description: 'Targets of different sizes will appear randomly.', config: { targetSize: [20, 60], movementPattern: 'static', targetSpeed: [0, 0], spawnBehavior: 'on-hit', maxTargetsOnScreen: 1 } },
    ]
  },
  {
    id: 'tracking',
    name: 'Tracking',
    icon: <Move size={24} />,
    scenarios: [
      { id: 'track_smooth', name: 'Smooth Tracking', description: 'Follow a target moving smoothly across the screen.', config: { targetSize: [45, 45], movementPattern: 'linear', targetSpeed: [2, 4], spawnBehavior: 'on-hit', maxTargetsOnScreen: 1 } },
      { id: 'track_strafe', name: 'Strafing Target', description: 'Track a target that mimics player strafing movements.', config: { targetSize: [40, 40], movementPattern: 'strafe', targetSpeed: [3, 5], spawnBehavior: 'on-hit', maxTargetsOnScreen: 1 } },
    ]
  },
  {
    id: 'switching',
    name: 'Target Switching',
    icon: <Shuffle size={24} />,
    scenarios: [
        { id: 'switch_grid', name: 'Static Grid', description: 'Eliminate a grid of stationary targets as fast as possible.', config: { targetSize: [50, 50], movementPattern: 'static', targetSpeed: [0, 0], spawnBehavior: 'grid', maxTargetsOnScreen: 6 } },
        { id: 'switch_multi', name: 'Multi-Target', description: 'Multiple static targets appear. Clear them quickly.', config: { targetSize: [40, 40], movementPattern: 'static', targetSpeed: [0, 0], spawnBehavior: 'on-hit', maxTargetsOnScreen: 3 } },
    ]
  }
];

// --- UTILITY FUNCTIONS ---
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

// --- COMPONENT ---

interface AimTrainerProps {
  onBack: () => void;
}

const AimTrainer: React.FC<AimTrainerProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'config' | 'playing' | 'finished'>('config');
  const [targets, setTargets] = useState<TargetState[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [overshoots, setOvershoots] = useState(0);
  const [undershoots, setUndershoots] = useState(0);
  const [gameDuration, setGameDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [avgHitTime, setAvgHitTime] = useState(0);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [crosshairPosition, setCrosshairPosition] = useState({ x: -100, y: -100 });

  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory | null>(TRAINING_SCENARIOS[0]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);
  const lastStrafeChangeRef = useRef<number>(0);

  useEffect(() => {
    const checkIsMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobileView(isTouchDevice && isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const spawnTarget = useCallback((scenario: Scenario, count: number) => {
    if (!gameAreaRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const newTargets: TargetState[] = [];
    for(let i=0; i<count; i++) {
        const size = randomBetween(scenario.config.targetSize[0], scenario.config.targetSize[1]);
        const speed = randomBetween(scenario.config.targetSpeed[0], scenario.config.targetSpeed[1]);
        const angle = Math.random() * 2 * Math.PI;

        const newTarget: TargetState = {
            id: Date.now() + i,
            x: Math.random() * (width - size),
            y: Math.random() * (height - size),
            vx: scenario.config.movementPattern !== 'static' ? Math.cos(angle) * speed : 0,
            vy: scenario.config.movementPattern !== 'static' ? Math.sin(angle) * speed : 0,
            size,
            createdAt: Date.now(),
        };
        newTargets.push(newTarget);
    }
    setTargets(prev => [...prev, ...newTargets]);
    lastHitTimeRef.current = Date.now();
  }, []);

  const resetGameStats = () => {
    setScore(0);
    setMisses(0);
    setOvershoots(0);
    setUndershoots(0);
    setTimeLeft(gameDuration);
    setHitTimes([]);
    setAvgHitTime(0);
    setShowSuggestion(false);
    setTargets([]);
  };

  const startGame = () => {
    if (!selectedScenario) return;
    resetGameStats();
    setGameState('playing');
    if (isMobileView && gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setCrosshairPosition({ x: rect.width / 2, y: rect.height / 2 });
    }
    gameAreaRef.current?.focus();

    if (selectedScenario.config.spawnBehavior === 'grid') {
        spawnTarget(selectedScenario, selectedScenario.config.maxTargetsOnScreen);
    } else {
        spawnTarget(selectedScenario, selectedScenario.config.maxTargetsOnScreen - targets.length);
    }
  };

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    setAvgHitTime(hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0);

    setGameState('finished');
    setTargets([]);
  }, [hitTimes]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current) };
    }
  }, [gameState]);
  
  useEffect(() => {
    if (gameState !== 'playing' || !selectedScenario) return;
    
    const gameLoop = (timestamp: number) => {
        if (!gameAreaRef.current) return;
        const { width, height } = gameAreaRef.current.getBoundingClientRect();

        setTargets(prevTargets => prevTargets.map(t => {
            let { x, y, vx, vy } = t;

            if (selectedScenario.config.movementPattern === 'strafe') {
                if (timestamp - lastStrafeChangeRef.current > 750) {
                    vx = -vx; // reverse direction
                    lastStrafeChangeRef.current = timestamp;
                }
            }
            
            x += vx;
            y += vy;

            if (x <= 0 || x >= width - t.size) vx = -vx;
            if (y <= 0 || y >= height - t.size) vy = -vy;

            return { ...t, x, y, vx, vy };
        }));

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
}, [gameState, selectedScenario]);

  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
      endGame();
    }
  }, [timeLeft, gameState, endGame]);

  const handleHit = (targetId: number) => {
    setHitTimes(prev => [...prev, Date.now() - lastHitTimeRef.current]);
    setScore(prev => prev + 1);
    const newTargets = targets.filter(t => t.id !== targetId);
    setTargets(newTargets);
    
    if (selectedScenario?.config.spawnBehavior === 'on-hit' && newTargets.length < selectedScenario.config.maxTargetsOnScreen) {
        spawnTarget(selectedScenario, 1);
    }
  };

  const handleTargetClick = (e: React.MouseEvent, targetId: number) => {
    if (isMobileView) return;
    e.stopPropagation();
    handleHit(targetId);
  };

  const handleMissClick = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !gameAreaRef.current || targets.length === 0 || isMobileView) return;
    setMisses(prev => prev + 1);

    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - gameAreaRect.left;

    // Find the closest target to the click to determine over/under shoot
    const closestTarget = targets.reduce((closest, current) => {
        const closestDist = Math.abs(clickX - (closest.x + closest.size / 2));
        const currentDist = Math.abs(clickX - (current.x + current.size / 2));
        return currentDist < closestDist ? current : closest;
    });

    const targetCenterX = closestTarget.x + closestTarget.size / 2;
    if (clickX > targetCenterX) setOvershoots(prev => prev + 1);
    else setUndershoots(prev => prev + 1);
  };
  
  // Mobile handlers
  const updateCrosshairPosition = (e: React.TouchEvent) => {
    if (e.touches.length < 1 || !gameAreaRef.current) return;
    const touch = e.touches[0];
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setCrosshairPosition({ x: Math.max(0, Math.min(x, rect.width)), y: Math.max(0, Math.min(y, rect.height)) });
  };
  const handleTouchStart = (e: React.TouchEvent) => { e.preventDefault(); if(gameState !== 'playing') return; updateCrosshairPosition(e); };
  const handleTouchMove = (e: React.TouchEvent) => { e.preventDefault(); if(gameState !== 'playing') return; updateCrosshairPosition(e); };
  const handleFire = () => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    
    const hitTarget = targets.find(target => {
        const targetCenterX = target.x + target.size / 2;
        const targetCenterY = target.y + target.size / 2;
        const distance = Math.hypot(crosshairPosition.x - targetCenterX, crosshairPosition.y - targetCenterY);
        return distance <= target.size / 2;
    });

    if (hitTarget) {
        if ('vibrate' in navigator) navigator.vibrate(50);
        handleHit(hitTarget.id);
    } else {
        if ('vibrate' in navigator) navigator.vibrate([75, 50, 75]);
        setMisses(prev => prev + 1);
    }
  }

  const getSensitivitySuggestion = (): React.ReactNode => {
    const totalMisses = overshoots + undershoots;
    if (totalMisses < 5) return <p>Not enough miss data for a suggestion. Keep practicing!</p>;
    const overshootRatio = overshoots / totalMisses;

    if (overshootRatio > 0.65) return <><p className="mb-2">You're frequently <strong className="text-red-400">overshooting</strong>.</p><p>Try lowering your sensitivity by <strong className="text-brand-primary">10-15%</strong> for better control.</p></>;
    if (overshootRatio < 0.35) return <><p className="mb-2">You're frequently <strong className="text-yellow-400">undershooting</strong>.</p><p>Try increasing your sensitivity by <strong className="text-brand-primary">5-10%</strong> to reach targets faster.</p></>;
    return <><p className="mb-2">Your aim seems <strong className="text-green-400">balanced!</strong></p><p>This sensitivity seems to be a good fit. Focus on consistency.</p></>;
  };
  
  const accuracy = (score + misses) > 0 ? ((score / (score + misses)) * 100) : 0;
  
  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string; }> = ({ icon, label, value, colorClass }) => (
    <div className={`p-4 bg-gray-800/50 rounded-lg text-center flex flex-col items-center justify-center border-b-4 ${colorClass}`}>
      <div className="flex items-center justify-center space-x-2 mb-2">{icon}<span className="font-semibold text-brand-text-muted">{label}</span></div>
      <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
    </div>
  );

  if (gameState === 'config') {
    return (
       <div className="relative flex flex-col p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto w-full">
         <button onClick={onBack} className="absolute top-4 left-4 text-brand-text-muted hover:text-white p-2 rounded-full hover:bg-white/10" aria-label="Go back to home"><Home size={24} /></button>
          <div className="text-center mb-8">
            <Target size={48} className="text-brand-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Aim Trainer</h2>
            <p className="text-brand-text-muted">Select a scenario to warm up your aim.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Categories */}
            <div className="md:w-1/4 flex flex-row md:flex-col gap-2">
                {TRAINING_SCENARIOS.map(cat => (
                    <button key={cat.id} onClick={() => {setSelectedCategory(cat); setSelectedScenario(null);}} className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg font-semibold text-left transition-colors ${selectedCategory?.id === cat.id ? 'bg-brand-primary/20 text-brand-primary' : 'bg-gray-800/50 hover:bg-gray-700/70'}`}>
                        <div className="mr-3">{cat.icon}</div>
                        <span className="hidden md:inline">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Scenarios */}
            <div className="md:w-3/4 bg-gray-800/50 p-4 rounded-lg min-h-[200px]">
                <h3 className="text-xl font-bold mb-4 text-white">{selectedCategory?.name} Scenarios</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCategory?.scenarios.map(scen => (
                        <button key={scen.id} onClick={() => setSelectedScenario(scen)} className={`p-4 rounded-lg text-left transition-all border-2 ${selectedScenario?.id === scen.id ? 'bg-brand-secondary/20 border-brand-secondary' : 'bg-gray-900/50 hover:bg-gray-900 border-transparent hover:border-gray-600'}`}>
                            <p className="font-bold text-brand-text">{scen.name}</p>
                            <p className="text-sm text-brand-text-muted">{scen.description}</p>
                        </button>
                    ))}
                </div>
            </div>
          </div>
          
          <div className="mt-8 border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
             <div className="w-full sm:w-auto">
                <label htmlFor="duration" className="block text-sm font-medium text-brand-text-muted mb-2 flex items-center"><Clock size={16} className="mr-2 text-brand-primary" />Duration (seconds)</label>
                <input type="number" name="duration" id="duration" value={gameDuration} onChange={(e) => setGameDuration(Math.max(10, parseInt(e.target.value, 10)))} className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5" min="10" />
              </div>
              <button onClick={startGame} disabled={!selectedScenario} className="w-full sm:w-auto px-8 py-4 rounded-lg font-bold text-lg text-black bg-brand-primary hover:bg-cyan-400 transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"><Play size={20} /><span>Start Practice</span></button>
          </div>
       </div>
    );
  }

  if (gameState === 'playing') {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl flex justify-between items-center bg-black/30 p-2 rounded-t-lg text-lg z-20">
              <div className="font-bold">Score: <span className="text-brand-primary">{score}</span></div>
              <div className="font-bold">Misses: <span className="text-red-400">{misses}</span></div>
              <div className="font-bold">Time: <span className="text-yellow-400">{timeLeft}s</span></div>
            </div>
            <div 
              className="relative w-full h-[60vh] sm:h-[70vh] max-w-4xl bg-gray-800/50 rounded-b-xl border border-t-0 border-gray-700 cursor-crosshair overflow-hidden"
              ref={gameAreaRef} onClick={handleMissClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} tabIndex={0}
            >
              {targets.map(target => (
                <div
                  key={target.id}
                  className="bg-brand-primary rounded-full absolute cursor-pointer border-4 border-cyan-200 shadow-lg shadow-cyan-500/50"
                  style={{ top: `${target.y}px`, left: `${target.x}px`, width: `${target.size}px`, height: `${target.size}px` }}
                  onClick={(e) => handleTargetClick(e, target.id)}
                ></div>
              ))}
              {isMobileView && (
                <>
                  <div className="absolute w-10 h-10 pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2" style={{ filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.7))', top: crosshairPosition.y, left: crosshairPosition.x, visibility: crosshairPosition.x < 0 ? 'hidden' : 'visible' }}>
                      <div className="absolute top-1/2 left-0 w-full h-[3px] bg-white/90 -translate-y-1/2"></div>
                      <div className="absolute left-1/2 top-0 h-full w-[3px] bg-white/90 -translate-x-1/2"></div>
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white/90 rounded-full"></div>
                  </div>
                  <button onClick={handleFire} className="absolute bottom-6 right-6 w-24 h-24 bg-red-600/70 rounded-full border-4 border-red-400/80 flex items-center justify-center text-white font-bold z-20 active:bg-red-500 active:scale-95 transform transition-transform" aria-label="Fire">FIRE</button>
                </>
              )}
            </div>
        </div>
    );
  }
  
  if (gameState === 'finished') {
    return (
       <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto w-full">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Practice Complete!</h2>
          <p className="text-brand-text-muted mb-6">Scenario: <span className="font-semibold text-white">{selectedScenario?.name}</span></p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mb-8">
            <StatCard icon={<CheckCircle size={24} />} label="Score" value={score} colorClass="border-green-500" />
            <StatCard icon={<Target size={24} />} label="Accuracy" value={`${accuracy.toFixed(1)}%`} colorClass="border-brand-primary" />
            <StatCard icon={<Clock size={24} />} label="Avg. Time" value={`${(avgHitTime / 1000).toFixed(2)}s`} colorClass="border-yellow-500" />
            <StatCard icon={<XCircle size={24} />} label="Misses" value={misses} colorClass="border-red-500" />
            {!isMobileView && (<>
                <StatCard icon={<ChevronsRight size={24} />} label="Overshoots" value={overshoots} colorClass="border-purple-500" />
                <StatCard icon={<ChevronsLeft size={24} />} label="Undershoots" value={undershoots} colorClass="border-indigo-500" />
            </>)}
          </div>
          
          {!isMobileView && (
            <div className="w-full bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-600">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white flex items-center"><Bot size={24} className="mr-3 text-brand-secondary"/>Sensei's Suggestion</h3>
                    <button onClick={() => setShowSuggestion(!showSuggestion)} className="text-sm font-semibold text-brand-primary hover:underline">{showSuggestion ? 'Hide' : 'Analyze My Aim'}</button>
                </div>
                {showSuggestion && <div className="mt-4 pt-4 border-t border-gray-700 text-center text-brand-text-muted">{getSensitivitySuggestion()}</div>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={startGame} className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-primary/80 hover:bg-brand-primary transition-colors duration-300 flex items-center space-x-2 justify-center"><RefreshCw size={20} /><span>Play Again</span></button>
              <button onClick={() => setGameState('config')} className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-secondary/80 hover:bg-brand-secondary transition-colors duration-300 flex items-center space-x-2 justify-center"><Home size={20} /><span>Change Scenario</span></button>
          </div>
       </div>
    );
  }

  return null;
};

export default AimTrainer;
