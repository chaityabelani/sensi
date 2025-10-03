import React from 'react';

interface HitTimeDistributionChartProps {
  hitTimes: number[];
}

const HitTimeDistributionChart: React.FC<HitTimeDistributionChartProps> = ({ hitTimes }) => {
  if (hitTimes.length < 5) { // Need a few data points for a meaningful distribution
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h4 className="text-lg font-semibold text-white mb-2 text-center">Hit Time Distribution</h4>
        <div className="flex items-center justify-center flex-grow w-full bg-gray-900/50 rounded-lg">
            <p className="text-brand-text-muted">Not enough data for a chart.</p>
        </div>
      </div>
    );
  }

  // 1. Binning the data
  const minTime = Math.min(...hitTimes);
  const maxTime = Math.max(...hitTimes);
  const numBins = Math.min(10, Math.max(5, Math.floor(hitTimes.length / 3))); // Dynamic number of bins
  
  const binWidth = (maxTime - minTime) / numBins || 1; // Avoid division by zero
  
  const bins = Array.from({ length: numBins }, (_, i) => ({
    min: minTime + i * binWidth,
    count: 0,
  }));

  for (const time of hitTimes) {
    let binIndex = Math.floor((time - minTime) / binWidth);
    if (binIndex >= numBins) {
        binIndex = numBins - 1; // Place max value in the last bin
    }
     if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex].count++;
    }
  }

  // 2. SVG constants
  const width = 500;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / numBins;

  const maxCount = Math.max(...bins.map(b => b.count));
  
  const yScale = (count: number) => {
    if (maxCount === 0) return chartHeight;
    return chartHeight - (count / maxCount) * chartHeight;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h4 className="text-lg font-semibold text-white mb-2 text-center">Hit Time Distribution</h4>
      <div className="flex-grow">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-labelledby="dist-chart-title" role="img">
          <title id="dist-chart-title">A histogram showing the distribution of hit times.</title>
          
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Y-axis with labels */}
            <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#4B5563" />
            <text x="-8" y={yScale(maxCount)} textAnchor="end" fill="#9CA3AF" fontSize="12">{maxCount}</text>
            <text x="-8" y={yScale(0) + 4} textAnchor="end" fill="#9CA3AF" fontSize="12">0</text>
            <text 
                transform="rotate(-90)" 
                y="-30" 
                x={-(chartHeight / 2)} 
                textAnchor="middle" 
                fill="#9CA3AF" 
                fontSize="12"
                dy="1em"
            >
                Hit Count
            </text>

            {/* X-axis with labels */}
            <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#4B5563" />
            {bins.map((bin, i) => (
              (i % 2 === 0) && <text 
                key={i} 
                x={i * barWidth + barWidth / 2} 
                y={chartHeight + 15} 
                textAnchor="middle" 
                fill="#9CA3AF" 
                fontSize="12"
              >
                {bin.min.toFixed(0)}
              </text>
            ))}
             <text 
                x={chartWidth} 
                y={chartHeight + 15} 
                textAnchor="end" 
                fill="#9CA3AF" 
                fontSize="12"
              >
                {maxTime.toFixed(0)}
              </text>
            <text 
                x={chartWidth / 2} 
                y={chartHeight + 35} 
                textAnchor="middle" 
                fill="#9CA3AF" 
                fontSize="12"
            >
                Time to Hit (ms)
            </text>

            {/* Bars */}
            {bins.map((bin, i) => (
              <rect
                key={i}
                x={i * barWidth + 2} // Small gap
                y={yScale(bin.count)}
                width={barWidth - 4} // Small gap
                height={chartHeight - yScale(bin.count)}
                fill="#22D3EE"
                className="opacity-80 hover:opacity-100 transition-opacity"
              >
                 <title>Range: {bin.min.toFixed(0)}-{(bin.min + binWidth).toFixed(0)}ms, Count: {bin.count}</title>
              </rect>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default HitTimeDistributionChart;
