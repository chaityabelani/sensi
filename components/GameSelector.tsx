
import React from 'react';
import type { Game } from '../types';

interface GameSelectorProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
}

const GameSelector: React.FC<GameSelectorProps> = ({ games, onSelectGame }) => {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Choose Your Game</h2>
      <p className="mt-4 text-lg leading-8 text-brand-text-muted">Select the game you want to analyze your sensitivity for.</p>
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game)}
            className="group relative flex flex-col items-center justify-center p-6 bg-brand-surface rounded-xl shadow-lg transition-all duration-300 hover:bg-brand-secondary/20 hover:shadow-brand-primary/20 hover:-translate-y-2 border border-transparent hover:border-brand-primary/50"
          >
            <div className="transition-transform duration-300 group-hover:scale-110">
              {game.logo}
            </div>
            <span className="mt-4 font-semibold text-brand-text">{game.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GameSelector;
