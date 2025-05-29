import React from 'react';
import { Player, MatchEvent, BallTrackingPoint } from '@/types/index';

export interface FootballPitchProps {
  homeTeam: {
    name: string;
    formation: string;
    players: Player[];
  };
  awayTeam: {
    name: string;
    formation: string;
    players: Player[];
  };
  ballTrackingPoints: BallTrackingPoint[];
  onPitchClick: (coordinates: { x: number; y: number }) => void;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  onPlayerSelect: (player: Player) => void;
  events: MatchEvent[];
}

const FootballPitch: React.FC<FootballPitchProps> = ({
  homeTeam,
  awayTeam,
  ballTrackingPoints,
  onPitchClick,
  selectedPlayer,
  selectedTeam,
  onPlayerSelect,
  events,
}) => {
  const pitchWidth = 600;
  const pitchHeight = 400;

  const scaleX = (x: number) => x * pitchWidth;
  const scaleY = (y: number) => y * pitchHeight;

  const handlePitchClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / pitchWidth;
    const y = (event.clientY - rect.top) / pitchHeight;
    onPitchClick({ x, y });
  };

  return (
    <div
      style={{
        width: pitchWidth,
        height: pitchHeight,
        background: '#3a8d45',
        border: '2px solid white',
        position: 'relative',
      }}
      onClick={handlePitchClick}
    >
      {/* Home Team Players */}
      {homeTeam.players.map((player) => (
        <div
          key={player.id}
          style={{
            position: 'absolute',
            left: scaleX(0.2) - 10,
            top: scaleY(0.2 + (player.id % 5) * 0.1) - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: selectedPlayer?.id === player.id ? 'yellow' : 'blue',
            color: 'white',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPlayerSelect(player);
          }}
        >
          {player.jersey_number}
        </div>
      ))}

      {/* Away Team Players */}
      {awayTeam.players.map((player) => (
        <div
          key={player.id}
          style={{
            position: 'absolute',
            left: scaleX(0.8) - 10,
            top: scaleY(0.2 + (player.id % 5) * 0.1) - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: selectedPlayer?.id === player.id ? 'yellow' : 'red',
            color: 'white',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPlayerSelect(player);
          }}
        >
          {player.jersey_number}
        </div>
      ))}

      {/* Ball Tracking Points */}
      {ballTrackingPoints.map((point, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: scaleX(point.x) - 5,
            top: scaleY(point.y) - 5,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'white',
          }}
        />
      ))}

      {/* Match Events */}
      {events.map((event) => (
        <div
          key={event.id}
          style={{
            position: 'absolute',
            left: scaleX(event.coordinates?.x || 0) - 8,
            top: scaleY(event.coordinates?.y || 0) - 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'rgba(255, 255, 0, 0.7)',
            border: '1px solid black',
          }}
        />
      ))}
    </div>
  );
};

export default FootballPitch;
