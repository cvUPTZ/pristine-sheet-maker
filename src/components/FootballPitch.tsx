
import React from 'react';

interface FootballPitchProps {
  onClick?: (coordinates: { x: number; y: number }) => void;
  children?: React.ReactNode;
}

const FootballPitch: React.FC<FootballPitchProps> = ({ onClick, children }) => {
  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    onClick({ x, y });
  };

  return (
    <div 
      className="relative w-full aspect-[68/105] bg-football-pitch rounded-md overflow-hidden border-2 border-football-line"
      onClick={handlePitchClick}
    >
      {/* Pitch markings */}
      <div className="absolute inset-0">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full border-2 border-football-line" />
        
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-football-line transform -translate-y-1/2" />
        
        {/* Center spot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1%] aspect-square rounded-full bg-football-line" />
        
        {/* Penalty areas */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[66%] h-[20%] border-b-2 border-r-2 border-l-2 border-football-line" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[66%] h-[20%] border-t-2 border-r-2 border-l-2 border-football-line" />
        
        {/* Goal areas */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[33%] h-[8%] border-b-2 border-r-2 border-l-2 border-football-line" />
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[33%] h-[8%] border-t-2 border-r-2 border-l-2 border-football-line" />
        
        {/* Penalty spots */}
        <div className="absolute top-[11%] left-1/2 transform -translate-x-1/2 w-[1%] aspect-square rounded-full bg-football-line" />
        <div className="absolute bottom-[11%] left-1/2 transform -translate-x-1/2 w-[1%] aspect-square rounded-full bg-football-line" />
        
        {/* Corner arcs */}
        <div className="absolute top-0 left-0 w-[5%] h-[3%] border-r-2 border-football-line rounded-br-full" />
        <div className="absolute top-0 right-0 w-[5%] h-[3%] border-l-2 border-football-line rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-[5%] h-[3%] border-r-2 border-football-line rounded-tr-full" />
        <div className="absolute bottom-0 right-0 w-[5%] h-[3%] border-l-2 border-football-line rounded-tl-full" />
      </div>
      
      {children}
    </div>
  );
};

export default FootballPitch;
