import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Bot, Gamepad, Github } from 'lucide-react';
import { AppStage } from './types';
import type { Game } from './types';
import { GAMES } from './constants';
import { analyzeGameplay } from './services/geminiService';

import GameSelector from './components/GameSelector';
import ScreenRecorder from './components/ScreenRecorder';
import Loader from './components/Loader';
import AnalysisDisplay from './components/AnalysisDisplay';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.SELECT_GAME);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [error, setError] = useState<string>('');

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
    try {
      const result = await analyzeGameplay(blob, selectedGame.name);
      setAnalysisResult(result);
      setStage(AppStage.SHOW_ANALYSIS);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setStage(AppStage.SHOW_ANALYSIS); // Show error in the analysis view
      setAnalysisResult(`Failed to analyze the video. Error: ${errorMessage}`);
    }
  }, [selectedGame]);

  const handleReset = useCallback(() => {
    setStage(AppStage.SELECT_GAME);
    setSelectedGame(null);
    setAnalysisResult('');
    setError('');
  }, []);

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
        return <Loader message="AI is analyzing your gameplay..." />;
      case AppStage.SHOW_ANALYSIS:
        if (selectedGame) {
          return <AnalysisDisplay analysis={analysisResult} game={selectedGame} onReset={handleReset} />;
        }
        // Fallback to reset if something goes wrong
        handleReset();
        return null;
      default:
        return <p>An unknown error occurred. Please refresh the page.</p>;
    }
  }, [stage, handleGameSelect, handleRecordingComplete, selectedGame, analysisResult, handleReset]);

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