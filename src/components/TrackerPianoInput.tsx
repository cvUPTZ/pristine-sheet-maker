import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import CancelActionIndicator from '@/components/match/CancelActionIndicator';

// Define interfaces for type safety
interface TrackerPianoInputProps {
  matchId: string;
  onRecordEvent: (
    eventTypeKey: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => Promise<any | null>;
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
  const { user } = useAuth();
  const userIdForConnection = useMemo(() => user?.id || '', [user?.id]);

  const { } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      if (event.created_by === user?.id) {
        const eventInfo = {
          id: event.id,
          eventType: { key: event.type, label: event.type },
          player: selectedPlayer,
          timestamp: Date.now()
        };
        setLastRecordedEvent(eventInfo);
        setRecentEvents(prev => [eventInfo, ...prev.slice(0, 4)]);
      }
    }
  });
  
  const { broadcastStatus } = useUnifiedTrackerConnection(matchId, userIdForConnection);

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
      if (matchError) throw matchError;
      const parsePlayerData = (data: any): PlayerForPianoInput[] => {
        if (typeof data === 'string') {
          try { return JSON.parse(data); } catch { return []; }
        }
        return Array.isArray(data) ? data : [];
      };
      setFullMatchRoster({
        home: parsePlayerData(matchData.home_team_players),
        away: parsePlayerData(matchData.away_team_players)
      });
    } catch (e: any) { console.error("Error fetching match details:", e); }
  }, [matchId]);

  const fetchAssignments = useCallback(async () => {
    if (!matchId || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);
      if (error) throw error;
      if (!data || data.length === 0) {
        setError("No assignments found for this tracker and match. Please contact your administrator.");
        setAssignedEventTypes([]);
        setAssignedPlayers({ home: [], away: [] });
        setLoading(false);
        return;
      }
      const eventTypes = Array.from(new Set(data.flatMap(assignment => assignment.assigned_event_types || [])));
      setAssignedEventTypes(eventTypes.filter(key => key).map(key => ({ key, label: key })));
      const homeP: PlayerForPianoInput[] = [], awayP: PlayerForPianoInput[] = [];
      data.forEach(assignment => {
        const teamList = assignment.player_team_id === 'home' ? fullMatchRoster?.home : fullMatchRoster?.away;
        const player = teamList?.find(p => String(p.id) === String(assignment.player_id));
        if (player) {
          const targetList = assignment.player_team_id === 'home' ? homeP : awayP;
          if (!targetList.some(p => p.id === player.id)) targetList.push(player);
        }
      });
      setAssignedPlayers({ home: homeP, away: awayP });
      setError(null);
    } catch (e: any) {
      console.error("Error fetching tracker assignments:", e);
      setError("Failed to fetch tracker assignments");
    } finally { setLoading(false); }
  }, [matchId, user?.id, fullMatchRoster]);

  useEffect(() => { fetchMatchDetails(); }, [fetchMatchDetails]);
  useEffect(() => { if (fullMatchRoster) fetchAssignments(); }, [fetchAssignments, fullMatchRoster]);

  const handleCancelEvent = useCallback(async (eventId: string, eventTypeKey: string) => {
    try {
      setRecentEvents(prev => prev.filter(event => event.id !== eventId));
      
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Error cancelling event in database:', error);
      }
      
      toast({
        title: "Event Cancelled",
        description: `${eventTypeKey} event has been cancelled.`,
      });
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast({
        title: "Error",
        description: "Failed to cancel event",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleEventExpire = useCallback((eventId: string) => {
    setRecentEvents(prev => prev.filter(event => event.id !== eventId));
  }, []);

  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    setIsRecording(true);
    setRecordingEventType(eventType.key);
    broadcastStatus({ status: 'recording', timestamp: Date.now() });
    let teamCtx = (selectedPlayer && selectedTeam) ? selectedTeam : undefined;
    try {
      const newEvent = await onRecordEvent(eventType.key, selectedPlayer?.id, teamCtx, { recorded_via: 'piano' });
      if (newEvent) {
        const eventInfo = { 
          id: newEvent.id, 
          eventType: { key: newEvent.event_type, label: newEvent.event_type }, 
          player: selectedPlayer, 
          timestamp: Date.now() 
        };
        setLastRecordedEvent(eventInfo);
        setRecentEvents(prev => [eventInfo, ...prev.slice(0, 4)]);
      }
    } catch (e: any) { 
      console.error('Error in onRecordEvent:', e); 
      toast({
        title: "Error recording event",
        description: e.message || "An unknown error occurred",
        variant: "destructive"
      });
    }
    finally { setIsRecording(false); setRecordingEventType(null); broadcastStatus({ status: 'active', timestamp: Date.now() }); }
  };

  const handlePlayerSelect = (player: PlayerForPianoInput, team: 'home' | 'away') => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  useEffect(() => {
    if (assignedPlayers && !selectedPlayer) {
      const all = [...(assignedPlayers.home || []), ...(assignedPlayers.away || [])];
      if (all.length === 1) {
        const single = all[0];
        setSelectedPlayer(single);
        setSelectedTeam(assignedPlayers.home?.includes(single) ? 'home' : 'away');
      }
    }
  }, [assignedPlayers, selectedPlayer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 sm:p-8">
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <motion.div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 border-4 border-blue-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <div className="text-base sm:text-lg font-semibold mb-1">Loading assignments...</div>
          <div className="text-xs sm:text-sm text-gray-600">Please wait while we fetch your tracker assignments.</div>
        </motion.div>
      </div>
    );
  }
  if (error) {
    return (
      <motion.div className="flex items-center justify-center p-6 sm:p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center">
          <div className="text-base sm:text-lg font-semibold mb-1 text-red-600">Assignment Error</div>
          <div className="text-xs sm:text-sm text-gray-600 mb-2">{error}</div>
          <Button onClick={fetchAssignments} variant="outline" size="sm">Retry</Button>
        </div>
      </motion.div>
    );
  }
  // Check if loading is complete and no error, but still no event types AND no assigned players.
  if (!loading && !error && !assignedEventTypes.length && (!assignedPlayers || (!assignedPlayers.home.length && !assignedPlayers.away.length))) {
    return (
      <motion.div className="flex items-center justify-center p-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="text-center">
          <div className="text-base sm:text-lg font-semibold mb-1">No Assignments</div>
          <div className="text-xs sm:text-sm text-gray-600 mb-2">You have no event types or players assigned for this match.</div>
          <Button onClick={fetchAssignments} variant="outline" size="sm">Refresh Assignments</Button>
        </div>
      </motion.div>
    );
  }

  const totalPlayersAssignedToThisTrackerForView = (assignedPlayers?.home?.length || 0) + (assignedPlayers?.away?.length || 0);
  const isEliteView = totalPlayersAssignedToThisTrackerForView > 1;
  const showRosterPlayerSelectionCard =
    !isEliteView &&
    fullMatchRoster &&
    ((fullMatchRoster.home?.length || 0) + (fullMatchRoster.away?.length || 0)) > 1;
  const showClearSelectedPlayerButton = isEliteView || showRosterPlayerSelectionCard;

  return (
    <div className="space-y-2 p-1 sm:p-2">
      {recentEvents.length > 0 && (
        <Card className="my-2 bg-white/60 backdrop-blur-xl border-slate-200/80 shadow-lg rounded-xl overflow-hidden transition-all animate-fade-in">
          <CardHeader className="pb-3 border-b border-slate-200/80 bg-slate-80/50">
            <CardTitle className="text-base text-slate-800">Recent Events (Click to Cancel)</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2 justify-start">
              {recentEvents.map((event) => (
                <CancelActionIndicator
                  key={event.id}
                  eventType={event.eventType.key}
                  onCancel={() => handleCancelEvent(event.id, event.eventType.key)}
                  onExpire={() => handleEventExpire(event.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
{/* 
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.25 }}>
            <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 shadow rounded-lg">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow" whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 300 }}>
                      {selectedPlayer.jersey_number || selectedPlayer.name.charAt(0)}
                    </motion.div>
                    <div>
                      <div className="text-base font-semibold text-green-700 dark:text-green-300">{selectedPlayer.name}</div>
                      <div className="text-sm text-green-600 dark:text-green-400 flex flex-wrap items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-green-200 dark:bg-green-800 rounded-full font-medium text-xs">{selectedTeam === 'home' ? 'Home' : 'Away'}</span>
                        {selectedPlayer.position && (<span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full text-xs">{selectedPlayer.position}</span>)}
                        {selectedPlayer.jersey_number && (<span className="px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 rounded-full text-xs">#{selectedPlayer.jersey_number}</span>)}
                        {totalPlayersAssignedToThisTrackerForView === 1 && (<span className="px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded-full text-xs">Auto-selected</span>)}
                      </div>
                    </div>
                  </div>
                  {showClearSelectedPlayerButton && (<Button onClick={() => { setSelectedPlayer(null); setSelectedTeam(null); }} variant="outline" size="sm" className="hover:bg-red-50 hover:border-red-300">Clear</Button>)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence> */}

      {/* <AnimatePresence>
        {lastRecordedEvent && (
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.25 }}>
            <Card className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 shadow rounded-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <motion.div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold shadow text-sm" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                    ✓
                  </motion.div>
                  <div>
                    <div className="text-base font-semibold text-blue-700 dark:text-blue-300">Event Recorded!</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {lastRecordedEvent.eventType.label} {lastRecordedEvent.player && `for ${lastRecordedEvent.player.name}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence> */}

      {showRosterPlayerSelectionCard && assignedPlayers && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">Select Player from Full Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {['home', 'away'].map(team => {
              const players = team === 'home' ? fullMatchRoster?.home : fullMatchRoster?.away;
              if (!players?.length) return null;
              return (
                <div key={team}>
                  <h4 className="text-sm font-semibold mb-1.5 capitalize">{team} Team</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                    {players.map(player => (
                      <Button key={player.id} onClick={() => handlePlayerSelect(player, team as 'home' | 'away')} variant={selectedPlayer?.id === player.id ? "default" : "outline"} size="sm" className="justify-start text-sm">
                        {player.jersey_number && `#${player.jersey_number} `}{player.name}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {assignedEventTypes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.33, delay: 0.13 }}>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-xl p-3 sm:p-4 shadow-lg border border-purple-200">
            <div className="text-center mb-3">
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">🎹 Record Events</h2>
              <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                {!isEliteView ? (selectedPlayer ? `Recording for ${selectedPlayer.name}` : "Select a player, then tap event type") : "Select a player and record an event"}
              </p>
            </div>

            {!isEliteView && (
              <div className="flex justify-center">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-6">
                      {assignedEventTypes.map(eventType => {
                          const isButtonDisabled = isRecording;
                          const isRecordingThisEvent = isRecording && recordingEventType === eventType.key;
                          
                          return (
                              <div key={eventType.key} className="flex flex-col items-center justify-start gap-2">
                                  <button
                                      onClick={() => {
                                          if (!selectedPlayer) {
                                              toast({ title: "No Player Selected", description: "Please select a player before recording an event.", variant: "destructive"});
                                              return;
                                          }
                                          handleEventTypeClick(eventType);
                                      }}
                                      disabled={isButtonDisabled}
                                      aria-label={`Record ${eventType.label} event`}
                                      className="relative flex items-center justify-center rounded-full border bg-gradient-to-br from-white/70 to-slate-100/70 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-16 h-16 sm:w-20 sm:h-20"
                                  >
                                      <EventTypeSvg eventType={eventType.key} size={'sm'} />
                                      {isRecordingThisEvent && (
                                          <motion.div className="absolute inset-0 rounded-full border-2 border-green-500 pointer-events-none" animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 0.8, repeat: Infinity }} />
                                      )}
                                  </button>
                                  <span className="font-semibold text-slate-700 text-center leading-tight text-xs sm:text-sm max-w-[80px] break-words">
                                      {eventType.label}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              </div>
            )}

            {isEliteView && (
              <div className="space-y-4">
                {(() => {
                  const allPlayersList = assignedPlayers ? [...assignedPlayers.home, ...assignedPlayers.away] : [];
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allPlayersList.map(player => (
                        <div key={player.id} className={`border rounded-lg p-3 transition-all duration-300 ease-in-out ${selectedPlayer?.id === player.id ? 'bg-green-50 dark:bg-green-900 border-green-400 dark:border-green-600 ring-1 ring-green-500 shadow-sm' : 'bg-white dark:bg-slate-800 hover:shadow'}`}>
                          <CardTitle className={`mb-3 cursor-pointer flex items-center justify-between px-1.5 py-1 rounded ${selectedPlayer?.id === player.id ? 'text-green-600 dark:text-green-200 bg-green-100 dark:bg-green-800 text-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm'}`} onClick={() => handlePlayerSelect(player, assignedPlayers!.home.includes(player) ? 'home' : 'away')}>
                            <div className="truncate">
                              {player.jersey_number && <span className="font-semibold text-sm">#{player.jersey_number} </span>}
                              <span className="font-medium">{player.name}</span>
                              <span className={`text-xs ml-1 px-1 rounded-full ${ assignedPlayers!.home.includes(player) ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200'}`}>{assignedPlayers!.home.includes(player) ? 'H' : 'A'}</span>
                            </div>
                            {selectedPlayer?.id === player.id && (<span className="text-xs font-semibold px-1 py-0 bg-green-500 text-white rounded-full shadow-sm">SEL</span>)}
                          </CardTitle>
                          <div className="flex justify-center">
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-x-2 gap-y-4">
                                  {assignedEventTypes.map(eventType => {
                                      const isButtonDisabled = isRecording;
                                      const isRecordingThisEvent = isRecording && recordingEventType === eventType.key && selectedPlayer?.id === player.id;
                                      return (
                                          <div key={`${player.id}-${eventType.key}`} className="flex flex-col items-center justify-start gap-2">
                                              <button
                                                  onClick={() => {
                                                      const teamForThisPlayer = assignedPlayers!.home.includes(player) ? 'home' : 'away';
                                                      handlePlayerSelect(player, teamForThisPlayer);
                                                      handleEventTypeClick(eventType);
                                                  }}
                                                  disabled={isButtonDisabled}
                                                  aria-label={`Record ${eventType.label} event for ${player.name}`}
                                                  className="relative flex items-center justify-center rounded-full border bg-gradient-to-br from-white/70 to-slate-100/70 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-14 h-14 sm:w-16 sm:h-16"
                                              >
                                                  <EventTypeSvg eventType={eventType.key} size={'xs'} />
                                                  {isRecordingThisEvent && (
                                                      <motion.div className="absolute inset-0 rounded-full border-2 border-green-500 pointer-events-none" animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 0.8, repeat: Infinity }} />
                                                  )}
                                              </button>
                                              <span className="font-semibold text-slate-700 text-center leading-tight text-xs max-w-[64px] break-words">
                                                  {eventType.label}
                                              </span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {isRecording && (
              <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-bold shadow">
                  <motion.div className="w-2.5 h-2.5 bg-white rounded-full" animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
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

interface RadialEventLayoutProps {
  eventTypes: EnhancedEventType[];
  isEliteView: boolean;
  settings: { containerSizeClass: string; radius: number; svgSize: 'xs' | 'sm' | 'md'; labelClassName: string; labelTextClassName: string; labelStyle: React.CSSProperties; animationInsetClass: string; };
  recordingEventType: string | null;
  selectedPlayerId?: number;
  isRecordingGlobal: boolean;
  onEventClick: (eventType: EnhancedEventType) => void;
  currentPlayerForLayout?: PlayerForPianoInput | null;
  totalPlayersInCurrentLayoutContext?: number;
}

const RadialEventLayout: React.FC<RadialEventLayoutProps> = ({
  eventTypes, isEliteView, settings, recordingEventType, selectedPlayerId,
  isRecordingGlobal, onEventClick, currentPlayerForLayout,
}) => {
  if (!eventTypes || eventTypes.length === 0) return null;
  const { containerSizeClass, radius, svgSize, labelClassName, labelTextClassName, labelStyle, animationInsetClass } = settings;
  return (
    <div className={`relative mx-auto flex items-center justify-center ${containerSizeClass}`}>
      {eventTypes.map((eventType, index) => {
        const angle = (index / eventTypes.length) * 2 * Math.PI - (Math.PI / 2);
        const x = Math.round(radius * Math.cos(angle));
        const y = Math.round(radius * Math.sin(angle));
        const itemWrapperStyle: React.CSSProperties = { position: 'absolute', top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' };
        const isCurrentlyRecordingThisEvent = recordingEventType === eventType.key && selectedPlayerId === (isEliteView && currentPlayerForLayout ? currentPlayerForLayout.id : selectedPlayerId);
        return (
          <motion.div key={eventType.key} style={itemWrapperStyle} className="w-auto h-auto" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: index * 0.05, type: "spring", stiffness: 280, damping: 18 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <div className="text-center">
              <EventTypeSvg eventType={eventType.key} size={svgSize} isRecording={isCurrentlyRecordingThisEvent} disabled={isRecordingGlobal} onClick={() => onEventClick(eventType)} />
              <div className={labelClassName}><span className={labelTextClassName} style={labelStyle}>{eventType.label}</span></div>
            </div>
            {isCurrentlyRecordingThisEvent && (<motion.div className={`absolute rounded-full border-green-600 ${animationInsetClass}`} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6]}} transition={{ duration: 0.7, repeat: Infinity }} />)}
          </motion.div>
        );
      })}
    </div>
  );
};

export default TrackerPianoInput;
