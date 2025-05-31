import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtime } from '@/hooks/useRealtime';
import { TrackerSyncEvent } from '@/types';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { EVENT_TYPE_LABELS } from '@/constants/eventTypes';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon'; // Ensure this path is correct
import { motion, AnimatePresence } from 'framer-motion';

const LOCAL_STORAGE_KEY_MATCH_EVENTS = 'matchEventsQueue';

interface EventType {
  key: string;
  label: string;
}

interface AssignedPlayer {
  id: string;
  player_name: string;
  jersey_number: number;
  team_context: 'home' | 'away';
}

interface TrackerPianoInputProps {
  matchId: string;
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; hover: string; border: string; text: string; shadow: string }> = {
  'pass': { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', hover: 'hover:from-blue-600 hover:to-blue-700', border: 'border-blue-400', text: 'text-blue-700', shadow: 'shadow-blue-200' },
  'shot': { bg: 'bg-gradient-to-br from-red-500 to-red-600', hover: 'hover:from-red-600 hover:to-red-700', border: 'border-red-400', text: 'text-red-700', shadow: 'shadow-red-200' },
  'goal': { bg: 'bg-gradient-to-br from-green-500 to-green-600', hover: 'hover:from-green-600 hover:to-green-700', border: 'border-green-400', text: 'text-green-700', shadow: 'shadow-green-200' },
  'foul': { bg: 'bg-gradient-to-br from-yellow-500 to-yellow-600', hover: 'hover:from-yellow-600 hover:to-yellow-700', border: 'border-yellow-400', text: 'text-yellow-700', shadow: 'shadow-yellow-200' },
  'save': { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', hover: 'hover:from-purple-600 hover:to-purple-700', border: 'border-purple-400', text: 'text-purple-700', shadow: 'shadow-purple-200' },
  'offside': { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', hover: 'hover:from-orange-600 hover:to-orange-700', border: 'border-orange-400', text: 'text-orange-700', shadow: 'shadow-orange-200' },
  'corner': { bg: 'bg-gradient-to-br from-teal-500 to-teal-600', hover: 'hover:from-teal-600 hover:to-teal-700', border: 'border-teal-400', text: 'text-teal-700', shadow: 'shadow-teal-200' },
  'sub': { bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', hover: 'hover:from-indigo-600 hover:to-indigo-700', border: 'border-indigo-400', text: 'text-indigo-700', shadow: 'shadow-indigo-200' },
  'default': { bg: 'bg-gradient-to-br from-gray-500 to-gray-600', hover: 'hover:from-gray-600 hover:to-gray-700', border: 'border-gray-400', text: 'text-gray-700', shadow: 'shadow-gray-200' },
};

// Define different animations for each event type
const EVENT_ANIMATIONS: Record<string, { whileHover: any; whileTap: any }> = {
  'pass': { whileHover: { scale: 1.05, y: -3, rotate: 2 }, whileTap: { scale: 0.95, rotate: -2 } },
  'shot': { whileHover: { scale: 1.07, y: -4, filter: 'brightness(1.1)' }, whileTap: { scale: 0.93 } },
  'goal': { whileHover: { scale: 1.1, y: -5, transition: { type: 'spring', stiffness: 300 } }, whileTap: { scale: 0.9 } },
  'foul': { whileHover: { scale: 1.04, x: [0, -2, 2, -2, 0], transition: { duration: 0.4 } }, whileTap: { scale: 0.96 } },
  'save': { whileHover: { scale: 1.06, boxShadow: "0px 5px 15px rgba(0,0,0,0.2)" }, whileTap: { scale: 0.94 } },
  'offside': { whileHover: { scale: 1.05, skewX: -3 }, whileTap: { scale: 0.95, skewX: 3 } },
  'corner': { whileHover: { scale: 1.05, y: -3, rotateZ: 3 }, whileTap: { scale: 0.95, rotateZ: -3 } },
  'sub': { whileHover: { scale: [1, 1.05, 1, 1.05, 1], transition: { duration: 0.5 } }, whileTap: { scale: 0.92 } },
  'default': { whileHover: { scale: 1.03, y: -2 }, whileTap: { scale: 0.97 } },
};


const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
  const { user } = useAuth();
  // Pass empty string as fallback instead of null
  const { pushEvent } = useRealtime({
    channelName: 'tracker-admin-sync',
    userId: user?.id || '',
    onEventReceived: () => {}, // Not used for sending, but required by hook
  });
  const [assignedEventTypes, setAssignedEventTypes] = useState<EventType[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<AssignedPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsavedEventCount, setUnsavedEventCount] = useState<number>(0);
  const [toggleBehaviorEnabled, setToggleBehaviorEnabled] = useState<boolean>(false);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

  const getLocalEvents = (): any[] => {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY_MATCH_EVENTS);
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error("Error parsing local events:", e);
        return [];
      }
    }
    return [];
  };

  const addLocalEvent = (eventData: any) => {
    const events = getLocalEvents();
    events.push(eventData);
    localStorage.setItem(LOCAL_STORAGE_KEY_MATCH_EVENTS, JSON.stringify(events));
    setUnsavedEventCount(events.length);
  };

  const clearLocalEvents = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_MATCH_EVENTS);
    setUnsavedEventCount(0);
  };

  // useEffect for fetching assignments - separated from status updates
  useEffect(() => {
    // Guard: Do not fetch if essential IDs are missing. Also reset state.
    if (!user?.id || !matchId) {
      setLoading(false);
      setError(null);
      setAssignedEventTypes([]);
      setAssignedPlayers([]);
      return;
    }

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors before new fetch attempt

        // console.log('=== TRACKER DEBUG: Starting fetchAssignments (User/Match specific) ===');
        // console.log('User ID:', user.id);
        // console.log('Match ID:', matchId);

        const { data: assignments, error: assignmentsError } = await supabase
          .from('match_tracker_assignments')
          .select('*')
          .eq('tracker_user_id', user.id)
          .eq('match_id', matchId);

        if (assignmentsError) throw assignmentsError;

        if (!assignments || assignments.length === 0) {
          setError('No assignments found for this match. Please contact your admin to assign you to track specific players and event types.');
          setAssignedEventTypes([]);
          setAssignedPlayers([]);
          setLoading(false); // Ensure loading is set to false
          return;
        }

        const allEventTypesSet = new Set<string>();
        assignments.forEach(assignment => {
          if (assignment.assigned_event_types && Array.isArray(assignment.assigned_event_types)) {
            assignment.assigned_event_types.forEach((eventType: string) => allEventTypesSet.add(eventType));
          }
        });

        const eventTypes: EventType[] = Array.from(allEventTypesSet).map(key => ({
          key,
          label: EVENT_TYPE_LABELS[key as keyof typeof EVENT_TYPE_LABELS] || key,
        }));
        setAssignedEventTypes(eventTypes);

        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('home_team_players, away_team_players')
          .eq('id', matchId)
          .single();

        if (matchError) throw matchError;

        const parsePlayerData = (data: any): any[] => {
          if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return []; }
          }
          return Array.isArray(data) ? data : [];
        };

        const homeTeamPlayers = parsePlayerData(matchData.home_team_players);
        const awayTeamPlayers = parsePlayerData(matchData.away_team_players);
        
        const assignedPlayerData: AssignedPlayer[] = [];
        assignments.forEach(assignment => {
          const playerId = assignment.player_id;
          const teamContext = assignment.player_team_id;
          if (playerId && teamContext) {
            const teamPlayers = teamContext === 'home' ? homeTeamPlayers : awayTeamPlayers;
            const player = teamPlayers.find(p => String(p.id) === String(playerId));
            if (player) {
              const assignedPlayer = {
                id: String(player.id),
                player_name: player.name || player.player_name,
                jersey_number: player.number || player.jersey_number,
                team_context: teamContext as 'home' | 'away',
              };
              if (!assignedPlayerData.some(p => p.id === assignedPlayer.id && p.team_context === assignedPlayer.team_context)) {
                assignedPlayerData.push(assignedPlayer);
              }
            }
          }
        });
        setAssignedPlayers(assignedPlayerData);

        if (assignedPlayerData.length === 1) {
          setSelectedPlayer(assignedPlayerData[0]);
        }

      } catch (err: any) {
        console.error('Error fetching tracker assignments:', err);
        setError(err.message || 'Failed to load assignments');
      } finally {
        setLoading(false);
        const localEvents = getLocalEvents();
        setUnsavedEventCount(localEvents.length);
      }
    };

    fetchAssignments();
  }, [user?.id, matchId]);

  // useEffect for tracker status (active/inactive)
  useEffect(() => {
    if (!user?.id || !matchId || !pushEvent) return;

    pushEvent({
      type: 'broadcast', event: 'tracker_event',
      payload: { trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_status', payload: { status: 'active' } } as TrackerSyncEvent,
    });
    return () => {
      if (user?.id && matchId && pushEvent) { // Re-check in cleanup
        pushEvent({
          type: 'broadcast', event: 'tracker_event',
          payload: { trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_status', payload: { status: 'inactive' } } as TrackerSyncEvent,
        });
      }
    };
  }, [user?.id, matchId, pushEvent]);

  const handleEventRecord = (eventType: EventType) => {
    if (!selectedPlayer) {
      toast.error('Please select a player first');
      return;
    }

    if (toggleBehaviorEnabled) {
      if (selectedEventType === null) {
        setSelectedEventType(eventType.key);
        if (pushEvent && user?.id) {
          pushEvent({
            type: 'broadcast', event: 'tracker_event',
            payload: { trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_action', payload: { currentAction: `arming_event_${eventType.key}_for_player_${selectedPlayer.id}` } } as TrackerSyncEvent,
          });
        }
      } else {
        if (selectedEventType === eventType.key) {
          recordEvent(eventType);
          setSelectedEventType(null);
        } else {
          const previousEventKey = selectedEventType;
          const previousEventTypeObj = assignedEventTypes.find(et => et.key === previousEventKey) || { key: previousEventKey, label: EVENT_TYPE_LABELS[previousEventKey as keyof typeof EVENT_TYPE_LABELS] || previousEventKey };
          recordEvent(previousEventTypeObj);
          setSelectedEventType(eventType.key); // Arm the new event type
           if (pushEvent && user?.id) { // Send arming event for the new type
            pushEvent({
              type: 'broadcast', event: 'tracker_event',
              payload: { trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_action', payload: { currentAction: `arming_event_${eventType.key}_for_player_${selectedPlayer.id}` } } as TrackerSyncEvent,
            });
          }
        }
      }
    } else {
      recordEvent(eventType);
    }
  };

  const recordEvent = (eventType: EventType) => {
    if (!selectedPlayer) return;

    if (pushEvent && user?.id) {
      pushEvent({
        type: 'broadcast', event: 'tracker_event',
        payload: {
          trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_action',
          payload: { currentAction: `recorded_event_locally_${eventType.key}_for_player_${selectedPlayer.id}`, details: { playerId: selectedPlayer.id, team: selectedPlayer.team_context, eventKey: eventType.key } },
        } as TrackerSyncEvent,
      });
    }

    const playerId = parseInt(String(selectedPlayer.id), 10);
    if (isNaN(playerId)) {
      console.error("Invalid player ID:", selectedPlayer.id);
      toast.error('Invalid player ID');
      return;
    }
    const timestampInSeconds = Math.floor(Date.now() / 1000);
    const eventData = { match_id: matchId, event_type: eventType.key, timestamp: timestampInSeconds, player_id: playerId, team: selectedPlayer.team_context, created_by: user?.id || '' };
    
    addLocalEvent(eventData);
    toast.info(`${eventType.label} logged locally for ${selectedPlayer.player_name}`);
    
    if (toggleBehaviorEnabled) {
      setSelectedEventType(null);
    }
  };

  const handleSyncEvents = async () => {
    if (pushEvent && user?.id) {
      pushEvent({
        type: 'broadcast', event: 'tracker_event',
        payload: { trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_action', payload: { currentAction: `sync_attempt_${getLocalEvents().length}_events` } } as TrackerSyncEvent,
      });
    }
    const localEvents = getLocalEvents();
    if (localEvents.length === 0) {
      toast.info("No events to sync.");
      return;
    }
    toast.loading("Syncing events to database...", { id: "sync-toast" });
    try {
      const { error } = await supabase.from('match_events').insert(localEvents);
      if (error) throw error;
      toast.success(`${localEvents.length} event(s) synced successfully!`, { id: "sync-toast" });
      clearLocalEvents();
    } catch (err: any) {
      console.error('Error syncing events:', err);
      toast.error(`Failed to sync events: ${err.message || 'Unknown error'}. Please try again.`, { id: "sync-toast" });
    }
  };

  if (loading) {
    return (
      <Card className="w-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
        <CardContent className="p-6"><div className="animate-pulse text-center"><div className="bg-slate-300 rounded-full mx-auto mb-4 w-16 h-16"></div><p className="text-slate-600 font-medium text-lg">Loading your assignments...</p></div></CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-gradient-to-br from-red-50 to-rose-50 shadow-xl border-red-200">
        <CardContent className="p-6"><div className="text-center"><div className="bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 w-16 h-16"><svg className="text-red-600 w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h3 className="font-bold text-red-800 mb-3 text-xl">Assignment Error</h3><p className="text-red-600">{error}</p></div></CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white shadow-2xl border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-700/20 animate-pulse"></div>
        <CardContent className="p-6 relative z-10"><div className="flex items-center gap-4"><div className="bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center w-12 h-12 shadow-lg"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5z"/><path d="M7 7h2v2H7zM11 7h2v2h-2zM15 7h2v2h-2zM7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z"/></svg></div><div><h2 className="text-2xl font-bold">Tracker Piano Input</h2><p className="text-white/90 text-sm">Fast event recording for assigned players</p></div></div></CardContent>
      </Card>

      <Card className="shadow-xl border-slate-200 bg-gradient-to-br from-white to-slate-50">
        <CardHeader><CardTitle className="text-xl">Your Tracker Assignment</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <motion.div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-lg">Click Behavior</span><Badge variant={toggleBehaviorEnabled ? "default" : "secondary"}>{toggleBehaviorEnabled ? "Two-Click Mode" : "One-Click Mode"}</Badge></div>
                <p className="text-sm text-muted-foreground">{toggleBehaviorEnabled ? "First click selects event type, second click records it" : "Single click records event immediately"}</p>
              </div>
              <Button onClick={() => setToggleBehaviorEnabled(!toggleBehaviorEnabled)} variant={toggleBehaviorEnabled ? "default" : "outline"} size="lg" className="px-6">{toggleBehaviorEnabled ? "Switch to One-Click" : "Switch to Two-Click"}</Button>
            </div>
          </motion.div>

          <motion.div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <div><h4 className="font-medium text-sm text-gray-600 mb-1">Assigned Event Types</h4><p className="text-lg font-semibold">{assignedEventTypes.length}</p><div className="text-xs text-gray-500 mt-1">{assignedEventTypes.map(et => et.label).join(', ')}</div></div>
            <div><h4 className="font-medium text-sm text-gray-600 mb-1">Assigned Players</h4><p className="text-lg font-semibold">{assignedPlayers.length}</p><div className="text-xs text-gray-500 mt-1">{assignedPlayers.map(p => `#${p.jersey_number} ${p.player_name}`).join(', ')}</div></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <h3 className="font-medium mb-2">Assigned Players</h3>
            <div className="flex flex-wrap gap-2">
              {assignedPlayers.map((player) => (
                <motion.div key={`${player.id}-${player.team_context}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant={selectedPlayer?.id === player.id && selectedPlayer?.team_context === player.team_context ? "default" : "outline"} size="sm" onClick={() => { setSelectedPlayer(player); if (pushEvent && user?.id) { pushEvent({ type: 'broadcast', event: 'tracker_event', payload: { trackerId: user.id, matchId, timestamp: Date.now(), eventType: 'tracker_action', payload: { currentAction: `selected_player_${player.id}_${player.team_context}` } } as TrackerSyncEvent }); } }} className="flex items-center gap-2">
                    <Badge variant={player.team_context === 'home' ? 'default' : 'secondary'}>{player.team_context.toUpperCase()}</Badge>#{player.jersey_number} {player.player_name}
                  </Button>
                </motion.div>
              ))}
            </div>
            {assignedPlayers.length === 0 && (<p className="text-muted-foreground text-sm">No players assigned</p>)}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
            <h3 className="font-medium mb-4">Assigned Event Types ({assignedEventTypes.length})</h3>
            {assignedEventTypes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"> {/* Increased gap slightly */}
                {assignedEventTypes.map((eventType) => {
                  const isSelected = toggleBehaviorEnabled && selectedEventType === eventType.key;
                  const colors = EVENT_TYPE_COLORS[eventType.key] || EVENT_TYPE_COLORS['default'];
                  const animations = EVENT_ANIMATIONS[eventType.key] || EVENT_ANIMATIONS['default'];
                  
                  return (
                    <motion.div
                      key={eventType.key}
                      layout // For smoother transitions if items reorder (though not expected here)
                      {...animations} // Apply specific hover/tap animations
                      className="relative"
                    >
                      <Button
                        onClick={() => handleEventRecord(eventType)}
                        disabled={!selectedPlayer}
                        className={`w-full h-28 md:h-32 rounded-xl transition-all duration-200 ease-in-out flex flex-col items-center justify-center gap-2 border-2 overflow-hidden relative group ${ // Added group for potential group-hover effects
                          isSelected 
                            ? `${colors.bg} ${colors.hover} text-white ${colors.border} shadow-xl ${colors.shadow} ring-2 ring-white ring-offset-2` 
                            : `bg-white hover:bg-slate-50 ${colors.text} border-slate-200 hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 shadow-lg hover:shadow-xl`
                        }`}
                        type="button"
                      >
                        {isSelected && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5" // More subtle shimmer
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} // Slightly faster shimmer
                          />
                        )}
                        
                        <div className={`transition-colors duration-200 z-10 relative ${isSelected ? 'text-white' : colors.text}`}>
                          <EnhancedEventTypeIcon 
                            eventKey={eventType.key} 
                            size={36} // Increased SVG size
                            isSelected={isSelected}
                            // className prop is handled internally by EnhancedEventTypeIcon now
                          />
                        </div>
                        
                        <span className={`font-semibold text-center leading-tight z-10 relative text-xs md:text-sm ${isSelected ? 'text-white' : colors.text}`}>
                          {eventType.label}
                        </span>
                        
                        {selectedPlayer && (
                          <span className={`text-xs opacity-70 z-10 relative ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {selectedPlayer.player_name.split(' ')[0]} {/* Show first name or initial for brevity */}
                          </span>
                        )}
                        
                        {toggleBehaviorEnabled && isSelected && (
                          <Badge variant="secondary" className="text-xs z-10 relative mt-1 bg-white/20 text-white">Click to Record</Badge>
                        )}

                        {/* Corner badge - can be removed if icon is prominent enough */}
                        {/* <motion.div
                          className={`absolute -top-1 -right-1 rounded-full p-0 flex items-center justify-center font-bold border-2 w-7 h-7 text-xs ${
                            isSelected 
                              ? 'bg-white text-slate-700 border-white shadow-lg' 
                              : `${colors.bg.replace('gradient-to-br', 'solid')} text-white border-white shadow-md`
                          }`}
                          whileHover={{ scale: 1.1 }}
                          animate={isSelected ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                          transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
                        >
                          {eventType.key.charAt(0).toUpperCase()}
                        </motion.div> */}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-100 rounded-lg"><p className="text-muted-foreground text-sm">No event types assigned</p><p className="text-xs text-gray-500 mt-1">Contact your admin to assign event types</p></div>
            )}
          </motion.div>

          {!selectedPlayer && assignedPlayers.length > 1 && (
            <motion.div className="text-center text-muted-foreground text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.4 }}>Select a player to record events</motion.div>
          )}

          <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }}>
            <Button onClick={handleSyncEvents} disabled={unsavedEventCount === 0} className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <motion.div className="flex items-center gap-2" animate={unsavedEventCount > 0 ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Sync {unsavedEventCount} Event{unsavedEventCount !== 1 ? 's' : ''} to Database
              </motion.div>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerPianoInput;
