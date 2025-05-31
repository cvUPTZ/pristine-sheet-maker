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
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
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

        console.log('=== TRACKER DEBUG: Starting fetchAssignments (User/Match specific) ===');
        console.log('User ID:', user.id);
        console.log('Match ID:', matchId);

        // Fetch tracker assignments for this user and match
        const { data: assignments, error: assignmentsError } = await supabase
          .from('match_tracker_assignments')
          .select('*')
          .eq('tracker_user_id', user.id)
          .eq('match_id', matchId);

        if (assignmentsError) {
          console.error('Assignments error:', assignmentsError);
          throw assignmentsError;
        }

        console.log('=== RAW ASSIGNMENTS DATA ===');
        console.log('Assignments found:', assignments?.length || 0);
        console.log('Full assignments data:', JSON.stringify(assignments, null, 2));

        if (!assignments || assignments.length === 0) {
          console.log('No assignments found - setting error state');
          setError('No assignments found for this match. Please contact your admin to assign you to track specific players and event types.');
          setAssignedEventTypes([]);
          setAssignedPlayers([]);
          return;
        }

        // Process assigned event types - get ALL event types from ALL assignments
        console.log('=== PROCESSING EVENT TYPES ===');
        const allEventTypesSet = new Set<string>();
        
        assignments.forEach((assignment, index) => {
          console.log(`Processing assignment ${index + 1}:`, {
            id: assignment.id,
            assigned_event_types: assignment.assigned_event_types,
            player_id: assignment.player_id,
            player_team_id: assignment.player_team_id
          });
          
          if (assignment.assigned_event_types && Array.isArray(assignment.assigned_event_types)) {
            console.log(`Found ${assignment.assigned_event_types.length} event types in assignment ${index + 1}`);
            assignment.assigned_event_types.forEach((eventType: string) => {
              console.log(`Adding event type: "${eventType}"`);
              allEventTypesSet.add(eventType);
            });
          } else {
            console.log(`No event types found in assignment ${index + 1} or not an array:`, assignment.assigned_event_types);
          }
        });

        console.log('=== FINAL EVENT TYPES SET ===');
        console.log('All unique event types collected:', Array.from(allEventTypesSet));

        const eventTypes: EventType[] = Array.from(allEventTypesSet).map(key => {
          const label = EVENT_TYPE_LABELS[key as keyof typeof EVENT_TYPE_LABELS] || key;
          console.log(`Mapping event type: "${key}" -> "${label}"`);
          return {
            key,
            label
          };
        });

        console.log('=== PROCESSED EVENT TYPES ===');
        console.log('Final event types array:', eventTypes);
        setAssignedEventTypes(eventTypes);

        // Fetch match data to get player details
        console.log('=== FETCHING MATCH DATA ===');
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('home_team_players, away_team_players')
          .eq('id', matchId)
          .single();

        if (matchError) {
          console.error('Match data error:', matchError);
          throw matchError;
        }

        console.log('Match data retrieved:', {
          home_team_players_type: typeof matchData.home_team_players,
          away_team_players_type: typeof matchData.away_team_players,
          home_team_players_sample: matchData.home_team_players,
          away_team_players_sample: matchData.away_team_players
        });

        // Parse player data safely
        const parsePlayerData = (data: any): any[] => {
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch {
              console.log('Failed to parse player data as JSON:', data);
              return [];
            }
          }
          return Array.isArray(data) ? data : [];
        };

        const homeTeamPlayers = parsePlayerData(matchData.home_team_players);
        const awayTeamPlayers = parsePlayerData(matchData.away_team_players);

        console.log('=== PARSED PLAYER DATA ===');
        console.log('Home team players count:', homeTeamPlayers.length);
        console.log('Away team players count:', awayTeamPlayers.length);
        console.log('Home team players sample:', homeTeamPlayers.slice(0, 2));
        console.log('Away team players sample:', awayTeamPlayers.slice(0, 2));

        // Get assigned player IDs and team contexts from assignments
        console.log('=== PROCESSING ASSIGNED PLAYERS ===');
        const assignedPlayerData: AssignedPlayer[] = [];
        
        assignments.forEach((assignment, index) => {
          const playerId = assignment.player_id;
          const teamContext = assignment.player_team_id;
          
          console.log(`Processing player assignment ${index + 1}:`, {
            player_id: playerId,
            player_team_id: teamContext
          });
          
          if (playerId && teamContext) {
            let player = null;
            
            if (teamContext === 'home') {
              player = homeTeamPlayers.find(p => String(p.id) === String(playerId));
              console.log(`Looking for player ID ${playerId} in home team:`, player ? 'FOUND' : 'NOT FOUND');
            } else if (teamContext === 'away') {
              player = awayTeamPlayers.find(p => String(p.id) === String(playerId));
              console.log(`Looking for player ID ${playerId} in away team:`, player ? 'FOUND' : 'NOT FOUND');
            }
            
            if (player) {
              const assignedPlayer: AssignedPlayer = {
                id: String(player.id),
                player_name: player.name || player.player_name,
                jersey_number: player.number || player.jersey_number,
                team_context: teamContext as 'home' | 'away'
              };
              
              // Avoid duplicates
              if (!assignedPlayerData.some(p => p.id === assignedPlayer.id && p.team_context === assignedPlayer.team_context)) {
                assignedPlayerData.push(assignedPlayer);
                console.log(`Added assigned player:`, assignedPlayer);
              } else {
                console.log(`Duplicate player skipped:`, assignedPlayer);
              }
            } else {
              console.log(`Player not found for ID: ${playerId} in team: ${teamContext}`);
              // Debug: show available players in the team
              const teamPlayers = teamContext === 'home' ? homeTeamPlayers : awayTeamPlayers;
              console.log(`Available ${teamContext} team player IDs:`, teamPlayers.map(p => p.id));
            }
          } else {
            console.log(`Skipping assignment ${index + 1} - missing player_id or player_team_id`);
          }
        });

        console.log('=== FINAL ASSIGNED PLAYERS ===');
        console.log('Total assigned players:', assignedPlayerData.length);
        console.log('Assigned players:', assignedPlayerData);
        setAssignedPlayers(assignedPlayerData);

        // Auto-select first player if only one is assigned
        if (assignedPlayerData.length === 1) {
          console.log('Auto-selecting single assigned player:', assignedPlayerData[0]);
          setSelectedPlayer(assignedPlayerData[0]);
        }

        console.log('=== FETCH ASSIGNMENTS COMPLETED ===');

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
    // Note: No cleanup function needed here as this effect is purely for data based on user/match.
  }, [user?.id, matchId]); // Dependencies are only user.id and matchId

  // useEffect for tracker status (active/inactive) - depends on pushEvent
  useEffect(() => {
    if (!user?.id || !matchId || !pushEvent) {
      return; // Do nothing if critical info or pushEvent is missing
    }

    // Send 'active' status when component mounts or dependencies change
    pushEvent({
      type: 'broadcast',
      event: 'tracker_event',
      payload: {
        trackerId: user.id,
        matchId: matchId,
        timestamp: Date.now(),
        eventType: 'tracker_status',
        payload: { status: 'active' },
      } as TrackerSyncEvent,
    });

    // Send 'inactive' status when component unmounts or dependencies change before next effect run
    return () => {
      // Re-check critical values in cleanup as component might be unmounting due to logout, etc.
      // or pushEvent might become null if useRealtime re-initializes.
      if (user?.id && matchId && pushEvent) {
        pushEvent({
          type: 'broadcast',
          event: 'tracker_event',
          payload: {
            trackerId: user.id,
            matchId: matchId,
            timestamp: Date.now(),
            eventType: 'tracker_status',
            payload: { status: 'inactive' },
          } as TrackerSyncEvent,
        });
      }
    };
  }, [user?.id, matchId, pushEvent]); // This effect explicitly depends on pushEvent

  const handleEventRecord = (eventType: EventType) => {
    if (!selectedPlayer) {
      toast.error('Please select a player first');
      return;
    }

    if (toggleBehaviorEnabled) {
      if (selectedEventType === null) {
        // First click in two-click mode: select the event type
        setSelectedEventType(eventType.key);
        // Realtime: tracker_action arming_event
        if (pushEvent && user?.id && selectedPlayer) {
          pushEvent({
            type: 'broadcast',
            event: 'tracker_event',
            payload: {
              trackerId: user.id,
              matchId,
              timestamp: Date.now(),
              eventType: 'tracker_action',
              payload: { currentAction: `arming_event_${eventType.key}_for_player_${selectedPlayer.id}` },
            } as TrackerSyncEvent,
          });
        }
      } else {
        // Second click in two-click mode
        if (selectedEventType === eventType.key) {
          // Clicked the same event type again: record it and reset selection
          recordEvent(eventType);
          setSelectedEventType(null);
        } else {
          // Clicked a different event type: record the previously selected event, then select the new one
          const previousEventKey = selectedEventType;
          const previousEventTypeObj = assignedEventTypes.find(et => et.key === previousEventKey) || { key: previousEventKey, label: EVENT_TYPE_LABELS[previousEventKey as keyof typeof EVENT_TYPE_LABELS] || previousEventKey };
          recordEvent(previousEventTypeObj);
          setSelectedEventType(eventType.key);
        }
      }
    } else {
      // One-click mode: record immediately
      recordEvent(eventType);
    }
  };

  const recordEvent = (eventType: EventType) => {
    if (!selectedPlayer) return;

    // Realtime: tracker_action recorded_event_locally
    if (pushEvent && user?.id) {
      pushEvent({
        type: 'broadcast',
        event: 'tracker_event',
        payload: {
          trackerId: user.id,
          matchId,
          timestamp: Date.now(),
          eventType: 'tracker_action',
          payload: {
            currentAction: `recorded_event_locally_${eventType.key}_for_player_${selectedPlayer.id}`,
            details: { playerId: selectedPlayer.id, team: selectedPlayer.team_context, eventKey: eventType.key },
          },
        } as TrackerSyncEvent,
      });
    }

    // Ensure player_id is properly converted to integer
    const playerId = parseInt(String(selectedPlayer.id), 10);
    
    // Validate player_id is a valid integer
    if (isNaN(playerId)) {
      console.error("Invalid player ID:", selectedPlayer.id);
      toast.error('Invalid player ID');
      return;
    }

    // Use seconds since epoch for timestamp to fit in bigint
    const timestampInSeconds = Math.floor(Date.now() / 1000);

    const eventData = {
      match_id: matchId,
      event_type: eventType.key,
      timestamp: timestampInSeconds,
      player_id: playerId,
      team: selectedPlayer.team_context,
      created_by: user?.id || ''
    };

    addLocalEvent(eventData);
    toast.info(`${eventType.label} logged locally for ${selectedPlayer.player_name}`);
    
    // Clear selection after recording if toggle behavior is enabled
    if (toggleBehaviorEnabled) {
      setSelectedEventType(null);
    }
  };

  const handleSyncEvents = async () => {
    // Realtime: tracker_action sync_attempt
    if (pushEvent && user?.id) {
      pushEvent({
        type: 'broadcast',
        event: 'tracker_event',
        payload: {
          trackerId: user.id,
          matchId,
          timestamp: Date.now(),
          eventType: 'tracker_action',
          payload: { currentAction: `sync_attempt_${getLocalEvents().length}_events` },
        } as TrackerSyncEvent,
      });
    }
    const localEvents = getLocalEvents();

    if (localEvents.length === 0) {
      toast.info("No events to sync.");
      return;
    }

    toast.loading("Syncing events to database...", { id: "sync-toast" });

    try {
      const { error } = await supabase
        .from('match_events')
        .insert(localEvents);

      if (error) {
        throw error;
      }

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
        <CardContent className="p-6">
          <div className="animate-pulse text-center">
            <div className="bg-slate-300 rounded-full mx-auto mb-4 w-16 h-16"></div>
            <p className="text-slate-600 font-medium text-lg">Loading your assignments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-gradient-to-br from-red-50 to-rose-50 shadow-xl border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 w-16 h-16">
              <svg className="text-red-600 w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="font-bold text-red-800 mb-3 text-xl">Assignment Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('=== RENDER DEBUG ===');
  console.log('Rendering with assigned event types:', assignedEventTypes.length);
  console.log('Event types to display:', assignedEventTypes);
  console.log('Assigned players:', assignedPlayers.length);
  console.log('Selected player:', selectedPlayer);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white shadow-2xl border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-700/20 animate-pulse"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center w-12 h-12 shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5z"/>
                <path d="M7 7h2v2H7zM11 7h2v2h-2zM15 7h2v2h-2zM7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Tracker Piano Input</h2>
              <p className="text-white/90 text-sm">Fast event recording for assigned players</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-slate-200 bg-gradient-to-br from-white to-slate-50">
        <CardHeader>
          <CardTitle className="text-xl">Your Tracker Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Behavior Control */}
          <motion.div 
            className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">Click Behavior</span>
                  <Badge variant={toggleBehaviorEnabled ? "default" : "secondary"}>
                    {toggleBehaviorEnabled ? "Two-Click Mode" : "One-Click Mode"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {toggleBehaviorEnabled 
                    ? "First click selects event type, second click records it" 
                    : "Single click records event immediately"
                  }
                </p>
              </div>
              <Button
                onClick={() => setToggleBehaviorEnabled(!toggleBehaviorEnabled)}
                variant={toggleBehaviorEnabled ? "default" : "outline"}
                size="lg"
                className="px-6"
              >
                {toggleBehaviorEnabled ? "Switch to One-Click" : "Switch to Two-Click"}
              </Button>
            </div>
          </motion.div>

          {/* Assignment Summary */}
          <motion.div 
            className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Assigned Event Types</h4>
              <p className="text-lg font-semibold">{assignedEventTypes.length}</p>
              <div className="text-xs text-gray-500 mt-1">
                {assignedEventTypes.map(et => et.label).join(', ')}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">Assigned Players</h4>
              <p className="text-lg font-semibold">{assignedPlayers.length}</p>
              <div className="text-xs text-gray-500 mt-1">
                {assignedPlayers.map(p => `#${p.jersey_number} ${p.player_name}`).join(', ')}
              </div>
            </div>
          </motion.div>

          {/* Player Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h3 className="font-medium mb-2">Assigned Players</h3>
            <div className="flex flex-wrap gap-2">
              {assignedPlayers.map((player) => (
                <motion.div
                  key={`${player.id}-${player.team_context}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={selectedPlayer?.id === player.id && selectedPlayer?.team_context === player.team_context ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedPlayer(player);
                      // Realtime: tracker_action selected_player
                      if (pushEvent && user?.id) {
                        pushEvent({
                          type: 'broadcast',
                          event: 'tracker_event',
                          payload: {
                            trackerId: user.id,
                            matchId,
                            timestamp: Date.now(),
                            eventType: 'tracker_action',
                            payload: { currentAction: `selected_player_${player.id}_${player.team_context}` },
                          } as TrackerSyncEvent,
                        });
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Badge variant={player.team_context === 'home' ? 'default' : 'secondary'}>
                      {player.team_context.toUpperCase()}
                    </Badge>
                    #{player.jersey_number} {player.player_name}
                  </Button>
                </motion.div>
              ))}
            </div>
            {assignedPlayers.length === 0 && (
              <p className="text-muted-foreground text-sm">No players assigned</p>
            )}
          </motion.div>

          {/* Event Type Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <h3 className="font-medium mb-4">Assigned Event Types ({assignedEventTypes.length})</h3>
            {assignedEventTypes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {assignedEventTypes.map((eventType) => {
                  const isSelected = toggleBehaviorEnabled && selectedEventType === eventType.key;
                  const colors = EVENT_TYPE_COLORS[eventType.key] || EVENT_TYPE_COLORS['pass'];
                  
                  return (
                    <motion.div
                      key={eventType.key}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                      layout
                    >
                      <Button
                        onClick={() => handleEventRecord(eventType)}
                        disabled={!selectedPlayer}
                        className={`w-full h-24 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border-2 overflow-hidden relative ${
                          isSelected 
                            ? `${colors.bg} ${colors.hover} text-white ${colors.border} shadow-xl ${colors.shadow} ring-2 ring-white ring-offset-2` 
                            : `bg-white hover:bg-slate-50 ${colors.text} border-slate-200 hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 shadow-lg hover:shadow-xl`
                        }`}
                        type="button"
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
                            eventKey={eventType.key} 
                            size={28} 
                            isSelected={isSelected}
                          />
                        </div>
                        
                        <span className="font-semibold text-center leading-tight z-10 relative text-xs">
                          {eventType.label}
                        </span>
                        
                        {selectedPlayer && (
                          <span className="text-xs opacity-70 z-10 relative">
                            {selectedPlayer.player_name}
                          </span>
                        )}
                        
                        {toggleBehaviorEnabled && isSelected && (
                          <span className="text-xs z-10 relative">Click to record</span>
                        )}

                        <motion.div
                          className={`absolute -top-1 -right-1 rounded-full p-0 flex items-center justify-center font-bold border-2 w-7 h-7 text-xs ${
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
                          {eventType.key.charAt(0).toUpperCase()}
                        </motion.div>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-100 rounded-lg">
                <p className="text-muted-foreground text-sm">No event types assigned</p>
                <p className="text-xs text-gray-500 mt-1">Contact your admin to assign event types</p>
              </div>
            )}
          </motion.div>

          {!selectedPlayer && assignedPlayers.length > 1 && (
            <motion.div 
              className="text-center text-muted-foreground text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              Select a player to record events
            </motion.div>
          )}

          {/* Sync Button */}
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Button
              onClick={handleSyncEvents}
              disabled={unsavedEventCount === 0}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <motion.div
                className="flex items-center gap-2"
                animate={unsavedEventCount > 0 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
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
