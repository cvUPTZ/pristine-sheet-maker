
import React, { useState, useRef, useEffect } from 'react';
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
  const markerRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  
  // Close menu when clicking elsewhere
  useEffect(() => {
    if (!showMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (markerRef.current && !markerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(player);
    }
    
    // If the player is already selected and circular menu is allowed, toggle the menu
    if (selected && onEventSelect && allowCircularMenu) {
      setShowMenu(prev => !prev);
    }
  };
  
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // First select the player if not already selected
    if (onClick && !selected) {
      onClick(player);
    }
    
    // Then show the circular menu
    if (onEventSelect && allowCircularMenu) {
      setShowMenu(true);
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartTimeRef.current = Date.now();
    
    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      window.clearTimeout(touchTimeoutRef.current);
    }
    
    // Set a timeout to detect long press (500ms)
    touchTimeoutRef.current = window.setTimeout(() => {
      if (onEventSelect && allowCircularMenu) {
        // First select the player if not already selected
        if (onClick && !selected) {
          onClick(player);
        }
        setShowMenu(true);
      }
      touchTimeoutRef.current = null;
    }, 500);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    // Clear the timeout
    if (touchTimeoutRef.current) {
      window.clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
      
      // If it was a short tap (less than 500ms), treat it as a regular click
      if (Date.now() - touchStartTimeRef.current < 500) {
        if (onClick) {
          onClick(player);
        }
      }
    }
  };
  
  const handleMenuSelect = (eventType: EventType) => {
    if (onEventSelect) {
      onEventSelect(eventType, player, position);
    }
    setShowMenu(false);
  };

  // Dynamic sizing based on screen size
  const markerSize = isSmall ? 'w-[6%]' : 'w-[5%]';
  const pulseAnimation = hasBall ? 'animate-pulse' : '';

  return (
    <>
      <div
        ref={markerRef}
        className={`absolute ${markerSize} aspect-square rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all ${
          selected ? 'ring-2 ring-white scale-110 z-30' : 'opacity-70 z-20'
        } ${
          hasBall ? 'ring-4 ring-yellow-300 ' + pulseAnimation : ''
        } ${
          showMenu ? 'opacity-75 z-40' : selected ? 'opacity-100' : 'opacity-70'
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid={`player-marker-${player.id}`}
      >
        {player.number}
      </div>
      
      {/* Circular menu for actions */}
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
