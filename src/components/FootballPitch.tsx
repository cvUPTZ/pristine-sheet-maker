
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Team, BallTrackingPoint } from '@/types';

interface PitchProps {
  onCoordinateClick?: (x: number, y: number) => void;
  homeTeam?: Team;
  awayTeam?: Team;
  ballTrackingData?: BallTrackingPoint[];
}

const FootballPitch: React.FC<PitchProps> = ({ onCoordinateClick, homeTeam, awayTeam, ballTrackingData }) => {
  const handleClick = (event: React.MouseEvent<SVGElement>) => {
    if (!onCoordinateClick) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    onCoordinateClick(x, y);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <svg
          viewBox="0 0 100 60"
          className="w-full h-auto border border-green-600 bg-green-100 cursor-pointer"
          onClick={handleClick}
        >
          {/* Pitch outline */}
          <rect x="0" y="0" width="100" height="60" fill="none" stroke="#059669" strokeWidth="0.2"/>
          
          {/* Center line */}
          <line x1="50" y1="0" x2="50" y2="60" stroke="#059669" strokeWidth="0.2"/>
          
          {/* Center circle */}
          <circle cx="50" cy="30" r="9" fill="none" stroke="#059669" strokeWidth="0.2"/>
          
          {/* Penalty areas */}
          <rect x="0" y="18" width="16" height="24" fill="none" stroke="#059669" strokeWidth="0.2"/>
          <rect x="84" y="18" width="16" height="24" fill="none" stroke="#059669" strokeWidth="0.2"/>
          
          {/* Goal areas */}
          <rect x="0" y="24" width="5" height="12" fill="none" stroke="#059669" strokeWidth="0.2"/>
          <rect x="95" y="24" width="5" height="12" fill="none" stroke="#059669" strokeWidth="0.2"/>
          
          {/* Goals */}
          <rect x="-1" y="27" width="1" height="6" fill="none" stroke="#059669" strokeWidth="0.2"/>
          <rect x="100" y="27" width="1" height="6" fill="none" stroke="#059669" strokeWidth="0.2"/>
          
          {/* Penalty spots */}
          <circle cx="11" cy="30" r="0.5" fill="#059669"/>
          <circle cx="89" cy="30" r="0.5" fill="#059669"/>
        </svg>
      </CardContent>
    </Card>
  );
};

export default FootballPitch;
