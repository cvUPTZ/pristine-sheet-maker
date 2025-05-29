
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

  // Log the assignments for debugging
  console.log('PianoInput - assignedEventTypes:', assignedEventTypes);
  console.log('PianoInput - assignedPlayers:', assignedPlayers);
  console.log('PianoInput - fullMatchRoster:', fullMatchRoster);

  const displayableEventTypes = useMemo(() => {
    // If assignedEventTypes is null or empty, show nothing for trackers
    if (!assignedEventTypes || assignedEventTypes.length === 0) {
      console.log('No assigned event types - showing empty list');
      return [];
    }
    
    // Filter system event types based on assignments
    const filtered = ALL_SYSTEM_EVENT_TYPES.filter((sysEt: EventType) =>
      assignedEventTypes.some((assignedEt: EventType) => assignedEt.key === sysEt.key)
    );
    
    console.log('Filtered event types:', filtered);
    return filtered;
  }, [assignedEventTypes]);

  const displayableHomePlayers = useMemo(() => {
    if (!fullMatchRoster) {
      console.log('No full roster - returning empty home players');
      return [];
    }
    
    // If assignedPlayers is null or empty, show nothing for trackers
    if (!assignedPlayers || (!assignedPlayers.home && !assignedPlayers.away)) {
      console.log('No assigned players - showing empty home list');
      return [];
    }
    
    const filtered = fullMatchRoster.home.filter((rosterPlayer: PlayerForPianoInput) =>
      assignedPlayers.home?.some((assignedP: PlayerForPianoInput) => assignedP.id === rosterPlayer.id)
    );
    
    console.log('Filtered home players:', filtered);
    return filtered;
  }, [fullMatchRoster, assignedPlayers]);

  const displayableAwayPlayers = useMemo(() => {
    if (!fullMatchRoster) {
      console.log('No full roster - returning empty away players');
      return [];
    }
    
    // If assignedPlayers is null or empty, show nothing for trackers
    if (!assignedPlayers || (!assignedPlayers.home && !assignedPlayers.away)) {
      console.log('No assigned players - showing empty away list');
      return [];
    }
    
    const filtered = fullMatchRoster.away.filter((rosterPlayer: PlayerForPianoInput) =>
      assignedPlayers.away?.some((assignedP: PlayerForPianoInput) => assignedP.id === rosterPlayer.id)
    );
    
    console.log('Filtered away players:', filtered);
    return filtered;
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

  // Show message if no assignments
  if (displayableEventTypes.length === 0 && displayableHomePlayers.length === 0 && displayableAwayPlayers.length === 0) {
    return (
      <div className="p-6 border rounded-lg bg-gradient-to-br from-gray-50 to-white shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Event Piano Input</h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <p className="font-medium text-lg">No assignments found</p>
            <p className="text-sm">You haven't been assigned any event types or players for this match.</p>
            <p className="text-sm mt-2">Please contact an admin to get proper assignments.</p>
          </div>
        </div>
      </div>
    );
  }
  
  const showPlayerSelection = selectedEventType && (displayableHomePlayers.length > 0 || displayableAwayPlayers.length > 0);

  return (
    <div className="p-6 border rounded-lg bg-gradient-to-br from-gray-50 to-white shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Event Piano Input</h2>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">
          1. Select Event Type {selectedEventType && <span className="text-blue-600 font-normal">(Selected: {selectedEventType.label})</span>}
        </h3>
        {displayableEventTypes.length === 0 && <p className="text-sm text-gray-500 mb-4">No event types assigned.</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayableEventTypes.map((et: EventType) => (
            <button
              key={et.key}
              onClick={() => handleEventTypeSelect(et)}
              disabled={!!selectedEventType && selectedEventType.key !== et.key}
              className={`group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg
                          min-w-[120px] min-h-[120px] border-2
                          ${selectedEventType?.key === et.key 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg scale-105' 
                            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-100 disabled:shadow-none disabled:scale-100'}`}
              title={`${et.label} (Shortcut: ${et.key.charAt(0).toUpperCase()})`}
            >
              <div className={`transition-colors duration-200 ${selectedEventType?.key === et.key ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'}`}>
                {getEventTypeIcon(et.key, { size: 48 })}
              </div>
              <span className="text-center leading-tight">{et.label}</span>
              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${selectedEventType?.key === et.key ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                {et.key.charAt(0).toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {showPlayerSelection && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            2. Select Player {activeTeamContext && <span className="text-blue-600 font-normal">(Active Team: {activeTeamContext.toUpperCase()})</span>}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-3 flex items-center text-green-800">
                🏠 Home Team 
                {selectedEventType && !activeTeamContext && displayableHomePlayers.length > 0 && (
                  <button 
                    onClick={() => setActiveTeamContext('home')} 
                    className="ml-3 text-xs bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 transition-colors"
                  >
                    Press H
                  </button>
                )}
                {activeTeamContext === 'home' && (
                  <span className="ml-3 text-xs bg-green-600 text-white px-2 py-1 rounded-md font-bold">
                    ACTIVE (H)
                  </span>
                )}
              </h4>
              {displayableHomePlayers.length === 0 && (
                <p className="text-sm text-gray-500 italic">No home players assigned for this tracker.</p>
              )}
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {displayableHomePlayers.map((player: PlayerForPianoInput) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    disabled={activeTeamContext !== null && activeTeamContext !== 'home'}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-all duration-200 w-full
                                ${activeTeamContext === 'home' || activeTeamContext === null
                                  ? 'bg-white hover:bg-green-100 text-gray-800 border border-green-200 hover:border-green-300 hover:shadow-md transform hover:scale-[1.02]' 
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                  >
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      {player.jersey_number}
                    </div>
                    <span className="flex-1">{player.player_name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-3 flex items-center text-red-800">
                ✈️ Away Team
                {selectedEventType && !activeTeamContext && displayableAwayPlayers.length > 0 && (
                  <button 
                    onClick={() => setActiveTeamContext('away')} 
                    className="ml-3 text-xs bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors"
                  >
                    Press A
                  </button>
                )}
                {activeTeamContext === 'away' && (
                  <span className="ml-3 text-xs bg-red-600 text-white px-2 py-1 rounded-md font-bold">
                    ACTIVE (A)
                  </span>
                )}
              </h4>
              {displayableAwayPlayers.length === 0 && (
                <p className="text-sm text-gray-500 italic">No away players assigned for this tracker.</p>
              )}
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {displayableAwayPlayers.map((player: PlayerForPianoInput) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    disabled={activeTeamContext !== null && activeTeamContext !== 'away'}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-all duration-200 w-full
                                ${activeTeamContext === 'away' || activeTeamContext === null
                                  ? 'bg-white hover:bg-red-100 text-gray-800 border border-red-200 hover:border-red-300 hover:shadow-md transform hover:scale-[1.02]' 
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                  >
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                      {player.jersey_number}
                    </div>
                    <span className="flex-1">{player.player_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        {!selectedEventType && displayableEventTypes.length > 0 && (
          <div className="text-gray-600">
            <p className="font-medium mb-1">🎹 Piano Mode Instructions</p>
            <p className="text-sm">Select an event type to begin. Use keyboard shortcuts for faster input (e.g., P for Pass, S for Shot, then H/A for team, then jersey number).</p>
          </div>
        )}
        {selectedEventType && !showPlayerSelection && (
          <p className="text-yellow-700 font-medium">⚠️ No players assigned for this tracker.</p>
        )}
        {selectedEventType && !activeTeamContext && showPlayerSelection && (
          <div className="text-gray-600">
            <p className="font-medium mb-1">👥 Team Selection Required</p>
            <p className="text-sm">Select Home (H) or Away (A) team, then player by jersey number. Press Esc to clear event selection.</p>
          </div>
        )}
        {selectedEventType && activeTeamContext && (
          <div className="text-gray-600">
            <p className="font-medium mb-1">🎯 Ready to Record</p>
            <p className="text-sm">Click on a player or press their jersey number (0-9) to record the {selectedEventType.label} event.</p>
          </div>
        )}
      </div>
    </div>
  );
}
