
import React from 'react';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import BallTracker from '@/components/BallTracker';
import { Player, BallTrackingPoint } from '@/types';

interface PitchViewProps {
  homeTeam: {
    name: string;
    players: Player[];
  };
  awayTeam: {
    name: string;
    players: Player[];
  };
  teamPositions: Record<number, { x: number; y: number }>;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: BallTrackingPoint[];
  mode: 'piano' | 'tracking';
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
}

const PitchView: React.FC<PitchViewProps> = ({
  homeTeam,
  awayTeam,
  teamPositions,
  selectedPlayer,
  selectedTeam,
  setSelectedTeam,
  handlePlayerSelect,
  ballTrackingPoints,
  mode,
  handlePitchClick,
  addBallTrackingPoint
}) => {
  return (
    <div className="mb-4">
      <FootballPitch onClick={handlePitchClick}>
        {/* Render home team players */}
        {homeTeam.players.map((player) => (
          <PlayerMarker
            key={`home-${player.id}`}
            player={player}
            teamColor="#1A365D" // Home team color
            position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
            onClick={() => {
              setSelectedTeam('home');
              handlePlayerSelect(player);
            }}
            selected={selectedPlayer?.id === player.id && selectedTeam === 'home'}
          />
        ))}
        
        {/* Render away team players */}
        {awayTeam.players.map((player) => (
          <PlayerMarker
            key={`away-${player.id}`}
            player={player}
            teamColor="#D3212C" // Away team color
            position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
            onClick={() => {
              setSelectedTeam('away');
              handlePlayerSelect(player);
            }}
            selected={selectedPlayer?.id === player.id && selectedTeam === 'away'}
          />
        ))}
        
        {/* Ball tracking */}
        <BallTracker 
          trackingPoints={ballTrackingPoints} 
          isActive={mode === 'tracking'} 
          onAddPoint={addBallTrackingPoint} 
        />
      </FootballPitch>
    </div>
  );
};

export default PitchView;
