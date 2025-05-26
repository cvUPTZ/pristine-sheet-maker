
import React, { useState, useEffect } from 'react';
import { Team, Player, EventType, BallTrackingPoint } from '@/types';
import PitchView from './match/PitchView';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast'; // Import useToast
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
  // Add onRecordPass prop for the new action
  onRecordPass?: (passer: Player, receiver: Player, passerTeamIdStr: 'home' | 'away', receiverTeamIdStr: 'home' | 'away', passerCoords: {x: number, y: number}, receiverCoords: {x: number, y: number}) => void;
  ballTrackingPoints: BallTrackingPoint[];
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
  onRecordPass, // Destructure the new prop
  ballTrackingPoints
}) => {
  const { toast } = useToast(); // Initialize useToast
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
    if (now - lastEventTime < 300) { // Debounce
      return;
    }
    setLastEventTime(now);

    if (isPassTrackingModeActive) {
      if (!potentialPasser) {
        setPotentialPasser(player);
        onSelectPlayer(player); // Visually select the potential passer
      } else {
        if (potentialPasser.id === player.id) {
          // Clicked on the potential passer again, maybe deselect or do nothing
          setPotentialPasser(null); // Option: deselect passer
          onSelectPlayer(null); // Option: deselect player visually
          return;
        }
        // This is the receiver (player variable)
        const passerTeamIdStr: 'home' | 'away' = homeTeam.players.some(p => p.id === potentialPasser.id) ? 'home' : 'away';
        const receiverTeamIdStr: 'home' | 'away' = homeTeam.players.some(p => p.id === player.id) ? 'home' : 
                                                 awayTeam.players.some(p => p.id === player.id) ? 'away' : passerTeamIdStr; // Default to passer's team if receiver not found (should not happen)

        const passerCoords = teamPositions[potentialPasser.id] || { x: 0.5, y: 0.5 };
        const receiverCoords = teamPositions[player.id] || { x: 0.5, y: 0.5 };

        if (onRecordPass) {
          onRecordPass(potentialPasser, player, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
          toast({
            title: "Pass Recorded",
            description: `Pass from ${potentialPasser.name} to ${player.name}`,
          });
        } else {
          // Fallback or error if onRecordPass is not provided, though it should be.
          // For now, let's keep the old handleEventSelect as a fallback if you want to test without wiring everything up immediately.
          // However, the goal is to replace this.
          console.warn("onRecordPass not provided to Pitch.tsx. Falling back to handleEventSelect for pass.");
          if (handleEventSelect) {
            handleEventSelect('pass', potentialPasser, receiverCoords);
          }
        }
        
        // Update ball position to receiver, select receiver
        // onTrackBallMovement might be redundant if recordPass also handles ball position logic implicitly via events
        onTrackBallMovement(receiverCoords); 
        onSelectPlayer(player); // Select the receiver
        setPotentialPasser(null); // Clear the potential passer
      }
    } else {
      onSelectPlayer(player); // Default behavior when not in pass tracking mode
    }
  };
  
  // Enhanced event selection with event processing feedback and realtime collaboration
  // This handleEventSelect is for the circular menu or other direct event selections.
  // It is NOT directly called by the pass tracking logic anymore if onRecordPass is used.
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
        handleEventSelect={handleEventSelect} // This is for circular menu etc.
        ballTrackingPoints={ballTrackingPoints}
        mode={ballTrackingMode ? 'tracking' : 'piano'} 
        handlePitchClick={handlePitchClick}
        addBallTrackingPoint={onTrackBallMovement}
        potentialPasser={potentialPasser} // Pass down for PlayerMarker styling
      />
    </div>
  );
};

export default Pitch;
