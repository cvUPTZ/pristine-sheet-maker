"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventType, PlayerForPianoInput, AssignedPlayers } from './types';
import { getEventTypeIcon } from './getEventTypeIcon'; // Import the icon getter

// This represents all possible event types configured in the system.
// It's used to get full event details (like label) for assigned event type keys.
const ALL_SYSTEM_EVENT_TYPES: EventType[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'shot', label: 'Shot' },
  { key: 'foul', label: 'Foul' },
  { key: 'goal', label: 'Goal' },
  { key: 'save', label: 'Save' },
  { key: 'offside', label: 'Offside' },
  { key: 'corner', label: 'Corner Kick' },
  { key: 'sub', label: 'Substitution' },
  // ... add all other possible event types here
];

interface PianoInputProps {
  fullMatchRoster: AssignedPlayers | null; // All players in the current match
  assignedEventTypes: EventType[] | null;  // Specific event types assigned to the tracker
  assignedPlayers: AssignedPlayers | null; // Specific players assigned to the tracker
  onEventRecord: (eventType: EventType, player?: PlayerForPianoInput, details?: Record<string, any>) => void;
}

export function PianoInput({
  fullMatchRoster,
  assignedEventTypes,
  assignedPlayers,
  onEventRecord,
}: PianoInputProps) {
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerForPianoInput | null>(null);
  const [activeTeamContext, setActiveTeamContext] = useState<'home' | 'away' | null>(null);


  const displayableEventTypes = useMemo(() => {
    if (assignedEventTypes === null) { // No specific assignment, show all system types
      return ALL_SYSTEM_EVENT_TYPES;
    }
    // Filter system types by keys from assignedEventTypes
    return ALL_SYSTEM_EVENT_TYPES.filter(sysEt =>
      assignedEventTypes.some(assignedEt => assignedEt.key === sysEt.key)
    );
  }, [assignedEventTypes]);

  const displayableHomePlayers = useMemo(() => {
    if (!fullMatchRoster) return [];
    if (assignedPlayers === null) { // No specific player assignment, show all from full roster for home
      return fullMatchRoster.home;
    }
    // Filter full roster home players by assigned home players
    return fullMatchRoster.home.filter(rosterPlayer =>
      assignedPlayers.home.some(assignedP => assignedP.id === rosterPlayer.id)
    );
  }, [fullMatchRoster, assignedPlayers]);

  const displayableAwayPlayers = useMemo(() => {
    if (!fullMatchRoster) return [];
    if (assignedPlayers === null) { // No specific player assignment, show all from full roster for away
      return fullMatchRoster.away;
    }
    // Filter full roster away players by assigned away players
    return fullMatchRoster.away.filter(rosterPlayer =>
      assignedPlayers.away.some(assignedP => assignedP.id === rosterPlayer.id)
    );
  }, [fullMatchRoster, assignedPlayers]);


  // Keyboard shortcut handling
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    // 1. Event Type Selection (e.g., 'p' for Pass, 's' for Shot)
    // Assumes first letter of event key is the shortcut, can be made more robust
    if (!selectedEventType) { // Only allow event type selection if none is selected yet
      const targetEventType = displayableEventTypes.find(
        et => et.key.charAt(0).toLowerCase() === key && !event.metaKey && !event.ctrlKey
      );
      if (targetEventType) {
        event.preventDefault();
        handleEventTypeSelect(targetEventType);
        return;
      }
    }

    // 2. Team Context Selection (e.g., 'h' for Home, 'a' for Away) after an event type is selected
    if (selectedEventType && !activeTeamContext) {
      if (key === 'h' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setActiveTeamContext('home');
        console.log("Active team: Home");
        return;
      }
      if (key === 'a' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setActiveTeamContext('away');
        console.log("Active team: Away");
        return;
      }
    }
    
    // 3. Player Selection (e.g., by jersey number) after team context is active
    if (selectedEventType && activeTeamContext && /^\d$/.test(key)) { // if a digit is pressed
      event.preventDefault();
      // This is a simplified example. A more robust solution would accumulate digits for multi-digit jersey numbers
      // and then find the player. For now, assumes single digit jersey numbers for simplicity of demo.
      const jerseyNumber = parseInt(key, 10);
      const targetPlayers = activeTeamContext === 'home' ? displayableHomePlayers : displayableAwayPlayers;
      const targetPlayer = targetPlayers.find(p => p.jersey_number === jerseyNumber);

      if (targetPlayer) {
        handlePlayerSelect(targetPlayer);
      } else {
        console.log(`No ${activeTeamContext} player with jersey #${jerseyNumber} found or assigned.`);
      }
      return;
    }

    // 4. Clear selection (e.g., Escape key)
    if (key === 'escape') {
      event.preventDefault();
      setSelectedEventType(null);
      setSelectedPlayer(null);
      setActiveTeamContext(null);
      console.log("Selection cleared.");
    }

  }, [selectedEventType, activeTeamContext, displayableEventTypes, displayableHomePlayers, displayableAwayPlayers /*, onEventRecord */]);
  // Note: onEventRecord removed from deps as direct call from shortcut isn't typical without player selection first for most events.

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setSelectedPlayer(null); 
    setActiveTeamContext(null); // Reset team context when a new event type is selected
    console.log(`Selected Event Type: ${eventType.label}`);
    // Example: If event type doesn't require a player (e.g., "Offside")
    // if (!eventRequiresPlayer(eventType.key)) { 
    //   onEventRecord(eventType);
    //   setSelectedEventType(null); // Reset after recording
    // }
  };

  const handlePlayerSelect = (player: PlayerForPianoInput) => {
    if (!selectedEventType) {
      console.warn("Player selected without an event type. Please select an event type first.");
      return;
    }
    setSelectedPlayer(player);
    console.log(`Selected Player: ${player.player_name} (#${player.jersey_number}) for event: ${selectedEventType.label}`);
    onEventRecord(selectedEventType, player);
    
    // Reset for next event recording
    setSelectedEventType(null);
    setSelectedPlayer(null);
    setActiveTeamContext(null);
  };

  if (!fullMatchRoster) {
    return <div className="p-4 text-center text-gray-500">Loading match data or match data unavailable...</div>;
  }
  
  const showPlayerSelection = selectedEventType && (displayableHomePlayers.length > 0 || displayableAwayPlayers.length > 0);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-md">
      <h2 className="text-xl font-semibold mb-4">Event Piano Input</h2>

      {/* Event Type Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">
          1. Select Event Type {selectedEventType && <span className="text-blue-600 font-normal">(Selected: {selectedEventType.label})</span>}
        </h3>
        {displayableEventTypes.length === 0 && <p className="text-sm text-gray-500">No event types assigned or available.</p>}
        <div className="flex flex-wrap gap-2">
          {displayableEventTypes.map(et => (
            <button
              key={et.key}
              onClick={() => handleEventTypeSelect(et)}
              disabled={!!selectedEventType && selectedEventType.key !== et.key}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg text-xs font-medium transition-colors shadow-sm hover:shadow-md
                          min-w-[80px] min-h-[80px]  // Ensure minimum size for icon and text
                          ${selectedEventType?.key === et.key 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                            : 'bg-white hover:bg-gray-50 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none'}`}
              title={`${et.label} (Shortcut: ${et.key.charAt(0).toUpperCase()})`} // Tooltip for full label and shortcut
            >
              {getEventTypeIcon(et.key, { size: 32 })} {/* Icon size 32x32 */}
              <span className="mt-1 truncate">{et.label}</span> {/* Label below icon */}
              {/* Shortcut hint can be part of the tooltip or subtly displayed if needed */}
            </button>
          ))}
        </div>
      </div>
      
      {/* Player Selection Area: Visible if an event type is selected AND there are players to show */}
      {showPlayerSelection && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">
            2. Select Player {activeTeamContext && <span className="text-blue-600 font-normal">(Active Team: {activeTeamContext.toUpperCase()})</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Players */}
            <div>
              <h4 className="text-md font-semibold mb-1 flex items-center">
                Home Team 
                {selectedEventType && !activeTeamContext && <button onClick={() => setActiveTeamContext('home')} className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600">(H)</button>}
                {activeTeamContext === 'home' && <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">ACTIVE (H)</span>}
              </h4>
              {displayableHomePlayers.length === 0 && <p className="text-sm text-gray-500">No home players assigned or available for this match.</p>}
              <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto pr-2">
                {displayableHomePlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    disabled={activeTeamContext !== null && activeTeamContext !== 'home'}
                    className={`px-3 py-1.5 rounded-md text-left text-sm transition-colors w-full
                                ${'bg-gray-100 hover:bg-green-100 text-gray-700 focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400'}`}
                  >
                    #{player.jersey_number} - {player.player_name}
                  </button>
                ))}
              </div>
            </div>

            {/* Away Players */}
            <div>
              <h4 className="text-md font-semibold mb-1 flex items-center">
                Away Team
                {selectedEventType && !activeTeamContext && <button onClick={() => setActiveTeamContext('away')} className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600">(A)</button>}
                {activeTeamContext === 'away' && <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">ACTIVE (A)</span>}
              </h4>
              {displayableAwayPlayers.length === 0 && <p className="text-sm text-gray-500">No away players assigned or available for this match.</p>}
              <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto pr-2">
                {displayableAwayPlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    disabled={activeTeamContext !== null && activeTeamContext !== 'away'}
                    className={`px-3 py-1.5 rounded-md text-left text-sm transition-colors w-full
                                ${'bg-gray-100 hover:bg-red-100 text-gray-700 focus:ring-2 focus:ring-red-400 disabled:bg-gray-50 disabled:text-gray-400'}`}
                  >
                    #{player.jersey_number} - {player.player_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedEventType && (
         <p className="text-sm text-gray-600 pt-2">Select an event type to begin. Use keyboard shortcuts for faster input (e.g., P for Pass, S for Shot, then H/A for team, then jersey number).</p>
       )}
       {selectedEventType && !showPlayerSelection && (
         <p className="text-sm text-yellow-700 pt-2">No players available for selection for the current assignment or match roster.</p>
       )}
       {selectedEventType && !activeTeamContext && showPlayerSelection && (
          <p className="text-sm text-gray-600 pt-2">Select Home (H) or Away (A) team, then player by jersey number. Press Esc to clear event selection.</p>
       )}

    </div>
  );
}
