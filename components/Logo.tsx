import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 400 100" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-labelledby="logo-title"
    >
      <title id="logo-title">Game Sensei Logo</title>
      
      {/* Katana Blade - simple representation */}
      <rect x="10" y="48" width="380" height="4" fill="#94a3b8" />
      <rect x="10" y="46" width="380" height="2" fill="#e2e8f0" />
      
      {/* Katana Hilt */}
      <rect x="0" y="44" width="20" height="12" fill="#334155" />
      <rect x="20" y="42" width="8" height="16" fill="#1e293b" />
      
      {/* Text - Knewave font is imported in index.html */}
      <text
        x="200"
        y="70"
        fontFamily="'Knewave', system-ui"
        fontSize="60"
        fill="#e2e8f0"
        textAnchor="middle"
        stroke="#0f172a"
        strokeWidth="2"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        Game Sensei
      </text>
    </svg>
  );
};

export default Logo;
