
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import CircularMenu from './CircularMenu';
import { Button } from './ui/button';

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
  };
  
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Right click detected on player:", player.name);
    
    // Only show the circular menu on right-click when onEventSelect is available
    if (onEventSelect) {
      setShowMenu(true);
    }
  };
  
  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onEventSelect) {
      console.log("Menu button clicked for player:", player.name);
      setShowMenu(true);
    }
  };
  
  const handleMenuSelect = (eventType: EventType) => {
    if (onEventSelect) {
      console.log("Event selected:", eventType, "for player:", player.name);
      onEventSelect(eventType, player, position);
    }
    setShowMenu(false);
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
        onContextMenu={handleRightClick}
      >
        {player.number}
        
        {/* Action menu button that appears when player is selected */}
        {selected && onEventSelect && (
          <div 
            className="absolute -bottom-7 left-1/2 transform -translate-x-1/2"
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 rounded-full p-0 bg-white shadow-md hover:bg-gray-100"
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
        />
      )}
    </>
  );
};

export default PlayerMarker;
