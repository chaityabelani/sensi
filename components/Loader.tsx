
import React from 'react';

interface LoaderProps {
  message: string;
  percentage: number | null;
}

const Loader: React.FC<LoaderProps> = ({ message, percentage }) => {
  const showProgressBar = typeof percentage === 'number' && percentage >= 0 && percentage <= 100;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-brand-surface rounded-xl shadow-lg border border-gray-700 max-w-md text-center w-full">
      <svg className="animate-spin h-12 w-12 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="mt-6 text-xl font-semibold text-white">Analyzing Your Gameplay</h2>
      <p className="mt-2 text-brand-text-muted h-10 flex items-center justify-center">
        {message || "Please wait..."}
      </p>

      {/* Progress Bar Container */}
      <div className="w-full bg-gray-600 rounded-full h-2.5 mt-4 overflow-hidden">
        {showProgressBar && (
          <div 
            className="bg-brand-primary h-2.5 rounded-full transition-all duration-300 ease-linear" 
            style={{ width: `${percentage}%` }}
          ></div>
        )}
      </div>
    </div>
  );
};

export default Loader;