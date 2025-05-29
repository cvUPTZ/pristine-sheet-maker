
import React, { useState, useEffect } from 'react';
import { Team, Player, EventType, BallTrackingPoint } from '@/types';
import PitchView from './match/PitchView';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PitchProps {
  matchId?: string;
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
  isPassTrackingModeActive?: boolean; 
  potentialPasser?: Player | null;    
  setPotentialPasser?: (player: Player | null) => void; 
  onRecordPass?: (passer: Player, receiver: Player, passerTeamIdStr: 'home' | 'away', receiverTeamIdStr: 'home' | 'away', passerCoords: {x: number, y: number}, receiverCoords: {x: number, y: number}) => void;
  ballTrackingPoints: BallTrackingPoint[];
  onEventRecord: (eventType: EventType, playerId: string | number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void;
}

const Pitch: React.FC<PitchProps> = ({
  matchId,
  homeTeam,
  awayTeam,
  teamPositions,
  onTeamPositionsChange,
  selectedPlayer,
  onSelectPlayer,
  selectedTeam,
  onSelectTeam,
  ballTrackingMode,
  onTrackBallMovement,
  isPassTrackingModeActive = false,
  potentialPasser = null,
  setPotentialPasser = () => {},
  onRecordPass,
  ballTrackingPoints,
  onEventRecord
}) => {
  const { toast } = useToast();
  const [lastEventTime, setLastEventTime] = useState(0);
  const [processingEvent, setProcessingEvent] = useState(false);
  const { user, userRole } = useAuth();
  
  const collaboration = useMatchCollaboration({ 
    matchId: matchId, 
    userId: user?.id || 'anonymous',
    teamId: selectedTeam
  });

  const { users = [], recordEvent = () => {} } = collaboration || {};

  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    const now = Date.now();
    
    if (now - lastEventTime < 300) {
      return;
    }
    
    setLastEventTime(now);
    
    if (ballTrackingMode) {
      onTrackBallMovement(coordinates);
    } else {
      onSelectPlayer(null);
    }
  };

  const handlePlayerSelect = (player: Player) => {
    const now = Date.now();
    if (now - lastEventTime < 300) {
      return;
    }
    setLastEventTime(now);

    if (isPassTrackingModeActive) {
      if (!potentialPasser) {
        setPotentialPasser(player);
        onSelectPlayer(player);
      } else {
        if (potentialPasser.id === player.id) {
          setPotentialPasser(null);
          onSelectPlayer(null);
          return;
        }

        const passerTeamIdStr: 'home' | 'away' = homeTeam.players.some(p => p.id === potentialPasser.id) ? 'home' : 'away';
        const receiverTeamIdStr: 'home' | 'away' = homeTeam.players.some(p => p.id === player.id) ? 'home' : 
                                                 awayTeam.players.some(p => p.id === player.id) ? 'away' : passerTeamIdStr;

        const passerCoords = teamPositions[potentialPasser.id] || { x: 0.5, y: 0.5 };
        const receiverCoords = teamPositions[player.id] || { x: 0.5, y: 0.5 };

        if (onRecordPass) {
          onRecordPass(potentialPasser, player, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
          toast({
            title: "Pass Recorded",
            description: `Pass from ${potentialPasser.player_name} to ${player.player_name}`,
          });
        }
        
        onTrackBallMovement(receiverCoords); 
        onSelectPlayer(player);
        setPotentialPasser(null);
      }
    } else {
      onSelectPlayer(player);
    }
  };
  
  const handleEventSelect = (eventType: EventType, playerId: string | number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => {
    const now = Date.now();
    
    if (now - lastEventTime < 400 || processingEvent) {
      return;
    }
    
    if (userRole !== 'admin' && userRole !== 'tracker') {
      console.log("No permission to record events - current role:", userRole);
      return;
    }
    
    setProcessingEvent(true);
    setLastEventTime(now);
    
    // Find the player object for selection
    const allPlayers = [...homeTeam.players, ...awayTeam.players];
    const playerIdAsNumber = typeof playerId === 'string' ? parseInt(playerId) : playerId;
    const player = allPlayers.find(p => p.id === playerIdAsNumber);
    if (player) {
      onSelectPlayer(player);
    }
    
    if (eventType) {
      console.log("Event selected:", eventType, "by player:", playerId, "at", coordinates);
      
      if (matchId) {
        recordEvent(
          eventType, 
          playerId, 
          teamId,
          coordinates
        );
      }
      
      // Call the onEventRecord with correct parameters
      onEventRecord(eventType, playerId, teamId, coordinates);
      
      if (['pass', 'shot', 'goal'].includes(eventType) && coordinates) {
        onTrackBallMovement(coordinates);
      }
      
      setTimeout(() => {
        setProcessingEvent(false);
      }, 300);
    }
  };

  return (
    <div className="relative">
      {matchId && users && (
        <div className="absolute top-2 right-2 z-30 flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
          <div className="text-xs font-medium">Collaborators:</div>
          <div className="flex -space-x-2">
            {users.filter((u: any) => u.online).map((collaborator: any) => (
              <Avatar key={collaborator.id} className="h-6 w-6 border-2 border-white">
                <AvatarFallback className="text-[10px]">
                  {collaborator.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Badge variant="outline" className="text-xs">
            {users.filter((u: any) => u.online).length} online
          </Badge>
        </div>
      )}

      <PitchView
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        selectedPlayer={selectedPlayer}
        selectedTeam={selectedTeam}
        setSelectedTeam={onSelectTeam}
        handlePlayerSelect={handlePlayerSelect}
        ballTrackingPoints={ballTrackingPoints}
        handlePitchClick={handlePitchClick}
        addBallTrackingPoint={onTrackBallMovement}
        recordEvent={handleEventSelect}
        events={[]}
      />
    </div>
  );
};

export default Pitch;
