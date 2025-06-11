import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EventType } from '@/types'; // Assuming EventType is here
// import { getEventTypeIcon } from '@/components/match/getEventTypeIcon'; // If you use this
import EventTypeSvg from '@/components/match/EventTypeSvg'; // Or this, if more suitable
import { TrackedEvent } from '@/types/eventData'; // Import from centralized location

interface EventWithTimerIndicatorProps {
  event: TrackedEvent;
  onCancel: (eventId: string) => void;
  onTimerEnd: (eventId: string) => void;
}

const CIRCLE_RADIUS = 20; // Adjust as needed
const CIRCLE_STROKE_WIDTH = 3; // Adjust as needed
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const ICON_SIZE = 20; // Assuming EventTypeSvg will be roughly this size

const EventWithTimerIndicator: React.FC<EventWithTimerIndicatorProps> = ({ event, onCancel, onTimerEnd }) => {
  const [remainingTime, setRemainingTime] = useState(10); // 10 seconds countdown
  const [isTimerActive, setIsTimerActive] = useState(true);

  useEffect(() => {
    // If the event itself is marked as cancelled (e.g. by parent), stop everything.
    if (event.isCancelled) {
      setIsTimerActive(false);
      return;
    }

    if (!isTimerActive) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setIsTimerActive(false);
          onTimerEnd(event.id); // Notify parent that timer ended
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [event.id, event.isCancelled, onTimerEnd, isTimerActive]);

  const handleCancel = () => {
    setIsTimerActive(false); // Stop local timer effect
    onCancel(event.id); // Notify parent to handle cancellation logic
  };

  const progressOffset = useMemo(() => {
    // As time decreases, offset increases, revealing the background
    return CIRCUMFERENCE - (remainingTime / 10) * CIRCUMFERENCE;
  }, [remainingTime]);

  // If parent marked as cancelled, don't render. Parent should filter this out.
  if (event.isCancelled) {
    return null; 
  }

  return (
    <div className="flex flex-col items-center p-2 border rounded-lg shadow-md bg-card w-24"> {/* Fixed width for consistency */}
      <div className="relative w-12 h-12 mb-2"> {/* Container for SVG icon and timer */}
        <svg 
            className="w-full h-full" 
            viewBox={`0 0 ${(CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH) * 2} ${(CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH) * 2}`}
            aria-label={`Event ${event.eventType} with ${remainingTime} seconds remaining`}
        >
          {/* Background circle */}
          <circle
            cx={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
            cy={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
            r={CIRCLE_RADIUS}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={CIRCLE_STROKE_WIDTH}
            className="text-gray-200 dark:text-gray-600" // Background track color
          />
          {/* Progress circle */}
          {isTimerActive && remainingTime > 0 && (
            <circle
              cx={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
              cy={CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH}
              r={CIRCLE_RADIUS}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={CIRCLE_STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={progressOffset}
              className="text-blue-500 dark:text-blue-400" // Progress color
              transform={`rotate(-90 ${CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH} ${CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH})`} // Start from top
              style={{ transition: 'stroke-dashoffset 0.3s linear' }} // Smooth transition for offset changes
            />
          )}
          {/* EventTypeIcon - centered */}
          {/* Centering the icon: (ContainerCenter - IconSize/2) */}
          <g transform={`translate(${(CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH) - (ICON_SIZE / 2)}, ${(CIRCLE_RADIUS + CIRCLE_STROKE_WIDTH) - (ICON_SIZE / 2)})`}>
             <EventTypeSvg eventType={event.eventType} width={ICON_SIZE} height={ICON_SIZE} />
          </g>
        </svg>
         {/* Remaining time text - centered */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-xs font-semibold ${remainingTime === 0 && !event.isCancelled ? 'text-green-500' : ''}`}>
                {remainingTime > 0 ? `${remainingTime}s` : (event.isCancelled ? 'CXL' : 'OK')}
            </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleCancel}
        disabled={!isTimerActive || remainingTime === 0 || event.isCancelled}
        className="text-xs h-auto px-2 py-1 w-full hover:bg-red-100 dark:hover:bg-red-700"
        aria-label={`Cancel event ${event.eventType}`}
      >
        Cancel
      </Button>
    </div>
  );
};

export default EventWithTimerIndicator;
