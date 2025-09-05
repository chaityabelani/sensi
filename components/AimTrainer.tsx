

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Timer, CheckCircle, XCircle, Home, Play, RefreshCw, Bot, MousePointerClick } from 'lucide-react';
import HitTimeChart from './HitTimeChart';
import MissScatterPlot from './MissScatterPlot';

interface TargetState {
  x: number;
  y: number;
  size: number;
  createdAt: number;
  dx: number;
  dy: number;
}

interface MissData {
    offsetX: number;
    offsetY: number;
}

interface FeedbackAnim {
    x: number;
    y: number;
    id: number;
    type: 'hit' | 'miss';
}

interface AimTrainerProps {
  onBack: () => void;
}

const AimTrainer: React.FC<AimTrainerProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<'config' | 'playing' | 'finished'>('config');
  const [gameMode, setGameMode] = useState<'classic' | 'recoil'>('classic');
  const [target, setTarget] = useState<TargetState | null>(null);
  
  // Classic Mode State
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [avgHitTime, setAvgHitTime] = useState(0);
  const [missClicks, setMissClicks] = useState<MissData[]>([]);
  
  // Recoil Mode State
  const [isFiring, setIsFiring] = useState(false);
  const [timeOnTarget, setTimeOnTarget] = useState(0);
  const [totalFiringTime, setTotalFiringTime] = useState(0);
  const [recoilControl, setRecoilControl] = useState(0);

  // Shared State
  const [gameDuration, setGameDuration] = useState(30);
  const [targetSize, setTargetSize] = useState(50);
  const [targetSpeed, setTargetSpeed] = useState<'stationary' | 'slow' | 'medium' | 'fast'>('stationary');
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [overshoots, setOvershoots] = useState(0);
  const [undershoots, setUndershoots] = useState(0);
  const [isTargetHit, setIsTargetHit] = useState(false);
  const [feedbackAnims, setFeedbackAnims] = useState<FeedbackAnim[]>([]);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);

  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const getSpeedValue = () => {
        switch (targetSpeed) {
            case 'slow': return 1.5;
            case 'medium': return 3;
            case 'fast': return 5;
            default: return 0;
        }
    };
    const speed = getSpeedValue();
    let dx = 0;
    let dy = 0;

    if (speed > 0) {
        const angle = Math.random() * 2 * Math.PI;
        dx = Math.cos(angle) * speed;
        dy = Math.sin(angle) * speed;
    }

    const newTarget: TargetState = {
      x: Math.random() * (width - targetSize),
      y: Math.random() * (height - targetSize),
      size: targetSize,
      createdAt: Date.now(),
      dx,
      dy,
    };
    setTarget(newTarget);
    lastHitTimeRef.current = Date.now();
  }, [targetSize, targetSpeed]);

  const spawnRecoilTarget = useCallback(() => {
    if (!gameAreaRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    setTarget({
        x: (width - targetSize) / 2,
        y: (height - targetSize) / 2,
        size: targetSize,
        createdAt: Date.now(),
        dx: 0,
        dy: 0,
    });
  }, [targetSize]);


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
    setMissClicks([]);
    setFeedbackAnims([]);
    setIsTargetHit(false);
    setIsFiring(false);
    setTimeOnTarget(0);
    setTotalFiringTime(0);
    setRecoilControl(0);
  };

  const startGame = () => {
    resetGameStats();
    setGameState('playing');
  };

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Classic mode results
    setAvgHitTime(hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0);
    // Recoil mode results
    setRecoilControl(totalFiringTime > 0 ? (timeOnTarget / totalFiringTime) * 100 : 0);
    setGameState('finished');
    setTarget(null);
    setIsFiring(false);
  }, [hitTimes, timeOnTarget, totalFiringTime]);

  useEffect(() => {
      const gameLoop = (timestamp: number) => {
          if (lastFrameTimeRef.current === 0) {
              lastFrameTimeRef.current = timestamp;
          }
          const deltaTime = timestamp - lastFrameTimeRef.current;
          lastFrameTimeRef.current = timestamp;

          if (gameState !== 'playing') return;

          setTarget(currentTarget => {
              if (!currentTarget || !gameAreaRef.current) return currentTarget;

              // --- Classic Mode Target Movement ---
              if (gameMode === 'classic' && targetSpeed !== 'stationary') {
                  const { width, height } = gameAreaRef.current.getBoundingClientRect();
                  let newX = currentTarget.x + currentTarget.dx;
                  let newY = currentTarget.y + currentTarget.dy;
                  let newDx = currentTarget.dx;
                  let newDy = currentTarget.dy;

                  if (newX <= 0 || newX + currentTarget.size >= width) {
                      newDx = -newDx;
                      newX = Math.max(0, Math.min(newX, width - currentTarget.size));
                  }
                  if (newY <= 0 || newY + currentTarget.size >= height) {
                      newDy = -newDy;
                      newY = Math.max(0, Math.min(newY, height - currentTarget.size));
                  }
                  return { ...currentTarget, x: newX, y: newY, dx: newDx, dy: newDy };
              }

              // --- Recoil Mode Target Movement ---
              if (gameMode === 'recoil' && isFiring) {
                  const recoilStrength = 2.5; // Pixels per frame at 60fps
                  const jitter = 1.5;
                  
                  // Scale movement by delta time to ensure consistent speed across different frame rates
                  const movementScale = deltaTime / (1000 / 60); // 16.67ms per frame at 60fps
                  
                  const dy = -recoilStrength * movementScale;
                  const dx = (Math.random() - 0.5) * jitter * movementScale;
                  
                  const newY = Math.max(0, currentTarget.y + dy);
                  const newX = currentTarget.x + dx;

                  // Check if cursor is on target
                  const { x: mouseX, y: mouseY } = mousePosRef.current;
                  const targetCenterX = newX + currentTarget.size / 2;
                  const targetCenterY = newY + currentTarget.size / 2;
                  const distance = Math.sqrt(Math.pow(mouseX - targetCenterX, 2) + Math.pow(mouseY - targetCenterY, 2));
                  
                  if (distance < currentTarget.size / 2) {
                      setTimeOnTarget(prev => prev + deltaTime);
                  }
                  setTotalFiringTime(prev => prev + deltaTime);

                  return { ...currentTarget, x: newX, y: newY, dx: currentTarget.dx, dy: currentTarget.dy };
              }

              return currentTarget;
          });
          animationFrameRef.current = requestAnimationFrame(gameLoop);
      };

      if (gameState === 'playing') {
          animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
      }
      return () => {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          lastFrameTimeRef.current = 0;
      };
  }, [gameState, gameMode, targetSpeed, isFiring]);
  
    // This effect handles setup when the 'playing' state begins.
  useEffect(() => {
    if (gameState === 'playing') {
      gameAreaRef.current?.focus();
      
      // Spawn initial target for recoil mode.
      if (gameMode === 'recoil') {
        spawnRecoilTarget();
      }
    }
  }, [gameState, gameMode, spawnRecoilTarget]);


  useEffect(() => {
    if (gameState === 'playing' && target === null && timeLeft > 0 && gameMode === 'classic') {
      const spawnTimeout = setTimeout(() => spawnTarget(), 300);
      return () => clearTimeout(spawnTimeout);
    }
  }, [gameState, target, spawnTarget, timeLeft, gameMode]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  useEffect(() => {
    if (timeLeft <= 0 && gameState === 'playing') {
      endGame();
    }
  }, [timeLeft, gameState, endGame]);
  
  const addFeedback = (x: number, y: number, type: 'hit' | 'miss') => {
    const newFeedback = { x, y, type, id: Date.now() };
    setFeedbackAnims(prev => [...prev, newFeedback]);
    setTimeout(() => {
        setFeedbackAnims(prev => prev.filter(f => f.id !== newFeedback.id));
    }, 400);
  };

  const handleHit = () => {
    setIsTargetHit(true);
    setScore(prev => prev + 1);
    setHitTimes(prev => [...prev, Date.now() - lastHitTimeRef.current]);

    setTimeout(() => {
        setIsTargetHit(false);
        if (timeLeft > 0) {
            spawnTarget();
        }
    }, 200);
  };

  const handleTargetClick = (e: React.MouseEvent) => {
    if (gameMode !== 'classic' || isTargetHit || !target) return;
    e.stopPropagation();
    addFeedback(target.x + target.size / 2, target.y + target.size / 2, 'hit');
    handleHit();
  };
  
  const handleMissClick = (e: React.MouseEvent) => {
    if (gameMode !== 'classic' || gameState !== 'playing' || !gameAreaRef.current || !target || isTargetHit) return;
    setMisses(prev => prev + 1);
    
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - gameAreaRect.left;
    const clickY = e.clientY - gameAreaRect.top;
    
    addFeedback(clickX, clickY, 'miss');
    
    const targetCenterX = target.x + target.size / 2;
    const targetCenterY = target.y + target.size / 2;
    
    setMissClicks(prev => [...prev, {
      offsetX: clickX - targetCenterX,
      offsetY: clickY - targetCenterY
    }]);

    if (clickX > targetCenterX) {
      setOvershoots(prev => prev + 1);
    } else {
      setUndershoots(prev => prev + 1);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
      if (!gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (gameMode !== 'recoil' || !target || gameState !== 'playing') return;
      // Also trigger miss for recoil mode to track total clicks
      if (gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const clickX = e.clientX - gameAreaRect.left;
        const clickY = e.clientY - gameAreaRect.top;
        const targetCenterX = target.x + target.size / 2;
        const targetCenterY = target.y + target.size / 2;
        const distance = Math.sqrt(Math.pow(clickX - targetCenterX, 2) + Math.pow(clickY - targetCenterY, 2));

        if (distance < target.size / 2) {
            e.preventDefault();
            setIsFiring(true);
        }
      }
  };

  const handleMouseUp = () => {
      if (gameMode === 'recoil') setIsFiring(false);
  };
  
  const handleMouseLeave = () => {
      if (gameMode === 'recoil') setIsFiring(false);
  };

  const accuracy = (score + misses) > 0 ? ((score / (score + misses)) * 100) : 0;

  const getSensitivitySuggestion = (): React.ReactNode => {
    const totalMisses = overshoots + undershoots;
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
  
  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string; }> = ({ icon, label, value, colorClass }) => (
    <div className={`p-4 bg-gray-800/50 rounded-lg text-center flex flex-col items-center justify-center border-b-4 ${colorClass}`}>
      <div className="flex items-center justify-center space-x-2 mb-2">{icon}<span className="font-semibold text-sm text-brand-text-muted">{label}</span></div>
      <span className="text-2xl font-bold text-white">{value}</span>
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
        <p className="text-brand-text-muted mb-8">Customize your drill and warm up.</p>

        <div className="w-full mb-6">
          <label htmlFor="gameMode" className="block text-sm font-medium text-brand-text-muted mb-2">Game Mode</label>
          <select
            id="gameMode"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as 'classic' | 'recoil')}
            className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5"
          >
            <option value="classic">Classic</option>
            <option value="recoil">Recoil Control</option>
          </select>
        </div>

        <div className="w-full mb-6">
          <label htmlFor="duration" className="block text-sm font-medium text-brand-text-muted mb-2">Duration (seconds)</label>
          <select
            id="duration"
            value={gameDuration}
            onChange={(e) => {
                const newDuration = parseInt(e.target.value, 10);
                setGameDuration(newDuration);
                setTimeLeft(newDuration);
            }}
            className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5"
          >
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
            <option value="90">90 seconds</option>
          </select>
        </div>
        
        <div className="w-full mb-6">
          <label htmlFor="targetSize" className="block text-sm font-medium text-brand-text-muted mb-2">Target Size ({targetSize}px)</label>
          <input
            type="range"
            id="targetSize"
            min="20"
            max="80"
            value={targetSize}
            onChange={(e) => setTargetSize(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="w-full mb-8">
          <label htmlFor="targetSpeed" className="block text-sm font-medium text-brand-text-muted mb-2">Target Movement</label>
          <select
            id="targetSpeed"
            value={targetSpeed}
            disabled={gameMode === 'recoil'}
            onChange={(e) => setTargetSpeed(e.target.value as 'stationary' | 'slow' | 'medium' | 'fast')}
            className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="stationary">Stationary</option>
            <option value="slow">Slow</option>
            <option value="medium">Medium</option>
            <option value="fast">Fast</option>
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
        <div className="w-full max-w-4xl flex justify-between items-center bg-black/30 p-3 rounded-t-lg z-10">
            <div className="font-bold text-xl w-1/3 text-left">
                {gameMode === 'classic' ? `Score: ${score}` : 'Recoil Control'}
            </div>
            <div className={`font-bold text-4xl transition-all duration-300 w-1/3 text-center ${timeLeft <= 5 && timeLeft > 0 ? 'text-red-500 scale-110 animate-pulse' : 'text-yellow-400'}`}>
                {timeLeft}
            </div>
            <div className="font-bold text-xl w-1/3 text-right">
                {gameMode === 'classic' ? `Misses: ${misses}` : `${((totalFiringTime > 0 ? timeOnTarget / totalFiringTime : 0) * 100).toFixed(0)}%`}
            </div>
        </div>
        <div
          className="relative w-full h-[60vh] sm:h-[70vh] max-w-4xl bg-gray-800/50 rounded-b-xl border border-t-0 border-gray-700 cursor-crosshair overflow-hidden"
          ref={gameAreaRef}
          onClick={handleMissClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          tabIndex={-1}
        >
          {target && (
            <div
              className={`bg-brand-primary rounded-full absolute border-4 border-cyan-200 shadow-lg shadow-cyan-500/50 
              ${isTargetHit ? 'animate-destroy-target' : gameMode === 'classic' ? 'animate-spawn-target' : ''} 
              ${gameMode === 'classic' && targetSpeed === 'stationary' ? 'animate-pulse-target' : ''}
              ${isFiring ? 'ring-4 ring-red-500' : ''}`}
              style={{
                top: `${target.y}px`,
                left: `${target.x}px`,
                width: `${target.size}px`,
                height: `${target.size}px`,
                willChange: 'transform, top, left',
              }}
              onClick={handleTargetClick}
            ></div>
          )}
          {gameMode === 'recoil' && !isFiring && timeLeft > 0 &&
            <div className="absolute inset-0 flex items-center justify-center text-white text-lg pointer-events-none">
              <p className="bg-black/50 p-3 rounded-lg">Click and hold the target to begin</p>
            </div>
          }
          {feedbackAnims.map(anim => {
              if (anim.type === 'miss') {
                  return <div key={anim.id} className="absolute w-8 h-8 rounded-full border-red-500 animate-miss-feedback" style={{ top: anim.y - 16, left: anim.x - 16, pointerEvents: 'none' }}></div>;
              }
              if (anim.type === 'hit') {
                  return (
                     <div key={anim.id} className="absolute w-6 h-6 animate-hit-feedback" style={{ top: anim.y - 12, left: anim.x - 12, pointerEvents: 'none' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="3">
                            <path d="M12 5V19" />
                            <path d="M5 12H19" />
                        </svg>
                     </div>
                  );
              }
              return null;
          })}
        </div>
      </div>
    );
  }
  
  if (gameState === 'finished') {
    return (
      <div className="relative flex flex-col items-center p-4 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Practice Complete!</h2>
        <p className="text-brand-text-muted mb-8">Here's your performance summary for {gameMode === 'classic' ? 'Classic' : 'Recoil Control'} mode.</p>

        {gameMode === 'classic' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
                <div className="md:col-span-1 p-6 bg-brand-primary/10 rounded-lg text-center flex flex-col items-center justify-center border-2 border-brand-primary shadow-lg shadow-brand-primary/10 order-first md:order-none">
                    <div className="flex items-center justify-center space-x-2 mb-2 text-brand-primary"><Target size={24} /><span className="font-semibold text-lg">Accuracy</span></div>
                    <span className="text-5xl font-bold text-white">{`${accuracy.toFixed(1)}%`}</span>
                </div>
                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <StatCard icon={<CheckCircle size={20} />} label="Hits" value={score} colorClass="border-green-500" />
                    <StatCard icon={<Timer size={20} />} label="Avg. Time/Hit" value={`${(avgHitTime/1000).toFixed(2)}s`} colorClass="border-yellow-500" />
                    <StatCard icon={<XCircle size={20} />} label="Misses" value={misses} colorClass="border-red-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-8">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 min-h-[300px]">
                    <HitTimeChart hitTimes={hitTimes} avgHitTime={avgHitTime} />
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 min-h-[300px]">
                    <MissScatterPlot misses={missClicks} targetSize={targetSize} />
                </div>
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
        </>
        ) : (
        <div className="w-full max-w-sm text-center mb-8">
            <div className="p-6 bg-brand-primary/10 rounded-lg text-center flex flex-col items-center justify-center border-2 border-brand-primary shadow-lg shadow-brand-primary/10">
                <div className="flex items-center justify-center space-x-2 mb-2 text-brand-primary"><MousePointerClick size={24} /><span className="font-semibold text-lg">Recoil Control</span></div>
                <span className="text-5xl font-bold text-white">{`${recoilControl.toFixed(1)}%`}</span>
                 <p className="text-brand-text-muted text-sm mt-2">
                    This is the percentage of time your cursor was on target while firing.
                 </p>
            </div>
        </div>
        )}

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