import React, { useEffect, useRef } from 'react';
import { EventType } from '@/types';
import { Button } from './ui/button';
import { EVENT_STYLES } from '@/constants/eventTypes';

interface CircularMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onSelect: (eventType: EventType) => void;
  onClose: () => void;
  isMobile: boolean;
}

const CircularMenu: React.FC<CircularMenuProps> = ({ visible, position, onSelect, onClose, isMobile }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menuItems: EventType[] = ['pass', 'shot', 'tackle', 'foul', 'goal', 'assist'];

  const calculatePosition = (index: number, total: number) => {
    const angle = ((index - (total - 1) / 2) / total) * 2 * Math.PI;
    const radius = isMobile ? 6 : 8; // Adjust radius based on screen size
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex items-center justify-center"
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative">
        {menuItems.map((eventType, index) => {
          const pos = calculatePosition(index, menuItems.length);
          const style = EVENT_STYLES[eventType];

          return (
            <Button
              key={eventType}
              onClick={() => onSelect(eventType)}
              className="absolute flex items-center justify-center rounded-full shadow-md transition-colors duration-150"
              style={{
                left: `calc(50% + ${pos.x}rem)`,
                top: `calc(50% + ${pos.y}rem)`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: style?.color || '#6B7280',
                color: 'white',
                width: isMobile ? '3rem' : '3.5rem',
                height: isMobile ? '3rem' : '3.5rem',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
              }}
            >
              {style?.icon} {isMobile ? '' : eventType.charAt(0).toUpperCase() + eventType.slice(1)}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CircularMenu;
