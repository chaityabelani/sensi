import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onReset: () => void;
}

const API_KEY_ERROR_MESSAGE = 'The API_KEY environment variable is not set on the server.';

const VercelApiKeyInstructions: React.FC = () => (
  <div className="text-left bg-brand-bg/50 p-4 sm:p-6 rounded-lg mt-6 border border-brand-panel space-y-4">
    <h3 className="font-bold text-lg text-brand-text">Corrective Action Required:</h3>
    <p className="text-brand-text-muted">
      This error indicates a server-side configuration issue with the Gemini API key. Please perform the following steps in your Vercel project dashboard:
    </p>
    <ol className="list-decimal list-inside space-y-3 text-brand-text text-sm">
      <li>
        Navigate to: Project Settings &rarr; <strong className="text-brand-primary">Environment Variables</strong>.
      </li>
      <li>
        Create a new variable with the name <code className="bg-brand-bg px-2 py-1 rounded text-brand-secondary font-mono text-base">API_KEY</code>.
      </li>
      <li>
        Paste your Gemini API key into the value field.
      </li>
      <li>
        Ensure the variable is applied to all required environments (Production, Preview, Development).
      </li>
      <li>
        <strong className="text-yellow-400">Critical:</strong> You must <strong className="text-brand-primary">create a new deployment</strong> for the changes to take effect. Redeploy from the "Deployments" tab.
      </li>
    </ol>
    <div className="!mt-6 border-t border-brand-panel pt-4">
        <h4 className="font-semibold text-brand-text">Common Pitfalls</h4>
        <p className="text-brand-text-muted text-xs mt-2">
            The variable name must be exact. Names like <code className="bg-brand-bg px-1 py-0.5 rounded text-red-400">GOOGLE_API_KEY</code> or <code className="bg-brand-bg px-1 py-0.5 rounded text-red-400">GEMINI_API_KEY</code> are incorrect and will not be detected by this application.
        </p>
    </div>
  </div>
);


const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onReset }) => {
    const isApiKeyError = message.includes(API_KEY_ERROR_MESSAGE);

  return (
    <div className="w-full max-w-3xl mx-auto bg-brand-surface/80 backdrop-blur-md rounded-xl shadow-2xl border border-red-500/50 overflow-hidden p-6 sm:p-8 text-center">
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
      </div>
      <h2 className="text-3xl font-bold text-brand-text mb-2 tracking-tighter">
        {isApiKeyError ? "System Configuration Error" : "Analysis Failed"}
      </h2>
      <p className="text-brand-text-muted mb-6">
        {message}
      </p>
      
      {isApiKeyError && <VercelApiKeyInstructions />}

      <button
        onClick={onReset}
        className="flex items-center justify-center mx-auto px-6 py-3 bg-brand-primary text-black rounded-lg hover:bg-cyan-300 transition-colors duration-300 font-semibold mt-8 transform hover:-translate-y-0.5"
      >
        <Home size={18} className="mr-2" />
        {isApiKeyError ? "Configuration Updated, Retry" : "Try Again"}
      </button>
    </div>
  );
};

export default ErrorDisplay;