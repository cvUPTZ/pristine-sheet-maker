
import React, { useState } from 'react';
import Pitch from '@/components/Pitch';
import { Team, BallTrackingPoint } from '@/types';

interface PitchViewProps {
  homeTeam: Team;
  awayTeam: Team;
  ballTrackingData: BallTrackingPoint[];
  onEventAdd?: (event: any) => void;
}

const PitchView: React.FC<PitchViewProps> = ({
  homeTeam,
  awayTeam,
  ballTrackingData,
  onEventAdd,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedEventType, setSelectedEventType] = useState<string>('pass');

  // Ensure teams have required properties with defaults
  const normalizedHomeTeam = {
    name: homeTeam.name,
    formation: homeTeam.formation || '4-4-2',
    players: homeTeam.players || []
  };

  const normalizedAwayTeam = {
    name: awayTeam.name,
    formation: awayTeam.formation || '4-3-3',
    players: awayTeam.players || []
  };

  // Ensure ball tracking data has required properties
  const normalizedBallData: BallTrackingPoint[] = ballTrackingData.map(point => ({
    ...point,
    id: point.id || `${point.x}-${point.y}-${point.timestamp}`,
  }));

  const handlePitchClick = (x: number, y: number) => {
    if (onEventAdd) {
      onEventAdd({
        type: selectedEventType,
        team: selectedTeam,
        coordinates: { x, y },
        timestamp: Date.now(),
      });
    }
  };

  const handlePlayerClick = (playerId: number) => {
    console.log('Player clicked:', playerId);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Team</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value as 'home' | 'away')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="home">{homeTeam.name}</option>
            <option value="away">{awayTeam.name}</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Event Type</label>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="pass">Pass</option>
            <option value="shot">Shot</option>
            <option value="tackle">Tackle</option>
            <option value="foul">Foul</option>
            <option value="goal">Goal</option>
          </select>
        </div>
      </div>

      {/* Pitch */}
      <div className="border rounded-lg p-4 bg-white">
        <Pitch
          players={selectedTeam === 'home' ? normalizedHomeTeam.players : normalizedAwayTeam.players}
          events={normalizedBallData}
          formation={selectedTeam === 'home' ? normalizedHomeTeam.formation : normalizedAwayTeam.formation}
          onPlayerClick={handlePlayerClick}
          selectedTeam={selectedTeam}
        />
      </div>
    </div>
  );
};

export default PitchView;
