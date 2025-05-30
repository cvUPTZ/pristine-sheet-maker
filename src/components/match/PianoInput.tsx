"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventType, PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

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

const EVENT_TYPE_COLORS: Record<string, { bg: string; hover: string; border: string; text: string; shadow: string }> = {
  'pass': { 
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600', 
    hover: 'hover:from-blue-600 hover:to-blue-700', 
    border: 'border-blue-400', 
    text: 'text-blue-700',
    shadow: 'shadow-blue-200'
  },
  'shot': { 
    bg: 'bg-gradient-to-br from-red-500 to-red-600', 
    hover: 'hover:from-red-600 hover:to-red-700', 
    border: 'border-red-400', 
    text: 'text-red-700',
    shadow: 'shadow-red-200'
  },
  'goal': { 
    bg: 'bg-gradient-to-br from-green-500 to-green-600', 
    hover: 'hover:from-green-600 hover:to-green-700', 
    border: 'border-green-400', 
    text: 'text-green-700',
    shadow: 'shadow-green-200'
  },
  'foul': { 
    bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', 
    hover: 'hover:from-yellow-600 hover:to-yellow-700', 
    border: 'border-yellow-400', 
    text: 'text-yellow-700',
    shadow: 'shadow-yellow-200'
  },
  'save': { 
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600', 
    hover: 'hover:from-purple-600 hover:to-purple-700', 
    border: 'border-purple-400', 
    text: 'text-purple-700',
    shadow: 'shadow-purple-200'
  },
  'offside': { 
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600', 
    hover: 'hover:from-orange-600 hover:to-orange-700', 
    border: 'border-orange-400', 
    text: 'text-orange-700',
    shadow: 'shadow-orange-200'
  },
  'corner': { 
    bg: 'bg-gradient-to-br from-teal-500 to-teal-600', 
    hover: 'hover:from-teal-600 hover:to-teal-700', 
    border: 'border-teal-400', 
    text: 'text-teal-700',
    shadow: 'shadow-teal-200'
  },
  'sub': { 
    bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', 
    hover: 'hover:from-indigo-600 hover:to-indigo-700', 
    border: 'border-indigo-400', 
    text: 'text-indigo-700',
    shadow: 'shadow-indigo-200'
  },
};

interface PianoInputProps {
  fullMatchRoster: AssignedPlayers | null;
  assignedEventTypes: EventType[] | null;
  assignedPlayers: AssignedPlayers | null;
  onEventRecord: (eventType: EventType, player?: PlayerForPianoInput, details?: Record<string, any>) => Promise<void>;
}

export function PianoInput({
  fullMatchRoster,
  assignedEventTypes,
  assignedPlayers,
  onEventRecord,
}: PianoInputProps) {
  const { user } = useAuth();
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerForPianoInput | null>(null);
  const [activeTeamContext, setActiveTeamContext] = useState<'home' | 'away' | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Responsive hooks
  const isMobile = useBreakpoint('md');
  const isSmall = useBreakpoint('sm');
  const isXSmall = useBreakpoint('xs');

  console.log('PianoInput - assignedEventTypes:', assignedEventTypes);
  console.log('PianoInput - assignedPlayers:', assignedPlayers);
  console.log('PianoInput - fullMatchRoster:', fullMatchRoster);
  console.log('PianoInput - user:', user);

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

  // Check if tracker has only one player assigned
  const singlePlayerAssigned = useMemo(() => {
    const totalPlayers = displayableHomePlayers.length + displayableAwayPlayers.length;
    if (totalPlayers === 1) {
      return displayableHomePlayers.length === 1 ? displayableHomePlayers[0] : displayableAwayPlayers[0];
    }
    return null;
  }, [displayableHomePlayers, displayableAwayPlayers]);

  // Auto-select the single player and team context
  useEffect(() => {
    if (singlePlayerAssigned) {
      setSelectedPlayer(singlePlayerAssigned);
      setActiveTeamContext(displayableHomePlayers.length === 1 ? 'home' : 'away');
      console.log('Auto-selected single player:', singlePlayerAssigned);
    }
  }, [singlePlayerAssigned, displayableHomePlayers.length]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isRecording) return; // Prevent actions while recording
    
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

    if (selectedEventType && !singlePlayerAssigned && !activeTeamContext) {
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
    
    if (selectedEventType && (singlePlayerAssigned || activeTeamContext) && /^\d$/.test(key)) {
      event.preventDefault();
      
      if (singlePlayerAssigned) {
        // Auto-record event for single player
        handlePlayerSelect(singlePlayerAssigned);
        return;
      }
      
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
      if (!singlePlayerAssigned) {
        setSelectedPlayer(null);
        setActiveTeamContext(null);
      }
      console.log("Selection cleared.");
    }

  }, [selectedEventType, activeTeamContext, displayableEventTypes, displayableHomePlayers, displayableAwayPlayers, singlePlayerAssigned, isRecording]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const handleEventTypeSelect = (eventType: EventType) => {
    if (isRecording) return;
    
    setSelectedEventType(eventType);
    if (!singlePlayerAssigned) {
      setSelectedPlayer(null); 
      setActiveTeamContext(null);
    }
    console.log(`Selected Event Type: ${eventType.label}`);
    
    // If single player is assigned, record event immediately
    if (singlePlayerAssigned) {
      handlePlayerSelect(singlePlayerAssigned);
    }
  };

  const handlePlayerSelect = async (player: PlayerForPianoInput) => {
    if (!selectedEventType) {
      console.warn("Player selected without an event type. Please select an event type first.");
      return;
    }
    
    if (!user?.id) {
      console.error("User not authenticated");
      toast.error('Authentication required to record events');
      return;
    }

    if (isRecording) {
      console.log("Already recording an event, please wait...");
      return;
    }
    
    setIsRecording(true);
    
    try {
      setSelectedPlayer(player);
      console.log(`Recording event: ${selectedEventType.label} for player: ${player.player_name} (#${player.jersey_number})`);
      console.log('Event data being sent:', {
        eventType: selectedEventType,
        player: player,
        userId: user.id
      });
      
      // Call the parent's onEventRecord with proper error handling
      await onEventRecord(selectedEventType, player);
      
      // Show success toast
      toast.success(`${selectedEventType.label} recorded for ${player.player_name || `Player #${player.jersey_number}`}`);
      
      // Reset selection
      setSelectedEventType(null);
      if (!singlePlayerAssigned) {
        setSelectedPlayer(null);
        setActiveTeamContext(null);
      }
    } catch (error: any) {
      console.error('Error in handlePlayerSelect:', error);
      toast.error(`Failed to record event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRecording(false);
    }
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
  
  const showPlayerSelection = selectedEventType && !singlePlayerAssigned && (displayableHomePlayers.length > 0 || displayableAwayPlayers.length > 0);

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
      <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white shadow-2xl border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-700/20 animate-pulse"></div>
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'} relative z-10`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ${isXSmall ? 'w-10 h-10' : 'w-12 h-12'} shadow-lg`}>
              <svg className={`${isXSmall ? 'w-5 h-5' : 'w-6 h-6'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5z"/>
                <path d="M7 7h2v2H7zM11 7h2v2h-2zM15 7h2v2h-2zM7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z"/>
              </svg>
            </div>
            <div>
              <h2 className={`font-bold ${isXSmall ? 'text-lg' : isMobile ? 'text-xl' : 'text-2xl'}`}>Event Piano Input</h2>
              <p className={`text-white/90 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                {singlePlayerAssigned ? 
                  `Recording for: ${singlePlayerAssigned.player_name || `Player #${singlePlayerAssigned.jersey_number}`}` :
                  (isXSmall ? 'Fast event recording' : 'Fast event recording with keyboard shortcuts')
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Player Assignment Notice */}
      {singlePlayerAssigned && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 shadow-lg shadow-green-100">
            <CardContent className={`${isXSmall ? 'p-4' : 'p-5'}`}>
              <div className="flex items-center gap-3">
                <motion.div 
                  className={`bg-green-500 rounded-full flex items-center justify-center ${isXSmall ? 'w-8 h-8' : 'w-10 h-10'} shadow-lg`}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <svg className={`text-white ${isXSmall ? 'w-4 h-4' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </motion.div>
                <div>
                  <h3 className={`font-semibold text-green-800 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    Auto-Selected Player
                  </h3>
                  <p className={`text-green-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    #{singlePlayerAssigned.jersey_number} {singlePlayerAssigned.player_name || `Player #${singlePlayerAssigned.jersey_number}`} - Just select an event type!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Event Types Selection */}
      <Card className="shadow-xl border-slate-200 bg-gradient-to-br from-white to-slate-50">
        <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'}`}>
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <motion.div 
              className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center ${isXSmall ? 'w-7 h-7' : 'w-8 h-8'} shadow-lg text-white`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className={`font-bold ${isXSmall ? 'text-base' : 'text-lg'}`}>1</span>
            </motion.div>
            <h3 className={`font-semibold text-slate-800 ${isXSmall ? 'text-lg' : 'text-xl'}`}>
              {isXSmall ? 'Event Type' : 'Select Event Type'}
            </h3>
            {selectedEventType && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Badge variant="secondary" className={`${EVENT_TYPE_COLORS[selectedEventType.key]?.bg || 'bg-blue-100'} text-white border-0 text-xs shadow-lg`}>
                  {isXSmall ? selectedEventType.key.toUpperCase() : `Selected: ${selectedEventType.label}`}
                </Badge>
              </motion.div>
            )}
          </div>
          
          {displayableEventTypes.length === 0 ? (
            <p className="text-slate-500 italic text-sm">No event types assigned.</p>
          ) : (
            <div className={`grid ${eventTypeGridCols} gap-3 sm:gap-4`}>
              {displayableEventTypes.map((et: EventType) => {
                const isSelected = selectedEventType?.key === et.key;
                const colors = EVENT_TYPE_COLORS[et.key] || EVENT_TYPE_COLORS['pass'];
                
                return (
                  <motion.div
                    key={et.key}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                    layout
                  >
                    <Button
                      onClick={() => handleEventTypeSelect(et)}
                      disabled={isRecording || (!!selectedEventType && selectedEventType.key !== et.key)}
                      className={`w-full p-3 sm:p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 sm:gap-2 border-2 overflow-hidden relative ${
                        isXSmall ? 'h-20' : isMobile ? 'h-24' : 'h-28'
                      } ${
                        isSelected 
                          ? `${colors.bg} ${colors.hover} text-white ${colors.border} shadow-xl ${colors.shadow} ring-2 ring-white ring-offset-2` 
                          : `bg-white hover:bg-slate-50 ${colors.text} border-slate-200 hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 shadow-lg hover:shadow-xl`
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}
                      
                      <div className={`transition-colors duration-300 z-10 relative ${
                        isSelected ? 'text-white' : colors.text
                      }`}>
                        <EnhancedEventTypeIcon 
                          eventKey={et.key} 
                          size={isXSmall ? 20 : isMobile ? 24 : 28} 
                          isSelected={isSelected}
                        />
                      </div>
                      
                      <span className={`font-semibold text-center leading-tight z-10 relative ${isXSmall ? 'text-[10px]' : 'text-xs'}`}>
                        {isXSmall ? et.key.charAt(0).toUpperCase() : et.label}
                      </span>
                      
                      <motion.div
                        className={`absolute -top-1 -right-1 rounded-full p-0 flex items-center justify-center font-bold border-2 ${
                          isXSmall ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'
                        } ${
                          isSelected 
                            ? 'bg-white text-slate-700 border-white shadow-lg' 
                            : `${colors.bg.replace('gradient-to-br', 'solid')} text-white border-white shadow-md`
                        }`}
                        whileHover={{ scale: 1.1 }}
                        animate={isSelected ? { 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
                      >
                        {et.key.charAt(0).toUpperCase()}
                      </motion.div>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Selection - Only show if not single player assigned */}
      <AnimatePresence>
        {showPlayerSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="shadow-xl border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <CardContent className={`${isXSmall ? 'p-4' : isMobile ? 'p-5' : 'p-6'}`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <motion.div 
                    className={`bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center ${isXSmall ? 'w-7 h-7' : 'w-8 h-8'} shadow-lg text-white`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className={`font-bold ${isXSmall ? 'text-base' : 'text-lg'}`}>2</span>
                  </motion.div>
                  <h3 className={`font-semibold text-slate-800 ${isXSmall ? 'text-lg' : 'text-xl'}`}>
                    {isXSmall ? 'Player' : 'Select Player'}
                  </h3>
                  {activeTeamContext && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="secondary" className={`${activeTeamContext === 'home' ? 'bg-green-500' : 'bg-red-500'} text-white border-0 text-xs shadow-lg`}>
                        {activeTeamContext.toUpperCase()}
                      </Badge>
                    </motion.div>
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
                                    {player.player_name || `Player #${player.jersey_number}`}
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
                                    {player.player_name || `Player #${player.jersey_number}`}
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
            <motion.div 
              className={`bg-blue-100 rounded-xl flex items-center justify-center ${isXSmall ? 'w-10 h-10' : 'w-12 h-12'}`}
              animate={{ rotate: isRecording ? 360 : 0 }}
              transition={{ duration: isRecording ? 1 : 0, repeat: isRecording ? Infinity : 0, ease: "linear" }}
            >
              <svg className={`text-blue-600 ${isXSmall ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
            <div className="flex-1">
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className={`font-semibold text-orange-800 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    ⏳ Recording Event...
                  </p>
                  <p className={`text-orange-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    Please wait while the event is being recorded.
                  </p>
                </motion.div>
              )}
              {!isRecording && singlePlayerAssigned && (
                <div>
                  <p className={`font-semibold text-blue-800 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    🎯 {isXSmall ? 'Quick Mode' : 'Quick Recording Mode'}
                  </p>
                  <p className={`text-blue-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    {isXSmall 
                      ? 'Select event type to record instantly.' 
                      : 'Just select an event type - it will be recorded automatically for your assigned player.'
                    }
                  </p>
                </div>
              )}
              {!singlePlayerAssigned && !selectedEventType && displayableEventTypes.length > 0 && (
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
              {!singlePlayerAssigned && selectedEventType && !showPlayerSelection && (
                <div>
                  <p className={`font-semibold text-amber-700 mb-1 ${isXSmall ? 'text-sm' : 'text-base'}`}>
                    ⚠️ {isXSmall ? 'No Players' : 'No Players Available'}
                  </p>
                  <p className={`text-amber-600 ${isXSmall ? 'text-xs' : 'text-sm'}`}>
                    {isXSmall ? 'No assigned players.' : 'No players have been assigned for this tracker.'}
                  </p>
                </div>
              )}
              {!singlePlayerAssigned && selectedEventType && !activeTeamContext && showPlayerSelection && (
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
              {!singlePlayerAssigned && selectedEventType && activeTeamContext && (
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
