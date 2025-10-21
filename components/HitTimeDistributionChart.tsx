import React from 'react';

interface HitTimeDistributionChartProps {
  hitTimes: number[];
}

const HitTimeDistributionChart: React.FC<HitTimeDistributionChartProps> = ({ hitTimes }) => {
  if (hitTimes.length < 5) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h4 className="text-lg font-semibold text-brand-text mb-2 text-center">Hit Time Distribution</h4>
        <div className="flex items-center justify-center flex-grow w-full bg-brand-bg/30 rounded-lg">
            <p className="text-brand-text-muted">Not enough data for a chart.</p>
        </div>
      </div>
    );
  }

  const minTime = Math.min(...hitTimes);
  const maxTime = Math.max(...hitTimes);
  const numBins = Math.min(10, Math.max(5, Math.floor(hitTimes.length / 3)));
  
  const binWidth = (maxTime - minTime) / numBins || 1;
  
  const bins = Array.from({ length: numBins }, (_, i) => ({
    min: minTime + i * binWidth,
    count: 0,
  }));

  for (const time of hitTimes) {
    let binIndex = Math.floor((time - minTime) / binWidth);
    if (binIndex >= numBins) {
        binIndex = numBins - 1;
    }
     if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex].count++;
    }
  }

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
      <h4 className="text-lg font-semibold text-brand-text mb-2 text-center">Hit Time Distribution</h4>
      <div className="flex-grow">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-labelledby="dist-chart-title" role="img">
          <title id="dist-chart-title">A histogram showing the distribution of hit times.</title>
          
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#334155" />
            <text x="-8" y={yScale(maxCount)} textAnchor="end" fill="#94a3b8" fontSize="12">{maxCount}</text>
            <text x="-8" y={yScale(0) + 4} textAnchor="end" fill="#94a3b8" fontSize="12">0</text>
            <text transform="rotate(-90)" y="-30" x={-(chartHeight / 2)} textAnchor="middle" fill="#94a3b8" fontSize="12" dy="1em">Hit Count</text>

            <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#334155" />
            {bins.map((bin, i) => (
              (i % 2 === 0) && <text key={i} x={i * barWidth + barWidth / 2} y={chartHeight + 15} textAnchor="middle" fill="#94a3b8" fontSize="12">{bin.min.toFixed(0)}</text>
            ))}
             <text x={chartWidth} y={chartHeight + 15} textAnchor="end" fill="#94a3b8" fontSize="12">{maxTime.toFixed(0)}</text>
            <text x={chartWidth / 2} y={chartHeight + 35} textAnchor="middle" fill="#94a3b8" fontSize="12">Time to Hit (ms)</text>

            {bins.map((bin, i) => (
              <rect
                key={i}
                x={i * barWidth + 2}
                y={yScale(bin.count)}
                width={barWidth - 4}
                height={chartHeight - yScale(bin.count)}
                fill="#22d3ee"
                className="opacity-80 hover:opacity-100 transition-opacity animate-grow-up"
                style={{ animationDelay: `${i * 40}ms` }}
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