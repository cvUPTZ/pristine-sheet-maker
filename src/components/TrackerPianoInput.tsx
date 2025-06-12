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
import { Undo } from 'lucide-react';

// Define interfaces for type safety
interface TrackerPianoInputProps {
  matchId: string;
  onRecordEvent: ( // Added prop
    eventTypeKey: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => Promise<void>;
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

  const { toast } = useToast();
  const { user } = useAuth(); // user.id will be used for local checks, but trackerUserId for event is from TrackerInterface

  // Use the centralized real-time system
  const { } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      // console.log('[TrackerPianoInput] Event received via real-time:', event); // Removed console.log
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
      // console.error("Match ID or user ID is missing."); // Kept for critical issues
      return;
    }

    // console.log('=== TRACKER DEBUG: Starting fetchAssignments (User/Match specific) ==='); // Removed console.log
    // console.log('User ID:', user.id); // Removed console.log
    // console.log('Match ID:', matchId); // Removed console.log

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      // console.log('=== RAW ASSIGNMENTS DATA ==='); // Removed console.log
      // console.log('Assignments found:', data?.length || 0); // Removed console.log
      // console.log('Full assignments data:', data); // Removed console.log

      if (error) {
        console.error("Error fetching tracker assignments:", error);
        setError("Failed to fetch tracker assignments");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        // console.log("No assignments found - setting error state"); // Kept for important state change
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
          const player = fullMatchRoster?.away?.find(p => String(assignment.player_id) === String(assignment.player_id));
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
    setIsRecording(true);
    setRecordingEventType(eventType.key);
    broadcastStatus({ status: 'recording', timestamp: Date.now() });

    let teamContextForEvent: 'home' | 'away' | undefined = undefined;
    // selectedTeam is set by handlePlayerSelect
    if (selectedPlayer && selectedTeam) {
      teamContextForEvent = selectedTeam;
    }
    // If no player is selected, teamContext remains undefined, which is fine.

    try {
      await onRecordEvent( // Use the prop here
        eventType.key,
        selectedPlayer?.id, // Pass selected player's ID if a player is selected
        teamContextForEvent, // Pass team context if a player is selected
        {
          recorded_via: 'piano',
          // You can add other piano-specific details here, e.g., coordinates if captured
        }
      );
      
      // For local UI feedback (recent events list)
      const eventInfoForRecentList = {
        id: `local-${Date.now()}-${eventType.key}`, // Temporary local ID
        eventType: { key: eventType.key, label: eventType.label }, // Use the structure expected by recentEvents
        player: selectedPlayer, // Keep the selected player object for display
        timestamp: Date.now()
      };
      setLastRecordedEvent(eventInfoForRecentList); // Update last recorded event display
      setRecentEvents(prev => [eventInfoForRecentList, ...prev.slice(0, 4)]); // Update recent events list

      // The main success toast is handled by onRecordEvent in TrackerInterface.
      // Optionally, reset selections or provide further local feedback.
      // E.g., clear selected player if events are usually one-off for a player selection:
      // setSelectedPlayer(null);
      // setSelectedTeam(null);
      // However, users might want to record multiple events for the same player, so avoid auto-clearing for now.

    } catch (error: any) {
      console.error('Error calling onRecordEvent from PianoInput:', error);
      // Error toast is handled by onRecordEvent in TrackerInterface.
    } finally {
      setIsRecording(false);
      setRecordingEventType(null);
      broadcastStatus({ status: 'active', timestamp: Date.now() });
    }
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
    <div className="space-y-6 p-4">
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

            {totalAssignedPlayers <= 1 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
                {assignedEventTypes.map((eventType, index) => (
                  <motion.div
                    key={eventType.key} // Single player event types
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
                      <EventTypeSvg
                        eventType={eventType.key}
                        isRecording={recordingEventType === eventType.key}
                        disabled={isRecording || (totalAssignedPlayers > 1 && !selectedPlayer)} // This condition might need adjustment for single player auto-selection
                        onClick={() => handleEventTypeClick(eventType)}
                      />
                      <motion.div
                        className="mt-3 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-purple-200 dark:border-purple-700"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                          {eventType.label}
                        </span>
                      </motion.div>
                    </div>

                    {recordingEventType === eventType.key && (
                      <motion.div
                        className="absolute -inset-4 rounded-full border-4 border-green-400"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold mb-6 text-center text-purple-700 dark:text-purple-300">
                  Record Events by Player
                </h3>
                <div className="space-y-6">
                  {assignedPlayers && [...assignedPlayers.home, ...assignedPlayers.away].map(player => (
                    <div 
                      key={player.id} 
                      className={`p-4 border rounded-lg shadow-md transition-all duration-300 ease-in-out ${
                        selectedPlayer?.id === player.id 
                          ? 'bg-green-50 dark:bg-green-900 border-green-400 dark:border-green-600 ring-2 ring-green-500' 
                          : 'bg-white dark:bg-slate-800 hover:shadow-lg'
                      }`}
                    >
                      <CardTitle 
                        className={`mb-4 cursor-pointer flex items-center justify-between p-3 rounded-md ${
                          selectedPlayer?.id === player.id 
                            ? 'text-green-700 dark:text-green-200 bg-green-100 dark:bg-green-800' 
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                        onClick={() => handlePlayerSelect(player, assignedPlayers.home.includes(player) ? 'home' : 'away')}
                      >
                        <div>
                          {player.jersey_number && <span className="font-bold">#{player.jersey_number} </span>}
                          {player.name}
                          <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${
                            assignedPlayers.home.includes(player) 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' 
                              : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'
                          }`}>
                            {assignedPlayers.home.includes(player) ? 'Home' : 'Away'}
                          </span>
                        </div>
                        {selectedPlayer?.id === player.id && (
                          <span className="text-xs font-semibold px-2 py-1 bg-green-500 text-white rounded-full shadow">SELECTED</span>
                        )}
                      </CardTitle>
                      
                      {selectedPlayer?.id === player.id && ( 
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-items-center pt-3">
                            {assignedEventTypes.map((eventType, index) => (
                              <motion.div
                                key={`${player.id}-${eventType.key}`} {/* Multi-player event types */}
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.05,
                              type: "spring",
                              stiffness: 280,
                              damping: 18
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="relative"
                          >
                            <div className="text-center">
                              <EventTypeSvg
                                eventType={eventType.key}
                                isRecording={recordingEventType === eventType.key}
                                // Player is already selected by clicking CardTitle, so no need to check !selectedPlayer here for disabled state
                                disabled={isRecording}
                                onClick={() => handleEventTypeClick(eventType)} // handleEventTypeClick uses selectedPlayer
                              />
                              <motion.div
                                className="mt-2 px-2 py-1 bg-white dark:bg-gray-700 rounded-full shadow border border-purple-100 dark:border-purple-600 text-center"
                                whileHover={{ scale: 1.05 }}
                              >
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-200 block truncate w-full">
                                  {eventType.label}
                                </span>
                              </motion.div>
                            </div>
                            {recordingEventType === eventType.key && selectedPlayer?.id === player.id && ( // Ensure animation is only for selected player's events
                              <motion.div
                                className="absolute -inset-3 rounded-full border-2 border-green-500"
                                animate={{
                                  scale: [1, 1.15, 1],
                                  opacity: [0.6, 0.9, 0.6]
                                }}
                                transition={{ duration: 0.7, repeat: Infinity }}
                              />
                            )}
                          </motion.div>
                        ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
    </div>
  );
};

export default TrackerPianoInput;
