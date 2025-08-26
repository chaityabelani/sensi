
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Timer, CheckCircle, XCircle, Home, Play, RefreshCw, Bot } from 'lucide-react';

interface TargetState {
  x: number;
  y: number;
  size: number;
  createdAt: number;
}

interface AimTrainerProps {
  onBack: () => void;
}

const AimTrainer: React.FC<AimTrainerProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'config' | 'playing' | 'finished'>('config');
  const [target, setTarget] = useState<TargetState | null>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [gameDuration, setGameDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [avgHitTime, setAvgHitTime] = useState(0);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [overshoots, setOvershoots] = useState(0);
  const [undershoots, setUndershoots] = useState(0);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);

  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    // Check if the game area has valid dimensions. If not, don't spawn.
    if (width === 0 || height === 0) return;

    const size = 50; // A standard medium-sized target.
    const newTarget: TargetState = {
      x: Math.random() * (width - size),
      y: Math.random() * (height - size),
      size,
      createdAt: Date.now(),
    };
    setTarget(newTarget);
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
    setTarget(null);
  };

  const startGame = () => {
    resetGameStats();
    setGameState('playing');
    // We want to ensure the game area is focused to capture any potential keyboard events in the future.
    gameAreaRef.current?.focus();
  };

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Calculate average time to hit a target.
    setAvgHitTime(hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0);
    setGameState('finished');
    setTarget(null); // Clear the target from the screen.
  }, [hitTimes]);

  // When the game starts, spawn the first target.
  useEffect(() => {
    if (gameState === 'playing' && target === null) {
      // A small delay gives the user a moment to prepare.
      const spawnTimeout = setTimeout(() => spawnTarget(), 300);
      return () => clearTimeout(spawnTimeout);
    }
  }, [gameState, target, spawnTarget]);

  // The main game timer.
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  // End the game when the timer reaches zero.
  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
      endGame();
    }
  }, [timeLeft, gameState, endGame]);

  const handleHit = () => {
    setScore(prev => prev + 1);
    // Record the time it took to hit this target since the last one appeared.
    setHitTimes(prev => [...prev, Date.now() - lastHitTimeRef.current]);
    spawnTarget(); // Spawn the next target immediately.
  };

  const handleTargetClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent this click from being registered as a "miss".
    handleHit();
  };
  
  const handleMissClick = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !gameAreaRef.current || !target) return;
    setMisses(prev => prev + 1);
    
    // Analyze if the miss was an overshoot or undershoot for the suggestion logic.
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - gameAreaRect.left;
    const targetCenterX = target.x + target.size / 2;

    if (clickX > targetCenterX) {
      setOvershoots(prev => prev + 1);
    } else {
      setUndershoots(prev => prev + 1);
    }
  };

  const accuracy = (score + misses) > 0 ? ((score / (score + misses)) * 100) : 0;

  const getSensitivitySuggestion = (): React.ReactNode => {
    const totalMisses = overshoots + undershoots;
    // We need a minimum number of misses to make a meaningful suggestion.
    if (totalMisses < 5) {
      return <p>Not enough miss data for a suggestion. Keep practicing!</p>;
    }
    const overshootRatio = overshoots / totalMisses;

    if (overshootRatio > 0.65) {
      return <><p className="mb-2">You're frequently <strong className="text-red-400">overshooting</strong> your targets.</p><p>This suggests your sensitivity might be too high. Try lowering your in-game sensitivity by <strong className="text-brand-primary">10-15%</strong> for better control.</p></>;
    }
    if (overshootRatio < 0.35) {
      return <><p className="mb-2">You're frequently <strong className="text-yellow-400">undershooting</strong> your targets.</p><p>This might mean your sensitivity is too low. Try increasing your in-game sensitivity by <strong className="text-brand-primary">5-10%</strong> to reach targets faster.</p></>;
    }
    return <><p className="mb-2">Your aim seems <strong className="text-green-400">balanced!</strong></p><p>Your current sensitivity seems to be a good fit. Focus on consistency.</p></>;
  };
  
  // Reusable UI component for displaying stats.
  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string; }> = ({ icon, label, value, colorClass }) => (
    <div className={`p-4 bg-gray-800/50 rounded-lg text-center flex flex-col items-center justify-center border-b-4 ${colorClass}`}>
      <div className="flex items-center justify-center space-x-2 mb-2">{icon}<span className="font-semibold text-brand-text-muted">{label}</span></div>
      <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
    </div>
  );

  // --- RENDER LOGIC ---

  if (gameState === 'config') {
    return (
      <div className="relative flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-lg mx-auto w-full">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-brand-text-muted hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          aria-label="Go back to home"
        >
          <Home size={24} />
        </button>
        <Target size={48} className="text-brand-primary mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Aim Trainer</h2>
        <p className="text-brand-text-muted mb-8">A simple drill to warm up your flicking.</p>

        <div className="w-full mb-8">
          <label htmlFor="duration" className="block text-sm font-medium text-brand-text-muted mb-2">Duration (seconds)</label>
          <select
            name="duration"
            id="duration"
            value={gameDuration}
            onChange={(e) => setGameDuration(parseInt(e.target.value, 10))}
            className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5"
          >
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
            <option value="90">90 seconds</option>
          </select>
        </div>

        <button onClick={startGame} className="w-full px-8 py-4 rounded-lg font-bold text-lg text-black bg-brand-primary hover:bg-cyan-400 transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105">
          <Play size={20} />
          <span>Start Practice</span>
        </button>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl flex justify-between items-center bg-black/30 p-2 rounded-t-lg text-lg z-10">
          <div className="font-bold">Score: <span className="text-brand-primary">{score}</span></div>
          <div className="font-bold">Misses: <span className="text-red-400">{misses}</span></div>
          <div className="font-bold">Time: <span className="text-yellow-400">{timeLeft}s</span></div>
        </div>
        <div
          className="relative w-full h-[60vh] sm:h-[70vh] max-w-4xl bg-gray-800/50 rounded-b-xl border border-t-0 border-gray-700 cursor-crosshair overflow-hidden"
          ref={gameAreaRef}
          onClick={handleMissClick}
          tabIndex={-1}
        >
          {target && (
            <div
              className="bg-brand-primary rounded-full absolute animate-pulse-target border-4 border-cyan-200 shadow-lg shadow-cyan-500/50"
              style={{
                top: `${target.y}px`,
                left: `${target.x}px`,
                width: `${target.size}px`,
                height: `${target.size}px`,
              }}
              onClick={handleTargetClick}
            ></div>
          )}
        </div>
      </div>
    );
  }
  
  if (gameState === 'finished') {
    return (
      <div className="relative flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-2xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Practice Complete!</h2>
        <p className="text-brand-text-muted mb-8">Here's your performance summary.</p>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 w-full mb-8">
            <StatCard icon={<CheckCircle size={24} />} label="Hits" value={score} colorClass="border-green-500" />
            <StatCard icon={<Target size={24} />} label="Accuracy" value={`${accuracy.toFixed(1)}%`} colorClass="border-brand-primary" />
            <StatCard icon={<Timer size={24} />} label="Avg. Time/Hit" value={`${(avgHitTime/1000).toFixed(2)}s`} colorClass="border-yellow-500" />
            <StatCard icon={<XCircle size={24} />} label="Misses" value={misses} colorClass="border-red-500" />
        </div>

        <div className="w-full bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-600">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white flex items-center"><Bot size={24} className="mr-3 text-brand-secondary"/>Sensei's Suggestion</h3>
                <button onClick={() => setShowSuggestion(!showSuggestion)} className="text-sm font-semibold text-brand-primary hover:underline">{showSuggestion ? 'Hide' : 'Analyze My Aim'}</button>
            </div>
            {showSuggestion && (
              <div className="mt-4 pt-4 border-t border-gray-700 text-center text-brand-text-muted">
                {getSensitivitySuggestion()}
              </div>
            )}
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button onClick={startGame} className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-primary/80 hover:bg-brand-primary transition-colors duration-300 flex items-center space-x-2 justify-center">
            <RefreshCw size={20} />
            <span>Play Again</span>
          </button>
          <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-secondary/80 hover:bg-brand-secondary transition-colors duration-300 flex items-center space-x-2 justify-center">
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
