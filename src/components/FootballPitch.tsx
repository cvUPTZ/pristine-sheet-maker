
import React, { useState } from 'react';

interface FootballPitchProps {
  onClick?: (coordinates: { x: number; y: number }) => void;
  children?: React.ReactNode;
}

const FootballPitch: React.FC<FootballPitchProps> = ({ onClick, children }) => {
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number} | null>(null);
  
  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    onClick({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setHoverPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  return (
    <div 
      className="relative w-full aspect-[68/105] bg-gradient-to-b from-football-pitch to-[#2a7d35] rounded-md overflow-hidden border-2 border-white shadow-lg"
      onClick={handlePitchClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Enhanced stadium atmosphere */}
      <div className="absolute inset-0 bg-[url('/stadium-bg.png')] bg-cover opacity-30 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none"></div>
      
      {/* Stadium crowd */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-5 -right-5 h-20 bg-crowd-pattern opacity-40"></div>
        <div className="absolute -bottom-10 -left-5 -right-5 h-20 bg-crowd-pattern opacity-40"></div>
        <div className="absolute -left-10 top-0 bottom-0 w-20 bg-crowd-pattern opacity-40"></div>
        <div className="absolute -right-10 top-0 bottom-0 w-20 bg-crowd-pattern opacity-40"></div>
      </div>
      
      {/* Field patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      </div>
      
      {/* Light effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Pitch markings */}
      <div className="absolute inset-0">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full border-2 border-white/80" />
        
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/80 transform -translate-y-1/2" />
        
        {/* Center spot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1.5%] aspect-square rounded-full bg-white/80" />
        
        {/* Penalty areas */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[66%] h-[20%] border-b-2 border-r-2 border-l-2 border-white/80" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[66%] h-[20%] border-t-2 border-r-2 border-l-2 border-white/80" />
        
        {/* Goal areas */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[33%] h-[8%] border-b-2 border-r-2 border-l-2 border-white/80" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[33%] h-[8%] border-t-2 border-r-2 border-l-2 border-white/80" />
        
        {/* Penalty spots */}
        <div className="absolute top-[11%] left-1/2 transform -translate-x-1/2 w-[1%] aspect-square rounded-full bg-white/80" />
        <div className="absolute bottom-[11%] left-1/2 transform -translate-x-1/2 w-[1%] aspect-square rounded-full bg-white/80" />
        
        {/* Penalty arcs */}
        <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[40%] h-[15%] border-b-2 border-white/80 rounded-b-full" style={{ clipPath: 'inset(50% 0 0 0)' }} />
        <div className="absolute bottom-[20%] left-1/2 transform -translate-x-1/2 translate-y-1/2 w-[40%] h-[15%] border-t-2 border-white/80 rounded-t-full" style={{ clipPath: 'inset(0 0 50% 0)' }} />
        
        {/* Corner arcs */}
        <div className="absolute top-0 left-0 w-[5%] h-[3%] border-r-2 border-white/80 rounded-br-full" />
        <div className="absolute top-0 right-0 w-[5%] h-[3%] border-l-2 border-white/80 rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-[5%] h-[3%] border-r-2 border-white/80 rounded-tr-full" />
        <div className="absolute bottom-0 right-0 w-[5%] h-[3%] border-l-2 border-white/80 rounded-tl-full" />
        
        {/* Goals */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[20%] h-[2%] border-2 border-t-0 border-white/80 bg-white/10 shadow-inner" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[20%] h-[2%] border-2 border-b-0 border-white/80 bg-white/10 shadow-inner" />
        
        {/* Goal nets (subtle effect) */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[20%] h-[2%] bg-[linear-gradient(0deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:5px_5px] opacity-80" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[20%] h-[2%] bg-[linear-gradient(0deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:5px_5px] opacity-80" />
      </div>
      
      {/* Coordinate indicator */}
      {hoverPosition && (
        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
          {hoverPosition.x.toFixed(2)}, {hoverPosition.y.toFixed(2)}
        </div>
      )}
      
      {children}
    </div>
  );
};

export default FootballPitch;
