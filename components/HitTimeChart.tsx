import React, { useRef, useEffect, useState } from 'react';

interface HitTimeChartProps {
  hitTimes: number[];
  avgHitTime: number;
}

const HitTimeChart: React.FC<HitTimeChartProps> = ({ hitTimes, avgHitTime }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, [hitTimes]);

  if (hitTimes.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h4 className="text-lg font-semibold text-brand-text mb-2 text-center">Time-to-Hit Consistency</h4>
        <div className="flex items-center justify-center flex-grow w-full bg-brand-bg/30 rounded-lg">
            <p className="text-brand-text-muted">Not enough data for a chart.</p>
        </div>
      </div>
    );
  }

  const width = 500;
  const height = 250;
  const padding = { top: 20, right: 60, bottom: 30, left: 40 };

  const maxValue = Math.max(...hitTimes, avgHitTime);
  const minValue = Math.min(...hitTimes);

  const yRange = maxValue - minValue;
  const yMax = maxValue + yRange * 0.1;
  const yMin = Math.max(0, minValue - yRange * 0.1);

  const getX = (index: number) => {
    return padding.left + (index / (hitTimes.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (time: number) => {
    if (yMax === yMin) return height - padding.bottom;
    return height - padding.bottom - ((time - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);
  };
  
  const linePath = hitTimes.map((time, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(time)}`).join(' ');

  const avgY = getY(avgHitTime);

  return (
    <div className="w-full h-full flex flex-col">
        <h4 className="text-lg font-semibold text-brand-text mb-2 text-center">Time-to-Hit Consistency</h4>
        <div className="flex-grow">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-labelledby="chart-title" role="img">
                <title id="chart-title">A line chart showing the time taken to hit each target.</title>
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#334155" strokeWidth="1"/>
                <line x1={padding.left} y1={height - padding.bottom} x2={width-padding.right} y2={height - padding.bottom} stroke="#334155" strokeWidth="1"/>
                
                <text x={padding.left - 8} y={getY(yMax) + 5} textAnchor="end" fill="#94a3b8" fontSize="12">{yMax.toFixed(0)}ms</text>
                <text x={padding.left - 8} y={getY(yMin) + 5} textAnchor="end" fill="#94a3b8" fontSize="12">{yMin.toFixed(0)}ms</text>
                
                <text x={padding.left} y={height - padding.bottom + 15} textAnchor="start" fill="#94a3b8" fontSize="12">Start</text>
                <text x={width - padding.right} y={height - padding.bottom + 15} textAnchor="end" fill="#94a3b8" fontSize="12">End</text>
                
                <g>
                    <line x1={padding.left} y1={avgY} x2={width - padding.right} y2={avgY} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" />
                    <text x={width - padding.right + 8} y={avgY + 4} fill="#8b5cf6" fontSize="12">Avg: {avgHitTime.toFixed(0)}ms</text>
                </g>

                <path d={`${linePath} V ${height - padding.bottom} H ${padding.left} Z`} fill="url(#gradient)" />

                <path
                  ref={pathRef}
                  d={linePath}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2"
                  style={{
                    strokeDasharray: pathLength,
                    strokeDashoffset: pathLength,
                  }}
                  className={pathLength > 0 ? 'animate-draw' : ''}
                />
                
                {hitTimes.map((time, index) => (
                    <circle key={index} cx={getX(index)} cy={getY(time)} r="3" fill="#22d3ee" stroke="#1e293b" strokeWidth="1">
                        <title>Target {index+1}: {time.toFixed(0)}ms</title>
                    </circle>
                ))}
            </svg>
        </div>
    </div>
  );
};

export default HitTimeChart;