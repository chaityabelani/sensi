import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onReset: () => void;
}

const API_KEY_ERROR_MESSAGE = 'The API_KEY environment variable is not set on the server.';

const VercelApiKeyInstructions: React.FC = () => (
  <div className="text-left bg-gray-800/50 p-6 rounded-lg mt-6 border border-gray-600 space-y-4">
    <h3 className="font-bold text-lg text-white">How to fix this:</h3>
    <p className="text-brand-text-muted">
      This error means your Gemini API key isn't configured correctly on the server. Follow these steps in your Vercel project dashboard:
    </p>
    <ol className="list-decimal list-inside space-y-3 text-brand-text">
      <li>
        <strong>Go to Project Settings:</strong> Navigate to your project and click the <strong className="text-brand-primary">Settings</strong> tab, then select <strong className="text-brand-primary">Environment Variables</strong>.
      </li>
      <li>
        <strong>Check Variable Name:</strong> Create a variable with the exact name <code className="bg-gray-900 px-2 py-1 rounded text-brand-secondary">API_KEY</code>.
      </li>
      <li>
        <strong>Set the Value:</strong> Paste your Gemini API key into the value field.
      </li>
      <li>
        <strong>Select Environments:</strong> Ensure the variable is applied to the <strong className="text-brand-primary">Production</strong> environment.
      </li>
      <li>
        <strong>Redeploy:</strong> This is the most important step! You must <strong className="text-brand-primary">create a new deployment</strong> for the changes to apply. Go to the Deployments tab and redeploy.
      </li>
    </ol>
  </div>
);


const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onReset }) => {
    const isApiKeyError = message.includes(API_KEY_ERROR_MESSAGE);

  return (
    <div className="w-full max-w-2xl mx-auto bg-brand-surface rounded-xl shadow-2xl border border-red-500/50 overflow-hidden p-8 text-center">
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        {isApiKeyError ? "Configuration Required" : "Analysis Failed"}
      </h2>
      <p className="text-brand-text-muted mb-6">
        {message}
      </p>
      
      {isApiKeyError && <VercelApiKeyInstructions />}

      <button
        onClick={onReset}
        className="flex items-center justify-center mx-auto px-6 py-3 bg-brand-primary text-black rounded-lg hover:bg-cyan-400 transition-colors duration-300 font-semibold mt-8"
      >
        <Home size={18} className="mr-2" />
        {isApiKeyError ? "I've fixed it, let's try again" : "Try Again"}
      </button>
    </div>
  );
};

export default ErrorDisplay;