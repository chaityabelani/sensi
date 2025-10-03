

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Bot, Github } from 'lucide-react';
import { AppStage } from './types';
import type { Game, AnalysisResponse } from './types';
import { analyzeGameplay, extractFramesFromVideo } from './services/geminiService';

import GameSelector from './components/GameSelector';
import ScreenRecorder from './components/ScreenRecorder';
import Loader from './components/Loader';
import AnalysisDisplay from './components/AnalysisDisplay';
import ErrorDisplay from './components/ErrorDisplay';
import AimTrainer from './components/AimTrainer';

const ESTIMATED_ANALYSIS_SECONDS = 45;

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.SELECT_GAME);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<{ message: string; percentage: number | null }>({ message: '', percentage: null });
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup timer on component unmount or stage change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    setStage(AppStage.RECORD_GAME);
  }, []);

  const handleStartPractice = useCallback(() => {
    setStage(AppStage.PRACTICE_MODE);
  }, []);
  
  const clearTimers = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRemainingTime(null);
  }

  const handleRecordingComplete = useCallback(async (blob: Blob, sensitivity: number | null) => {
    if (!selectedGame) {
      setError('No game selected. Please start over.');
      setStage(AppStage.SELECT_GAME);
      return;
    }
    setStage(AppStage.ANALYZING);
    setError('');
    setAnalysisResult(null);
    setVideoFrames([]);

    try {
      // Step 1: Extract frames
      const frameExtractionProgress = (message: string, percentage: number | null) => {
        // Map frame extraction (0-100) to the first half of progress bar (0-50)
        const scaledPercentage = percentage !== null ? Math.round((percentage / 100) * 50) : 0;
        setProgress({ message, percentage: scaledPercentage });
      };

      setProgress({ message: 'Extracting key frames...', percentage: 0 });
      const frames = await extractFramesFromVideo(blob, 10, (progress) => {
        frameExtractionProgress("Extracting key frames...", progress * 100);
      });

      if (frames.length === 0) {
        throw new Error("Could not extract any frames from the video. The file might be corrupt or in an unsupported format. Please try a different recording.");
      }
      setVideoFrames(frames);

      // Step 2: Run analysis
      const analysisProgressCallback = (message: string, percentage: number | null) => {
        // Start AI analysis at 50%
        setProgress({ message, percentage: 50 });
        setRemainingTime(ESTIMATED_ANALYSIS_SECONDS);

        // Start a timer to animate progress from 50 to 95 and countdown time
        const analysisProgressInterval = (ESTIMATED_ANALYSIS_SECONDS * 1000) / 45; // 45 is range 95-50
        timerRef.current = window.setInterval(() => {
          setProgress(prev => ({ ...prev, percentage: Math.min(prev.percentage ?? 50, 95) + 1 }));
          setRemainingTime(prev => (prev ? prev - 1 : 0));
        }, analysisProgressInterval);
      };

      const result = await analyzeGameplay(frames, selectedGame.name, sensitivity, analysisProgressCallback);
      clearTimers();
      setProgress(prev => ({ ...prev, percentage: 100, message: 'Analysis Complete!' }));
      await new Promise(resolve => setTimeout(resolve, 300));
      setAnalysisResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
        clearTimers();
        setStage(AppStage.SHOW_ANALYSIS);
    }
  }, [selectedGame]);

  const handleReset = useCallback(() => {
    setStage(AppStage.SELECT_GAME);
    setSelectedGame(null);
    setAnalysisResult(null);
    setError('');
    setProgress({ message: '', percentage: null });
    setVideoFrames([]);
    clearTimers();
  }, []);

  const renderContent = useMemo(() => {
    switch (stage) {
      case AppStage.SELECT_GAME:
        return <GameSelector onSelectGame={handleGameSelect} onStartPractice={handleStartPractice} />;
      case AppStage.RECORD_GAME:
        if (selectedGame) {
          return <ScreenRecorder onRecordingComplete={handleRecordingComplete} onBack={handleReset} gameName={selectedGame.name} />;
        }
        handleReset();
        return null;
      case AppStage.PRACTICE_MODE:
        return <AimTrainer onBack={handleReset} />;
      case AppStage.ANALYZING:
        return <Loader message={progress.message} percentage={progress.percentage} remainingTime={remainingTime} />;
      case AppStage.SHOW_ANALYSIS:
        if (error) {
            return <ErrorDisplay message={error} onReset={handleReset} />;
        }
        if (selectedGame && analysisResult && videoFrames.length > 0) {
          return <AnalysisDisplay analysis={analysisResult} game={selectedGame} onReset={handleReset} frames={videoFrames} />;
        }
        handleReset();
        return null;
      default:
        return <p>An unknown error occurred. Please refresh the page.</p>;
    }
  }, [stage, selectedGame, analysisResult, videoFrames, error, progress, remainingTime, handleGameSelect, handleStartPractice, handleRecordingComplete, handleReset]);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <Bot className="h-8 w-8 text-brand-primary"/>
                <h1 className="text-lg sm:text-xl font-bold text-white">Game Sense AI</h1>
            </div>
             <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-brand-text-muted hover:text-brand-primary transition-colors">
                <Github size={24} />
            </a>
        </header>

      <main className="w-full max-w-4xl flex-grow flex items-center justify-center">
        {renderContent}
      </main>
      
      <footer className="w-full text-center p-4 mt-8">
        <p className="text-sm text-brand-text-muted">
            Select a game, record your screen, and get AI-powered feedback to improve your aim.
        </p>
      </footer>
    </div>
  );
};

export default App;
