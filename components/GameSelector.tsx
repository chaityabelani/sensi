import React from 'react';
import type { Game } from '../types';
import { Target, Gamepad2 } from 'lucide-react';

interface GameSelectorProps {
  onSelectGame: (game: Game) => void;
  onStartPractice: () => void;
}

const genericGame: Game = {
  id: 'generic',
  name: 'Your Game',
  logo: <Gamepad2 size={64} />,
};

const GameSelector: React.FC<GameSelectorProps> = ({ onSelectGame, onStartPractice }) => {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">What would you like to do?</h2>
      <p className="mt-4 text-lg leading-8 text-brand-text-muted">Analyze gameplay footage or warm up in the aim trainer.</p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 max-w-2xl mx-auto">
        <button
          onClick={() => onSelectGame(genericGame)}
          className="group relative flex flex-col items-center justify-center p-6 bg-brand-surface rounded-xl shadow-lg transition-all duration-300 hover:bg-brand-secondary/20 hover:shadow-brand-primary/20 hover:-translate-y-2 border border-transparent hover:border-brand-primary/50"
        >
          <div className="transition-transform duration-300 group-hover:scale-110 text-brand-secondary">
            {genericGame.logo}
          </div>
          <span className="mt-4 font-semibold text-brand-text">Analyze Gameplay</span>
          <span className="text-xs text-brand-text-muted">For any game</span>
        </button>
        <button
          onClick={onStartPractice}
          className="group relative flex flex-col items-center justify-center p-6 bg-brand-surface rounded-xl shadow-lg transition-all duration-300 hover:bg-brand-secondary/20 hover:shadow-brand-primary/20 hover:-translate-y-2 border border-transparent hover:border-brand-primary/50"
        >
          <div className="transition-transform duration-300 group-hover:scale-110 text-brand-primary">
            <Target size={64} />
          </div>
          <span className="mt-4 font-semibold text-brand-text">Aim Trainer</span>
          <span className="text-xs text-brand-text-muted">Practice Mode</span>
        </button>
      </div>
    </div>
  );
};

export default GameSelector;
