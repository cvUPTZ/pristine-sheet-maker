
import React, { useState } from 'react';
import { Player, EventType } from '@/types';
import CircularMenu from './CircularMenu';
import { MoreHorizontal } from 'lucide-react';

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
  
  const handleMenuSelect = (eventType: EventType) => {
    if (onEventSelect) {
      console.log("Event selected:", eventType, "for player:", player.name);
      onEventSelect(eventType, player, position);
    }
    setShowMenu(false);
  };

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEventSelect) {
      setShowMenu(true);
    }
  };

  return (
    <>
      <div className="absolute" style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 30
      }}>
        <div
          className={`w-[5%] aspect-square rounded-full flex items-center justify-center text-xs font-bold cursor-pointer ${
            selected ? 'ring-2 ring-white scale-110' : ''
          } ${
            hasBall ? 'ring-4 ring-yellow-300 animate-pulse' : ''
          } ${
            showMenu ? 'opacity-75' : 'opacity-100'
          }`}
          style={{
            backgroundColor: teamColor,
            color: teamColor === '#1A365D' ? 'white' : 'white',
            boxShadow: hasBall ? '0 0 10px rgba(255, 255, 0, 0.6)' : 'none'
          }}
          onClick={handleClick}
          onContextMenu={handleRightClick}
        >
          {player.number}
        </div>
        
        {/* Action menu button */}
        {selected && onEventSelect && (
          <button 
            className="absolute -right-4 -top-4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 z-40"
            onClick={handleOpenMenu}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Circular menu for actions */}
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
