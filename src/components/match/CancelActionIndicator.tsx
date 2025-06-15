
import React, { useState, useEffect, useRef } from 'react';
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
  const hasExpiredCalledRef = useRef(false);

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100;
        if (next <= 0 && !hasExpiredCalledRef.current) {
          hasExpiredCalledRef.current = true;
          setIsExpired(true);
          onExpire();
          clearInterval(interval);
          return 0;
        }
        return next > 0 ? next : 0;
      });
    }, 100);

    return () => clearInterval(interval);
    // Don't include onExpire in deps to avoid effect loop
    // eslint-disable-next-line
  }, [isExpired]);

  const progress = Math.max(0, (timeLeft / duration) * 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isExpired) return null;

  return (
    <div className="relative flex items-center justify-center w-10 h-10 bg-white border-2 border-red-500 rounded-full shadow-md">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <button
        onClick={onCancel}
        className="relative z-10 flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        title={`Cancel ${eventType} event`}
        disabled={isExpired}
      >
        <X size={12} />
      </button>
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
        {eventType}
      </div>
    </div>
  );
};

export default CancelActionIndicator;
