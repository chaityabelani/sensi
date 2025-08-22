
import React from 'react';
import type { Game } from './types';

const FarlightLogo: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-yellow-400" fill="currentColor">
    <path d="M50 0 L100 50 L50 100 L0 50 Z" />
    <path d="M50 10 L85 50 L50 90 L15 50 Z" fill="black" />
    <path d="M50 20 L75 50 L50 80 L25 50 Z" />
  </svg>
);

const BGMILogo: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-blue-500" fill="currentColor">
    <circle cx="50" cy="50" r="50" />
    <path d="M35 25 L65 25 L65 35 L45 35 L45 45 L60 45 L60 55 L45 55 L45 75 L35 75 Z" fill="white" />
    <path d="M70 75 L70 65 L80 65 L80 25 L70 25" fill="white" stroke="white" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const FreeFireLogo: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-orange-500" fill="currentColor">
    <path d="M10 10 L50 0 L90 10 L90 50 L50 100 L10 50 Z" />
    <path d="M50 15 L25 25 L25 50 L50 75 L75 50 L75 25 Z" fill="white" />
    <circle cx="50" cy="40" r="10" fill="black" />
  </svg>
);

const ValorantLogo: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 text-red-500" fill="currentColor">
     <path d="M10 90 L40 10 L50 10 L20 90 Z" />
     <path d="M50 10 L60 10 L90 90 L80 90 Z" />
     <path d="M45 50 L55 50 L100 50 L0 50" stroke="currentColor" strokeWidth="5" />
  </svg>
);

export const GAMES: Game[] = [
  { id: 'farlight84', name: 'Farlight 84', logo: <FarlightLogo /> },
  { id: 'bgmi', name: 'BGMI', logo: <BGMILogo /> },
  { id: 'freefire', name: 'Free Fire', logo: <FreeFireLogo /> },
  { id: 'valorant', name: 'Valorant', logo: <ValorantLogo /> },
];
