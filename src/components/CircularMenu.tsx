
import React, { useEffect } from 'react';
import { EventType } from '@/types';
import { X } from 'lucide-react';

// Define the available event types and their colors
const eventTypes: Record<EventType, { color: string; description: string; icon?: string }> = {
  pass: { color: "bg-blue-500", description: "Pass", icon: "↗" },
  shot: { color: "bg-red-500", description: "Shot", icon: "🥅" },
  tackle: { color: "bg-green-500", description: "Tackle", icon: "👟" },
  foul: { color: "bg-yellow-500", description: "Foul", icon: "⚠️" },
  corner: { color: "bg-indigo-500", description: "Corner", icon: "⛳" },
  offside: { color: "bg-orange-500", description: "Offside", icon: "🚩" },
  goal: { color: "bg-emerald-500", description: "Goal", icon: "⚽" },
  assist: { color: "bg-purple-500", description: "Assist", icon: "👟" },
  yellowCard: { color: "bg-yellow-400", description: "Yellow", icon: "🟨" },
  redCard: { color: "bg-red-600", description: "Red", icon: "🟥" },
  substitution: { color: "bg-green-400", description: "Sub", icon: "🔄" },
  card: { color: "bg-yellow-300", description: "Card", icon: "📇" },
  penalty: { color: "bg-red-400", description: "Penalty", icon: "⚠️" },
  "free-kick": { color: "bg-cyan-500", description: "Free Kick", icon: "⚽" },
  "goal-kick": { color: "bg-teal-500", description: "Goal Kick", icon: "🥅" },
  "throw-in": { color: "bg-sky-500", description: "Throw-in", icon: "🤾" },
  interception: { color: "bg-amber-500", description: "Intercept", icon: "🛡️" }
};

// Group actions by categories
const ACTION_CATEGORIES = {
  'Attack': ['pass', 'shot', 'goal', 'assist'],
  'Defense': ['tackle', 'interception'],
  'Set Pieces': ['corner', 'free-kick', 'goal-kick', 'throw-in', 'penalty'],
  'Violations': ['foul', 'offside', 'yellowCard', 'redCard'],
  'Other': ['substitution']
};

// Inner ring - primary actions
const PRIMARY_ACTIONS: EventType[] = ['pass', 'shot', 'goal', 'assist'];

// Outer ring - secondary actions
const SECONDARY_ACTIONS: EventType[] = ['tackle', 'foul', 'yellowCard', 'redCard', 'corner', 'offside', 'penalty', 'free-kick'];

interface CircularMenuProps {
  visible: boolean;
  position?: { x: number; y: number };
  onSelect: (eventType: EventType) => void;
  onClose: () => void;
  isMobile?: boolean; // Added the isMobile prop
}

const CircularMenu: React.FC<CircularMenuProps> = ({ 
  visible, 
  position = { x: 0.5, y: 0.5 }, 
  onSelect, 
  onClose,
  isMobile = false // Default to false if not provided
}) => {
  // Handle escape key to close menu
  useEffect(() => {
    if (!visible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);
  
  if (!visible) return null;

  // Calculate positions for items in a circle
  const calculatePosition = (index: number, total: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2; // Start from top
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  };

  const handleActionClick = (e: React.MouseEvent, eventType: EventType) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Action selected:", eventType);
    onSelect(eventType);
    onClose();
  };

  // Adjust sizes based on mobile view
  const containerSize = isMobile ? '240px' : '300px';
  const centerButtonSize = isMobile ? 'w-12 h-12' : 'w-14 h-14';
  const primaryButtonSize = isMobile ? 'w-14 h-14' : 'w-16 h-16';
  const secondaryButtonSize = isMobile ? 'w-12 h-12' : 'w-14 h-14';
  const primaryRadius = isMobile ? 50 : 60;
  const secondaryRadius = isMobile ? 100 : 120;

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-auto"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      <div 
        className="absolute"
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          width: containerSize,
          height: containerSize,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Center button to close */}
        <button 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${centerButtonSize} bg-white rounded-full flex items-center justify-center shadow-lg z-30 border-2 border-gray-200 hover:bg-gray-100 transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-gray-700`} />
        </button>
        
        {/* Inner ring - Primary actions */}
        {PRIMARY_ACTIONS.map((eventType, index) => {
          const { x, y } = calculatePosition(index, PRIMARY_ACTIONS.length, primaryRadius);
          const info = eventTypes[eventType];
          
          return (
            <button
              key={`primary-${eventType}`}
              onClick={(e) => handleActionClick(e, eventType)}
              className={`absolute ${primaryButtonSize} rounded-full ${info.color} text-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 border-2 border-white z-20`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                animation: `fadeIn 0.3s ease forwards ${index * 0.05}s`,
                opacity: 0,
              }}
            >
              <div className="flex flex-col items-center">
                <span className={isMobile ? "text-base" : "text-lg"}>{info.icon}</span>
                <span className="text-xs font-semibold">{info.description}</span>
              </div>
            </button>
          );
        })}
        
        {/* Outer ring - Secondary actions */}
        {SECONDARY_ACTIONS.map((eventType, index) => {
          const { x, y } = calculatePosition(index, SECONDARY_ACTIONS.length, secondaryRadius);
          const info = eventTypes[eventType];
          
          return (
            <button
              key={`secondary-${eventType}`}
              onClick={(e) => handleActionClick(e, eventType)}
              className={`absolute ${secondaryButtonSize} rounded-full ${info.color} text-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 border-2 border-white z-10`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                animation: `fadeIn 0.3s ease forwards ${(index + PRIMARY_ACTIONS.length) * 0.05}s`,
                opacity: 0,
              }}
            >
              <div className="flex flex-col items-center">
                <span className={isMobile ? "text-xs" : "text-sm"}>{info.icon}</span>
                <span className={isMobile ? "text-[0.65rem]" : "text-xs"} className="font-semibold">{isMobile ? info.description.substring(0, 4) : info.description}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Add animation styles */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
          }
        `}
      </style>
    </div>
  );
};

export default CircularMenu;
