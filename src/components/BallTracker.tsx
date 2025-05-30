
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BallTrackingPoint } from '@/types';

interface BallTrackerProps {
  onTrackingDataUpdate: (data: BallTrackingPoint[]) => void;
  initialData?: BallTrackingPoint[];
}

const BallTracker: React.FC<BallTrackerProps> = ({
  onTrackingDataUpdate,
  initialData = []
}) => {
  const [trackingData, setTrackingData] = useState<BallTrackingPoint[]>(initialData);
  const [isRecording, setIsRecording] = useState(false);

  const handleAddPoint = useCallback((x: number, y: number) => {
    const newPoint: BallTrackingPoint = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      timestamp: Date.now(),
      team: 'home' // Default team
    };

    const updatedData = [...trackingData, newPoint];
    setTrackingData(updatedData);
    onTrackingDataUpdate(updatedData);
  }, [trackingData, onTrackingDataUpdate]);

  const handleClearData = () => {
    setTrackingData([]);
    onTrackingDataUpdate([]);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const homePoints = trackingData.filter(point => point.team === 'home');
  const awayPoints = trackingData.filter(point => point.team === 'away');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          variant={isRecording ? "destructive" : "default"}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <Button onClick={handleClearData} variant="outline">
          Clear Data
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Home Team Points</Label>
          <div className="text-sm text-gray-600">
            {homePoints.length} points recorded
          </div>
        </div>
        <div>
          <Label>Away Team Points</Label>
          <div className="text-sm text-gray-600">
            {awayPoints.length} points recorded
          </div>
        </div>
      </div>

      {/* Ball tracking visualization */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px] cursor-crosshair relative"
        onClick={(e) => {
          if (isRecording) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            handleAddPoint(x, y);
          }
        }}
      >
        <div className="text-center text-gray-500">
          {isRecording ? 'Click to add tracking points' : 'Start recording to track ball movement'}
        </div>
        
        {/* Render tracking points */}
        {trackingData.map((point, index) => (
          <div
            key={point.id || index}
            className={`absolute w-2 h-2 rounded-full ${
              point.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
            }`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            title={`Point ${index + 1}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`}
          />
        ))}
      </div>
    </div>
  );
};

export default BallTracker;
