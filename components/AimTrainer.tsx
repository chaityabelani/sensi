
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
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    };
  }, []);

  const handleTargetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHitTimes(prev => [...prev, Date.now() - lastSpawnTimeRef.current]);
    setScore(prev => prev + 1);
    spawnTarget();
  };

  const handleMissClick = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !gameAreaRef.current || targets.length === 0) return;

    setMisses(prev => prev + 1);

    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const gameCenterX = gameAreaRect.width / 2;
    const gameCenterY = gameAreaRect.height / 2;
    
    const clickX = e.clientX - gameAreaRect.left;
    const clickY = e.clientY - gameAreaRect.top;

    const currentTarget = targets[0];
    const targetCenterX = currentTarget.x + 25;
    const targetCenterY = currentTarget.y + 25;

    const distCenterToTarget = Math.hypot(targetCenterX - gameCenterX, targetCenterY - gameCenterY);
    const distCenterToClick = Math.hypot(clickX - gameCenterX, clickY - gameCenterY);

    if (distCenterToClick > distCenterToTarget) {
      setOvershoots(prev => prev + 1);
    } else {
      setUndershoots(prev => prev + 1);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
        setGameDuration(Math.max(10, Math.min(120, numValue)));
    } else if (value === '') {
        setGameDuration(10);
    }
  };
  
  const getSensitivitySuggestion = () => {
      const currentSens = parseFloat(sensitivity);
      if (isNaN(currentSens) || currentSens <= 0) {
          return (
              <div className="text-brand-text-muted">
                  Please enter your current sensitivity on the practice setup screen to get a suggestion.
              </div>
          );
      }

      const totalMisses = overshoots + undershoots;
      if (accuracyValue >= 98 || totalMisses < 2) {
           return (
              <div>
                  <h4 className="font-bold text-lg text-green-400">Excellent Control!</h4>
                  <p>Your accuracy is superb. Your current sensitivity of <strong className="text-white">{currentSens}</strong> seems to be working very well for you. No changes are recommended at this time.</p>
              </div>
          );
      }

      const overshootRatio = totalMisses > 0 ? overshoots / totalMisses : 0;
      let suggestion = '';
      let newSensLow = 0;
      let newSensHigh = 0;
      let title = '';
      let titleColor = 'text-white';

      if (overshootRatio > 0.6) {
          title = "Sensitivity May Be Too High";
          titleColor = "text-yellow-400";
          suggestion = `You're overshooting targets more than 60% of the time. This often means your sensitivity is too high, causing your crosshair to fly past your target.`;
          newSensLow = currentSens * 0.85;
          newSensHigh = currentSens * 0.95;
          suggestion += ` Consider lowering it by 5-15%.`;
      } else if (overshootRatio < 0.4) {
          title = "Sensitivity May Be Too Low";
          titleColor = "text-yellow-400";
          suggestion = `You're undershooting targets more than 60% of the time. This can happen if your sensitivity is too low, making it difficult to flick fast enough.`;
          newSensLow = currentSens * 1.05;
          newSensHigh = currentSens * 1.15;
          suggestion += ` Consider raising it by 5-15%.`;
      } else {
          title = "Aim Is Inconsistent";
          titleColor = "text-brand-primary";
          suggestion = `Your misses are a mix of overshooting and undershooting. This suggests your sensitivity might be in a good range, but your aim is inconsistent. Instead of a large sensitivity change, focus on smoothness drills.`;
          suggestion += ` If you do adjust, make only a very small change (1-3%) and stick with it to build muscle memory.`
      }
      
      return (
          <div>
              <h4 className={`font-bold text-lg ${titleColor}`}>{title}</h4>
              <p className="mt-2 text-brand-text-muted">{suggestion}</p>
               {(newSensLow > 0) &&
                  <p className="mt-4 font-semibold text-white">Suggested New Range: <span className="text-brand-secondary font-mono">{newSensLow.toFixed(3)} - {newSensHigh.toFixed(3)}</span></p>
              }
          </div>
      )
  };
  
  const accuracyValue = score + misses > 0 ? (score / (score + misses)) * 100 : 0;
  const accuracy = accuracyValue.toFixed(1);

  const renderIdleScreen = () => (
    <div className="text-center w-full">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Aim Trainer</h2>
      <p className="mt-4 text-lg leading-8 text-brand-text-muted">Click the targets as fast as you can.</p>
      
      <div className="mt-6 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-0 max-w-sm mx-auto">
        <div>
            <label htmlFor="sensitivity-idle" className="block text-sm font-medium text-brand-text-muted mb-2 flex items-center justify-center">
                <Target size={16} className="mr-2 text-brand-secondary" />
                Sensitivity
            </label>
            <input
                type="number"
                name="sensitivity"
                id="sensitivity-idle"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
                className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5 text-center"
                placeholder="e.g., 0.45"
                step="0.01"
            />
        </div>
        <div>
            <label htmlFor="duration" className="block text-sm font-medium text-brand-text-muted mb-2 flex items-center justify-center">
                <Timer size={16} className="mr-2 text-brand-secondary" />
                Duration (s)
            </label>
            <input
                type="number"
                name="duration"
                id="duration"
                value={gameDuration}
                onChange={handleDurationChange}
                className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5 text-center"
                min="10"
                max="120"
                step="5"
            />
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-center space-x-4 text-brand-text-muted">
        <div className="flex items-center"><Timer size={20} /><span>{gameDuration} Seconds</span></div>
        <div className="flex items-center"><MousePointerClick size={20} /><span>Click to Score</span></div>
      </div>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-y-4 sm:gap-y-0 sm:gap-x-6">
        <button
          onClick={startGame}
          className="flex items-center rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-black shadow-sm hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 w-full sm:w-auto justify-center"
        >
          <Play className="mr-2 h-5 w-5" />
          Start Practice
        </button>
        <button onClick={onBack} className="flex items-center text-sm font-semibold leading-6 text-white">
          <Home className="mr-2 h-5 w-5" />
          Back to Menu
        </button>
      </div>
    </div>
  );
  
  const renderFinishedScreen = () => (
    <div className="text-center w-full max-w-2xl mx-auto">
       <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Practice Complete!</h2>
       <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-brand-text-muted flex items-center justify-center"><CheckCircle size={14} className="mr-2" /> Score</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-semibold text-brand-primary">{score}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-brand-text-muted flex items-center justify-center"><Target size={14} className="mr-2" /> Accuracy</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-semibold text-brand-primary">{accuracy}%</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-brand-text-muted flex items-center justify-center"><Clock size={14} className="mr-2" /> Avg. Time</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-semibold text-brand-primary">
                    {avgHitTime > 0 ? (avgHitTime / 1000).toFixed(2) : '0.00'}s
                </p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-brand-text-muted flex items-center justify-center"><XCircle size={14} className="mr-2" /> Misses</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-semibold text-white">{misses}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-brand-text-muted flex items-center justify-center"><ChevronsRight size={14} className="mr-2 text-red-400" /> Overshoots</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-semibold text-white">{overshoots}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-brand-text-muted flex items-center justify-center"><ChevronsLeft size={14} className="mr-2 text-yellow-400" /> Undershoots</h3>
                <p className="mt-1 text-2xl sm:text-3xl font-semibold text-white">{undershoots}</p>
            </div>
       </div>

       <div className="mt-8 border-t border-gray-700 pt-6">
        {!showSuggestion && (
            <button 
                onClick={() => setShowSuggestion(true)}
                className="flex items-center justify-center mx-auto rounded-md bg-brand-secondary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
                <Bot className="mr-2 h-5 w-5" />
                Get Sensei's Suggestion
            </button>
        )}
        {showSuggestion && (
            <div className="bg-gray-800/50 p-6 rounded-lg text-left border border-brand-primary/30">
                {getSensitivitySuggestion()}
            </div>
        )}
       </div>

       <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-y-4 sm:gap-y-0 sm:gap-x-6">
        <button
          onClick={startGame}
          className="flex items-center justify-center rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold text-black shadow-sm hover:bg-cyan-400 w-full sm:w-auto"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Play Again
        </button>
        <button onClick={onBack} className="flex items-center text-sm font-semibold leading-6 text-white">
          <Home className="mr-2 h-5 w-5" />
          Back to Menu
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 w-full max-w-4xl h-[90vh] max-h-[500px] sm:max-h-[600px]">
      {gameState === 'playing' && (
        <>
            <div className="absolute top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-white bg-black/30 p-2 rounded-lg z-10 text-sm sm:text-base">
                <div className="flex items-center justify-around w-full sm:w-auto sm:space-x-4">
                    <div className="flex items-center"><CheckCircle size={18} className="mr-2 text-green-400" /> Score: {score}</div>
                    <div className="flex items-center"><XCircle size={18} className="mr-2 text-red-400" /> Misses: {misses}</div>
                </div>
                <div className="flex items-center font-mono sm:text-lg"><Timer size={18} className="mr-2 text-yellow-400"/> {timeLeft}s</div>
            </div>

            <div 
                ref={gameAreaRef} 
                className="relative w-full h-full cursor-crosshair rounded-lg overflow-hidden bg-gray-800/50"
                onClick={handleMissClick}
            >
                {targets.map(target => (
                <div
                    key={target.id}
                    className="absolute rounded-full bg-red-500 border-4 border-white flex items-center justify-center z-20 animate-pulse-target"
                    style={{
                        width: '50px',
                        height: '50px',
                        left: `${target.x}px`,
                        top: `${target.y}px`,
                    }}
                    onClick={handleTargetClick}
                >
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                ))}
            </div>
        </>
      )}

      {gameState === 'idle' && renderIdleScreen()}
      {gameState === 'finished' && renderFinishedScreen()}

    </div>
  );
};

export default AimTrainer;
