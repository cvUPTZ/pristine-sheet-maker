
import React, { useRef, useEffect, useState } from 'react';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import BallTracker from '@/components/BallTracker';
import { Player, BallTrackingPoint, EventType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getPlayerPositions } from '@/utils/formationUtils';
import { useCurrentBreakpoint } from '@/hooks/use-mobile';

interface PitchViewProps {
  homeTeam: {
    name: string;
    players: Player[];
    formation?: string;
  };
  awayTeam: {
    name: string;
    players: Player[];
    formation?: string;
  };
  teamPositions: Record<string, { x: number; y: number }>;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  handleEventSelect?: (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => void;
  ballTrackingPoints: BallTrackingPoint[];
  mode: 'piano' | 'tracking';
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  potentialPasser?: Player | null;
}

const PitchView: React.FC<PitchViewProps> = ({
  homeTeam,
  awayTeam,
  teamPositions,
  selectedPlayer,
  selectedTeam,
  setSelectedTeam,
  handlePlayerSelect,
  handleEventSelect,
  ballTrackingPoints,
  mode,
  handlePitchClick,
  addBallTrackingPoint,
  potentialPasser = null
}) => {
  const homePositions = getPlayerPositions(homeTeam, true);
  const awayPositions = getPlayerPositions(awayTeam, false);
  
  const combinedPositions = { ...homePositions, ...awayPositions, ...teamPositions };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const currentBreakpoint = useCurrentBreakpoint();
  
  const allowCircularMenu = mode === 'piano' || mode === 'tracking';
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerSize({
          width,
          height: currentBreakpoint === 'xs' || currentBreakpoint === 'sm' 
            ? width * 0.7
            : width * 0.75
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [currentBreakpoint]);
  
  return (
    <div className="mb-4 relative" ref={containerRef}>
      {mode === 'tracking' && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="outline" className="bg-white/70 backdrop-blur-sm">
            Ball Tracking Active
          </Badge>
        </div>
      )}
      
      <FootballPitch 
        onClick={handlePitchClick} 
        className={`w-full ${currentBreakpoint === 'xs' || currentBreakpoint === 'sm' ? 'min-h-[50vh]' : 'min-h-[60vh]'}`}
      >
        {homeTeam.players.map((player) => (
          <PlayerMarker
            key={`home-${player.id}`}
            player={player}
            teamColor="#1A365D"
            position={combinedPositions[player.id] || { x: 0.5, y: 0.9 }}
            onClick={() => {
              setSelectedTeam('home');
              handlePlayerSelect(player);
            }}
            onEventSelect={handleEventSelect}
            selected={selectedPlayer?.id === player.id && selectedTeam === 'home'}
            allowCircularMenu={allowCircularMenu}
            isPotentialPasser={potentialPasser?.id === player.id}
          />
        ))}
        
        {awayTeam.players.map((player) => (
          <PlayerMarker
            key={`away-${player.id}`}
            player={player}
            teamColor="#D3212C"
            position={combinedPositions[player.id] || { x: 0.5, y: 0.1 }}
            onClick={() => {
              setSelectedTeam('away');
              handlePlayerSelect(player);
            }}
            onEventSelect={handleEventSelect}
            selected={selectedPlayer?.id === player.id && selectedTeam === 'away'}
            allowCircularMenu={allowCircularMenu}
            isPotentialPasser={potentialPasser?.id === player.id}
          />
        ))}
        
        <BallTracker 
          trackingPoints={ballTrackingPoints} 
          isActive={mode === 'tracking'} 
          onAddPoint={addBallTrackingPoint} 
        />
      </FootballPitch>
      
      {selectedPlayer && (
        <div className="mt-2 p-2 bg-gray-100 rounded-md shadow-sm text-xs sm:text-sm">
          <p className="font-medium truncate">Selected: {selectedPlayer.name} (#{selectedPlayer.number}) - {selectedTeam === 'home' ? homeTeam.name : awayTeam.name}</p>
        </div>
      )}
    </div>
  );
};

export default PitchView;
