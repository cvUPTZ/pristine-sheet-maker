import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { EventType } from '@/types';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { motion, AnimatePresence } from 'framer-motion';
import EventTypeSvg from '@/components/match/EventTypeSvg';

// Define interfaces for type safety
interface TrackerPianoInputProps {
  matchId: string;
}

interface PlayerForPianoInput {
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

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
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

  const { toast } = useToast();
  const { user } = useAuth();

  // Use the centralized real-time system
  const { broadcastStatus } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      console.log('[TrackerPianoInput] Event received via real-time:', event);
      if (event.created_by === user?.id) {
        setLastRecordedEvent({
          eventType: { key: event.type, label: event.type },
          player: selectedPlayer,
          timestamp: Date.now()
        });
      }
    }
  });

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

    console.log('=== TRACKER DEBUG: Starting fetchAssignments (User/Match specific) ===');
    console.log('User ID:', user.id);
    console.log('Match ID:', matchId);

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      console.log('=== RAW ASSIGNMENTS DATA ===');
      console.log('Assignments found:', data?.length || 0);
      console.log('Full assignments data:', data);

      if (error) {
        console.error("Error fetching tracker assignments:", error);
        setError("Failed to fetch tracker assignments");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log("No assignments found - setting error state");
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
          const player = fullMatchRoster?.away?.find(p => String(p.id) === String(assignment.player_id));
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

  const recordEvent = async (eventType: EnhancedEventType, player?: PlayerForPianoInput, details?: Record<string, any>) => {
    console.log('TrackerPianoInput recordEvent called with:', { 
      eventType, 
      player, 
      details, 
      user: user?.id,
      matchId 
    });
    
    if (!matchId) {
      console.error("Match ID is missing.");
      throw new Error("Match ID is missing");
    }

    if (!user?.id) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }

    if (!eventType) {
      console.error("Event type is missing");
      throw new Error("Event type is missing");
    }

    setIsRecording(true);
    setRecordingEventType(eventType.key);
    
    // Broadcast that we're recording
    broadcastStatus('recording', `recording_${eventType.key}`);

    try {
      let teamContext = null;
      if (player && assignedPlayers) {
        if (assignedPlayers.home?.some(p => p.id === player.id)) {
          teamContext = 'home';
        } else if (assignedPlayers.away?.some(p => p.id === player.id)) {
          teamContext = 'away';
        }
      }

      const playerId = player ? parseInt(String(player.id), 10) : null;
      
      if (player && (isNaN(playerId!) || playerId === null)) {
        console.error("Invalid player ID:", player.id);
        throw new Error("Invalid player ID");
      }

      const timestampInSeconds = Math.floor(Date.now() / 1000);

      const eventData = {
        match_id: matchId,
        event_type: eventType.key,
        timestamp: timestampInSeconds,
        player_id: playerId,
        team: teamContext,
        coordinates: details?.coordinates || null,
        created_by: user.id
      };

      console.log('Inserting event data:', eventData);

      // Use upsert for faster insertion and avoid conflicts
      const { data, error } = await supabase
        .from('match_events')
        .upsert([eventData])
        .select();

      if (error) {
        console.error("Error recording event:", error);
        throw new Error(`Failed to record event: ${error.message}`);
      }

      console.log('Event recorded successfully:', data);
      
      // Broadcast that we're back to active status
      broadcastStatus('active', `recorded_${eventType.key}`);
      
      toast({
        title: "Event Recorded",
        description: `${eventType.label}${player ? ` by ${player.name}` : ''} recorded successfully`,
      });
      
    } catch (error: any) {
      console.error("Error in recordEvent:", error);
      broadcastStatus('active'); // Reset status on error
      toast({
        title: "Error",
        description: error.message || "Failed to record event",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsRecording(false);
      setRecordingEventType(null);
    }
  };

  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    try {
      await recordEvent(eventType, selectedPlayer || undefined);
    } catch (error) {
      console.error('Error recording event:', error);
    }
  };

  const handlePlayerSelect = (player: PlayerForPianoInput, team: 'home' | 'away') => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

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

  return (
    <div className="space-y-6 p-4">
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
                      </div>
                    </div>
                  </div>
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
                    <EnhancedEventTypeIcon 
                      eventType={lastRecordedEvent.eventType.key as EventType}
                      size={24}
                      className="text-white"
                    />
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

      {/* Player Selection */}
      {(assignedPlayers?.home?.length || assignedPlayers?.away?.length) && (
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

      {/* Event Types - New SVG Design */}
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
                Tap any event type to record instantly
              </p>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
              {assignedEventTypes.map((eventType, index) => (
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
                    <EventTypeSvg
                      eventType={eventType.key}
                      isRecording={recordingEventType === eventType.key}
                      disabled={isRecording}
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
