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
import { Undo, User, CheckCircle, Activity, Zap, Play } from 'lucide-react';

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
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  // Use the centralized real-time system
  const { } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      console.log('[TrackerPianoInput] Event received via real-time:', event);
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
    broadcastStatus({
      status: 'recording',
      timestamp: Date.now()
    });

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
      broadcastStatus({
        status: 'active',
        timestamp: Date.now()
      });
      
      toast({
        title: "Event Recorded",
        description: `${eventType.label}${player ? ` by ${player.name}` : ''} recorded successfully`,
      });
      
    } catch (error: any) {
      console.error("Error in recordEvent:", error);
      broadcastStatus({ status: 'active', timestamp: Date.now() }); // Reset status on error
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
      <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <motion.div 
          className="text-center bg-white rounded-3xl p-12 shadow-2xl border border-slate-100"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="w-8 h-8 text-white" />
          </motion.div>
          <div className="text-2xl font-bold mb-3 bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Loading assignments...
          </div>
          <div className="text-slate-500">Please wait while we fetch your tracker assignments.</div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-red-50 via-white to-red-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center bg-white rounded-3xl p-12 shadow-2xl border border-red-100">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-3xl">⚠️</span>
          </div>
          <div className="text-2xl font-bold mb-3 text-red-700">Assignment Error</div>
          <div className="text-slate-600 mb-6">{error}</div>
          <Button onClick={fetchAssignments} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg">
            Retry
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!assignedEventTypes.length && !assignedPlayers?.home?.length && !assignedPlayers?.away?.length) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-gray-50 via-white to-gray-50"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="text-center bg-white rounded-3xl p-12 shadow-2xl border border-gray-100">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="text-2xl font-bold mb-3 text-gray-700">No Assignments</div>
          <div className="text-slate-600 mb-6">You have no event types or players assigned for this match.</div>
          <Button onClick={fetchAssignments} className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 shadow-lg">
            Refresh Assignments
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-200/20 to-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 space-y-8 p-6 max-w-7xl mx-auto">
        {/* Floating Undo Button */}
        <motion.div
          className="fixed top-6 right-6 z-50"
          initial={{ opacity: 0, scale: 0.8, x: 100 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            onClick={undoLastAction}
            disabled={recentEvents.length === 0}
            size="lg"
            className={`
              bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700
              text-white border-0 shadow-2xl rounded-full px-6 py-3
              transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100
            `}
          >
            <Undo className="h-5 w-5 mr-2" />
            Annuler Dernière
          </Button>
        </motion.div>

        {/* Selected Player Display */}
        <AnimatePresence>
          {selectedPlayer && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            >
              <Card className="border-0 shadow-2xl bg-gradient-to-r from-emerald-50 to-green-50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10" />
                <CardContent className="relative p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <motion.div 
                        className="relative"
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                          {selectedPlayer.jersey_number || selectedPlayer.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </motion.div>
                      <div>
                        <div className="text-3xl font-bold text-emerald-800 mb-2">
                          {selectedPlayer.name}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full text-sm font-semibold shadow-lg">
                            {selectedTeam === 'home' ? 'Home Team' : 'Away Team'}
                          </span>
                          {selectedPlayer.position && (
                            <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-semibold shadow-lg">
                              {selectedPlayer.position}
                            </span>
                          )}
                          {selectedPlayer.jersey_number && (
                            <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full text-sm font-semibold shadow-lg">
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
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                    >
                      Clear Selection
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
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.6, type: "spring" }}
            >
              <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-50 to-cyan-50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" />
                <CardContent className="relative p-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-xl"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0] 
                      }}
                      transition={{ duration: 0.8 }}
                    >
                      <CheckCircle className="w-8 h-8 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-blue-800 mb-1">
                        Event Successfully Recorded!
                      </div>
                      <div className="text-blue-600">
                        <span className="font-semibold">{lastRecordedEvent.eventType.label}</span>
                        {lastRecordedEvent.player && (
                          <span> • by {lastRecordedEvent.player.name}</span>
                        )}
                        <span> • {new Date(lastRecordedEvent.timestamp).toLocaleTimeString()}</span>
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <CardTitle className="text-2xl flex items-center gap-3 text-slate-800">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  Select Player
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {assignedPlayers?.home?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-6 text-blue-700 flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg"></div>
                      Home Team
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {assignedPlayers.home.map((player, index) => (
                        <motion.div
                          key={`home-${player.id}`}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={() => handlePlayerSelect(player, 'home')}
                            variant="outline"
                            className={`
                              w-full h-auto p-6 flex flex-col items-center gap-3 border-2 transition-all duration-300 rounded-2xl
                              ${selectedPlayer?.id === player.id && selectedTeam === 'home' 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-2xl transform scale-105' 
                                : 'hover:bg-blue-50 hover:border-blue-300 border-slate-200 shadow-lg hover:shadow-xl'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                              selectedPlayer?.id === player.id && selectedTeam === 'home'
                                ? 'bg-white text-blue-600'
                                : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700'
                            }`}>
                              {player.jersey_number || player.name.charAt(0)}
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-sm mb-1">{player.name}</div>
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
                    <h3 className="text-xl font-bold mb-6 text-red-700 flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg"></div>
                      Away Team
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {assignedPlayers.away.map((player, index) => (
                        <motion.div
                          key={`away-${player.id}`}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={() => handlePlayerSelect(player, 'away')}
                            variant="outline"
                            className={`
                              w-full h-auto p-6 flex flex-col items-center gap-3 border-2 transition-all duration-300 rounded-2xl
                              ${selectedPlayer?.id === player.id && selectedTeam === 'away' 
                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-600 shadow-2xl transform scale-105' 
                                : 'hover:bg-red-50 hover:border-red-300 border-slate-200 shadow-lg hover:shadow-xl'
                              }
                            `}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                              selectedPlayer?.id === player.id && selectedTeam === 'away'
                                ? 'bg-white text-red-600'
                                : 'bg-gradient-to-br from-red-100 to-red-200 text-red-700'
                            }`}>
                              {player.jersey_number || player.name.charAt(0)}
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-sm mb-1">{player.name}</div>
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

        {/* Event Types - Simplified Piano Interface */}
        {assignedEventTypes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-10">
                <div className="text-center mb-10">
                  <motion.h2 
                    className="text-3xl font-bold mb-4"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent flex items-center justify-center gap-3">
                      <Zap className="w-8 h-8 text-blue-600" />
                      Event Controls
                    </span>
                  </motion.h2>
                  <p className="text-lg text-slate-600 font-medium">
                    Select an event type to record instantly
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
                  {assignedEventTypes.map((eventType, index) => (
                    <motion.div
                      key={eventType.key}
                      initial={{ opacity: 0, scale: 0.3, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ 
                        duration: 0.5, 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 200,
                        damping: 15
                      }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                      <Button
                        onClick={() => handleEventTypeClick(eventType)}
                        disabled={isRecording}
                        className={`
                          w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold transition-all duration-300 shadow-lg
                          ${recordingEventType === eventType.key 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-400 shadow-2xl scale-110' 
                            : 'bg-gradient-to-br from-white to-slate-50 hover:from-blue-50 hover:to-indigo-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300 hover:shadow-xl'
                          }
                        `}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          recordingEventType === eventType.key 
                            ? 'bg-white text-green-600' 
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        }`}>
                          <Play className="w-4 h-4" />
                        </div>
                        <span className="capitalize">{eventType.label}</span>
                      </Button>
                      
                      {/* Recording pulse effect */}
                      {recordingEventType === eventType.key && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl border-4 border-green-400 bg-green-400/10"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.7, 1, 0.7]
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
                
                {/* Recording Status */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      className="mt-10 text-center"
                    >
                      <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xl font-bold shadow-2xl">
                        <motion.div
                          className="w-6 h-6 bg-white rounded-full"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        Recording Event...
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Activity className="w-6 h-6" />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TrackerPianoInput;
