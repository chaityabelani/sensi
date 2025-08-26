
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Timer, CheckCircle, XCircle, Home, Play, RefreshCw, MousePointerClick, Clock, Bot, ChevronsRight, ChevronsLeft } from 'lucide-react';

interface TargetState {
  id: number;
  x: number;
  y: number;
}

interface AimTrainerProps {
  onBack: () => void;
}

const AimTrainer: React.FC<AimTrainerProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [targets, setTargets] = useState<TargetState[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [overshoots, setOvershoots] = useState(0);
  const [undershoots, setUndershoots] = useState(0);
  const [gameDuration, setGameDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [sensitivity, setSensitivity] = useState('');
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [avgHitTime, setAvgHitTime] = useState(0);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [crosshairPosition, setCrosshairPosition] = useState({ x: -100, y: -100 });

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);

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

  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const targetSize = 50;
    const newTarget = {
      id: Date.now(),
      x: Math.random() * (width - targetSize),
      y: Math.random() * (height - targetSize),
    };

    setTargets([newTarget]);
    lastSpawnTimeRef.current = Date.now();
  }, []);

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    
    setAvgHitTime(hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0);

    setGameState('finished');
    setTargets([]);
  }, [hitTimes]);

  const startGame = () => {
    setScore(0);
    setMisses(0);
    setOvershoots(0);
    setUndershoots(0);
    setTimeLeft(gameDuration);
    setHitTimes([]);
    setAvgHitTime(0);
    setShowSuggestion(false);
    setGameState('playing');
    if (isMobileView && gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setCrosshairPosition({ x: rect.width / 2, y: rect.height / 2 });
    }
    gameAreaRef.current?.focus();
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      spawnTimeoutRef.current = window.setTimeout(spawnTarget, 100);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      };
    }
  }, [gameState, spawnTarget]);

  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
      endGame();
    }
  }, [timeLeft, gameState, endGame]);

  const handleTargetClick = (e: React.MouseEvent) => {
    if (isMobileView) return;
    e.stopPropagation();
    setHitTimes(prev => [...prev, Date.now() - lastSpawnTimeRef.current]);
    setScore(prev => prev + 1);
    spawnTarget();
  };

  const handleMissClick = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !gameAreaRef.current || targets.length === 0 || isMobileView) return;
    setMisses(prev => prev + 1);

    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - gameAreaRect.left;
    const clickY = e.clientY - gameAreaRect.top;

    const currentTarget = targets[0];
    const targetSize = 50;
    const targetCenterX = currentTarget.x + targetSize / 2;
    const targetCenterY = currentTarget.y + targetSize / 2;
    
    const screenCenterX = gameAreaRect.width / 2;
    const screenCenterY = gameAreaRect.height / 2;

    const distCenterToTarget = Math.hypot(targetCenterX - screenCenterX, targetCenterY - screenCenterY);
    const distCenterToClick = Math.hypot(clickX - screenCenterX, clickY - screenCenterY);

    if (distCenterToClick > distCenterToTarget) {
      setOvershoots(prev => prev + 1);
    } else {
      setUndershoots(prev => prev + 1);
    }
  };

  const updateCrosshairPosition = (e: React.TouchEvent) => {
    if (e.touches.length < 1 || !gameAreaRef.current) return;
    const touch = e.touches[0];
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setCrosshairPosition({ 
        x: Math.max(0, Math.min(x, rect.width)), 
        y: Math.max(0, Math.min(y, rect.height)) 
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if(gameState !== 'playing') return;
    updateCrosshairPosition(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if(gameState !== 'playing') return;
    updateCrosshairPosition(e);
  };
  
  const handleFire = () => {
    if (gameState !== 'playing' || !gameAreaRef.current || targets.length === 0) return;
    
    const target = targets[0];
    const targetSize = 50;
    const targetRadius = targetSize / 2;

    const targetCenterX = target.x + targetRadius;
    const targetCenterY = target.y + targetRadius;

    const distance = Math.hypot(crosshairPosition.x - targetCenterX, crosshairPosition.y - targetCenterY);

    if (distance <= targetRadius) {
        if ('vibrate' in navigator) navigator.vibrate(50); // Haptic for hit
        setHitTimes(prev => [...prev, Date.now() - lastSpawnTimeRef.current]);
        setScore(prev => prev + 1);
        spawnTarget();
    } else {
        if ('vibrate' in navigator) navigator.vibrate([75, 50, 75]); // Haptic for miss
        setMisses(prev => prev + 1);
    }
  }

  const getSensitivitySuggestion = (): React.ReactNode => {
    const totalMisses = overshoots + undershoots;
    if (totalMisses < 5) {
      return <p>Not enough miss data for a suggestion. Keep practicing!</p>;
    }
    const overshootRatio = overshoots / totalMisses;

    if (overshootRatio > 0.65) {
      return (
        <>
          <p className="mb-2">You're frequently <strong className="text-red-400">overshooting</strong> your targets.</p>
          <p>This suggests your sensitivity might be too high. Try lowering it by <strong className="text-brand-primary">10-15%</strong> for better control.</p>
        </>
      );
    }
    if (overshootRatio < 0.35) {
      return (
        <>
          <p className="mb-2">You're frequently <strong className="text-yellow-400">undershooting</strong> your targets.</p>
          <p>This suggests your sensitivity might be too low. Try increasing it by <strong className="text-brand-primary">5-10%</strong> to reach targets faster.</p>
        </>
      );
    }
    return (
      <>
        <p className="mb-2">Your aim seems <strong className="text-green-400">balanced!</strong></p>
        <p>Your misses are a healthy mix of over and undershooting. This sensitivity seems to be a good fit. Focus on consistency.</p>
      </>
    );
  };
  
  const accuracy = (score + misses) > 0 ? ((score / (score + misses)) * 100) : 0;
  
  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string; }> = ({ icon, label, value, colorClass }) => (
    <div className={`p-4 bg-gray-800/50 rounded-lg text-center flex flex-col items-center justify-center border-b-4 ${colorClass}`}>
      <div className="flex items-center justify-center space-x-2 mb-2">
        {icon}
        <span className="font-semibold text-brand-text-muted">{label}</span>
      </div>
      <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
    </div>
  );

  if (gameState === 'idle') {
    return (
       <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-2xl mx-auto w-full">
         <button
            onClick={onBack}
            className="absolute top-4 left-4 text-brand-text-muted hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            aria-label="Go back to home"
          >
            <Home size={24} />
          </button>
          <Target size={48} className="text-brand-primary mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Aim Trainer</h2>
          <p className="text-brand-text-muted text-center mb-8">Warm up your aim before you play.</p>
          
          <div className="w-full max-w-sm space-y-4 sm:space-y-0 sm:flex sm:space-x-4 mb-8">
             {!isMobileView && (
              <div className="w-full">
                <label htmlFor="sensitivity" className="block text-sm font-medium text-brand-text-muted mb-2 flex items-center">
                    <MousePointerClick size={16} className="mr-2 text-brand-secondary" />
                    Sensitivity (Optional)
                </label>
                <input
                    type="number"
                    name="sensitivity"
                    id="sensitivity"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(e.target.value)}
                    className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5"
                    placeholder="For analysis"
                    step="0.01"
                />
              </div>
             )}
              <div className="w-full">
                <label htmlFor="duration" className="block text-sm font-medium text-brand-text-muted mb-2 flex items-center">
                    <Clock size={16} className="mr-2 text-brand-primary" />
                    Duration (seconds)
                </label>
                <input
                    type="number"
                    name="duration"
                    id="duration"
                    value={gameDuration}
                    onChange={(e) => setGameDuration(Math.max(10, parseInt(e.target.value, 10)))}
                    className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5"
                    min="10"
                />
              </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 rounded-lg font-bold text-lg text-black bg-brand-primary hover:bg-cyan-400 transition-all duration-300 flex items-center space-x-2 transform hover:scale-105"
          >
            <Play size={20} />
            <span>Start Practice</span>
          </button>
       </div>
    );
  }

  if (gameState === 'playing') {
    return (
        <div 
          className="relative w-full h-[60vh] sm:h-[70vh] max-w-4xl bg-gray-800/50 rounded-xl border border-gray-700 cursor-crosshair overflow-hidden"
          ref={gameAreaRef}
          onClick={handleMissClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          tabIndex={0}
        >
          <div className="absolute top-2 left-2 right-2 flex flex-col sm:flex-row justify-between items-center bg-black/30 p-2 rounded-lg text-lg z-20">
              <div className="font-bold">Score: <span className="text-brand-primary">{score}</span></div>
              <div className="font-bold">Misses: <span className="text-red-400">{misses}</span></div>
              <div className="font-bold">Time: <span className="text-yellow-400">{timeLeft}s</span></div>
          </div>
          
          {targets.map(target => (
            <div
              key={target.id}
              className="w-[50px] h-[50px] bg-brand-primary rounded-full absolute cursor-pointer animate-pulse-target border-4 border-cyan-200 shadow-lg shadow-cyan-500/50"
              style={{
                top: `${target.y}px`,
                left: `${target.x}px`,
              }}
              onClick={handleTargetClick}
            ></div>
          ))}

          {isMobileView && (
            <>
              <div 
                className="absolute w-10 h-10 pointer-events-none z-10 -translate-x-1/2 -translate-y-1/2" 
                style={{ 
                    filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.7))',
                    top: crosshairPosition.y,
                    left: crosshairPosition.x,
                    visibility: crosshairPosition.x < 0 ? 'hidden' : 'visible'
                }}
              >
                  <div className="absolute top-1/2 left-0 w-full h-[3px] bg-white/90 -translate-y-1/2"></div>
                  <div className="absolute left-1/2 top-0 h-full w-[3px] bg-white/90 -translate-x-1/2"></div>
                  <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white/90 rounded-full"></div>
              </div>

              <button
                onClick={handleFire}
                className="absolute bottom-6 right-6 w-24 h-24 bg-red-600/70 rounded-full border-4 border-red-400/80 flex items-center justify-center text-white font-bold z-20 active:bg-red-500 active:scale-95 transform transition-transform"
                aria-label="Fire"
              >
                FIRE
              </button>
            </>
          )}
        </div>
    );
  }
  
  if (gameState === 'finished') {
    return (
       <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto w-full">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Practice Complete!</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mb-8">
            <StatCard icon={<CheckCircle size={24} />} label="Score" value={score} colorClass="border-green-500" />
            <StatCard icon={<Target size={24} />} label="Accuracy" value={`${accuracy.toFixed(1)}%`} colorClass="border-brand-primary" />
            <StatCard icon={<Clock size={24} />} label="Avg. Time" value={`${(avgHitTime / 1000).toFixed(2)}s`} colorClass="border-yellow-500" />
            <StatCard icon={<XCircle size={24} />} label="Misses" value={misses} colorClass="border-red-500" />
            {!isMobileView && (
              <>
                <StatCard icon={<ChevronsRight size={24} />} label="Overshoots" value={overshoots} colorClass="border-purple-500" />
                <StatCard icon={<ChevronsLeft size={24} />} label="Undershoots" value={undershoots} colorClass="border-indigo-500" />
              </>
            )}
          </div>
          
          {!isMobileView && (
            <div className="w-full bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-600">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white flex items-center"><Bot size={24} className="mr-3 text-brand-secondary"/>Sensei's Suggestion</h3>
                    <button 
                        onClick={() => setShowSuggestion(!showSuggestion)}
                        className="text-sm font-semibold text-brand-primary hover:underline"
                    >
                      {showSuggestion ? 'Hide' : 'Analyze My Aim'}
                    </button>
                </div>
                {showSuggestion && (
                    <div className="mt-4 pt-4 border-t border-gray-700 text-center text-brand-text-muted">
                        {getSensitivitySuggestion()}
                    </div>
                )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-primary/80 hover:bg-brand-primary transition-colors duration-300 flex items-center space-x-2 justify-center"
              >
                <RefreshCw size={20} />
                <span>Play Again</span>
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-secondary/80 hover:bg-brand-secondary transition-colors duration-300 flex items-center space-x-2 justify-center"
              >
                <Home size={20} />
                <span>Return to Home</span>
              </button>
          </div>
       </div>
    );
  }

  return null;
};

export default AimTrainer;
