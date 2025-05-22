
import React, { useState, useEffect } from 'react';
import { Team, Player, EventType } from '@/types';
import PitchView from './match/PitchView';
import { useAuth } from '@/context/AuthContext';
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
  onTrackBallMovement
}) => {
  // Track last event to prevent rapid duplicate events
  const [lastEventTime, setLastEventTime] = useState(0);
  const [processingEvent, setProcessingEvent] = useState(false);
  const { user, userRole } = useAuth();
  const { users, recordEvent } = useMatchCollaboration({ matchId });
  
  // Handle pitch click with debouncing to prevent multiple rapid clicks
  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    const now = Date.now();
    
    // Prevent clicks that are too close together (within 300ms)
    if (now - lastEventTime < 300) {
      return;
    }
    
    setLastEventTime(now);
    
    if (ballTrackingMode) {
      onTrackBallMovement(coordinates);
    } else {
      // When clicking on empty pitch in piano mode, deselect player
      onSelectPlayer(null);
    }
  };

  // Enhanced player selection with anti-bounce protection
  const handlePlayerSelect = (player: Player) => {
    const now = Date.now();
    
    // Prevent selections that are too close together (within 300ms)
    if (now - lastEventTime < 300) {
      return;
    }
    
    setLastEventTime(now);
    onSelectPlayer(player);
  };
  
  // Enhanced event selection with event processing feedback and realtime collaboration
  const handleEventSelect = (eventType: EventType, player: Player, coordinates: { x: number; y: number }) => {
    const now = Date.now();
    
    // Prevent events that are too close together (within 400ms) or if processing
    if (now - lastEventTime < 400 || processingEvent) {
      return;
    }
    
    // Check if user has permission to record events
    if (userRole !== 'admin' && userRole !== 'tracker') {
      console.log("No permission to record events - current role:", userRole);
      return;
    }
    
    // Set processing flag to prevent multiple submissions
    setProcessingEvent(true);
    setLastEventTime(now);
    
    // First select the player
    onSelectPlayer(player);
    
    // Then record the event (the parent component will handle this)
    if (eventType) {
      console.log("Event selected:", eventType, "by player:", player.name, "at", coordinates);
      
      // Record the event in the collaboration system
      if (matchId) {
        recordEvent(
          eventType, 
          player.id, 
          selectedTeam === 'home' ? homeTeam.id : awayTeam.id,
          coordinates,
          now
        );
      }
      
      // If it's a ball-related event, track the ball movement too
      if (['pass', 'shot', 'goal'].includes(eventType)) {
        onTrackBallMovement(coordinates);
      }
      
      // Reset processing flag after a short delay
      setTimeout(() => {
        setProcessingEvent(false);
      }, 300);
    }
  };

  // Use an empty array if no tracking points should be displayed
  const emptyTrackingPoints: any[] = [];

  return (
    <div className="relative">
      {/* Collaboration indicator */}
      {matchId && (
        <div className="absolute top-2 right-2 z-30 flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
          <div className="text-xs font-medium">Collaborators:</div>
          <div className="flex -space-x-2">
            {users.filter(u => u.online).map((collaborator) => (
              <Avatar key={collaborator.id} className="h-6 w-6 border-2 border-white">
                <AvatarFallback className="text-[10px]">
                  {collaborator.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Badge variant="outline" className="text-xs">
            {users.filter(u => u.online).length} online
          </Badge>
        </div>
      )}

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
    </div>
  );
};

export default Pitch;
