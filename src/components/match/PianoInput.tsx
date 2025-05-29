
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventType, PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { getEventTypeIcon } from '@/components/match/getEventTypeIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/hooks/use-mobile';

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

  // Responsive hooks
  const isMobile = useBreakpoint('md');
  const isSmall = useBreakpoint('sm');
  const isXSmall = useBreakpoint('xs');

  console.log('PianoInput - assignedEventTypes:', assignedEventTypes);
  console.log('PianoInput - assignedPlayers:', assignedPlayers);
  console.log('PianoInput - fullMatchRoster:', fullMatchRoster);

  const displayableEventTypes = useMemo(() => {
    if (!assignedEventTypes || assignedEventTypes.length === 0) {
      console.log('No assigned event types - showing empty list');
      return [];
    }
    
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
    return (
      <Card className="w-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-6' : 'p-8'} text-center`}>
          <div className="animate-pulse">
            <div className={`bg-slate-300 rounded-full mx-auto mb-4 ${isXSmall ? 'w-12 h-12' : 'w-16 h-16'}`}></div>
            <p className={`text-slate-600 font-medium ${isXSmall ? 'text-base' : 'text-lg'}`}>Loading match data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayableEventTypes.length === 0 && displayableHomePlayers.length === 0 && displayableAwayPlayers.length === 0) {
    return (
      <Card className="w-full bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl border-amber-200">
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-6' : 'p-8'} text-center`}>
          <div className={`bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 ${isXSmall ? 'w-16 h-16' : 'w-20 h-20'}`}>
            <svg className={`text-amber-600 ${isXSmall ? 'w-8 h-8' : 'w-10 h-10'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className={`font-bold text-amber-800 mb-3 ${isXSmall ? 'text-lg' : 'text-xl'}`}>No Assignments Found</h3>
          <p className={`text-amber-700 mb-2 ${isXSmall ? 'text-sm' : 'text-base'}`}>You haven't been assigned any event types or players for this match.</p>
          <p className={`text-amber-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>Please contact an admin to get proper assignments.</p>
        </CardContent>
      </Card>
    );
  }
  
  const showPlayerSelection = selectedEventType && (displayableHomePlayers.length > 0 || displayableAwayPlayers.length > 0);

  // Responsive grid columns
  const eventTypeGridCols = isXSmall 
    ? 'grid-cols-2' 
    : isSmall 
      ? 'grid-cols-3' 
      : isMobile 
        ? 'grid-cols-4' 
        : 'grid-cols-6';

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl">
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`bg-white/20 rounded-xl flex items-center justify-center ${isXSmall ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <svg className={`${isXSmall ? 'w-5 h-5' : 'w-6 h-6'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5z"/>
                <path d="M7 7h2v2H7zM11 7h2v2h-2zM15 7h2v2h-2zM7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z"/>
              </svg>
            </div>
            <div>
              <h2 className={`font-bold ${isXSmall ? 'text-lg' : isMobile ? 'text-xl' : 'text-2xl'}`}>Event Piano Input</h2>
              <p className={`text-white/80 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                {isXSmall ? 'Fast event recording' : 'Fast event recording with keyboard shortcuts'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Types Selection */}
      <Card className="shadow-lg border-slate-200">
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'}`}>
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className={`bg-blue-100 rounded-lg flex items-center justify-center ${isXSmall ? 'w-7 h-7' : 'w-8 h-8'}`}>
              <span className={`text-blue-600 font-bold ${isXSmall ? 'text-base' : 'text-lg'}`}>1</span>
            </div>
            <h3 className={`font-semibold text-slate-800 ${isXSmall ? 'text-lg' : 'text-xl'}`}>
              {isXSmall ? 'Event Type' : 'Select Event Type'}
            </h3>
            {selectedEventType && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                {isXSmall ? selectedEventType.key.toUpperCase() : `Selected: ${selectedEventType.label}`}
              </Badge>
            )}
          </div>
          
          {displayableEventTypes.length === 0 ? (
            <p className="text-slate-500 italic text-sm">No event types assigned.</p>
          ) : (
            <div className={`grid ${eventTypeGridCols} gap-2 sm:gap-3 md:gap-4`}>
              {displayableEventTypes.map((et: EventType) => (
                <motion.div
                  key={et.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <Button
                    onClick={() => handleEventTypeSelect(et)}
                    disabled={!!selectedEventType && selectedEventType.key !== et.key}
                    className={`w-full p-3 sm:p-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1 sm:gap-2 border-2 ${
                      isXSmall ? 'h-16' : isMobile ? 'h-20' : 'h-24'
                    } ${
                      selectedEventType?.key === et.key 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg ring-2 ring-blue-300' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100'
                    }`}
                  >
                    <div className={`transition-colors duration-200 ${
                      selectedEventType?.key === et.key ? 'text-white' : 'text-slate-600'
                    }`}>
                      {getEventTypeIcon(et.key, { size: isXSmall ? 16 : isMobile ? 20 : 24 })}
                    </div>
                    <span className={`font-medium text-center leading-tight ${isXSmall ? 'text-[10px]' : 'text-xs'}`}>
                      {isXSmall ? et.key.charAt(0).toUpperCase() : et.label}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`absolute -top-1 -right-1 rounded-full p-0 flex items-center justify-center font-bold ${
                        isXSmall ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
                      } ${
                        selectedEventType?.key === et.key 
                          ? 'bg-white text-blue-600 border-white' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {et.key.charAt(0).toUpperCase()}
                    </Badge>
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Selection */}
      <AnimatePresence>
        {showPlayerSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-lg border-slate-200">
              <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'}`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className={`bg-green-100 rounded-lg flex items-center justify-center ${isXSmall ? 'w-7 h-7' : 'w-8 h-8'}`}>
                    <span className={`text-green-600 font-bold ${isXSmall ? 'text-base' : 'text-lg'}`}>2</span>
                  </div>
                  <h3 className={`font-semibold text-slate-800 ${isXSmall ? 'text-lg' : 'text-xl'}`}>
                    {isXSmall ? 'Player' : 'Select Player'}
                  </h3>
                  {activeTeamContext && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                      {activeTeamContext.toUpperCase()}
                    </Badge>
                  )}
                </div>

                <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                  {/* Home Team */}
                  <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className={`${isXSmall ? 'p-3' : 'p-4'}`}>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`bg-green-500 rounded-lg flex items-center justify-center ${isXSmall ? 'w-6 h-6' : 'w-8 h-8'}`}>
                            <svg className={`text-white ${isXSmall ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                            </svg>
                          </div>
                          <h4 className={`font-semibold text-green-800 ${isXSmall ? 'text-base' : 'text-lg'}`}>
                            {isXSmall ? 'Home' : 'Home Team'}
                          </h4>
                        </div>
                        {selectedEventType && !activeTeamContext && displayableHomePlayers.length > 0 && (
                          <Button 
                            onClick={() => setActiveTeamContext('home')} 
                            size={isXSmall ? "sm" : "sm"}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs"
                          >
                            Press H
                          </Button>
                        )}
                        {activeTeamContext === 'home' && (
                          <Badge className="bg-green-600 text-white text-xs">
                            {isXSmall ? 'H' : 'ACTIVE (H)'}
                          </Badge>
                        )}
                      </div>

                      {displayableHomePlayers.length === 0 ? (
                        <p className={`text-slate-500 italic ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                          {isXSmall ? 'No players assigned' : 'No home players assigned for this tracker.'}
                        </p>
                      ) : (
                        <div className={`grid gap-2 ${isXSmall ? 'max-h-64' : 'max-h-80'} overflow-y-auto`}>
                          {displayableHomePlayers.map((player: PlayerForPianoInput) => (
                            <motion.div
                              key={player.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                onClick={() => handlePlayerSelect(player)}
                                disabled={activeTeamContext !== null && activeTeamContext !== 'home'}
                                variant="ghost"
                                className={`w-full h-auto justify-start text-left transition-all duration-200 ${
                                  isXSmall ? 'p-2' : 'p-3'
                                } ${
                                  activeTeamContext === 'home' || activeTeamContext === null
                                    ? 'bg-white hover:bg-green-100 text-slate-800 border border-green-200 hover:border-green-300 hover:shadow-md' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 sm:gap-3 w-full">
                                  <div className={`bg-green-500 text-white rounded-full flex items-center justify-center font-bold ${
                                    isXSmall ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
                                  }`}>
                                    {player.jersey_number}
                                  </div>
                                  <span className={`flex-1 font-medium ${isXSmall ? 'text-sm' : 'text-base'} truncate`}>
                                    {player.player_name}
                                  </span>
                                </div>
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Away Team */}
                  <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
                    <CardContent className={`${isXSmall ? 'p-3' : 'p-4'}`}>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`bg-red-500 rounded-lg flex items-center justify-center ${isXSmall ? 'w-6 h-6' : 'w-8 h-8'}`}>
                            <svg className={`text-white ${isXSmall ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                            </svg>
                          </div>
                          <h4 className={`font-semibold text-red-800 ${isXSmall ? 'text-base' : 'text-lg'}`}>
                            {isXSmall ? 'Away' : 'Away Team'}
                          </h4>
                        </div>
                        {selectedEventType && !activeTeamContext && displayableAwayPlayers.length > 0 && (
                          <Button 
                            onClick={() => setActiveTeamContext('away')} 
                            size={isXSmall ? "sm" : "sm"}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs"
                          >
                            Press A
                          </Button>
                        )}
                        {activeTeamContext === 'away' && (
                          <Badge className="bg-red-600 text-white text-xs">
                            {isXSmall ? 'A' : 'ACTIVE (A)'}
                          </Badge>
                        )}
                      </div>

                      {displayableAwayPlayers.length === 0 ? (
                        <p className={`text-slate-500 italic ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                          {isXSmall ? 'No players assigned' : 'No away players assigned for this tracker.'}
                        </p>
                      ) : (
                        <div className={`grid gap-2 ${isXSmall ? 'max-h-64' : 'max-h-80'} overflow-y-auto`}>
                          {displayableAwayPlayers.map((player: PlayerForPianoInput) => (
                            <motion.div
                              key={player.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                onClick={() => handlePlayerSelect(player)}
                                disabled={activeTeamContext !== null && activeTeamContext !== 'away'}
                                variant="ghost"
                                className={`w-full h-auto justify-start text-left transition-all duration-200 ${
                                  isXSmall ? 'p-2' : 'p-3'
                                } ${
                                  activeTeamContext === 'away' || activeTeamContext === null
                                    ? 'bg-white hover:bg-red-100 text-slate-800 border border-red-200 hover:border-red-300 hover:shadow-md' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 sm:gap-3 w-full">
                                  <div className={`bg-red-500 text-white rounded-full flex items-center justify-center font-bold ${
                                    isXSmall ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
                                  }`}>
                                    {player.jersey_number}
                                  </div>
                                  <span className={`flex-1 font-medium ${isXSmall ? 'text-sm' : 'text-base'} truncate`}>
                                    {player.player_name}
                                  </span>
                                </div>
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Information */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 shadow-lg">
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`bg-blue-100 rounded-xl flex items-center justify-center ${isXSmall ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <svg className={`text-blue-600 ${isXSmall ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              {!selectedEventType && displayableEventTypes.length > 0 && (
                <div>
                  <p className={`font-semibold text-slate-800 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    🎹 {isXSmall ? 'Piano Mode' : 'Piano Mode Instructions'}
                  </p>
                  <p className={`text-slate-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    {isXSmall 
                      ? 'Select event type to begin.' 
                      : 'Select an event type to begin. Use keyboard shortcuts for faster input (e.g., P for Pass, S for Shot, then H/A for team, then jersey number).'
                    }
                  </p>
                </div>
              )}
              {selectedEventType && !showPlayerSelection && (
                <div>
                  <p className={`font-semibold text-amber-700 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    ⚠️ {isXSmall ? 'No Players' : 'No Players Available'}
                  </p>
                  <p className={`text-amber-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    {isXSmall ? 'No assigned players.' : 'No players have been assigned for this tracker.'}
                  </p>
                </div>
              )}
              {selectedEventType && !activeTeamContext && showPlayerSelection && (
                <div>
                  <p className={`font-semibold text-slate-800 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    👥 {isXSmall ? 'Select Team' : 'Team Selection Required'}
                  </p>
                  <p className={`text-slate-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    {isXSmall 
                      ? 'Select Home (H) or Away (A).' 
                      : 'Select Home (H) or Away (A) team, then player by jersey number. Press Esc to clear event selection.'
                    }
                  </p>
                </div>
              )}
              {selectedEventType && activeTeamContext && (
                <div>
                  <p className={`font-semibold text-green-700 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    🎯 {isXSmall ? 'Ready' : 'Ready to Record'}
                  </p>
                  <p className={`text-green-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    {isXSmall 
                      ? `Tap player for ${selectedEventType.label}.` 
                      : `Click on a player or press their jersey number (0-9) to record the ${selectedEventType.label} event.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
