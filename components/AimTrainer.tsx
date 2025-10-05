

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Timer, CheckCircle, XCircle, Home, Play, RefreshCw, Bot, MousePointerClick, Settings2 } from 'lucide-react';
import HitTimeChart from './HitTimeChart';
import MissScatterPlot from './MissScatterPlot';
import HitTimeDistributionChart from './HitTimeDistributionChart';
import RecoilPatternDisplay from './RecoilPatternDisplay';

interface TargetState {
  x: number;
  y: number;
  size: number;
  createdAt: number;
  dx: number; // velocity x
  dy: number; // velocity y
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
  const [gameMode, setGameMode] = useState<'classic' | 'recoil' | 'rotate'>('classic');
  
  // --- Game Config State ---
  const [gameDuration, setGameDuration] = useState(30);
  const [targetSize, setTargetSize] = useState(50);
  const [targetSpeed, setTargetSpeed] = useState<'stationary' | 'slow' | 'medium' | 'fast'>('stationary');
  
  // --- Shared Gameplay State ---
  const [target, setTarget] = useState<TargetState | null>(null);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [feedbackAnims, setFeedbackAnims] = useState<FeedbackAnim[]>([]);

  // --- Classic Mode State ---
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hitTimes, setHitTimes] = useState<number[]>([]);
  const [missClicks, setMissClicks] = useState<MissData[]>([]);
  const [isTargetHit, setIsTargetHit] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [overshoots, setOvershoots] = useState(0);
  const [undershoots, setUndershoots] = useState(0);
  const lastHitTimeRef = useRef<number>(0);

  // --- Recoil Mode State ---
  const [isFiring, setIsFiring] = useState(false);
  const [timeOnTarget, setTimeOnTarget] = useState(0);
  const [totalFiringTime, setTotalFiringTime] = useState(0);
  const [recoilPattern, setRecoilPattern] = useState<{x: number, y: number}[]>([]);
  const directionChangeTimerRef = useRef<number | null>(null);

  // --- Rotate Mode State ---
  const [crosshairPos, setCrosshairPos] = useState({ x: 0, y: 0 });
  const isAimingRef = useRef(false);
  const lastAimPosRef = useRef({ x: 0, y: 0 });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [fireButtonConfig, setFireButtonConfig] = useState({
    size: 80, // px
    bottom: 20, // px
    right: 20, // px
  });


  // --- Refs ---
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const recoilOffsetRef = useRef({ x: 0, y: 0 });
  const recoilPatternRef = useRef<{x: number, y: number}[]>([]);
  const recoilFrameCounterRef = useRef(0);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const isDraggingButtonRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartButtonPosRef = useRef({ bottom: 0, right: 0 });


  const getSpeedValue = useCallback(() => {
    switch (targetSpeed) {
        case 'slow': return 1.5;
        case 'medium': return 3;
        case 'fast': return 5;
        default: return 0;
    }
  }, [targetSpeed]);

  const cleanupTimers = useCallback(() => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (directionChangeTimerRef.current) clearTimeout(directionChangeTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      countdownTimerRef.current = null;
      directionChangeTimerRef.current = null;
      animationFrameRef.current = null;
  }, []);
  
  const changeTargetDirection = useCallback(() => {
    if (gameState !== 'playing' || gameMode !== 'recoil') return;

    setTarget(currentTarget => {
        if (!currentTarget) return null;
        const speed = getSpeedValue();
        if (speed === 0) return { ...currentTarget, dx: 0, dy: 0 };

        const angle = Math.random() * 2 * Math.PI;
        return {
            ...currentTarget,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
        };
    });
    
    const nextChangeInterval = Math.random() * 2000 + 1000; // 1-3 seconds
    if (directionChangeTimerRef.current) clearTimeout(directionChangeTimerRef.current);
    directionChangeTimerRef.current = window.setTimeout(changeTargetDirection, nextChangeInterval);
  }, [getSpeedValue, gameState, gameMode]);

  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current) return;
    const { width, height } = gameAreaRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const isRecoil = gameMode === 'recoil';
    const speed = getSpeedValue();
    let dx = 0, dy = 0;

    if (speed > 0 && !isRecoil) { // Recoil mode handles velocity via changeTargetDirection
        const angle = Math.random() * 2 * Math.PI;
        dx = Math.cos(angle) * speed;
        dy = Math.sin(angle) * speed;
    }

    const newX = isRecoil ? (width - targetSize) / 2 : Math.random() * (width - targetSize);
    const newY = isRecoil ? (height - targetSize) / 2 : Math.random() * (height - targetSize);

    setTarget({ x: newX, y: newY, size: targetSize, createdAt: Date.now(), dx, dy });
    
    if (isRecoil) {
        changeTargetDirection();
    } else {
      lastHitTimeRef.current = Date.now();
    }
  }, [gameMode, targetSize, getSpeedValue, changeTargetDirection]);

  const resetGameStats = useCallback(() => {
    setScore(0);
    setMisses(0);
    setHitTimes([]);
    setMissClicks([]);
    setIsTargetHit(false);
    setShowSuggestion(false);
    setOvershoots(0);
    setUndershoots(0);
    setIsFiring(false);
    setTimeOnTarget(0);
    setTotalFiringTime(0);
    setTimeLeft(gameDuration);
    setTarget(null);
    setFeedbackAnims([]);
    setRecoilPattern([]);
    recoilOffsetRef.current = { x: 0, y: 0 };
    recoilPatternRef.current = [];
    recoilFrameCounterRef.current = 0;
    cleanupTimers();
  }, [gameDuration, cleanupTimers]);

  const startGame = useCallback(() => {
    resetGameStats();
    if (gameMode === 'rotate' && gameAreaRef.current) {
      const { width, height } = gameAreaRef.current.getBoundingClientRect();
      setCrosshairPos({ x: width / 2, y: height / 2 });
    }
    setGameState('playing');
  }, [resetGameStats, gameMode]);

  const endGame = useCallback(() => {
    setGameState('finished');
    setTarget(null);
    setIsFiring(false);
    setRecoilPattern(recoilPatternRef.current);
    if (gameAreaRef.current) {
        gameAreaRef.current.style.transform = 'translate(0px, 0px)';
    }
    cleanupTimers();
  }, [cleanupTimers]);

  // Main Game Loop
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = timestamp;
      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Visual screen shake for recoil
      if (gameMode === 'recoil' && isFiring && gameAreaRef.current) {
        const shakeIntensity = 1.5;
        const recoilX = (Math.random() - 0.5) * shakeIntensity;
        const recoilY = (Math.random() - 0.5) * shakeIntensity - shakeIntensity; // Bias upwards
        gameAreaRef.current.style.transform = `translate(${recoilX}px, ${recoilY}px)`;
      } else if (gameAreaRef.current && gameAreaRef.current.style.transform !== 'translate(0px, 0px)') {
        gameAreaRef.current.style.transform = 'translate(0px, 0px)';
      }

      setTarget(currentTarget => {
        if (!currentTarget || !gameAreaRef.current) return currentTarget;
        const { width, height } = gameAreaRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return currentTarget;
        
        const movementScale = deltaTime / (1000 / 60);
        let { x: newX, y: newY, dx: newDx, dy: newDy } = currentTarget;

        // Base Movement (applies to all moving targets)
        if (targetSpeed !== 'stationary') {
          newX += newDx * movementScale;
          newY += newDy * movementScale;

          if (newX <= 0 || newX + currentTarget.size >= width) newDx = -newDx;
          if (newY <= 0 || newY + currentTarget.size >= height) newDy = -newDy;
          newX = Math.max(0, Math.min(newX, width - currentTarget.size));
          newY = Math.max(0, Math.min(newY, height - currentTarget.size));
        }

        // Recoil Simulation (additive, only in recoil mode when firing)
        if (gameMode === 'recoil' && isFiring) {
          const recoilStrength = 2.5;
          const jitter = 1.5;
          const verticalKick = -recoilStrength * movementScale;
          const horizontalKick = (Math.random() - 0.5) * jitter * movementScale;

          newY += verticalKick;
          newX += horizontalKick;
          
          newX = Math.max(0, Math.min(newX, width - currentTarget.size));
          newY = Math.max(0, Math.min(newY, height - currentTarget.size));

          // Record recoil pattern
          recoilOffsetRef.current.x += horizontalKick;
          recoilOffsetRef.current.y += verticalKick;
          recoilFrameCounterRef.current++;
          if (recoilFrameCounterRef.current % 4 === 0) { // Record every 4 frames for ~15fps pattern
              recoilPatternRef.current.push({ ...recoilOffsetRef.current });
          }

          const { x: mouseX, y: mouseY } = mousePosRef.current;
          const targetCenterX = newX + currentTarget.size / 2;
          const targetCenterY = newY + currentTarget.size / 2;
          const distance = Math.sqrt(Math.pow(mouseX - targetCenterX, 2) + Math.pow(mouseY - targetCenterY, 2));

          if (distance < currentTarget.size / 2) {
            setTimeOnTarget(prev => prev + deltaTime);
          }
          setTotalFiringTime(prev => prev + deltaTime);
        }
        
        return { ...currentTarget, x: newX, y: newY, dx: newDx, dy: newDy };
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      lastFrameTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    
    // This cleanup function should ONLY clean up the animation frame,
    // so it doesn't interfere with the countdown timer when `isFiring` changes.
    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };
  }, [gameState, gameMode, targetSpeed, isFiring]);
  
  // Effect for initial spawn & countdown timer
  useEffect(() => {
    if (gameState === 'playing') {
      gameAreaRef.current?.focus();
      spawnTarget();
      countdownTimerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [gameState, spawnTarget, endGame]);

  // Effect for respawn loop in Classic & Rotate modes
  useEffect(() => {
    if (gameState === 'playing' && (gameMode === 'classic' || gameMode === 'rotate') && target === null && timeLeft > 0 && !isTargetHit) {
      const spawnTimeout = setTimeout(() => spawnTarget(), 300);
      return () => clearTimeout(spawnTimeout);
    }
  }, [gameState, gameMode, target, timeLeft, isTargetHit, spawnTarget]);
  
  // Effect for handling global mouse up to prevent stuck firing state in recoil mode
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsFiring(false);
    };

    if (gameState === 'playing' && gameMode === 'recoil' && isFiring) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [gameState, gameMode, isFiring]);


  const addFeedback = (x: number, y: number, type: 'hit' | 'miss') => {
    const newFeedback = { x, y, type, id: Date.now() };
    setFeedbackAnims(prev => [...prev, newFeedback]);
    setTimeout(() => setFeedbackAnims(prev => prev.filter(f => f.id !== newFeedback.id)), 400);
  };
  
  const handleHit = () => { // For Classic and Rotate Modes
    setIsTargetHit(true);
    setScore(prev => prev + 1);
    setHitTimes(prev => [...prev, Date.now() - lastHitTimeRef.current]);
    setTimeout(() => {
        setIsTargetHit(false);
        setTarget(null); // Triggers respawn effect
    }, 200);
  };

  const handleTargetClick = (e: React.MouseEvent) => { // Classic Mode Only
    if (gameMode !== 'classic' || isTargetHit || !target) return;
    e.stopPropagation();
    addFeedback(target.x + target.size / 2, target.y + target.size / 2, 'hit');
    handleHit();
  };
  
  const handleMissClick = (e: React.MouseEvent) => { // Classic Mode Only
    if (gameMode !== 'classic' || gameState !== 'playing' || !gameAreaRef.current || !target || isTargetHit) return;
    setMisses(prev => prev + 1);
    
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
    const clickX = e.clientX - gameAreaRect.left;
    const clickY = e.clientY - gameAreaRect.top;
    addFeedback(clickX, clickY, 'miss');
    
    const targetCenterX = target.x + target.size / 2;
    const targetCenterY = target.y + target.size / 2;
    setMissClicks(prev => [...prev, { offsetX: clickX - targetCenterX, offsetY: clickY - targetCenterY }]);

    if (clickX > targetCenterX) setOvershoots(prev => prev + 1);
    else setUndershoots(prev => prev + 1);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => { // Recoil Mode Only
      if (gameMode !== 'recoil' || e.button !== 0 || !target || gameState !== 'playing' || !gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const distance = Math.sqrt(Math.pow(clickX - (target.x + target.size/2), 2) + Math.pow(clickY - (target.y + target.size/2), 2));
      if (distance < target.size / 2) {
          e.preventDefault();
          setIsFiring(true);
      }
  };

  const handleMouseUpOrLeave = () => { // Recoil Mode Only
      if (gameMode === 'recoil') setIsFiring(false);
  };

  // --- Rotate Mode Handlers ---
  const handleAimStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameMode !== 'rotate' || gameState !== 'playing') return;
    e.preventDefault();
    isAimingRef.current = true;
    const pos = 'touches' in e ? e.touches[0] : e;
    lastAimPosRef.current = { x: pos.clientX, y: pos.clientY };
  };

  const handleAimMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (gameMode !== 'rotate' || gameState !== 'playing' || !isAimingRef.current) return;
      e.preventDefault();
      const pos = 'touches' in e ? e.touches[0] : e;
      const deltaX = pos.clientX - lastAimPosRef.current.x;
      const deltaY = pos.clientY - lastAimPosRef.current.y;
      lastAimPosRef.current = { x: pos.clientX, y: pos.clientY };

      setCrosshairPos(prev => {
          if (!gameAreaRef.current) return prev;
          const { width, height } = gameAreaRef.current.getBoundingClientRect();
          const sensitivity = 1.5; // Make aiming a bit faster
          const newX = Math.max(0, Math.min(width, prev.x + deltaX * sensitivity));
          const newY = Math.max(0, Math.min(height, prev.y + deltaY * sensitivity));
          return { x: newX, y: newY };
      });
  };

  const handleAimEnd = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isAimingRef.current = false;
  };
  
  const handleFire = () => {
    if (gameMode !== 'rotate' || gameState !== 'playing' || !target || isTargetHit) return;

    addFeedback(crosshairPos.x, crosshairPos.y, 'hit'); // Visual for shot

    const isHit =
      crosshairPos.x >= target.x &&
      crosshairPos.x <= target.x + target.size &&
      crosshairPos.y >= target.y &&
      crosshairPos.y <= target.y + target.size;

    if (isHit) {
      handleHit();
    } else {
      setMisses(prev => prev + 1);
      const targetCenterX = target.x + target.size / 2;
      const targetCenterY = target.y + target.size / 2;
      setMissClicks(prev => [...prev, { offsetX: crosshairPos.x - targetCenterX, offsetY: crosshairPos.y - targetCenterY }]);

      if (crosshairPos.x > targetCenterX) setOvershoots(prev => prev + 1);
      else setUndershoots(prev => prev + 1);
    }
  };
  
  // --- Memoized Values & Components for Rendering ---
  const accuracy = (score + misses) > 0 ? ((score / (score + misses)) * 100) : 0;
  const avgHitTime = hitTimes.length > 0 ? hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length : 0;
  const recoilControl = totalFiringTime > 0 ? (timeOnTarget / totalFiringTime) * 100 : 0;

  const getSensitivitySuggestion = (): React.ReactNode => {
    const totalMisses = overshoots + undershoots;
    if (totalMisses < 5) return <p>Not enough miss data for a suggestion. Keep practicing!</p>;
    const overshootRatio = overshoots / totalMisses;

    if (overshootRatio > 0.65) return <><p className="mb-2">You're frequently <strong className="text-red-400">overshooting</strong>.</p><p>Consider lowering your sensitivity by <strong className="text-brand-primary">10-15%</strong>.</p></>;
    if (overshootRatio < 0.35) return <><p className="mb-2">You're frequently <strong className="text-yellow-400">undershooting</strong>.</p><p>Consider increasing your sensitivity by <strong className="text-brand-primary">5-10%</strong>.</p></>;
    return <><p className="mb-2">Your aim seems <strong className="text-green-400">balanced!</strong></p><p>Your current sensitivity is a good fit. Focus on consistency.</p></>;
  };
  
  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string; }> = ({ icon, label, value, colorClass }) => (
    <div className={`p-4 bg-gray-800/50 rounded-lg text-center flex flex-col items-center justify-center border-b-4 ${colorClass}`}>
      <div className="flex items-center justify-center space-x-2 mb-2">{icon}<span className="font-semibold text-sm text-brand-text-muted">{label}</span></div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  );
  
  const RecoilResults = () => {
    const getRecoilFeedback = () => {
        if (recoilControl >= 90) return { title: "Sharpshooter!", message: "Your recoil control is exceptional. You're ready for the highest levels of competition.", color: "text-green-400"};
        if (recoilControl >= 75) return { title: "Great Control!", message: "You have solid recoil control. Focus on maintaining this consistency during intense fights.", color: "text-brand-primary" };
        if (recoilControl >= 50) return { title: "Getting There!", message: "You have a good foundation. Practice consistently to make your spray more reliable.", color: "text-yellow-400" };
        return { title: "Needs Practice", message: "Your spray is a bit wild. Focus on pulling down smoothly and consistently. You'll get it!", color: "text-red-400" };
    };
    const feedback = getRecoilFeedback();
    return (
        <div className="w-full max-w-4xl text-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: Stats & Feedback */}
                <div className="flex flex-col gap-8">
                    <div className={`p-6 bg-brand-surface rounded-lg text-center flex flex-col items-center justify-center border-2 border-brand-primary shadow-lg shadow-brand-primary/10`}>
                        <div className="flex items-center justify-center space-x-2 mb-2 text-brand-primary"><MousePointerClick size={24} /><span className="font-semibold text-lg">Recoil Control</span></div>
                        <span className="text-6xl font-bold text-white">{`${recoilControl.toFixed(1)}%`}</span>
                        <p className="text-brand-text-muted text-sm mt-2">Percentage of time your cursor was on target while firing.</p>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <h3 className={`text-xl font-bold ${feedback.color}`}>{feedback.title}</h3>
                        <p className="text-brand-text-muted mt-2">{feedback.message}</p>
                    </div>
                </div>
                {/* Right Column: Recoil Pattern */}
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 min-h-[300px]">
                    <RecoilPatternDisplay pattern={recoilPattern} />
                </div>
            </div>
        </div>
    );
  };

  // --- RENDER LOGIC ---

  if (gameState === 'config') {
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!previewAreaRef.current) return;
        isDraggingButtonRef.current = true;
        const pos = 'touches' in e ? e.touches[0] : e;
        dragStartPosRef.current = { x: pos.clientX, y: pos.clientY };
        dragStartButtonPosRef.current = { bottom: fireButtonConfig.bottom, right: fireButtonConfig.right };
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingButtonRef.current || !previewAreaRef.current) return;

        const pos = 'touches' in e ? e.touches[0] : e;
        const deltaX = pos.clientX - dragStartPosRef.current.x;
        const deltaY = pos.clientY - dragStartPosRef.current.y;

        const previewRect = previewAreaRef.current.getBoundingClientRect();

        let newRight = dragStartButtonPosRef.current.right - deltaX;
        let newBottom = dragStartButtonPosRef.current.bottom - deltaY;

        // Clamp values to stay within the preview area
        newRight = Math.max(0, Math.min(newRight, previewRect.width - fireButtonConfig.size));
        newBottom = Math.max(0, Math.min(newBottom, previewRect.height - fireButtonConfig.size));

        setFireButtonConfig(prev => ({
            ...prev,
            bottom: Math.round(newBottom),
            right: Math.round(newRight),
        }));
    };

    const handleDragEnd = () => {
        if (isDraggingButtonRef.current) {
            isDraggingButtonRef.current = false;
            document.body.style.cursor = 'default';
        }
    };

    return (
      <div className="relative flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-lg mx-auto w-full">
        <button onClick={onBack} className="absolute top-4 left-4 text-brand-text-muted hover:text-white transition-colors p-2 rounded-full hover:bg-white/10" aria-label="Go back"><Home size={24} /></button>
        <Target size={48} className="text-brand-primary mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Aim Trainer</h2>
        <p className="text-brand-text-muted mb-8">Customize your drill and warm up.</p>
        <div className="w-full space-y-6">
          <div>
            <label htmlFor="gameMode" className="block text-sm font-medium text-brand-text-muted mb-2">Game Mode</label>
            <div className="flex items-center space-x-4">
                <select id="gameMode" value={gameMode} onChange={(e) => setGameMode(e.target.value as 'classic' | 'recoil' | 'rotate')} className="flex-grow bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5">
                <option value="classic">Classic (Click Accuracy)</option>
                <option value="recoil">Recoil Control (Tracking)</option>
                <option value="rotate">Rotate (Mobile Style)</option>
                </select>
                {gameMode === 'rotate' && (
                    <button 
                    onClick={() => setIsCustomizing(true)}
                    className="p-2.5 bg-brand-secondary/80 hover:bg-brand-secondary rounded-lg text-white transition-colors"
                    aria-label="Customize controls"
                    >
                    <Settings2 size={20} />
                    </button>
                )}
            </div>
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-brand-text-muted mb-2">Duration (seconds)</label>
            <select id="duration" value={gameDuration} onChange={(e) => setGameDuration(parseInt(e.target.value, 10))} className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5">
              <option value="15">15</option><option value="30">30</option><option value="60">60</option><option value="90">90</option>
            </select>
          </div>
          <div>
            <label htmlFor="targetSize" className="block text-sm font-medium text-brand-text-muted mb-2">Target Size ({targetSize}px)</label>
            <input type="range" id="targetSize" min="20" max="80" value={targetSize} onChange={(e) => setTargetSize(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div>
            <label htmlFor="targetSpeed" className="block text-sm font-medium text-brand-text-muted mb-2">Target Movement</label>
            <select id="targetSpeed" value={targetSpeed} onChange={(e) => setTargetSpeed(e.target.value as any)} className="bg-gray-800/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block w-full p-2.5">
              <option value="stationary">Stationary</option><option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option>
            </select>
          </div>
        </div>
        <button onClick={startGame} className="w-full mt-8 px-8 py-4 rounded-lg font-bold text-lg text-black bg-brand-primary hover:bg-cyan-400 transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105">
          <Play size={20} /><span>Start Practice</span>
        </button>

        {isCustomizing && (
            <div 
                className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
            >
                <div className="bg-brand-surface p-6 rounded-lg w-full max-w-lg shadow-2xl border border-gray-600" onMouseUp={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 text-white">Customize Fire Button</h3>
                    
                    <div 
                        ref={previewAreaRef}
                        className="relative w-full h-56 bg-gray-800/50 mt-4 rounded-lg overflow-hidden border border-gray-700 mb-6 touch-none"
                    >
                        <div 
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            className="absolute bg-red-600/80 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg select-none cursor-grab active:cursor-grabbing active:scale-105"
                            style={{
                                width: fireButtonConfig.size,
                                height: fireButtonConfig.size,
                                bottom: fireButtonConfig.bottom,
                                right: fireButtonConfig.right,
                                fontSize: `${Math.max(12, fireButtonConfig.size / 5)}px`
                            }}
                        >
                        FIRE
                        </div>
                        <p className="absolute top-2 left-3 text-xs text-brand-text-muted pointer-events-none">Drag to move, use slider for size.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-2">Size ({fireButtonConfig.size}px)</label>
                            <input 
                                type="range" min="60" max="140" 
                                value={fireButtonConfig.size} 
                                onChange={(e) => setFireButtonConfig(prev => ({ ...prev, size: parseInt(e.target.value) }))} 
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                    
                    <button onClick={() => { setIsCustomizing(false); handleDragEnd(); }} className="w-full mt-8 px-6 py-3 rounded-lg font-semibold text-black bg-brand-primary hover:bg-cyan-400 transition-colors duration-300">
                        Done
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  }

  if (gameState === 'playing') {
     const gameAreaHandlers = {
      classic: { onClick: handleMissClick },
      recoil: {
        onMouseMove: handleMouseMove,
        onMouseDown: handleMouseDown,
        onMouseUp: handleMouseUpOrLeave,
        onMouseLeave: handleMouseUpOrLeave,
      },
      rotate: {
        onMouseDown: handleAimStart,
        onMouseMove: handleAimMove,
        onMouseUp: handleAimEnd,
        onTouchStart: handleAimStart,
        onTouchMove: handleAimMove,
        onTouchEnd: handleAimEnd,
      },
    };

    return (
      <div className="fixed inset-0 z-50 bg-brand-bg flex flex-col lg:items-center lg:justify-center">
        <div className="w-full lg:max-w-4xl flex justify-between items-center bg-black/30 p-3 lg:rounded-t-lg z-10">
            <div className="font-bold text-xl w-1/3 text-left">{gameMode === 'classic' || gameMode === 'rotate' ? `Score: ${score}` : 'Recoil Control'}</div>
            <div className={`font-bold text-4xl transition-all duration-300 w-1/3 text-center ${timeLeft <= 5 && timeLeft > 0 ? 'text-red-500 scale-110 animate-pulse' : 'text-yellow-400'}`}>{timeLeft}</div>
            <div className="font-bold text-xl w-1/3 text-right">{gameMode === 'classic' || gameMode === 'rotate' ? `Accuracy: ${accuracy.toFixed(0)}%` : `${recoilControl.toFixed(0)}%`}</div>
        </div>
        <div
          className={`relative w-full flex-grow lg:flex-grow-0 lg:h-[70vh] lg:max-w-4xl bg-gray-800/50 lg:rounded-b-xl border-gray-700 lg:border lg:border-t-0 overflow-hidden transition-transform duration-75 ${gameMode === 'rotate' ? 'cursor-none' : 'cursor-crosshair'}`}
          ref={gameAreaRef}
          tabIndex={-1}
          {...gameAreaHandlers[gameMode]}
        >
          {target && (
            <div
              className={`bg-brand-primary rounded-full absolute border-4 border-cyan-200 shadow-lg shadow-cyan-500/50
              ${isTargetHit ? 'animate-destroy-target' : ''} ${(gameMode === 'classic' || gameMode === 'rotate') && !isTargetHit ? 'animate-spawn-target' : ''}
              ${isFiring ? 'ring-4 ring-red-500' : ''}`}
              style={{ top: target.y, left: target.x, width: target.size, height: target.size, willChange: 'transform, top, left' }}
              onClick={gameMode === 'classic' ? handleTargetClick : undefined}
            />
          )}

          {gameMode === 'rotate' && (
             <div
              className="absolute pointer-events-none"
              style={{
                transform: `translate(${crosshairPos.x}px, ${crosshairPos.y}px)`,
                top: 0,
                left: 0,
                willChange: 'transform'
              }}
            >
              <div className="w-8 h-8 -translate-x-1/2 -translate-y-1/2 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 5V2" /><path d="M12 22V19" />
                  <path d="M5 12H2" /><path d="M22 12H19" />
                </svg>
              </div>
            </div>
          )}

          {gameMode === 'recoil' && !isFiring && timeLeft > 0 &&
            <div className="absolute inset-0 flex items-center justify-center text-white text-lg pointer-events-none"><p className="bg-black/50 p-3 rounded-lg">Click and hold the target to begin</p></div>
          }
          {feedbackAnims.map(anim => (
            anim.type === 'miss' ? <div key={anim.id} className="absolute w-8 h-8 rounded-full border-red-500 animate-miss-feedback" style={{ top: anim.y - 16, left: anim.x - 16, pointerEvents: 'none' }}></div>
            : <div key={anim.id} className="absolute w-6 h-6 animate-hit-feedback" style={{ top: anim.y - 12, left: anim.x - 12, pointerEvents: 'none' }}><svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="3"><path d="M12 5V19" /><path d="M5 12H19" /></svg></div>
          ))}
        </div>

        {gameMode === 'rotate' && (
          <div 
            className="absolute z-20"
            style={{
                bottom: `${fireButtonConfig.bottom}px`,
                right: `${fireButtonConfig.right}px`,
            }}
            >
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleFire(); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleFire(); }}
              className="bg-red-600/80 rounded-full active:bg-red-700 border-4 border-white/30 flex items-center justify-center text-white font-bold transition-all duration-100"
              style={{
                width: `${fireButtonConfig.size}px`,
                height: `${fireButtonConfig.size}px`,
                fontSize: `${Math.max(12, fireButtonConfig.size / 5)}px`
              }}
            >
              FIRE
            </button>
          </div>
        )}
      </div>
    );
  }
  
  if (gameState === 'finished') {
    const isClassicOrRotate = gameMode === 'classic' || gameMode === 'rotate';

    return (
      <div className="relative flex flex-col items-center p-4 sm:p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Practice Complete!</h2>
        <p className="text-brand-text-muted mb-8">Here's your performance summary for {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} mode.</p>

        {isClassicOrRotate ? (
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
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 min-h-[300px]"><HitTimeChart hitTimes={hitTimes} avgHitTime={avgHitTime} /></div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 min-h-[300px]"><MissScatterPlot misses={missClicks} targetSize={targetSize} /></div>
                <div className="lg:col-span-2 bg-gray-800/50 rounded-lg p-4 border border-gray-600 min-h-[300px]"><HitTimeDistributionChart hitTimes={hitTimes} /></div>
            </div>
            <div className="w-full bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-600">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white flex items-center"><Bot size={24} className="mr-3 text-brand-secondary"/>Sensei's Suggestion</h3>
                    <button onClick={() => setShowSuggestion(!showSuggestion)} className="text-sm font-semibold text-brand-primary hover:underline">{showSuggestion ? 'Hide' : 'Analyze My Aim'}</button>
                </div>
                {showSuggestion && <div className="mt-4 pt-4 border-t border-gray-700 text-center text-brand-text-muted">{getSensitivitySuggestion()}</div>}
            </div>
        </>
        ) : <RecoilResults />}

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-8">
          <button onClick={startGame} className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-primary/80 hover:bg-brand-primary transition-colors duration-300 flex items-center space-x-2 justify-center">
            <RefreshCw size={20} /><span>Play Again</span>
          </button>
          <button onClick={onBack} className="px-6 py-3 rounded-lg font-semibold text-white bg-brand-secondary/80 hover:bg-brand-secondary transition-colors duration-300 flex items-center space-x-2 justify-center">
            <Home size={20} /><span>Return to Home</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AimTrainer;