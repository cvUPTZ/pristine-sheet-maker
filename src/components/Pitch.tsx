
import React from 'react';
import { Team, Player, EventType } from '@/types';
import PitchView from './match/PitchView';

interface PitchProps {
  homeTeam: Team;
  awayTeam: Team;
  teamPositions: Record<number, { x: number; y: number }>;
  onTeamPositionsChange: (positions: Record<number, { x: number; y: number }>) => void;
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player | null) => void;
  selectedTeam: 'home' | 'away';
  onSelectTeam: (team: 'home' | 'away') => void;
  ballTrackingMode: boolean;
  onTrackBallMovement: (coordinates: { x: number; y: number }) => void;
}

const Pitch: React.FC<PitchProps> = ({
  homeTeam,
  awayTeam,
  teamPositions,
  onTeamPositionsChange,
  selectedPlayer,
  onSelectPlayer,
  selectedTeam,
  onSelectTeam,
  ballTrackingMode,
  onTrackBallMovement
}) => {
  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    if (ballTrackingMode) {
      onTrackBallMovement(coordinates);
    }
  };

  const handlePlayerSelect = (player: Player) => {
    onSelectPlayer(player);
  };
  
  const handleEventSelect = (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => {
    // First select the player
    onSelectPlayer(player);
    
    // Then record the event (the parent component will handle this)
    if (eventType && player) {
      // We need to dispatch this event to the parent component
      // For now, we'll just track the ball movement as a demonstration
      onTrackBallMovement(coordinates);
    }
  };

  // Use an empty array if no tracking points should be displayed
  const emptyTrackingPoints: any[] = [];

  return (
    <PitchView
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      teamPositions={teamPositions}
      selectedPlayer={selectedPlayer}
      selectedTeam={selectedTeam}
      setSelectedTeam={onSelectTeam}
      handlePlayerSelect={handlePlayerSelect}
      handleEventSelect={handleEventSelect}
      ballTrackingPoints={emptyTrackingPoints}
      mode={ballTrackingMode ? 'tracking' : 'piano'}
      handlePitchClick={handlePitchClick}
      addBallTrackingPoint={onTrackBallMovement}
    />
  );
};

export default Pitch;
