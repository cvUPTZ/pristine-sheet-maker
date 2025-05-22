
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import CircularMenu from './CircularMenu';
import { Button } from './ui/button';
import { useBreakpoint } from '@/hooks/use-mobile';

interface PlayerMarkerProps {
  player: Player;
  teamColor: string;
  position: { x: number; y: number };
  onClick?: (player: Player) => void;
  selected?: boolean;
  hasBall?: boolean;
  onEventSelect?: (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => void;
  allowCircularMenu?: boolean;
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({ 
  player, 
  teamColor, 
  position, 
  onClick, 
  selected = false,
  hasBall = false,
  onEventSelect,
  allowCircularMenu = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isSmall = useBreakpoint('sm');
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(player);
    }
    
    // Show the circular menu immediately on player click if allowed
    if (selected && onEventSelect && allowCircularMenu) {
      setShowMenu(true);
    }
  };
  
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show the circular menu on right-click when onEventSelect is available AND allowCircularMenu is true
    if (onEventSelect && allowCircularMenu) {
      setShowMenu(true);
    }
  };
  
  const handleMenuSelect = (eventType: EventType) => {
    if (onEventSelect) {
      onEventSelect(eventType, player, position);
    }
    setShowMenu(false);
  };

  const markerSize = isSmall ? 'w-[6%]' : 'w-[5%]';

  return (
    <>
      <div
        className={`absolute ${markerSize} aspect-square rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all ${
          selected ? 'ring-2 ring-white scale-110' : 'opacity-70'
        } ${
          hasBall ? 'ring-4 ring-yellow-300 animate-pulse' : ''
        } ${
          showMenu ? 'opacity-75' : selected ? 'opacity-100' : 'opacity-70'
        } touch-manipulation`}
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          backgroundColor: teamColor,
          color: teamColor === '#1A365D' ? 'white' : 'white',
          boxShadow: hasBall ? '0 0 10px rgba(255, 255, 0, 0.6)' : selected ? '0 0 15px rgba(255, 255, 255, 0.8)' : 'none',
          fontSize: isSmall ? '0.65rem' : '0.75rem'
        }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        {player.number}
      </div>
      
      {/* Circular menu for actions - shown on player click or right-click */}
      {showMenu && allowCircularMenu && (
        <CircularMenu 
          visible={showMenu} 
          position={position}
          onSelect={handleMenuSelect} 
          onClose={() => setShowMenu(false)} 
          isMobile={isSmall}
        />
      )}
    </>
  );
};

export default PlayerMarker;
