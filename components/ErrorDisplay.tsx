
import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onReset: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onReset }) => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-brand-surface rounded-xl shadow-2xl border border-red-500/50 overflow-hidden p-8 text-center">
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Analysis Failed</h2>
      <p className="text-brand-text-muted mb-6">
        {message}
      </p>
      <button
        onClick={onReset}
        className="flex items-center justify-center mx-auto px-6 py-3 bg-brand-primary text-black rounded-lg hover:bg-cyan-400 transition-colors duration-300 font-semibold"
      >
        <Home size={18} className="mr-2" />
        Try Again
      </button>
    </div>
  );
};

export default ErrorDisplay;
