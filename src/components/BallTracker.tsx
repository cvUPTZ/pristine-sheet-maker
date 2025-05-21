
import React, { useState, useEffect } from 'react';
import { BallTrackingPoint } from '@/types';

interface BallTrackerProps {
  trackingPoints: BallTrackingPoint[];
  isActive: boolean;
  onAddPoint: (point: BallTrackingPoint) => void;
}

const BallTracker: React.FC<BallTrackerProps> = ({ trackingPoints, isActive, onAddPoint }) => {
  const [currentBallPosition, setCurrentBallPosition] = useState<{ x: number; y: number } | null>(null);
  const [pathSegments, setPathSegments] = useState<{ start: number, end: number, color: string }[]>([]);
  
  // Update the ball position when active tracking points change
  useEffect(() => {
    if (trackingPoints.length > 0) {
      setCurrentBallPosition(trackingPoints[trackingPoints.length - 1]);
    }
    
    // Create path segments for visualization - group by team
    const segments: { start: number, end: number, color: string }[] = [];
    let currentTeamId: string | undefined = undefined;
    let segmentStart = 0;
    
    trackingPoints.forEach((point, index) => {
      if (index > 0) {
        // If team changed, or this is the last point, end the segment
        if (point.teamId !== currentTeamId || index === trackingPoints.length - 1) {
          if (currentTeamId) {
            segments.push({
              start: segmentStart,
              end: index,
              color: currentTeamId === 'home' ? 'rgba(26,54,93,0.8)' : 'rgba(211,33,44,0.8)'
            });
          }
          segmentStart = index;
          currentTeamId = point.teamId;
        }
      } else {
        // First point
        currentTeamId = point.teamId;
      }
    });
    
    setPathSegments(segments);
  }, [trackingPoints]);
  
  // Render the ball and tracking path
  return (
    <>
      {/* Tracking paths segmented by team */}
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
          
          {/* Draw each path segment with appropriate team color */}
          {pathSegments.map((segment, idx) => {
            const points = trackingPoints.slice(segment.start, segment.end + 1);
            return (
              <path 
                key={`segment-${idx}`}
                d={`M ${points.map(p => `${p.x * 100}% ${p.y * 100}%`).join(' L ')}`}
                stroke={segment.color}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={idx === pathSegments.length - 1 ? "url(#arrowhead)" : ""}
              />
            );
          })}
          
          {/* Draw dots at each tracked position */}
          {trackingPoints.map((point, idx) => (
            <circle 
              key={`point-${idx}`}
              cx={`${point.x * 100}%`} 
              cy={`${point.y * 100}%`} 
              r="2"
              fill={point.teamId === 'home' ? '#1A365D' : (point.teamId === 'away' ? '#D3212C' : '#FFFFFF')}
              opacity={0.7}
            />
          ))}
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
