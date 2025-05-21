
import React, { useState, useEffect } from 'react';
import { BallTrackingPoint } from '@/types';

interface BallTrackerProps {
  trackingPoints: BallTrackingPoint[];
  isActive: boolean;
  onAddPoint: (point: BallTrackingPoint) => void;
}

const BallTracker: React.FC<BallTrackerProps> = ({ trackingPoints, isActive, onAddPoint }) => {
  const [currentBallPosition, setCurrentBallPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Update the ball position when active tracking points change
  useEffect(() => {
    if (trackingPoints.length > 0) {
      setCurrentBallPosition(trackingPoints[trackingPoints.length - 1]);
    }
  }, [trackingPoints]);
  
  // Render the ball and tracking path
  return (
    <>
      {/* Tracking path */}
      {trackingPoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
          <defs>
            <marker 
              id="arrowhead" 
              markerWidth="10" 
              markerHeight="7" 
              refX="0" 
              refY="3.5" 
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.7)" />
            </marker>
          </defs>
          <path 
            d={`M ${trackingPoints.map(p => `${p.x * 100}% ${p.y * 100}%`).join(' L ')}`}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
        </svg>
      )}
      
      {/* Current ball position */}
      {currentBallPosition && (
        <div
          className="absolute w-4 h-4 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-md"
          style={{
            left: `${currentBallPosition.x * 100}%`,
            top: `${currentBallPosition.y * 100}%`,
            animation: isActive ? 'ball-pulse 1s infinite' : 'none',
          }}
        />
      )}
      
      <style>
        {`
          @keyframes ball-pulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); }
            100% { transform: translate(-50%, -50%) scale(1); }
          }
        `}
      </style>
    </>
  );
};

export default BallTracker;
