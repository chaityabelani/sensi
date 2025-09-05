
import React from 'react';

interface MissData {
    offsetX: number;
    offsetY: number;
}

interface MissScatterPlotProps {
  misses: MissData[];
  targetSize: number;
}

const MissScatterPlot: React.FC<MissScatterPlotProps> = ({ misses, targetSize }) => {
    if (misses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h4 className="text-lg font-semibold text-white mb-2 text-center">Miss Distribution</h4>
                <div className="flex items-center justify-center flex-grow w-full bg-gray-900/50 rounded-lg">
                    <p className="text-brand-text-muted">No misses to analyze. Great job!</p>
                </div>
            </div>
        );
    }

    const size = 200;
    const center = size / 2;
    const targetRadius = targetSize / 2;

    // Find max offset to scale the plot so it fits nicely
    const maxOffset = misses.reduce((max, miss) => {
        return Math.max(max, Math.abs(miss.offsetX), Math.abs(miss.offsetY));
    }, targetRadius * 1.5); // Default scale to be 1.5x the target radius
    
    const scale = (center - 10) / maxOffset;

    return (
        <div className="w-full h-full flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-2 text-center">Miss Distribution</h4>
            <div className="flex-grow flex flex-col items-center justify-center">
                 <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[200px] mx-auto" aria-labelledby="scatter-title" role="img">
                    <title id="scatter-title">A scatter plot showing where misses landed relative to the target's center.</title>
                    {/* Background & crosshairs */}
                    <circle cx={center} cy={center} r={center - 1} fill="#1F2937" stroke="#4B5563" />
                    <line x1={center} y1="0" x2={center} y2={size} stroke="#4B5563" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="0" y1={center} x2={size} y2={center} stroke="#4B5563" strokeWidth="1" strokeDasharray="2 2" />

                    {/* Target Area */}
                    <circle cx={center} cy={center} r={targetRadius * scale} fill="none" stroke="#22D3EE" strokeOpacity="0.5" strokeWidth="2" />
                    <circle cx={center} cy={center} r={(targetRadius / 2) * scale} fill="#22D3EE" strokeOpacity="0.3" />

                    {/* Misses */}
                    {misses.map((miss, index) => (
                        <circle 
                            key={index} 
                            cx={center + miss.offsetX * scale} 
                            cy={center + miss.offsetY * scale} 
                            r="3" 
                            fill="#EF4444"
                            opacity="0.8"
                        >
                           <title>Miss {index+1}: Offset X: {miss.offsetX.toFixed(0)}, Y: {miss.offsetY.toFixed(0)}</title>
                        </circle>
                    ))}
                </svg>
                 <p className="text-xs text-center text-brand-text-muted mt-2 px-4">Each red dot shows a miss relative to the target's center.</p>
            </div>
        </div>
    );
};

export default MissScatterPlot;
