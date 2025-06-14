import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
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

  const undoLastAction = async () => {
    if (recentEvents.length === 0) {
      toast({ title: "Aucune action à annuler", description: "Il n'y a pas d'action récente à annuler", variant: "destructive"});
      return;
    }
    const lastEvent = recentEvents[0];
    try {
      const { error } = await supabase.from('match_events').delete().eq('id', lastEvent.id);
      if (error) throw error;
      setRecentEvents(prev => prev.slice(1));
      setLastRecordedEvent(null);
      toast({ title: "Action annulée", description: `L'événement ${lastEvent.eventType.label} a été supprimé` });
    } catch (e: any) {
      console.error('Error undoing last action:', e);
      toast({ title: "Erreur", description: "Impossible d'annuler la dernière action", variant: "destructive"});
    }
  };

  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    setIsRecording(true);
    setRecordingEventType(eventType.key);
    broadcastStatus({ status: 'recording', timestamp: Date.now() });
    let teamCtx = (selectedPlayer && selectedTeam) ? selectedTeam : undefined;
    try {
      await onRecordEvent(eventType.key, selectedPlayer?.id, teamCtx, { recorded_via: 'piano' });
      const eventInfo = { id: `local-${Date.now()}-${eventType.key}`, eventType, player: selectedPlayer, timestamp: Date.now() };
      setLastRecordedEvent(eventInfo);
      setRecentEvents(prev => [eventInfo, ...prev.slice(0, 4)]);
    } catch (e: any) { console.error('Error in onRecordEvent:', e); }
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
    <div className="space-y-4 sm:space-y-5 p-2 sm:p-3">
      <motion.div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}>
        <Button onClick={undoLastAction} disabled={recentEvents.length === 0} variant="outline" size="sm" className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 shadow">
          <Undo className="h-4 w-4 mr-2" /> Annuler Dernière Action
        </Button>
      </motion.div>

      <AnimatePresence>
        {selectedPlayer && (
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.25 }}>
            <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 shadow rounded-lg">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow" whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 300 }}>
                      {selectedPlayer.jersey_number || selectedPlayer.name.charAt(0)}
                    </motion.div>
                    <div>
                      <div className="font-bold text-base text-green-800 dark:text-green-200">{selectedPlayer.name}</div>
                      <div className="text-xs text-green-600 dark:text-green-300 flex flex-wrap items-center gap-1">
                        <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded-full font-medium">{selectedTeam === 'home' ? 'Home' : 'Away'}</span>
                        {selectedPlayer.position && (<span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full">{selectedPlayer.position}</span>)}
                        {selectedPlayer.jersey_number && (<span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 rounded-full">#{selectedPlayer.jersey_number}</span>)}
                        {totalPlayersAssignedToThisTrackerForView === 1 && (<span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-800 rounded-full">Auto-selected</span>)}
                      </div>
                    </div>
                  </div>
                  {showClearSelectedPlayerButton && (<Button onClick={() => { setSelectedPlayer(null); setSelectedTeam(null); }} variant="outline" size="xs" className="hover:bg-red-50 hover:border-red-300">Clear</Button>)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastRecordedEvent && (
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.25 }}>
            <Card className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 shadow rounded-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <motion.div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold shadow" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                    ✓
                  </motion.div>
                  <div>
                    <div className="font-bold text-base text-blue-800 dark:text-blue-200">Event Recorded!</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">
                      {lastRecordedEvent.eventType.label} {lastRecordedEvent.player && `for ${lastRecordedEvent.player.name}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {showRosterPlayerSelectionCard && assignedPlayers && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Select Player from Full Roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {['home', 'away'].map(team => {
              const players = team === 'home' ? fullMatchRoster?.home : fullMatchRoster?.away;
              if (!players?.length) return null;
              return (
                <div key={team}>
                  <h4 className="font-medium mb-1 capitalize">{team} Team</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {players.map(player => (
                      <Button key={player.id} onClick={() => handlePlayerSelect(player, team as 'home' | 'away')} variant={selectedPlayer?.id === player.id ? "default" : "outline"} size="sm" className="justify-start">
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
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-xl p-4 sm:p-6 shadow-lg border border-purple-200">
            <div className="text-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">🎹 Record Events</h2>
              <p className="text-purple-600 dark:text-purple-300 mt-1 text-xs sm:text-sm">
                {!isEliteView ? (selectedPlayer ? `Recording for ${selectedPlayer.name}` : "Select a player, then tap event type") : "Events per assigned player:"}
              </p>
            </div>

            <RadialEventLayout
              eventTypes={assignedEventTypes}
              isEliteView={isEliteView}
              settings={
                !isEliteView
                ? {
                    containerSizeClass: 'w-44 h-44 sm:w-60 sm:h-60', radius: 70, svgSize: 'sm',
                    labelClassName: "mt-0.5 px-1 py-0.5 bg-white dark:bg-gray-800 rounded-full shadow border border-gray-200 dark:border-gray-700 text-center",
                    labelTextClassName: "text-xs font-medium text-gray-700 dark:text-gray-300 block truncate w-full leading-tight",
                    labelStyle: {}, animationInsetClass: "-inset-2 border-2",
                  }
                : {
                    containerSizeClass: 'w-24 h-24 sm:w-36 sm:h-36', radius: 36, svgSize: 'xs',
                    labelClassName: "mt-0.5 text-center",
                    labelTextClassName: "text-purple-700 dark:text-purple-300 block truncate w-full",
                    labelStyle: { fontSize: '0.60rem', lineHeight: '0.72rem' }, animationInsetClass: "-inset-1 border",
                  }
              }
              recordingEventType={recordingEventType}
              selectedPlayerId={selectedPlayer?.id}
              isRecordingGlobal={isRecording}
              onEventClick={(eventType) => {
                if (!isEliteView) {
                  if (!selectedPlayer) {
                    toast({ title: "No Player Selected", description: "Please select a player before recording an event.", variant: "destructive"});
                    return;
                  }
                }
                handleEventTypeClick(eventType);
              }}
              currentPlayerForLayout={null}
              totalPlayersInCurrentLayoutContext={totalPlayersAssignedToThisTrackerForView}
            />

            {isEliteView && (
              <div>
                <h3 className="text-base font-semibold mb-1.5 text-center text-purple-700 dark:text-purple-300">Record Events by Player</h3>
                {(() => {
                  const allPlayersList = assignedPlayers ? [...assignedPlayers.home, ...assignedPlayers.away] : [];
                  const numEvents = assignedEventTypes.length;
                  const playerSections = allPlayersList.map(player => {
                    let radialContainerClass: string, radialRadius: number;
                    if (totalPlayersAssignedToThisTrackerForView === 2) {
                      if (numEvents >= 7) { radialContainerClass = 'w-32 h-32 sm:w-40 sm:h-40'; radialRadius = 36; }
                      else { radialContainerClass = 'w-28 h-28 sm:w-36 sm:h-36'; radialRadius = 30; }
                    } else {
                      if (numEvents >= 7) { radialContainerClass = 'w-32 h-32 sm:w-44 sm:h-44'; radialRadius = 40; }
                      else { radialContainerClass = 'w-28 h-28 sm:w-40 sm:h-40'; radialRadius = 32; }
                    }
                    return (
                      <div key={player.id} className={`border rounded-lg transition-all duration-300 ease-in-out ${totalPlayersAssignedToThisTrackerForView === 2 ? 'flex-1 min-w-0 p-1' : 'p-1 sm:p-2'} ${selectedPlayer?.id === player.id ? 'bg-green-50 dark:bg-green-900 border-green-400 dark:border-green-600 ring-1 ring-green-500 shadow-sm' : 'bg-white dark:bg-slate-800 hover:shadow'} `}>
                        <CardTitle className={`mb-1 cursor-pointer flex items-center justify-between px-1 py-0.5 rounded ${selectedPlayer?.id === player.id ? 'text-green-600 dark:text-green-200 bg-green-100 dark:bg-green-800 text-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs'}`} onClick={() => handlePlayerSelect(player, assignedPlayers!.home.includes(player) ? 'home' : 'away')}>
                          <div className="truncate">
                            {player.jersey_number && <span className="font-semibold text-xs">#{player.jersey_number} </span>}
                            <span className="font-medium">{player.name}</span>
                            <span className={`text-xs ml-1 px-1 rounded-full ${ assignedPlayers!.home.includes(player) ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200'}`}>{assignedPlayers!.home.includes(player) ? 'H' : 'A'}</span>
                          </div>
                          {selectedPlayer?.id === player.id && (<span className="text-xs font-semibold px-1 py-0 bg-green-500 text-white rounded-full shadow-sm">SEL</span>)}
                        </CardTitle>
                        <RadialEventLayout
                          eventTypes={assignedEventTypes}
                          isEliteView={true}
                          settings={{
                            containerSizeClass: radialContainerClass, radius: radialRadius, svgSize: 'xs',
                            labelClassName: "mt-0.5 text-center",
                            labelTextClassName: "text-purple-700 dark:text-purple-300 block truncate w-full",
                            labelStyle: { fontSize: '0.60rem', lineHeight: '0.72rem' },
                            animationInsetClass: "-inset-1 border",
                          }}
                          recordingEventType={recordingEventType}
                          selectedPlayerId={selectedPlayer?.id}
                          isRecordingGlobal={isRecording}
                          onEventClick={(eventType) => {
                              const teamForThisPlayer = assignedPlayers!.home.includes(player) ? 'home' : 'away';
                              handlePlayerSelect(player, teamForThisPlayer);
                              handleEventTypeClick(eventType);
                          }}
                          currentPlayerForLayout={player}
                          totalPlayersInCurrentLayoutContext={1}
                        />
                      </div>
                    );
                  });
                  if (totalPlayersAssignedToThisTrackerForView === 2) { return <div className="flex flex-row gap-1 items-start">{playerSections}</div>; }
                  else { return <div className="space-y-1">{playerSections}</div>; }
                })()}
              </div>
            )}

            {isRecording && (
              <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-center">
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-base font-bold shadow">
                  <motion.div className="w-3 h-3 bg-white rounded-full" animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
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
