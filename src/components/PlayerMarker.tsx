
import React, { useState, useRef, useEffect } from 'react';
import { Player, EventType } from '@/types';
import CircularMenu from './CircularMenu';
import { Button } from './ui/button';
import { useBreakpoint } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

interface PlayerMarkerProps {
  player: Player;
  teamColor: string;
  position: { x: number; y: number };
  onClick?: (player: Player) => void;
  selected?: boolean;
  hasBall?: boolean;
  onEventSelect?: (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => void;
  allowCircularMenu?: boolean;
  isPotentialPasser?: boolean;
}

const PlayerMarker: React.FC<PlayerMarkerProps> = ({ 
  player, 
  teamColor, 
  position, 
  onClick, 
  selected = false,
  hasBall = false,
  onEventSelect,
  allowCircularMenu = true,
  isPotentialPasser = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isSmall = useBreakpoint('sm');
  const markerRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const { userRole } = useAuth();
  
  // Check if user has permission to record events
  const canRecordEvents = userRole === 'admin' || userRole === 'tracker';
  
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
    if (selected && onEventSelect && allowCircularMenu && canRecordEvents) {
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
    if (onEventSelect && allowCircularMenu && canRecordEvents) {
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
      if (onEventSelect && allowCircularMenu && canRecordEvents) {
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
    if (onEventSelect && canRecordEvents) {
      onEventSelect(eventType, player, position);
    }
    setShowMenu(false);
  };

  const pulseAnimation = hasBall ? 'animate-pulse' : '';

  return (
    <>
      <motion.div
        ref={markerRef}
        className={`absolute ${isSmall ? 'w-[8%]' : 'w-[6%]'} ${isSmall ? 'min-w-[36px]' : 'min-w-[40px]'} aspect-square rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all 
          ${isPotentialPasser ? 'ring-4 ring-green-500 scale-110 z-30' : 
            selected ? 'ring-2 ring-white scale-110 z-30' : 'opacity-70 z-20'} 
          ${hasBall ? 'ring-4 ring-yellow-300 ' + pulseAnimation : ''} 
          ${showMenu ? 'opacity-75 z-40' : (selected || isPotentialPasser) ? 'opacity-100' : 'opacity-70'} 
          touch-manipulation`}
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          backgroundColor: teamColor,
          color: teamColor === '#1A365D' ? 'white' : 'white', // Example: ensure contrast
          boxShadow: isPotentialPasser ? '0 0 15px rgba(0, 255, 0, 0.7)' : 
                     hasBall ? '0 0 10px rgba(255, 255, 0, 0.6)' : 
                     selected ? '0 0 15px rgba(255, 255, 255, 0.8)' : 'none',
          fontSize: isSmall ? '0.65rem' : '0.75rem'
        }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid={`player-marker-${player.id}`}
        whileTap={{ scale: 1.2 }}
        initial={{ scale: 1 }}
        animate={{ 
          scale: (selected || isPotentialPasser) ? 1.1 : 1,
          opacity: (selected || isPotentialPasser) ? 1 : 0.7
        }}
        transition={{ duration: 0.2 }}
      >
        {player.number}
        {!canRecordEvents && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-gray-400 rounded-full border border-white"></div>
        )}
      </motion.div>
      
      {/* Circular menu for actions - only show if user has permission */}
      {showMenu && allowCircularMenu && canRecordEvents && (
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
