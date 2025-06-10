import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { EventType } from '@/types';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';
import { motion, AnimatePresence } from 'framer-motion';
import EventTypeSvg from '@/components/match/EventTypeSvg';
import CancellableEventsDisplay, { CancellableEventItem } from '../match/CancellableEventsDisplay'; // Import new component and type
import { Undo, Clock, Plus } from 'lucide-react';


// Define interfaces for type safety
interface TrackerPianoInputProps {
  matchId: string;
  onRecordEvent: ( 
    eventTypeKey: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => Promise<any | null>; // Updated prop type
}

export interface PlayerForPianoInput {
  id: number;
  name: string;
  position?: string;
  jersey_number?: number;
}

interface AssignedPlayers {
  home: PlayerForPianoInput[];
  away: PlayerForPianoInput[];
}

interface EnhancedEventType {
  key: string;
  label: string;
  category?: string;
  subcategory?: string;
  description?: string;
}

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId, onRecordEvent }) => {
  const [assignedEventTypes, setAssignedEventTypes] = useState<EnhancedEventType[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayers | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerForPianoInput | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordedEvent, setLastRecordedEvent] = useState<any>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<AssignedPlayers | null>(null);
  const [recordingEventType, setRecordingEventType] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [cancellableEvents, setCancellableEvents] = useState<CancellableEventItem[]>([]); // Updated state type
  const [showDelayedRecording, setShowDelayedRecording] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth(); // user.id will be used for local checks, but trackerUserId for event is from TrackerInterface

  // Use the centralized real-time system
  const { } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      // console.log('[TrackerPianoInput] Event received via real-time:', event);
      if (event.created_by === user?.id) {
        const eventInfo = {
          id: event.id,
          eventType: { key: event.type, label: event.type },
          player: selectedPlayer,
          timestamp: Date.now()
        };
        setLastRecordedEvent(eventInfo);
        setRecentEvents(prev => [eventInfo, ...prev.slice(0, 4)]); // Keep last 5 events
      }
    }
  });

  // Use unified tracker connection for status broadcasting
  const { broadcastStatus } = useUnifiedTrackerConnection(matchId, user?.id || '');

  const fetchMatchDetails = useCallback(async () => {
    if (!matchId) {
      console.error("Match ID is missing.");
      return;
    }

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('home_team_players, away_team_players')
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error("Error fetching match details:", matchError);
        return;
      }

      const parsePlayerData = (data: any): PlayerForPianoInput[] => {
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch {
            return [];
          }
        }
        return Array.isArray(data) ? data : [];
      };

      const homePlayers = parsePlayerData(matchData.home_team_players);
      const awayPlayers = parsePlayerData(matchData.away_team_players);
      setFullMatchRoster({ home: homePlayers, away: awayPlayers });

    } catch (error: any) {
      console.error("Error fetching match details:", error);
    }
  }, [matchId]);

  const fetchAssignments = useCallback(async () => {
    if (!matchId || !user?.id) {
      console.error("Match ID or user ID is missing.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      if (error) {
        console.error("Error fetching tracker assignments:", error);
        setError("Failed to fetch tracker assignments");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setError("No assignments found for this tracker and match. Please contact your administrator.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        setLoading(false);
        return;
      }

      const eventTypes = Array.from(new Set(data.flatMap(assignment => assignment.assigned_event_types || [])));
      const assignedEventTypesData: EnhancedEventType[] = eventTypes
        .filter(key => key)
        .map(key => ({ key, label: key }));
      setAssignedEventTypes(assignedEventTypesData);

      const homePlayers: PlayerForPianoInput[] = [];
      const awayPlayers: PlayerForPianoInput[] = [];

      data.forEach(assignment => {
        if (assignment.player_team_id === 'home') {
          const player = fullMatchRoster?.home?.find(p => String(p.id) === String(assignment.player_id));
          if (player && !homePlayers.some(p => p.id === player.id)) {
            homePlayers.push(player);
          }
        } else if (assignment.player_team_id === 'away') {
          const player = fullMatchRoster?.away?.find(p => String(p.id) === String(assignment.player_id)); // Corrected this line
          if (player && !awayPlayers.some(p => p.id === player.id)) {
            awayPlayers.push(player);
          }
        }
      });

      setAssignedPlayers({ home: homePlayers, away: awayPlayers });
      setError(null);

    } catch (error: any) {
      console.error("Error fetching tracker assignments:", error);
      setError("Failed to fetch tracker assignments");
    } finally {
      setLoading(false);
    }
  }, [matchId, user?.id, fullMatchRoster]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  useEffect(() => {
    if (fullMatchRoster) {
      fetchAssignments();
    }
  }, [fetchAssignments, fullMatchRoster]);

  const undoLastAction = async () => {
    if (recentEvents.length === 0) {
      toast({
        title: "Aucune action à annuler",
        description: "Il n'y a pas d'action récente à annuler",
        variant: "destructive",
      });
      return;
    }

    const lastEvent = recentEvents[0];
    
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', lastEvent.id);

      if (error) throw error;

      // Remove from local state
      setRecentEvents(prev => prev.slice(1));
      setLastRecordedEvent(null);

      // Also remove from cancellableEvents if present
      if (lastEvent && lastEvent.id) {
        setCancellableEvents(prevCancellable =>
          prevCancellable.filter(event => event.id !== lastEvent.id)
        );
      }

      toast({
        title: "Action annulée",
        description: `L'événement ${lastEvent.eventType.label} a été supprimé`,
      });

    } catch (error: any) {
      console.error('Error undoing last action:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la dernière action",
        variant: "destructive",
      });
    }
  };

  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    await executeEventRecord(eventType);
  };

  const executeEventRecord = async (eventType: EnhancedEventType) => {
    setIsRecording(true);
    setRecordingEventType(eventType.key);
    broadcastStatus({ status: 'recording', timestamp: Date.now() });

    let teamContextForEvent: 'home' | 'away' | undefined = undefined;
    // selectedTeam is set by handlePlayerSelect
    if (selectedPlayer && selectedTeam) {
      teamContextForEvent = selectedTeam;
    }
    // If no player is selected, teamContext remains undefined.

    try {
      const recordedEvent = await onRecordEvent( 
        eventType.key,
        selectedPlayer?.id, 
        teamContextForEvent, 
        {
          recorded_via: 'piano',
        }
      );
      
      if (recordedEvent && recordedEvent.id) { 
        const newCancellableEvent: CancellableEventItem = {
            id: recordedEvent.id, 
            label: eventType.label, 
            timerStartTime: Date.now(),
        };
        setCancellableEvents(prev => [newCancellableEvent, ...prev.slice(0, 4)]);
        
        // For local UI feedback (recent events list)
        const eventInfoForRecentList = {
          id: recordedEvent.id,
          eventType: { key: eventType.key, label: eventType.label },
          player: selectedPlayer,
          timestamp: Date.now() // Or use recordedEvent.timestamp if available and preferred
        };
        setLastRecordedEvent(eventInfoForRecentList);
        setRecentEvents(prev => [eventInfoForRecentList, ...prev.slice(0, 4)]);

      } else {
        console.error("Event recording failed or did not return an event object with ID.");
        toast({
          title: "Recording Issue",
          description: "The event was recorded but its details could not be immediately retrieved for cancellation.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error calling onRecordEvent from PianoInput:', error);
      // This toast might be redundant if onRecordEvent already shows one for DB errors
      toast({
        title: "Recording Error",
        description: "Failed to record the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
      setRecordingEventType(null);
      broadcastStatus({ status: 'active', timestamp: Date.now() });
    }
  };

  const handleCancelEventFromDisplay = async (eventId: string | number) => {
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        throw error;
      }

      setCancellableEvents(prev => prev.filter(event => event.id !== eventId));
      toast({ 
        title: "Event Cancelled", 
        description: "The event was successfully removed." 
      });

    } catch (error: any) {
      console.error('Error cancelling event:', error);
      toast({ 
        title: "Error Cancelling Event", 
        description: error.message || "Could not remove the event.", 
        variant: "destructive" 
      });
    }
  };

  const handleDelayedEventRecord = async (eventType: EnhancedEventType) => {
    await executeEventRecord(eventType);
    setShowDelayedRecording(false);
  };

  const handlePlayerSelect = (player: PlayerForPianoInput, team: 'home' | 'away') => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  useEffect(() => {
    if (assignedPlayers && !selectedPlayer) {
      const allPlayers = [...(assignedPlayers.home || []), ...(assignedPlayers.away || [])];
      if (allPlayers.length === 1) {
        const singlePlayer = allPlayers[0];
        const isHomePlayer = assignedPlayers.home?.includes(singlePlayer);
        setSelectedPlayer(singlePlayer);
        setSelectedTeam(isHomePlayer ? 'home' : 'away');
      }
    }
  }, [assignedPlayers, selectedPlayer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="text-lg font-semibold mb-2">Loading assignments...</div>
          <div className="text-sm text-gray-600">Please wait while we fetch your tracker assignments.</div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="flex items-center justify-center p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-red-600">Assignment Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <Button onClick={fetchAssignments} variant="outline">
            Retry
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!assignedEventTypes.length && !assignedPlayers?.home?.length && !assignedPlayers?.away?.length) {
    return (
      <motion.div 
        className="flex items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No Assignments</div>
          <div className="text-sm text-gray-600 mb-4">You have no event types or players assigned for this match.</div>
          <Button onClick={fetchAssignments} variant="outline">
            Refresh Assignments
          </Button>
        </div>
      </motion.div>
    );
  }

  const totalAssignedPlayers = (assignedPlayers?.home?.length || 0) + (assignedPlayers?.away?.length || 0);
  const showPlayerSelection = totalAssignedPlayers > 1;

  return (
    <div className="space-y-4 p-4">
      {/* Delayed Recording Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowDelayedRecording(!showDelayedRecording)}
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-300 hover:bg-orange-50"
        >
          <Clock className="h-4 w-4 mr-2" />
          Add Delayed Event
        </Button>
      </div>

      {/* Delayed Recording Panel */}
      <AnimatePresence>
        {showDelayedRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-lg p-4"
          >
            <h3 className="font-semibold text-orange-800 mb-3">Record Delayed Event</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {assignedEventTypes.map((eventType) => (
                <Button
                  key={`delayed-${eventType.key}`}
                  onClick={() => handleDelayedEventRecord(eventType)}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  disabled={isRecording}
                >
                  <EventTypeSvg eventType={eventType.key} />
                  <span className="text-xs">{eventType.label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Button - Fixed position and easily accessible */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={undoLastAction}
          disabled={recentEvents.length === 0}
          variant="outline"
          size="lg"
          className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 shadow-lg"
        >
          <Undo className="h-5 w-5 mr-2" />
          Annuler Dernière Action
        </Button>
      </motion.div>

      {/* Selected Player Display */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {selectedPlayer.jersey_number || selectedPlayer.name.charAt(0)}
                    </motion.div>
                    <div>
                      <div className="font-bold text-xl text-green-800 dark:text-green-200">
                        {selectedPlayer.name}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-300 flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-200 dark:bg-green-800 rounded-full text-xs font-medium">
                          {selectedTeam === 'home' ? 'Home' : 'Away'}
                        </span>
                        {selectedPlayer.position && (
                          <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded-full text-xs font-medium">
                            {selectedPlayer.position}
                          </span>
                        )}
                        {selectedPlayer.jersey_number && (
                          <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 rounded-full text-xs font-medium">
                            #{selectedPlayer.jersey_number}
                          </span>
                        )}
                        {totalAssignedPlayers === 1 && (
                          <span className="px-2 py-1 bg-orange-200 dark:bg-orange-800 rounded-full text-xs font-medium">
                            Auto-selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {showPlayerSelection && (
                    <Button 
                      onClick={() => {
                        setSelectedPlayer(null);
                        setSelectedTeam(null);
                      }}
                      variant="outline"
                      size="sm"
                      className="hover:bg-red-50 hover:border-red-300"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Recorded Event */}
      <AnimatePresence>
        {lastRecordedEvent && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0] 
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="text-white text-lg">⚽</span>
                  </motion.div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-800 dark:text-blue-200">
                      Last Event: {lastRecordedEvent.eventType.label}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-300">
                      {lastRecordedEvent.player && `by ${lastRecordedEvent.player.name} • `}
                      {new Date(lastRecordedEvent.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Selection - Only show when there are multiple players */}
      {showPlayerSelection && (assignedPlayers?.home?.length || assignedPlayers?.away?.length) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-xl border-2 border-slate-200">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="text-2xl">⚽</span>
                Select Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {assignedPlayers?.home?.length > 0 && (
                <div>
                  <h3 className="font-bold mb-4 text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                    Home Team
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {assignedPlayers.home.map((player, index) => (
                      <motion.div
                        key={`home-${player.id}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => handlePlayerSelect(player, 'home')}
                          variant={selectedPlayer?.id === player.id && selectedTeam === 'home' ? 'default' : 'outline'}
                          className={`w-full h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                            selectedPlayer?.id === player.id && selectedTeam === 'home' 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
                              : 'hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            selectedPlayer?.id === player.id && selectedTeam === 'home'
                              ? 'bg-white text-blue-600'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                          }`}>
                            {player.jersey_number || player.name.charAt(0)}
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-sm">{player.name}</div>
                            {player.position && (
                              <div className="text-xs opacity-75">{player.position}</div>
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {assignedPlayers?.away?.length > 0 && (
                <div>
                  <h3 className="font-bold mb-4 text-lg text-red-700 dark:text-red-300 flex items-center gap-2">
                    <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                    Away Team
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {assignedPlayers.away.map((player, index) => (
                      <motion.div
                        key={`away-${player.id}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => handlePlayerSelect(player, 'away')}
                          variant={selectedPlayer?.id === player.id && selectedTeam === 'away' ? 'default' : 'outline'}
                          className={`w-full h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                            selectedPlayer?.id === player.id && selectedTeam === 'away' 
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg transform scale-105' 
                              : 'hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            selectedPlayer?.id === player.id && selectedTeam === 'away'
                              ? 'bg-white text-red-600'
                              : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
                          }`}>
                            {player.jersey_number || player.name.charAt(0)}
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-sm">{player.name}</div>
                            {player.position && (
                              <div className="text-xs opacity-75">{player.position}</div>
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Event Types - Enhanced SVG Design */}
      {assignedEventTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-2xl p-8 shadow-2xl border-2 border-purple-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎹 Record Events
              </h2>
              <p className="text-purple-600 dark:text-purple-300 mt-2">
                {totalAssignedPlayers === 1 
                  ? "Tap any event type to record instantly" 
                  : selectedPlayer 
                    ? `Recording for ${selectedPlayer.name}` 
                    : "Select a player first, then tap any event type"}
              </p>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
              {assignedEventTypes.map((eventType, index) => {
                return (
                  <motion.div
                    key={eventType.key}
                    initial={{ opacity: 0, scale: 0.5, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 300,
                      damping: 20
                    }}
                    whileHover={{ scale: 1.1, y: -10 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <div className="text-center">
                      <div className="relative">
                        <EventTypeSvg
                          eventType={eventType.key}
                          isRecording={recordingEventType === eventType.key}
                          disabled={isRecording || (totalAssignedPlayers > 1 && !selectedPlayer)}
                          onClick={() => handleEventTypeClick(eventType)}
                        />
                      </div>
                      
                      <motion.div
                        className="mt-3 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-purple-200 dark:border-purple-700"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                          {eventType.label}
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 text-center"
              >
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-lg font-bold shadow-xl">
                  <motion.div
                    className="w-4 h-4 bg-white rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                  Recording Event...
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Cancellable Events Display */}
      <CancellableEventsDisplay
        events={cancellableEvents}
        onCancelEvent={handleCancelEventFromDisplay}
        timerDuration={10000} // e.g., 10 seconds
      />
    </div>
  );
};

export default TrackerPianoInput;
