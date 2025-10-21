import React from 'react';
import { Home, Bot } from 'lucide-react';
import type { Game, AnalysisResponse } from '../types';
import FrameVisualizer from './FrameVisualizer';

interface AnalysisDisplayProps {
  analysis: AnalysisResponse;
  game: Game;
  onReset: () => void;
  frames: string[];
}

const FormattedAnalysis: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="text-left space-y-4 prose prose-invert prose-sm max-w-none prose-p:text-brand-text-muted prose-headings:text-brand-primary prose-strong:text-brand-text prose-li:marker:text-brand-secondary">
      {text.split('\n').map((line, index) => {
        line = line.trim();
        if (line === '') return null;

        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={index} className="text-xl font-bold tracking-tight mt-6 mb-2">{line.substring(2, line.length - 2)}</h3>;
        }
        
        if (line.startsWith('* ')) {
          return <div key={index} className="flex items-start"><span className="mr-3 mt-1.5 text-brand-secondary text-lg leading-none">•</span><p className="flex-1 m-0">{line.substring(2)}</p></div>;
        }

        return <p key={index} className="m-0">{line}</p>;
      })}
    </div>
  );
};


const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, game, onReset, frames }) => {
  return (
    <div className="w-full max-w-7xl mx-auto bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-brand-panel overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 pb-6 border-b border-brand-panel">
            <div className="flex items-center space-x-4">
                <div className="w-16 h-16 flex items-center justify-center text-brand-primary">{game.logo}</div>
                <div>
                  <h2 className="text-3xl font-bold text-brand-text tracking-tighter">Debriefing Report</h2>
                  <p className="text-brand-text-muted flex items-center space-x-2"><Bot size={16}/><span>Analysis by Sensei AI</span></p>
                </div>
            </div>
          <button
            onClick={onReset}
            className="mt-4 sm:mt-0 flex items-center px-5 py-2.5 bg-brand-panel text-brand-text rounded-lg hover:bg-slate-600 transition-all duration-300 font-semibold w-full sm:w-auto justify-center transform hover:-translate-y-0.5"
          >
            <Home size={16} className="mr-2" />
            New Session
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Text Analysis */}
            <div className="bg-brand-bg/50 p-6 rounded-lg border border-brand-panel h-fit">
                <FormattedAnalysis text={analysis.analysis} />
            </div>

            {/* Right Column: Visualizer */}
            {frames && frames.length > 0 && analysis.visual_data && (
                <FrameVisualizer frames={frames} visualData={analysis.visual_data} />
            )}
        </div>
        
         <p className="text-xs text-brand-text-muted text-center mt-8 pt-4 border-t border-brand-panel">
            Disclaimer: AI analysis is a supplementary tool. Your personal comfort and consistent practice are paramount for improvement.
         </p>
      </div>
    </div>
  );
};

export default AnalysisDisplay;