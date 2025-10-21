import React from 'react';

interface LoaderProps {
  message: string;
  percentage: number | null;
  remainingTime: number | null;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Loader: React.FC<LoaderProps> = ({ message, percentage, remainingTime }) => {
  const showProgressBar = typeof percentage === 'number' && percentage >= 0 && percentage <= 100;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-brand-panel max-w-md text-center w-full">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 border-4 border-brand-panel rounded-full"></div>
        <div className="absolute inset-2 border-4 border-brand-panel rounded-full animate-loader-spin" style={{ animationDirection: 'reverse' }}></div>
        <div className="absolute inset-4 border-4 border-transparent border-t-brand-primary rounded-full animate-loader-spin"></div>
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-brand-text tracking-tight">AI Core Initializing...</h2>
      <p className="mt-2 text-brand-text-muted h-10 flex items-center justify-center">
        {message || "Awaiting tactical data..."}
      </p>

      {/* Timer Display */}
      {remainingTime !== null && remainingTime > 0 && (
          <div className="mt-4 text-brand-text-muted">
              Time remaining: <span className="font-semibold text-brand-text tabular-nums">{formatTime(remainingTime)}</span>
          </div>
      )}

      {/* Progress Bar Container */}
      <div className="w-full bg-brand-bg rounded-full h-3 mt-4 overflow-hidden border border-brand-panel">
        {showProgressBar ? (
          <div 
            className="bg-brand-primary h-full rounded-full transition-all duration-300 ease-linear" 
            style={{ width: `${percentage}%` }}
          ></div>
        ) : (
           <div className="w-full h-full bg-brand-primary/50 animate-pulse"></div>
        )}
      </div>
       <p className="text-xs text-brand-text-muted text-center mt-6">
            Processing can take up to a minute. Please maintain the connection.
      </p>
    </div>
  );
};

export default Loader;