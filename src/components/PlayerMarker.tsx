
import React from 'react';
import { Player } from '@/types';

interface PlayerMarkerProps {
  player: Player;
  teamColor: string;
  position: { x: number; y: number };
  onClick?: (player: Player) => void;
  selected?: boolean;
  hasBall?: boolean;
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({ 
  player, 
  teamColor, 
  position, 
  onClick, 
  selected = false,
  hasBall = false 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(player);
    }
  };

  return (
    <div
      className={`absolute w-[5%] aspect-square rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all ${
        selected ? 'ring-2 ring-white scale-110' : ''
      } ${
        hasBall ? 'ring-4 ring-yellow-300 animate-pulse' : ''
      }`}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        backgroundColor: teamColor,
        color: teamColor === '#1A365D' ? 'white' : 'white',
        boxShadow: hasBall ? '0 0 10px rgba(255, 255, 0, 0.6)' : 'none'
      }}
      onClick={handleClick}
    >
      {player.number}
    </div>
  );
};

export default PlayerMarker;
