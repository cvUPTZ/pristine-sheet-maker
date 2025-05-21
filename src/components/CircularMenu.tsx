
import React from 'react';
import { EventType } from '@/types';

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

// Array of the most common event types for the circular menu
const COMMON_EVENTS: EventType[] = [
  'pass', 'shot', 'tackle', 'foul', 'goal', 'assist', 'yellowCard', 'redCard'
];

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
    const angle = (index * 2 * Math.PI) / total;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  };

  const handleActionClick = (e: React.MouseEvent, eventType: EventType) => {
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
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
      
      <div 
        className="absolute w-[280px] h-[280px]"
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Center button to close */}
        <button 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg z-10 border-2 border-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <span className="text-sm font-medium text-gray-700">Close</span>
        </button>
        
        {/* Circular menu items */}
        {COMMON_EVENTS.map((eventType, index) => {
          const { x, y } = calculatePosition(index, COMMON_EVENTS.length, 100);
          const info = eventTypes[eventType];
          
          return (
            <button
              key={eventType}
              onClick={(e) => handleActionClick(e, eventType)}
              className={`absolute w-16 h-16 rounded-full ${info.color} text-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 border-2 border-white`}
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
