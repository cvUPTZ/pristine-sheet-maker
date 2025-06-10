import React, { useState, useEffect } from 'react';

export interface CircularTimerProps {
  duration: number;
  startTime: number;
  onCancel: () => void;
  size?: number; // Optional size for the timer
  strokeWidth?: number; // Optional stroke width
}

const CircularTimer: React.FC<CircularTimerProps> = ({
  duration,
  startTime,
  onCancel,
  size = 60, // Default size
  strokeWidth = 6, // Default stroke width
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Optionally, trigger a different callback if the timer completes naturally
      }
    }, 100); // Update every 100ms for smoother animation

    return () => clearInterval(interval);
  }, [duration, startTime]);

  const progress = timeLeft / duration;
  // Ensure progress doesn't go below 0, which can cause visual glitches
  const strokeDashoffset = circumference * (1 - Math.max(0, progress));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-300 dark:text-gray-600" // Adjusted for dark mode
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500 dark:text-blue-400 transition-all duration-100 ease-linear"
        />
      </svg>
      <button
        onClick={onCancel}
        className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-700 bg-opacity-80 dark:bg-opacity-70 rounded-full hover:bg-opacity-90 dark:hover:bg-opacity-80 transition-colors"
        aria-label="Cancel event"
      >
        <span className="text-red-500 dark:text-red-400 font-semibold text-xs">Cancel</span>
      </button>
    </div>
  );
};

export default CircularTimer;
