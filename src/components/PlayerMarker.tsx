
import React from 'react';
import { Player } from '@/types';

interface PlayerMarkerProps {
  player: Player;
  teamColor: string;
  position: { x: number; y: number };
  onClick?: (player: Player) => void;
  selected?: boolean;
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({ 
  player, 
  teamColor, 
  position, 
  onClick, 
  selected = false 
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
      }`}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        backgroundColor: teamColor,
        color: teamColor === '#1A365D' ? 'white' : 'white'
      }}
      onClick={handleClick}
    >
      {player.number}
    </div>
  );
};

export default PlayerMarker;
