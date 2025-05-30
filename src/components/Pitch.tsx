
import React from 'react';

interface PitchProps {
  players: any[];
  events?: any[];
  formation?: string;
  onPlayerClick?: (playerId: number) => void;
  selectedTeam?: 'home' | 'away' | null;
}

const Pitch: React.FC<PitchProps> = ({ 
  players, 
  events = [], 
  formation = '4-4-2', 
  onPlayerClick,
  selectedTeam 
}) => {
  const handlePlayerClick = (playerId: number) => {
    if (selectedTeam && onPlayerClick) {
      onPlayerClick(playerId);
    }
  };

  return (
    <div className="relative w-full h-96 bg-green-500 border-2 border-white rounded-lg overflow-hidden">
      {/* Simple pitch representation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full relative">
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white rounded-full"></div>
          
          {/* Center line */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white"></div>
          
          {/* Goal areas */}
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-12 h-32 border-2 border-white border-l-0"></div>
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-12 h-32 border-2 border-white border-r-0"></div>
          
          {/* Players */}
          {players.map((player, index) => (
            <div
              key={player.id || index}
              className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
              style={{
                left: `${20 + (index % 3) * 20}%`,
                top: `${30 + Math.floor(index / 3) * 15}%`
              }}
              onClick={() => handlePlayerClick(player.id)}
              title={player.name || player.player_name || `Player ${player.id}`}
            >
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white font-bold bg-black bg-opacity-50 px-1 rounded">
                {player.jersey_number || player.number || player.id}
              </span>
            </div>
          ))}
          
          {/* Events visualization */}
          {events.slice(0, 10).map((event, index) => (
            <div
              key={event.id || index}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: `${event.coordinates?.x || 50}%`,
                top: `${event.coordinates?.y || 50}%`
              }}
              title={`${event.type} at ${event.timestamp}s`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pitch;
