import React from 'react';

interface RecoilPatternDisplayProps {
  pattern: { x: number; y: number }[];
}

const RecoilPatternDisplay: React.FC<RecoilPatternDisplayProps> = ({ pattern }) => {
  if (pattern.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h4 className="text-lg font-semibold text-white mb-2 text-center">Recoil Pattern</h4>
        <div className="flex items-center justify-center flex-grow w-full bg-gray-900/50 rounded-lg">
            <p className="text-brand-text-muted">Not enough data to display pattern.</p>
        </div>
      </div>
    );
  }

  const width = 250;
  const height = 250;
  const padding = 20;

  // The pattern starts near (0,0) and goes mostly negative Y (up) and some X
  const allX = pattern.map(p => p.x);
  const allY = pattern.map(p => p.y);

  const minX = Math.min(0, ...allX);
  const maxX = Math.max(0, ...allX);
  const minY = Math.min(0, ...allY);
  const maxY = Math.max(0, ...allY); 

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const maxRange = Math.max(rangeX, rangeY, 1); // Avoid division by zero

  const scale = (Math.min(width, height) - padding * 2) / maxRange;

  const getSvgX = (x: number) => (width / 2) + (x - (minX + rangeX / 2)) * scale;
  const getSvgY = (y: number) => (height / 2) - (y - (minY + rangeY / 2)) * -scale; // Double invert Y-axis to go up

  const pathData = pattern
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getSvgX(p.x)} ${getSvgY(p.y)}`)
    .join(' ');
    
  const startPoint = pattern[0];
  const endPoint = pattern[pattern.length-1];

  return (
    <div className="w-full h-full flex flex-col">
      <h4 className="text-lg font-semibold text-white mb-2 text-center">Recoil Pattern</h4>
      <div className="flex-grow flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[250px] mx-auto bg-gray-900/50 rounded-lg" aria-labelledby="recoil-title" role="img">
          <title id="recoil-title">A line chart showing the uncompensated recoil pattern.</title>
          <defs>
            <linearGradient id="recoil-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          
          {/* Center crosshair */}
          <line x1={width/2 - 10} y1={height/2} x2={width/2 + 10} y2={height/2} stroke="#4B5563" strokeWidth="1" />
          <line x1={width/2} y1={height/2 - 10} x2={width/2} y2={height/2 + 10} stroke="#4B5563" strokeWidth="1" />

          <path d={pathData} fill="none" stroke="url(#recoil-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Start Point */}
          <circle cx={getSvgX(startPoint.x)} cy={getSvgY(startPoint.y)} r="4" fill="#22D3EE">
             <title>Start of spray</title>
          </circle>
          {/* End Point */}
          <circle cx={getSvgX(endPoint.x)} cy={getSvgY(endPoint.y)} r="4" fill="#EF4444">
             <title>End of spray</title>
          </circle>
        </svg>
      </div>
      <p className="text-xs text-center text-brand-text-muted mt-2 px-4">This shows the path your aim would take if you didn't compensate for recoil.</p>
    </div>
  );
};

export default RecoilPatternDisplay;
