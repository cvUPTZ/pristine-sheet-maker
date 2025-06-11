
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { EventType } from '@/types';

interface CancelActionIndicatorProps {
  eventType: EventType;
  onCancel: () => void;
  onExpire: () => void;
  duration?: number;
}

const CancelActionIndicator: React.FC<CancelActionIndicatorProps> = ({
  eventType,
  onCancel,
  onExpire,
  duration = 10000 // 10 seconds
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          setIsExpired(true);
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onExpire, isExpired]);

  const progress = Math.max(0, (timeLeft / duration) * 100);
  const secondsLeft = Math.ceil(timeLeft / 1000);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isExpired) return null;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center w-12 h-12 bg-white border-2 border-red-500 rounded-full shadow-md">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-100 ease-linear"
          />
        </svg>
        <button
          onClick={onCancel}
          className="relative z-10 flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          title={`Cancel ${eventType} event`}
        >
          <X size={14} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-red-600 mt-6">
            {secondsLeft}s
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-600 text-center whitespace-nowrap">
        {eventType}
      </div>
    </div>
  );
};

export default CancelActionIndicator;
