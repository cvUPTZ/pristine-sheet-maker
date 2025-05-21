
import React from 'react';
import { EventType } from '@/types';
import { X } from 'lucide-react';

// Define the available event types and their colors
const eventTypes: Record<EventType, { color: string; description: string }> = {
  pass: { color: "bg-blue-500", description: "Pass" },
  shot: { color: "bg-red-500", description: "Shot" },
  tackle: { color: "bg-green-500", description: "Tackle" },
  foul: { color: "bg-yellow-500", description: "Foul" },
  corner: { color: "bg-indigo-500", description: "Corner" },
  offside: { color: "bg-orange-500", description: "Offside" },
  goal: { color: "bg-emerald-500", description: "Goal" },
  assist: { color: "bg-purple-500", description: "Assist" },
  yellowCard: { color: "bg-yellow-400", description: "Yellow" },
  redCard: { color: "bg-red-600", description: "Red" },
  substitution: { color: "bg-green-400", description: "Sub" },
  card: { color: "bg-yellow-300", description: "Card" },
  penalty: { color: "bg-red-400", description: "Penalty" },
  "free-kick": { color: "bg-cyan-500", description: "Free Kick" },
  "goal-kick": { color: "bg-teal-500", description: "Goal Kick" },
  "throw-in": { color: "bg-sky-500", description: "Throw-in" },
  interception: { color: "bg-amber-500", description: "Intercept" }
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
}

const CircularMenu: React.FC<CircularMenuProps> = ({ 
  visible, 
  position = { x: 0.5, y: 0.5 }, 
  onSelect, 
  onClose 
}) => {
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
    onSelect(eventType);
    onClose();
  };

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
          width: '300px',
          height: '300px',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Center button to close */}
        <button 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg z-30 border-2 border-gray-200 hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
        
        {/* Inner ring - Primary actions */}
        {PRIMARY_ACTIONS.map((eventType, index) => {
          const { x, y } = calculatePosition(index, PRIMARY_ACTIONS.length, 60);
          const info = eventTypes[eventType];
          
          return (
            <button
              key={`primary-${eventType}`}
              onClick={(e) => handleActionClick(e, eventType)}
              className={`absolute w-16 h-16 rounded-full ${info.color} text-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 border-2 border-white z-20`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
            >
              <span className="text-xs font-semibold">{info.description}</span>
            </button>
          );
        })}
        
        {/* Outer ring - Secondary actions */}
        {SECONDARY_ACTIONS.map((eventType, index) => {
          const { x, y } = calculatePosition(index, SECONDARY_ACTIONS.length, 120);
          const info = eventTypes[eventType];
          
          return (
            <button
              key={`secondary-${eventType}`}
              onClick={(e) => handleActionClick(e, eventType)}
              className={`absolute w-14 h-14 rounded-full ${info.color} text-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 border-2 border-white z-10`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
            >
              <span className="text-xs font-semibold">{info.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CircularMenu;
