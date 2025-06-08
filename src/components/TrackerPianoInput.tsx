import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { EventType as AppEventType } from '@/types';
import { MatchSpecificEventData, ShotEventData, PassEventData, TackleEventData, FoulCommittedEventData, CardEventData, SubstitutionEventData, GenericEventData, PressureEventData } from '@/types/eventData';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';
import { motion, AnimatePresence } from 'framer-motion';
import EventTypeSvg from '@/components/match/EventTypeSvg';
import { Undo, UserCircle } from 'lucide-react'; // Added UserCircle
import ShotDetailModal from '@/components/modals/ShotDetailModal';
import PassDetailModal from '@/components/modals/PassDetailModal';
import PressureDetailModal from '@/components/modals/PressureDetailModal';

export interface PlayerForPianoInput {
  id: number;
  name: string;
  position?: string;
  jersey_number?: number;
  teamName?: string;
}
interface TrackerPianoInputProps {
  matchId: string;
  // Optional props for team names if not reliably in fullMatchRoster.teamName
  // homeTeamName?: string;
  // awayTeamName?: string;
}

interface EnhancedEventType {
  key: string;
  label: string;
  category?: string;
  subcategory?: string;
  description?: string;
}

// TODO: Potentially move EVENT_TYPE_LABELS here or make it accessible for better label display
const EVENT_TYPE_LABELS_LOCAL: Record<string, string> = {
    pass: 'Pass', shot: 'Shot', tackle: 'Tackle', foul: 'Foul', corner: 'Corner',
    offside: 'Offside', goal: 'Goal', assist: 'Assist', yellowCard: 'Yellow Card',
    redCard: 'Red Card', substitution: 'Substitution', card: 'Card', penalty: 'Penalty',
    'free-kick': 'Free Kick', 'goal-kick': 'Goal Kick', 'throw-in': 'Throw In',
    interception: 'Interception', possession: 'Possession', ballLost: 'Ball Lost',
    ballRecovered: 'Ball Recovered', dribble: 'Dribble', cross: 'Cross',
    clearance: 'Clearance', block: 'Block', save: 'Save', ownGoal: 'Own Goal',
    freeKick: 'Free Kick', throwIn: 'Throw In', goalKick: 'Goal Kick',
    aerialDuel: 'Aerial Duel', groundDuel: 'Ground Duel', sub: 'Sub',
    pressure: 'Pressure', dribble_attempt: 'Dribble Attempt', ball_recovery: 'Ball Recovery'
};

interface FullRoster { // For clarity
    home: PlayerForPianoInput[];
    away: PlayerForPianoInput[];
}


const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
  // State for focused player and their assigned event types
  const [focusedPlayer, setFocusedPlayer] = useState<(PlayerForPianoInput & {teamName?: string}) | null>(null);
  const [focusedPlayerTeam, setFocusedPlayerTeam] = useState<'home' | 'away' | null>(null);
  const [focusedAssignedEventTypes, setFocusedAssignedEventTypes] = useState<EnhancedEventType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordedEvent, setLastRecordedEvent] = useState<any>(null);
  const [fullMatchRoster, setFullMatchRoster] = useState<FullRoster | null>(null);
  const [recordingEventType, setRecordingEventType] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // State for modals
  const [showShotDetailModal, setShowShotDetailModal] = useState(false);
  const [currentShotInitialData, setCurrentShotInitialData] = useState<Partial<ShotEventData>>({ on_target: false, is_goal: false, body_part_used: 'right_foot', shot_type: 'normal', situation: 'open_play', assist_type: 'none' });

  const [showPassDetailModal, setShowPassDetailModal] = useState(false);
  const [currentPassInitialData, setCurrentPassInitialData] = useState<Partial<PassEventData>>({ success: true, pass_type: 'short' });

  const [showPressureDetailModal, setShowPressureDetailModal] = useState(false);
  const [currentPressureInitialData, setCurrentPressureInitialData] = useState<Partial<PressureEventData>>({ outcome: 'no_effect' });

  const [pendingEventTrigger, setPendingEventTrigger] = useState<{ eventType: EnhancedEventType, player: PlayerForPianoInput, coordinates?: { x: number, y: number } } | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      if (event.created_by === user?.id && focusedPlayer && event.player_id === focusedPlayer.id) {
        const eventInfo = {
          id: event.id,
          eventType: { key: event.type, label: EVENT_TYPE_LABELS_LOCAL[event.type] || event.type },
          player: focusedPlayer,
          timestamp: Date.now()
        };
        setLastRecordedEvent(eventInfo);
        setRecentEvents(prev => [eventInfo, ...prev.slice(0, 4)]);
      }
    }
  });

  const { broadcastStatus } = useUnifiedTrackerConnection(matchId, user?.id || '');

  const fetchMatchDetails = useCallback(async () => {
    if (!matchId) return;
    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('home_team_players, away_team_players, home_team_name, away_team_name')
        .eq('id', matchId)
        .single();
      if (matchError) throw matchError;

      const parsePlayerData = (data: any, teamName: string): PlayerForPianoInput[] => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
        return parsed.map((p: any) => ({
            id: p.id || p.jersey_number || Date.now() + Math.random(),
            name: p.name || p.player_name || `Player ${p.jersey_number || p.id}`,
            jersey_number: p.jersey_number || p.number,
            position: p.position,
            teamName
        }));
      };
      setFullMatchRoster({
        home: parsePlayerData(matchData.home_team_players, matchData.home_team_name || 'Home'),
        away: parsePlayerData(matchData.away_team_players, matchData.away_team_name || 'Away')
      });
    } catch (e) { console.error("Error fetching match details:", e); setError("Could not load team rosters."); }
  }, [matchId]);

  const fetchAssignments = useCallback(async () => {
    if (!matchId || !user?.id || !fullMatchRoster) return;
    setLoading(true);
    setError(null);

    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      if (assignmentsError) throw assignmentsError;

      const firstValidAssignment = assignments?.find(a => a.player_id && a.assigned_event_types && a.assigned_event_types.length > 0);

      if (!firstValidAssignment || !firstValidAssignment.player_id) {
        setError("No specific player/event assignment found for you in this match. Please check with your administrator.");
        setFocusedPlayer(null); setFocusedPlayerTeam(null); setFocusedAssignedEventTypes([]);
        setLoading(false);
        return;
      }

      const teamId = firstValidAssignment.player_team_id as 'home' | 'away';
      const playerList = teamId === 'home' ? fullMatchRoster.home : fullMatchRoster.away;
      // Attempt to find by ID first, then by jersey number as a fallback
      let playerDetails = playerList.find(p => String(p.id) === String(firstValidAssignment.player_id));
      if (!playerDetails) {
        playerDetails = playerList.find(p => String(p.jersey_number) === String(firstValidAssignment.player_id));
      }

      if (!playerDetails) {
        setError(`Assigned player (ID/Number: ${firstValidAssignment.player_id}) not found in ${teamId} team roster. Contact admin.`);
        setFocusedPlayer(null); setFocusedPlayerTeam(null); setFocusedAssignedEventTypes([]);
        setLoading(false);
        return;
      }

      setFocusedPlayer(playerDetails); // playerDetails already includes teamName from fetchMatchDetails
      setFocusedPlayerTeam(teamId);

      const eventKeys = firstValidAssignment.assigned_event_types || [];
      setFocusedAssignedEventTypes(eventKeys.map(key => ({ key, label: EVENT_TYPE_LABELS_LOCAL[key] || key })));

    } catch (e: any) {
      console.error("Error fetching tracker assignments:", e);
      setError("Failed to fetch assignments.");
    } finally {
      setLoading(false);
    }
  }, [matchId, user?.id, fullMatchRoster]);

  useEffect(() => { fetchMatchDetails(); }, [fetchMatchDetails]);
  useEffect(() => { if (fullMatchRoster) fetchAssignments(); }, [fetchAssignments, fullMatchRoster]);

  const recordEvent = async (
    eventType: EnhancedEventType,
    player: PlayerForPianoInput | null,
    details?: { coordinates?: {x: number, y: number}, event_data?: Partial<MatchSpecificEventData> }
  ) => {
    if (!matchId || !user?.id || !eventType || !player || !focusedPlayerTeam ) {
        console.error("Missing critical data for recording event:", {matchId, user, eventType, player, focusedPlayerTeam});
        toast({ title: "Error", description: "Cannot record event: critical data missing.", variant: "destructive" });
        return;
    }

    setIsRecording(true);
    setRecordingEventType(eventType.key);
    broadcastStatus({ status: 'recording', timestamp: Date.now() });

    try {
      const playerId = player.id;
      const timestampInSeconds = Math.floor(Date.now() / 1000);
      let specificEventData: MatchSpecificEventData;

      switch (eventType.key as AppEventType) {
        case 'shot':
          specificEventData = details?.event_data && typeof (details.event_data as ShotEventData).on_target === 'boolean'
            ? details.event_data as ShotEventData
            : { on_target: false, ...((details?.event_data as Partial<ShotEventData>) || {}) } as ShotEventData;
          break;
        case 'pass':
          specificEventData = details?.event_data && typeof (details.event_data as PassEventData).success === 'boolean'
            ? details.event_data as PassEventData
            : { success: true, ...((details?.event_data as Partial<PassEventData>) || {}) } as PassEventData;
          break;
        case 'pressure':
          specificEventData = details?.event_data && (details.event_data as PressureEventData).outcome
            ? details.event_data as PressureEventData
            : { outcome: 'no_effect', ...((details?.event_data as Partial<PressureEventData>) || {}) } as PressureEventData;
          break;
        case 'tackle':
          specificEventData = { success: true, ...details?.event_data } as TackleEventData;
          break;
        default:
          specificEventData = { ...details?.event_data } as GenericEventData;
      }

      const eventDataForSupabase = {
        match_id: matchId,
        event_type: eventType.key,
        timestamp: timestampInSeconds,
        player_id: playerId,
        team: focusedPlayerTeam,
        coordinates: details?.coordinates || null,
        event_data: specificEventData,
        created_by: user.id
      };

      const { data: newDbEvent, error: dbError } = await supabase.from('match_events').upsert([eventDataForSupabase]).select().single();
      if (dbError) throw dbError;

      if (newDbEvent) {
        const eventInfo = {
          id: newDbEvent.id,
          eventType: { key: newDbEvent.event_type, label: EVENT_TYPE_LABELS_LOCAL[newDbEvent.event_type] || newDbEvent.event_type },
          player: player,
          timestamp: newDbEvent.timestamp * 1000
        };
        setLastRecordedEvent(eventInfo);
        setRecentEvents(prev => [eventInfo, ...prev.slice(0, 4)]);
      }
      
      broadcastStatus({ status: 'active', timestamp: Date.now() });
      toast({ title: "Event Recorded", description: `${eventType.label} by ${player.name} recorded.` });
      
    } catch (e: any) {
      console.error("Error in recordEvent:", e);
      broadcastStatus({ status: 'active', timestamp: Date.now() });
      toast({ title: "Error", description: e.message || "Failed to record event", variant: "destructive" });
      throw e;
    } finally {
      setIsRecording(false);
      setRecordingEventType(null);
    }
  };

  const handleRecordShotWithDetails = async (shotDetails: ShotEventData) => {
    if (pendingEventTrigger && pendingEventTrigger.player) {
      try {
        await recordEvent(pendingEventTrigger.eventType, pendingEventTrigger.player, { coordinates: pendingEventTrigger.coordinates, event_data: shotDetails });
      } catch (error) { console.error('Error recording shot with details:', error); }
      finally { setShowShotDetailModal(false); setPendingEventTrigger(null); }
    }
  };

  const handleRecordPassWithDetails = async (passDetails: PassEventData) => {
    if (pendingEventTrigger && pendingEventTrigger.player) {
      try {
        await recordEvent(pendingEventTrigger.eventType, pendingEventTrigger.player, { coordinates: pendingEventTrigger.coordinates, event_data: passDetails });
      } catch (error) { console.error('Error recording pass with details:', error); }
      finally { setShowPassDetailModal(false); setPendingEventTrigger(null); }
    }
  };

  const handleRecordPressureWithDetails = async (pressureDetails: PressureEventData) => {
    if (pendingEventTrigger && pendingEventTrigger.player) {
      try {
        await recordEvent(pendingEventTrigger.eventType, pendingEventTrigger.player, { coordinates: pendingEventTrigger.coordinates, event_data: pressureDetails });
      } catch (error) { console.error('Error recording pressure with details:', error); }
      finally { setShowPressureDetailModal(false); setPendingEventTrigger(null); }
    }
  };

  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    if (!focusedPlayer) {
        toast({ title: "No Player Focused", description: "Cannot record event, no player assigned or focused.", variant: "destructive" });
        return;
    }
    const currentCoordinates = undefined; // Placeholder for potential future pitch integration

    if (eventType.key === 'shot') {
      setPendingEventTrigger({ eventType, player: focusedPlayer, coordinates: currentCoordinates });
      setCurrentShotInitialData({ on_target: false, is_goal: false, body_part_used: 'right_foot', shot_type: 'normal', situation: 'open_play', assist_type: 'none' });
      setShowShotDetailModal(true);
    } else if (eventType.key === 'pass') {
      setPendingEventTrigger({ eventType, player: focusedPlayer, coordinates: currentCoordinates });
      setCurrentPassInitialData({ success: true, pass_type: 'short' });
      setShowPassDetailModal(true);
    } else if (eventType.key === 'pressure') {
      setPendingEventTrigger({ eventType, player: focusedPlayer, coordinates: currentCoordinates });
      setCurrentPressureInitialData({ outcome: 'no_effect' });
      setShowPressureDetailModal(true);
    } else {
      try {
        await recordEvent(eventType, focusedPlayer, {coordinates: currentCoordinates});
      } catch (error) { console.error('Error recording event:', error); }
    }
  };

  const undoLastAction = async () => {
    if (recentEvents.length === 0) {
      toast({ title: "Aucune action à annuler", description: "Il n'y a pas d'action récente à annuler.", variant: "destructive" });
      return;
    }
    const lastEventToUndo = recentEvents[0];
    try {
      const { error: deleteError } = await supabase.from('match_events').delete().eq('id', lastEventToUndo.id);
      if (deleteError) throw deleteError;
      setRecentEvents(prev => prev.slice(1));
      setLastRecordedEvent(recentEvents.length > 1 ? recentEvents[1] : null);
      toast({ title: "Action annulée", description: `L'événement ${lastEventToUndo.eventType.label} a été supprimé.` });
    } catch (e: any) {
      console.error('Error undoing last action:', e);
      toast({ title: "Erreur", description: "Impossible d'annuler la dernière action.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <motion.div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <div className="text-lg font-semibold mb-2">Loading assignments...</div>
          <div className="text-sm text-gray-600">Please wait while we fetch your tracker assignments.</div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div className="flex items-center justify-center p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-red-600">Assignment Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <Button onClick={fetchAssignments} variant="outline">Retry Fetching Assignments</Button>
        </div>
      </motion.div>
    );
  }

  if (!focusedPlayer) {
    return (
      <motion.div className="flex items-center justify-center p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-orange-600">No Active Player Assignment</div>
          <div className="text-sm text-gray-600 mb-4">No specific player and event types assigned for tracking in this match, or an error occurred. Please check assignments.</div>
          <Button onClick={fetchAssignments} variant="outline">Retry Fetching Assignments</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <motion.div className="fixed top-4 right-4 z-50" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Button onClick={undoLastAction} disabled={recentEvents.length === 0} variant="outline" size="lg" className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 shadow-lg">
          <Undo className="h-5 w-5 mr-2" /> Annuler Dernière Action
        </Button>
      </motion.div>

      {/* Focused Player Display */}
      <Card className="mb-4 border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {focusedPlayer.jersey_number || focusedPlayer.name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="font-bold text-lg text-indigo-800 dark:text-indigo-100">Tracking: {focusedPlayer.name}</div>
              <div className="text-sm text-indigo-600 dark:text-indigo-300">
                Team: {focusedPlayer.teamName || (focusedPlayerTeam === 'home' ? 'Home Team' : 'Away Team')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Recorded Event Display */}
      <AnimatePresence>
        {lastRecordedEvent && lastRecordedEvent.player?.id === focusedPlayer.id && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }}>
            <Card className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <motion.div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center" animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 0.6 }}>
                    <EventTypeSvg eventType={lastRecordedEvent.eventType.key} isRecording={false} disabled={true} />
                  </motion.div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-800 dark:text-blue-200">Last Event: {lastRecordedEvent.eventType.label}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-300">
                      By {lastRecordedEvent.player.name} • {new Date(lastRecordedEvent.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REMOVED Player Selection UI */}

      {/* Modals */}
      {showShotDetailModal && pendingEventTrigger && pendingEventTrigger.player && (
        <ShotDetailModal isOpen={showShotDetailModal} onClose={() => { setShowShotDetailModal(false); setPendingEventTrigger(null); }} onSubmit={handleRecordShotWithDetails} initialDetails={currentShotInitialData} />
      )}
      {showPassDetailModal && pendingEventTrigger && pendingEventTrigger.player && (
        <PassDetailModal
          isOpen={showPassDetailModal}
          onClose={() => { setShowPassDetailModal(false); setPendingEventTrigger(null); }}
          onSubmit={handleRecordPassWithDetails}
          initialDetails={currentPassInitialData}
          passer={pendingEventTrigger.player}
          teamPlayers={ (focusedPlayerTeam === 'home' ? fullMatchRoster?.home : fullMatchRoster?.away)?.filter(p => p.id !== focusedPlayer?.id) || [] }
        />
      )}
      {showPressureDetailModal && pendingEventTrigger && pendingEventTrigger.player && (
        <PressureDetailModal
          isOpen={showPressureDetailModal}
          onClose={() => { setShowPressureDetailModal(false); setPendingEventTrigger(null); }}
          onSubmit={handleRecordPressureWithDetails}
          initialDetails={currentPressureInitialData}
          pressurer={pendingEventTrigger.player}
        />
      )}

      {/* Event Types - Now uses focusedAssignedEventTypes */}
      {focusedAssignedEventTypes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-2xl p-8 shadow-2xl border-2 border-purple-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎹 Record Events for {focusedPlayer?.name}
              </h2>
              <p className="text-purple-600 dark:text-purple-300 mt-2">Tap assigned event type to record.</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
              {focusedAssignedEventTypes.map((eventType, index) => (
                <motion.div key={eventType.key} initial={{ opacity: 0, scale: 0.5, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1, type: "spring", stiffness: 300, damping: 20 }} whileHover={{ scale: 1.1, y: -10 }} whileTap={{ scale: 0.95 }} className="relative">
                  <div className="text-center">
                    <EventTypeSvg eventType={eventType.key} isRecording={recordingEventType === eventType.key} disabled={isRecording || !focusedPlayer} onClick={() => handleEventTypeClick(eventType)} />
                    <motion.div className="mt-3 px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-purple-200 dark:border-purple-700" whileHover={{ scale: 1.05 }}>
                      <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{EVENT_TYPE_LABELS_LOCAL[eventType.key] || eventType.label}</span>
                    </motion.div>
                  </div>
                  {recordingEventType === eventType.key && ( <motion.div className="absolute -inset-4 rounded-full border-4 border-green-400" animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 0.8, repeat: Infinity }} /> )}
                </motion.div>
              ))}
            </div>
            {isRecording && ( <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 text-center"> <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-lg font-bold shadow-xl"> <motion.div className="w-4 h-4 bg-white rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity }} /> Recording Event... </div> </motion.div> )}
          </div>
        </motion.div>
      )}
      {focusedAssignedEventTypes.length === 0 && !loading && !error && focusedPlayer && (
         <Card className="mt-4"><CardContent className="p-4 text-center text-gray-600">No event types assigned for {focusedPlayer.name}. Please check assignments.</CardContent></Card>
      )}
    </div>
  );
};

export default TrackerPianoInput;
