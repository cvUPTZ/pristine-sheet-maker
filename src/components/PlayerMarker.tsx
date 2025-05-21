
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
  const isSmall = useBreakpoint('sm');
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(player);
    }
  };
  
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show the circular menu on right-click when onEventSelect is available
    if (onEventSelect) {
      setShowMenu(true);
    }
  };
  
  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onEventSelect) {
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
          selected ? 'ring-2 ring-white scale-110' : ''
        } ${
          hasBall ? 'ring-4 ring-yellow-300 animate-pulse' : ''
        } ${
          showMenu ? 'opacity-75' : 'opacity-100'
        } touch-manipulation`} // Added touch-manipulation for better touch experience
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          backgroundColor: teamColor,
          color: teamColor === '#1A365D' ? 'white' : 'white',
          boxShadow: hasBall ? '0 0 10px rgba(255, 255, 0, 0.6)' : 'none',
          fontSize: isSmall ? '0.65rem' : '0.75rem' // Slightly smaller font on mobile
        }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      >
        {player.number}
        
        {/* Action menu button that appears when player is selected */}
        {selected && onEventSelect && (
          <div 
            className={`absolute ${isSmall ? '-bottom-5' : '-bottom-7'} left-1/2 transform -translate-x-1/2`}
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="sm"
              className={`${isSmall ? 'h-5 w-5' : 'h-6 w-6'} rounded-full p-0 bg-white shadow-md hover:bg-gray-100`}
              onClick={handleMenuButtonClick}
            >
              +
            </Button>
          </div>
        )}
      </div>
      
      {/* Circular menu for actions - shown on right-click or button click */}
      {showMenu && (
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
