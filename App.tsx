

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Bot, Gamepad, Github } from 'lucide-react';
import { AppStage } from './types';
import type { Game } from './types';
import { GAMES } from './constants';
import { analyzeGameplay } from './services/geminiService';

import GameSelector from './components/GameSelector';
import ScreenRecorder from './components/ScreenRecorder';
import Loader from './components/Loader';
import AnalysisDisplay from './components/AnalysisDisplay';
import ErrorDisplay from './components/ErrorDisplay';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.SELECT_GAME);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<{ message: string; percentage: number | null }>({ message: '', percentage: null });
  const progressIntervalRef = useRef<number | null>(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => clearProgressInterval();
  }, [clearProgressInterval]);

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

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (!selectedGame) {
      setError('No game selected. Please start over.');
      setStage(AppStage.SELECT_GAME);
      return;
    }
    setStage(AppStage.ANALYZING);
    setError('');
    setAnalysisResult('');
    clearProgressInterval();
    setProgress({ message: 'Preparing video...', percentage: 0 });

    const progressCallback = (message: string, percentage: number | null = null) => {
      // Phase 2: AI Analysis (indeterminate progress)
      // We start a "fake" progress animation to show the AI is thinking.
      if (percentage === null) {
        setProgress({ message, percentage: 50 }); // Start fake progress at 50%
        
        // Slowly animate from 50% to 95% to give user feedback
        progressIntervalRef.current = window.setInterval(() => {
          setProgress(prev => {
            const nextPercent = prev.percentage ? prev.percentage + 1 : 51;
            if (nextPercent >= 95) {
              clearProgressInterval();
              return { ...prev, percentage: 95 };
            }
            return { ...prev, percentage: nextPercent };
          });
        }, 300); // Increment percentage every 300ms

      } else {
        // Phase 1: Frame Extraction (real progress)
        // We map the 0-100% of frame extraction to the first half of our progress bar (0-50%)
        setProgress({ message, percentage: Math.round((percentage / 100) * 50) });
      }
    };

    try {
      const result = await analyzeGameplay(blob, selectedGame.name, progressCallback);
      clearProgressInterval();
      // Animate to 100% on completion before showing results
      setProgress(prev => ({ ...prev, percentage: 100, message: 'Analysis Complete!' }));
      // A small delay to let the user see the 100% bar
      await new Promise(resolve => setTimeout(resolve, 300));
      setAnalysisResult(result);
    } catch (err) {
      clearProgressInterval();
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
        setStage(AppStage.SHOW_ANALYSIS);
    }
  }, [selectedGame, clearProgressInterval]);

  const handleReset = useCallback(() => {
    setStage(AppStage.SELECT_GAME);
    setSelectedGame(null);
    setAnalysisResult('');
    setError('');
    clearProgressInterval();
  }, [clearProgressInterval]);

  const renderContent = useMemo(() => {
    switch (stage) {
      case AppStage.SELECT_GAME:
        return <GameSelector games={GAMES} onSelectGame={handleGameSelect} />;
      case AppStage.RECORD_GAME:
        if (selectedGame) {
          return <ScreenRecorder onRecordingComplete={handleRecordingComplete} onBack={handleReset} gameName={selectedGame.name} />;
        }
        // Fallback to reset if something goes wrong
        handleReset();
        return null;
      case AppStage.ANALYZING:
        return <Loader message={progress.message} percentage={progress.percentage} />;
      case AppStage.SHOW_ANALYSIS:
        if (error) {
            return <ErrorDisplay message={error} onReset={handleReset} />;
        }
        if (selectedGame) {
          return <AnalysisDisplay analysis={analysisResult} game={selectedGame} onReset={handleReset} />;
        }
        // Fallback to reset if something goes wrong
        handleReset();
        return null;
      default:
        return <p>An unknown error occurred. Please refresh the page.</p>;
    }
  }, [stage, selectedGame, analysisResult, error, progress, handleGameSelect, handleRecordingComplete, handleReset]);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <Bot className="h-8 w-8 text-brand-primary"/>
                <h1 className="text-xl font-bold text-white">Game Sense AI</h1>
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