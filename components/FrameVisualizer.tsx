
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, UserSquare } from 'lucide-react';
import type { VisualDataPoint } from '../types';

interface FrameVisualizerProps {
  frames: string[];
  visualData: VisualDataPoint[];
}

const FrameVisualizer: React.FC<FrameVisualizerProps> = ({ frames, visualData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? frames.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev === frames.length - 1 ? 0 : prev + 1));
  };

  const currentFrameData = visualData.find(d => d.frame_index === currentIndex);

  return (
    <div className="w-full mt-8">
      <h3 className="text-xl font-bold text-brand-primary mb-4">
        Visual Breakdown
      </h3>
       <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-700">
         <img
           src={`data:image/jpeg;base64,${frames[currentIndex]}`}
           alt={`Gameplay frame ${currentIndex + 1}`}
           className="w-full h-full object-contain"
         />
         <div className="absolute inset-0 w-full h-full">
            {/* Crosshair Overlay */}
            {currentFrameData?.crosshair && (
              <div 
                className="absolute text-green-400 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ 
                    left: `${currentFrameData.crosshair.x * 100}%`, 
                    top: `${currentFrameData.crosshair.y * 100}%`,
                }}
              >
                <Crosshair size={24} strokeWidth={2.5}/>
              </div>
            )}
            {/* Enemy Bounding Boxes */}
            {currentFrameData?.enemies.map((enemy, index) => (
              <div
                key={index}
                className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                style={{
                  left: `${enemy.x * 100}%`,
                  top: `${enemy.y * 100}%`,
                  width: `${enemy.width * 100}%`,
                  height: `${enemy.height * 100}%`,
                }}
              ></div>
            ))}
         </div>
       </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={goToPrevious} className="flex items-center px-4 py-2 bg-brand-secondary text-black rounded-lg hover:bg-indigo-400 transition-colors duration-300 font-semibold">
          <ChevronLeft size={20} className="mr-1" />
          Previous
        </button>
        <div className="text-center font-semibold">
          <p className="text-white">Frame {currentIndex + 1} / {frames.length}</p>
          <div className="flex justify-center items-center space-x-2 mt-1">
             {currentFrameData?.crosshair && <span className="text-xs text-green-400 flex items-center"><Crosshair size={12} className="mr-1"/> Crosshair</span>}
             {currentFrameData?.enemies && currentFrameData.enemies.length > 0 && <span className="text-xs text-red-500 flex items-center"><UserSquare size={12} className="mr-1"/> Enemies ({currentFrameData.enemies.length})</span>}
          </div>
        </div>
        <button onClick={goToNext} className="flex items-center px-4 py-2 bg-brand-secondary text-black rounded-lg hover:bg-indigo-400 transition-colors duration-300 font-semibold">
          Next
          <ChevronRight size={20} className="ml-1" />
        </button>
      </div>
    </div>
  );
};

export default FrameVisualizer;
