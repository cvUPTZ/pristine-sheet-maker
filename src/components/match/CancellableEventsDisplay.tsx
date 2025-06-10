import React, { useState } from 'react'; // Removed useEffect as it's no longer used
import CircularTimer from '../ui/CircularTimer'; // Import the extracted component

export interface CancellableEventItem {
  id: string | number; // Unique ID for the event
  label: string;       // Display label for the event type
  timerStartTime: number; // Timestamp when the timer started
  // Add any other properties you might need for display, e.g., player name
  // playerName?: string;
}

export interface CancellableEventsDisplayProps {
  events: CancellableEventItem[];
  onCancelEvent: (eventId: string | number) => void;
  timerDuration: number; // e.g., 10000 for 10 seconds
}

const CancellableEventsDisplay: React.FC<CancellableEventsDisplayProps> = ({
  events,
  onCancelEvent,
  timerDuration,
}) => {
  if (!events || events.length === 0) {
    return null; // Don't render anything if there are no events
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50">
      <div className="flex space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-col items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-md min-w-[100px]"
          >
            <span className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200 truncate w-full text-center">
              {event.label}
            </span>
            {/* Optional: Display player name if available
            {event.playerName && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate w-full text-center">
                {event.playerName}
              </span>
            )}
            */}
            <CircularTimer
              duration={timerDuration}
              startTime={event.timerStartTime}
              onCancel={() => onCancelEvent(event.id)}
              size={50} // Slightly smaller timer for this display
              strokeWidth={5}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CancellableEventsDisplay;
