
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import CircularMenu from './CircularMenu';

interface PlayerMarkerProps {
  player: Player;
  teamColor: string;
  position: { x: number; y: number };
  onClick?: (player: Player) => void;
  selected?: boolean;
  hasBall?: boolean;
  onEventSelect?: (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => void;
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({ 
  player, 
  teamColor, 
  position, 
  onClick, 
  selected = false,
  hasBall = false,
  onEventSelect
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(player);
    }
    
    if (onEventSelect) {
      setShowMenu(true);
    }
  };
  
  const handleMenuSelect = (eventType: EventType) => {
    if (onEventSelect) {
      onEventSelect(eventType, player, position);
    }
  };

  return (
    <>
      <div
        className={`absolute w-[5%] aspect-square rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all ${
          selected ? 'ring-2 ring-white scale-110' : ''
        } ${
          hasBall ? 'ring-4 ring-yellow-300 animate-pulse' : ''
        } ${
          showMenu ? 'opacity-75' : 'opacity-100'
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
      
      {/* Circular menu for actions */}
      <CircularMenu 
        visible={showMenu} 
        onSelect={handleMenuSelect} 
        onClose={() => setShowMenu(false)} 
      />
    </>
  );
};

export default PlayerMarker;
