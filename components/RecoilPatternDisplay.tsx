import React, { useRef, useEffect, useState } from 'react';

interface RecoilPatternDisplayProps {
  pattern: { x: number; y: number }[];
  title?: string;
}

const RecoilPatternDisplay: React.FC<RecoilPatternDisplayProps> = ({ pattern, title = "Aim Drift Pattern" }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        setPathLength(length);
    }
  }, [pattern]);

  if (pattern.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h4 className="text-lg font-semibold text-brand-text mb-2 text-center">{title}</h4>
        <div className="flex items-center justify-center flex-grow w-full bg-brand-bg/30 rounded-lg">
            <p className="text-brand-text-muted">Not enough miss data to display pattern.</p>
        </div>
      </div>
    );
  }

  const width = 250;
  const height = 250;
  const padding = 20;

  const allX = pattern.map(p => p.x);
  const allY = pattern.map(p => p.y);

  const minX = Math.min(0, ...allX);
  const maxX = Math.max(0, ...allX);
  const minY = Math.min(0, ...allY);
  const maxY = Math.max(0, ...allY); 

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const maxRange = Math.max(rangeX, rangeY, 1);

  const scale = (Math.min(width, height) - padding * 2) / maxRange;

  const getSvgX = (x: number) => (width / 2) + (x - (minX + rangeX / 2)) * scale;
  const getSvgY = (y: number) => (height / 2) - (y - (minY + rangeY / 2)) * -scale;

  const pathData = pattern
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getSvgX(p.x)} ${getSvgY(p.y)}`)
    .join(' ');
    
  const startPoint = pattern[0];
  const endPoint = pattern[pattern.length-1];

  return (
    <div className="w-full h-full flex flex-col">
      <h4 className="text-lg font-semibold text-brand-text mb-2 text-center">{title}</h4>
      <div className="flex-grow flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-[250px] mx-auto bg-brand-bg/30 rounded-lg" aria-labelledby="recoil-title" role="img">
          <title id="recoil-title">A line chart showing the drift of your aim during consecutive misses.</title>
          <defs>
            <linearGradient id="recoil-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          
          <line x1={width/2 - 10} y1={height/2} x2={width/2 + 10} y2={height/2} stroke="#334155" strokeWidth="1" />
          <line x1={width/2} y1={height/2 - 10} x2={width/2} y2={height/2 + 10} stroke="#334155" strokeWidth="1" />

          <path
            ref={pathRef}
            d={pathData}
            fill="none"
            stroke="url(#recoil-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength,
            }}
            className={pathLength > 0 ? 'animate-draw' : ''}
          />
          
          <circle cx={getSvgX(startPoint.x)} cy={getSvgY(startPoint.y)} r="4" fill="#22d3ee">
             <title>First miss</title>
          </circle>
          <circle cx={getSvgX(endPoint.x)} cy={getSvgY(endPoint.y)} r="4" fill="#8b5cf6">
             <title>Last miss</title>
          </circle>
        </svg>
      </div>
      <p className="text-xs text-center text-brand-text-muted mt-2 px-4">This path connects your misses in sequence, revealing any consistent aiming drift.</p>
    </div>
  );
};

export default RecoilPatternDisplay;
