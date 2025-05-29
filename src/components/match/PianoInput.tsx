
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventType, PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { getEventTypeIcon } from '@/components/match/getEventTypeIcon';

const ALL_SYSTEM_EVENT_TYPES: EventType[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'shot', label: 'Shot' },
  { key: 'foul', label: 'Foul' },
  { key: 'goal', label: 'Goal' },
  { key: 'save', label: 'Save' },
  { key: 'offside', label: 'Offside' },
  { key: 'corner', label: 'Corner Kick' },
  { key: 'sub', label: 'Substitution' },
];

interface PianoInputProps {
  fullMatchRoster: AssignedPlayers | null;
  assignedEventTypes: EventType[] | null;
  assignedPlayers: AssignedPlayers | null;
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
    if (assignedEventTypes === null) {
      return ALL_SYSTEM_EVENT_TYPES;
    }
    return ALL_SYSTEM_EVENT_TYPES.filter((sysEt: EventType) =>
      assignedEventTypes.some((assignedEt: EventType) => assignedEt.key === sysEt.key)
    );
  }, [assignedEventTypes]);

  const displayableHomePlayers = useMemo(() => {
    if (!fullMatchRoster) return [];
    if (assignedPlayers === null) {
      return fullMatchRoster.home;
    }
    return fullMatchRoster.home.filter((rosterPlayer: PlayerForPianoInput) =>
      assignedPlayers.home.some((assignedP: PlayerForPianoInput) => assignedP.id === rosterPlayer.id)
    );
  }, [fullMatchRoster, assignedPlayers]);

  const displayableAwayPlayers = useMemo(() => {
    if (!fullMatchRoster) return [];
    if (assignedPlayers === null) {
      return fullMatchRoster.away;
    }
    return fullMatchRoster.away.filter((rosterPlayer: PlayerForPianoInput) =>
      assignedPlayers.away.some((assignedP: PlayerForPianoInput) => assignedP.id === rosterPlayer.id)
    );
  }, [fullMatchRoster, assignedPlayers]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();

    if (!selectedEventType) {
      const targetEventType = displayableEventTypes.find(
        (et: EventType) => et.key.charAt(0).toLowerCase() === key && !event.metaKey && !event.ctrlKey
      );
      if (targetEventType) {
        event.preventDefault();
        handleEventTypeSelect(targetEventType);
        return;
      }
    }

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
    
    if (selectedEventType && activeTeamContext && /^\d$/.test(key)) {
      event.preventDefault();
      const jerseyNumber = parseInt(key, 10);
      const targetPlayers = activeTeamContext === 'home' ? displayableHomePlayers : displayableAwayPlayers;
      const targetPlayer = targetPlayers.find((p: PlayerForPianoInput) => p.jersey_number === jerseyNumber);

      if (targetPlayer) {
        handlePlayerSelect(targetPlayer);
      } else {
        console.log(`No ${activeTeamContext} player with jersey #${jerseyNumber} found or assigned.`);
      }
      return;
    }

    if (key === 'escape') {
      event.preventDefault();
      setSelectedEventType(null);
      setSelectedPlayer(null);
      setActiveTeamContext(null);
      console.log("Selection cleared.");
    }

  }, [selectedEventType, activeTeamContext, displayableEventTypes, displayableHomePlayers, displayableAwayPlayers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setSelectedPlayer(null); 
    setActiveTeamContext(null);
    console.log(`Selected Event Type: ${eventType.label}`);
  };

  const handlePlayerSelect = (player: PlayerForPianoInput) => {
    if (!selectedEventType) {
      console.warn("Player selected without an event type. Please select an event type first.");
      return;
    }
    setSelectedPlayer(player);
    console.log(`Selected Player: ${player.player_name} (#${player.jersey_number}) for event: ${selectedEventType.label}`);
    onEventRecord(selectedEventType, player);
    
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

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">
          1. Select Event Type {selectedEventType && <span className="text-blue-600 font-normal">(Selected: {selectedEventType.label})</span>}
        </h3>
        {displayableEventTypes.length === 0 && <p className="text-sm text-gray-500">No event types assigned or available.</p>}
        <div className="flex flex-wrap gap-2">
          {displayableEventTypes.map((et: EventType) => (
            <button
              key={et.key}
              onClick={() => handleEventTypeSelect(et)}
              disabled={!!selectedEventType && selectedEventType.key !== et.key}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg text-xs font-medium transition-colors shadow-sm hover:shadow-md
                          min-w-[90px] min-h-[90px]
                          ${selectedEventType?.key === et.key 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                            : 'bg-white hover:bg-gray-50 text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none'}`}
              title={`${et.label} (Shortcut: ${et.key.charAt(0).toUpperCase()})`}
            >
              {getEventTypeIcon(et.key, { size: 40 })}
              <span className="mt-1 truncate">{et.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {showPlayerSelection && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">
            2. Select Player {activeTeamContext && <span className="text-blue-600 font-normal">(Active Team: {activeTeamContext.toUpperCase()})</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold mb-1 flex items-center">
                Home Team 
                {selectedEventType && !activeTeamContext && <button onClick={() => setActiveTeamContext('home')} className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600">(H)</button>}
                {activeTeamContext === 'home' && <span className="ml-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">ACTIVE (H)</span>}
              </h4>
              {displayableHomePlayers.length === 0 && <p className="text-sm text-gray-500">No home players assigned or available for this match.</p>}
              <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto pr-2">
                {displayableHomePlayers.map((player: PlayerForPianoInput) => (
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

            <div>
              <h4 className="text-md font-semibold mb-1 flex items-center">
                Away Team
                {selectedEventType && !activeTeamContext && <button onClick={() => setActiveTeamContext('away')} className="ml-2 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600">(A)</button>}
                {activeTeamContext === 'away' && <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">ACTIVE (A)</span>}
              </h4>
              {displayableAwayPlayers.length === 0 && <p className="text-sm text-gray-500">No away players assigned or available for this match.</p>}
              <div className="flex flex-col space-y-1 max-h-60 overflow-y-auto pr-2">
                {displayableAwayPlayers.map((player: PlayerForPianoInput) => (
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
