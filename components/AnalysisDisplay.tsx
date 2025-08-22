
import React from 'react';
import { Home } from 'lucide-react';
import type { Game } from '../types';

interface AnalysisDisplayProps {
  analysis: string;
  game: Game;
  onReset: () => void;
}

const FormattedAnalysis: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="text-left space-y-4">
      {text.split('\n').map((line, index) => {
        line = line.trim();
        if (line === '') return null;

        // Handle bold headers like **Sensei's Analysis:**
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <h3 key={index} className="text-xl font-bold text-brand-primary mt-6 mb-2">
              {line.substring(2, line.length - 2)}
            </h3>
          );
        }
        
        // Handle list items like * Tip...
        if (line.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start pl-2">
              <span className="mr-3 mt-1 text-brand-secondary">•</span>
              <p className="text-brand-text flex-1">{line.substring(2)}</p>
            </div>
          );
        }

        // Handle normal paragraphs
        return <p key={index} className="text-brand-text-muted">{line}</p>;
      })}
    </div>
  );
};


const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, game, onReset }) => {
  return (
    <div className="w-full max-w-3xl mx-auto bg-brand-surface rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      <div className="p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 pb-6 border-b border-gray-700">
            <div className="flex items-center space-x-4">
                <div className="w-16 h-16 flex items-center justify-center">{game.logo}</div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Analysis for {game.name}</h2>
                  <p className="text-brand-text-muted">Powered by Sensei AI</p>
                </div>
            </div>
          <button
            onClick={onReset}
            className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-brand-primary text-black rounded-lg hover:bg-cyan-400 transition-colors duration-300 font-semibold"
          >
            <Home size={16} className="mr-2" />
            Return to Home
          </button>
        </div>

        <div className="p-2">
          <FormattedAnalysis text={analysis} />
        </div>
         <p className="text-xs text-brand-text-muted text-center mt-8 pt-4 border-t border-gray-700">
            Disclaimer: This AI analysis is based on a few frames from your video and is intended as a helpful suggestion. Your own feeling and continued practice are most important.
         </p>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
