import React from 'react';
import type { Game } from '../types';
import { Target } from 'lucide-react';

interface HomeProps {
  onStartPractice: () => void;
}

const Home: React.FC<HomeProps> = ({ onStartPractice }) => {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-bold tracking-tighter text-brand-text sm:text-5xl">Welcome, Operator</h2>
      <p className="mt-4 text-lg leading-8 text-brand-text-muted max-w-2xl mx-auto">
        Your performance is critical. Enter the simulation to sharpen your skills.
      </p>
      <div className="mt-12 flex justify-center px-4" style={{ perspective: '1000px' }}>
        <div
          onClick={onStartPractice}
          className="group relative cursor-pointer p-8 bg-brand-surface/80 rounded-xl shadow-2xl transition-all duration-300 transform-style-3d hover:-translate-y-2 hover:scale-105 max-w-md w-full"
          style={{ transform: 'rotateY(0deg) rotateX(0deg)' }}
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-10 rounded-xl"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary/80 to-transparent"></div>

          <div className="flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110 text-brand-primary">
            <Target size={64} />
          </div>
          <span className="mt-6 text-2xl font-semibold text-brand-text">Aim Trainer</span>
          <p className="mt-2 text-sm text-brand-text-muted">Practice accuracy, tracking, and recoil control.</p>
           <div className="absolute inset-0 border-2 border-brand-panel rounded-xl group-hover:border-brand-primary/70 transition-colors duration-300 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default Home;
