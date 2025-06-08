import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { EventType as AppEventType, MatchEvent } from '@/types';
import { MatchSpecificEventData, ShotEventData, PassEventData, TackleEventData, FoulCommittedEventData, CardEventData, SubstitutionEventData, GenericEventData, PressureEventData } from '@/types/eventData';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';
import { motion, AnimatePresence } from 'framer-motion';
import EventTypeSvg from '@/components/match/EventTypeSvg';
import { Undo, UserCircle, AlertTriangle, Edit } from 'lucide-react'; // Added Edit icon
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
  homeTeamNameProp?: string;
  awayTeamNameProp?: string;
}

interface EnhancedEventType {
  key: string;
  label: string;
  category?: string;
  subcategory?: string;
  description?: string;
}

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

interface FullRoster {
    home: PlayerForPianoInput[];
    away: PlayerForPianoInput[];
}

// For Modifier Context
interface ModifierContextState {
  eventType: AppEventType | null;
  eventId: string | null; // DB ID of the event
  timeoutId: NodeJS.Timeout | null;
  // Store enough info to display / update the last event
  lastEventDetails?: { type: EnhancedEventType, player: PlayerForPianoInput, data: MatchSpecificEventData | null };
}

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId, homeTeamNameProp, awayTeamNameProp }) => {
  const [focusedPlayer, setFocusedPlayer] = useState<(PlayerForPianoInput & { teamName?: string }) | null>(null);
  const [focusedPlayerTeam, setFocusedPlayerTeam] = useState<'home' | 'away' | null>(null);
  const [focusedAssignedEventTypes, setFocusedAssignedEventTypes] = useState<EnhancedEventType[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordedEventDisplay, setLastRecordedEventDisplay] = useState<any>(null); // For displaying the last recorded event with its latest state
  const [fullMatchRoster, setFullMatchRoster] = useState<FullRoster | null>(null);
  const [recordingEventType, setRecordingEventType] = useState<string | null>(null);
  const [recentEventsForUndo, setRecentEventsForUndo] = useState<any[]>([]); // Specifically for undo functionality

  // State for modals (now for editing or more detailed input, not primary flow for shot/pass/pressure)
  const [showShotDetailModal, setShowShotDetailModal] = useState(false);
  const [currentShotInitialData, setCurrentShotInitialData] = useState<Partial<ShotEventData>>({});

  const [showPassDetailModal, setShowPassDetailModal] = useState(false);
  const [currentPassInitialData, setCurrentPassInitialData] = useState<Partial<PassEventData>>({});

  const [showPressureDetailModal, setShowPressureDetailModal] = useState(false);
  const [currentPressureInitialData, setCurrentPressureInitialData] = useState<Partial<PressureEventData>>({});

  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);

  // State for Post-Tap Modifiers
  const [modifierContext, setModifierContext] = useState<ModifierContextState | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  useRealtimeMatch({
    matchId,
    onEventReceived: (event) => { // This is for incoming events from other trackers
      // Potentially update UI if an event being modified is updated by another tracker
      // Or simply refresh data periodically
    }
  });

  const { broadcastStatus } = useUnifiedTrackerConnection(matchId, user?.id || '');

  // Fetch Match Details (Team Rosters and Names)
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
        home: parsePlayerData(matchData.home_team_players, matchData.home_team_name || homeTeamNameProp || 'Home'),
        away: parsePlayerData(matchData.away_team_players, matchData.away_team_name || awayTeamNameProp || 'Away')
      });
    } catch (e) { console.error("Error fetching match details:", e); setError("Could not load team rosters."); }
  }, [matchId, homeTeamNameProp, awayTeamNameProp]);

  // Fetch Tracker Assignments
  const fetchAssignments = useCallback(async () => {
    if (!matchId || !user?.id || !fullMatchRoster) return;
    setLoading(true); setError(null);
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);
      if (assignmentsError) throw assignmentsError;

      const firstValidAssignment = assignments?.find(a => a.player_id && a.assigned_event_types && a.assigned_event_types.length > 0);
      if (!firstValidAssignment || !firstValidAssignment.player_id) {
        setError("No specific player/event assignment found. Please check with your administrator.");
        setFocusedPlayer(null); setFocusedPlayerTeam(null); setFocusedAssignedEventTypes([]);
        setLoading(false); return;
      }

      const teamId = firstValidAssignment.player_team_id as 'home' | 'away';
      const playerList = teamId === 'home' ? fullMatchRoster.home : fullMatchRoster.away;
      let playerDetails = playerList.find(p => String(p.id) === String(firstValidAssignment.player_id)) || playerList.find(p => String(p.jersey_number) === String(firstValidAssignment.player_id));

      if (!playerDetails) {
        setError(`Assigned player (ID/Number: ${firstValidAssignment.player_id}) not found in ${teamId} team roster. Contact admin.`);
        setFocusedPlayer(null); setFocusedPlayerTeam(null); setFocusedAssignedEventTypes([]);
        setLoading(false); return;
      }

      setFocusedPlayer(playerDetails);
      setFocusedPlayerTeam(teamId);
      const eventKeys = firstValidAssignment.assigned_event_types || [];
      setFocusedAssignedEventTypes(eventKeys.map(key => ({ key, label: EVENT_TYPE_LABELS_LOCAL[key] || key })));
    } catch (e: any) { console.error("Error fetching tracker assignments:", e); setError("Failed to fetch assignments.");
    } finally { setLoading(false); }
  }, [matchId, user?.id, fullMatchRoster]);

  useEffect(() => { fetchMatchDetails(); }, [fetchMatchDetails]);
  useEffect(() => { if (fullMatchRoster) fetchAssignments(); }, [fetchAssignments, fullMatchRoster]);

  // RECORD EVENT (Main Logic)
  const recordEvent = async (
    eventType: EnhancedEventType,
    player: PlayerForPianoInput | null,
    details?: { coordinates?: {x: number, y: number}, event_data?: Partial<MatchSpecificEventData> }
  ): Promise<any | null> => { // Return the created event or null
    if (!matchId || !user?.id || !eventType || !player || !focusedPlayerTeam ) {
        toast({ title: "Error", description: "Cannot record event: critical data missing.", variant: "destructive" });
        return null;
    }

    setIsRecording(true); setRecordingEventType(eventType.key);
    broadcastStatus({ status: 'recording', timestamp: Date.now() });

    let specificEventData: MatchSpecificEventData;
    switch (eventType.key as AppEventType) {
      case 'shot':
        // Use comprehensive defaults if no specific event_data is passed (i.e., initial tap)
        specificEventData = details?.event_data
          ? { ...(details.event_data) } as ShotEventData
          : {
              on_target: false,
              is_goal: false,
              situation: 'open_play',
              body_part_used: 'right_foot',
              shot_type: 'normal',
              assist_type: 'none'
            } as ShotEventData;
        break;
      case 'pass':
        specificEventData = { success: true, ...(details?.event_data || {}) } as PassEventData;
        break;
      case 'pressure':
        specificEventData = { outcome: 'no_effect', ...(details?.event_data || {}) } as PressureEventData;
        break;
      case 'tackle':
        specificEventData = { success: true, ...details?.event_data } as TackleEventData;
        break;
      default:
        specificEventData = { ...details?.event_data } as GenericEventData;
    }

    const eventDataForSupabase = {
      match_id: matchId, event_type: eventType.key, timestamp: Math.floor(Date.now() / 1000),
      player_id: player.id, team: focusedPlayerTeam, coordinates: details?.coordinates || null,
      event_data: specificEventData, created_by: user.id
    };

    try {
      const { data: newDbEvent, error: dbError } = await supabase.from('match_events').upsert([eventDataForSupabase]).select().single();
      if (dbError) throw dbError;

      if (newDbEvent) {
        const displayEventInfo = {
          id: newDbEvent.id,
          eventType: { key: newDbEvent.event_type, label: EVENT_TYPE_LABELS_LOCAL[newDbEvent.event_type] || newDbEvent.event_type },
          player: player,
          timestamp: newDbEvent.timestamp * 1000,
          data: newDbEvent.event_data // Store data for potential update by modifier
        };
        setLastRecordedEventDisplay(displayEventInfo);
        setRecentEventsForUndo(prev => [displayEventInfo, ...prev.slice(0, 4)]);
        toast({ title: "Event Recorded", description: `${eventType.label} by ${player.name} recorded.` });
        return newDbEvent; // Return the event for modifier context
      }
    } catch (e: any) {
      console.error("Error in recordEvent:", e);
      toast({ title: "Error", description: e.message || "Failed to record event", variant: "destructive" });
    } finally {
      setIsRecording(false); setRecordingEventType(null);
      broadcastStatus({ status: 'active', timestamp: Date.now() });
    }
    return null;
  };

  // EVENT TYPE CLICK HANDLER (Primary action)
  const handleEventTypeClick = async (eventType: EnhancedEventType) => {
    if (!focusedPlayer) {
      toast({ title: "No Player Focused", description: "Cannot record event.", variant: "destructive" });
      return;
    }
    if (modifierContext?.timeoutId) clearTimeout(modifierContext.timeoutId); // Clear previous modifier timeout

    const currentCoordinates = undefined; // Placeholder

    // Log event with defaults first
    const newDbEvent = await recordEvent(eventType, focusedPlayer, { coordinates: currentCoordinates });

    if (newDbEvent && newDbEvent.id) {
      // For specific types, set up modifier context
      if (eventType.key === 'shot' || eventType.key === 'pass' || eventType.key === 'pressure') {
        const newTimeoutId = setTimeout(() => setModifierContext(null), 3500);
        setModifierContext({
          eventType: eventType.key as AppEventType,
          eventId: newDbEvent.id,
          timeoutId: newTimeoutId,
          lastEventDetails: { type: eventType, player: focusedPlayer, data: newDbEvent.event_data }
        });
      } else {
        setModifierContext(null); // No modifiers for other types
      }
    } else {
      setModifierContext(null); // Failed to log event
    }
  };

  // MODIFIER HANDLERS
  const updateLastEventData = async (eventId: string, updated_event_data: Partial<MatchSpecificEventData>) => {
    const { data, error } = await supabase
      .from('match_events')
      .update({ event_data: updated_event_data, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "Event Updated", description: `Details for event ${modifierContext?.lastEventDetails?.type.label} updated.`});
      // Update the last recorded event display
      if (modifierContext?.lastEventDetails) {
        setLastRecordedEventDisplay({
          ...modifierContext.lastEventDetails,
          id: data.id, // ensure id is from db
          data: data.event_data
        });
      }
    }
    if (modifierContext?.timeoutId) clearTimeout(modifierContext.timeoutId);
    setModifierContext(null);
  };

  const handleShotOutcomeModifier = async (outcome: 'goal' | 'on_target' | 'off_target_blocked') => {
    if (!modifierContext || modifierContext.eventType !== 'shot' || !modifierContext.eventId) return;

    // Preserve other potential fields from the original event_data if they exist and are relevant
    const originalEventData = modifierContext.lastEventDetails?.data as ShotEventData | undefined;

    let updated_event_data: ShotEventData;

    if (outcome === 'goal') {
      updated_event_data = {
        ...(originalEventData || {}), // Spread original data first
        on_target: true,
        is_goal: true
      };
    } else if (outcome === 'on_target') {
      updated_event_data = {
        ...(originalEventData || {}),
        on_target: true,
        is_goal: false
      };
    } else { // 'off_target_blocked'
      updated_event_data = {
        ...(originalEventData || {}),
        on_target: false,
        is_goal: false
      };
    }

    // Ensure default fields are present if not in originalEventData and not set by outcome
    if (!updated_event_data.situation) updated_event_data.situation = 'open_play';
    if (!updated_event_data.body_part_used) updated_event_data.body_part_used = 'right_foot';
    if (!updated_event_data.shot_type) updated_event_data.shot_type = 'normal';
    if (!updated_event_data.assist_type) updated_event_data.assist_type = 'none';

    await updateLastEventData(modifierContext.eventId, updated_event_data);
  };

  const handlePassOutcomeModifier = async (newSuccessState: boolean) => {
    if (!modifierContext || modifierContext.eventType !== 'pass' || !modifierContext.eventId) return;
    const updated_event_data: Partial<PassEventData> = { ...(modifierContext.lastEventDetails?.data as PassEventData), success: newSuccessState };
    await updateLastEventData(modifierContext.eventId, updated_event_data);
  };

  const handlePressureOutcomeModifier = async (newOutcome: PressureEventData['outcome']) => {
    if (!modifierContext || modifierContext.eventType !== 'pressure' || !modifierContext.eventId) return;
    const updated_event_data: Partial<PressureEventData> = { ...(modifierContext.lastEventDetails?.data as PressureEventData), outcome: newOutcome };
    await updateLastEventData(modifierContext.eventId, updated_event_data);
  };

  // HANDLERS FOR MODALS (e.g., for "Edit Last Event" or "More Details" button - not primary flow)
  const openEditModalForLastEvent = () => {
    if (!lastRecordedEventDisplay || !lastRecordedEventDisplay.id) {
        toast({title: "No event to edit", variant: "destructive"});
        return;
    }

    const eventToEdit = recentEventsForUndo.find(e => e.id === lastRecordedEventDisplay.id);
    if (!eventToEdit) { // Fallback if not in recent, could fetch if necessary
        toast({title: "Cannot find event details to edit", variant: "destructive"});
        return;
    }

    setEditingEvent(eventToEdit as MatchEvent); // Cast needed if `any` type used for recentEventsForUndo
    const eventData = eventToEdit.data as MatchSpecificEventData;

    if (eventToEdit.eventType.key === 'shot') {
        setCurrentShotInitialData(eventData as ShotEventData || { on_target: false, is_goal: false });
        setShowShotDetailModal(true);
    } else if (eventToEdit.eventType.key === 'pass') {
        setCurrentPassInitialData(eventData as PassEventData || { success: true });
        setShowPassDetailModal(true);
    } else if (eventToEdit.eventType.key === 'pressure') {
        setCurrentPressureInitialData(eventData as PressureEventData || { outcome: 'no_effect' });
        setShowPressureDetailModal(true);
    }
    // Clear modifier context if opening a modal for editing
    if (modifierContext?.timeoutId) clearTimeout(modifierContext.timeoutId);
    setModifierContext(null);
  };

  const handleModalSubmit = async (updatedDetails: MatchSpecificEventData) => {
    if (!editingEvent || !editingEvent.id) return;
    await updateLastEventData(editingEvent.id, updatedDetails); // Reuses the update logic
    setShowShotDetailModal(false); setShowPassDetailModal(false); setShowPressureDetailModal(false);
    setEditingEvent(null);
  };


  const undoLastAction = async () => {
    if (recentEventsForUndo.length === 0) {
      toast({ title: "Aucune action à annuler", description: "Il n'y a pas d'action récente à annuler.", variant: "destructive" });
      return;
    }
    const lastEventToUndo = recentEventsForUndo[0];
    try {
      const { error: deleteError } = await supabase.from('match_events').delete().eq('id', lastEventToUndo.id);
      if (deleteError) throw deleteError;
      setRecentEventsForUndo(prev => prev.slice(1));
      setLastRecordedEventDisplay(recentEventsForUndo.length > 1 ? recentEventsForUndo[1] : null);
      if (modifierContext?.eventId === lastEventToUndo.id) { // Clear modifier if it was for the undone event
        if (modifierContext.timeoutId) clearTimeout(modifierContext.timeoutId);
        setModifierContext(null);
      }
      toast({ title: "Action annulée", description: `L'événement ${lastEventToUndo.eventType.label} a été supprimé.` });
    } catch (e: any) {
      console.error('Error undoing last action:', e);
      toast({ title: "Erreur", description: "Impossible d'annuler la dernière action.", variant: "destructive" });
    }
  };

  // JSX Rendering
  if (loading) { /* Loading UI */ }
  if (error) { /* Error UI */ }
  if (!focusedPlayer && !loading && !error) { /* No assignment UI */ }


  return (
    <div className="space-y-4 p-4"> {/* Reduced overall padding, more space-y between elements */}
      <motion.div className="fixed top-4 right-4 z-50" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Button onClick={undoLastAction} disabled={recentEventsForUndo.length === 0} variant="outline" size="default" className="bg-red-50 border-red-300 text-red-600 hover:bg-red-100 shadow-lg">
          <Undo className="h-4 w-4 mr-2" /> Annuler
        </Button>
      </motion.div>

      {focusedPlayer && (
        <Card className="mb-3 border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-md">
                {focusedPlayer.jersey_number || focusedPlayer.name?.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-bold text-md text-indigo-800 dark:text-indigo-100">Tracking: {focusedPlayer.name}</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-300">
                  Team: {focusedPlayer.teamName || (focusedPlayerTeam === 'home' ? (homeTeamNameProp || 'Home') : (awayTeamNameProp || 'Away'))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {lastRecordedEventDisplay && lastRecordedEventDisplay.player?.id === focusedPlayer?.id && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4 }} className="mb-3">
            <Card className="border-2 border-blue-400 bg-blue-50 dark:bg-blue-950 shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <EventTypeSvg eventType={lastRecordedEventDisplay.eventType.key} isRecording={false} disabled={true} sizeClass="w-8 h-8"/>
                        <div className="flex-1">
                            <div className="font-semibold text-sm text-blue-800 dark:text-blue-200">Last: {lastRecordedEventDisplay.eventType.label}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-300">
                            By {lastRecordedEventDisplay.player.name} • {new Date(lastRecordedEventDisplay.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={openEditModalForLastEvent} className="p-1 h-auto"><Edit className="h-4 w-4"/></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modifier Buttons Area */}
      <AnimatePresence>
        {modifierContext && modifierContext.eventId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-3 mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md"
          >
            <div className="text-sm font-semibold mb-2 text-center text-gray-700 dark:text-gray-300">
              Update last event: {modifierContext.lastEventDetails?.eventType.label} by {modifierContext.lastEventDetails?.player.name}
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {modifierContext.eventType === 'shot' && (
                <>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleShotOutcomeModifier('goal')}>Goal</Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => handleShotOutcomeModifier('on_target')}>On Target</Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => handleShotOutcomeModifier('off_target_blocked')}>Off Target/Block</Button>
                </>
              )}
              {modifierContext.eventType === 'pass' && (
                <>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handlePassOutcomeModifier(true)}>Pass Success</Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => handlePassOutcomeModifier(false)}>Pass Failed</Button>
                </>
              )}
              {modifierContext.eventType === 'pressure' && (
                <>
                  <Button size="sm" className="bg-sky-500 hover:bg-sky-600" onClick={() => handlePressureOutcomeModifier('regain_possession')}>Regain</Button>
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600" onClick={() => handlePressureOutcomeModifier('forced_turnover_error')}>Turnover</Button>
                  <Button size="sm" className="bg-gray-500 hover:bg-gray-600" onClick={() => handlePressureOutcomeModifier('no_effect')}>No Effect</Button>
                  <Button size="sm" className="bg-teal-500 hover:bg-teal-600" onClick={() => handlePressureOutcomeModifier('foul_won')}>Foul Won</Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals (now for editing/detailed input, not primary flow for shot/pass/pressure) */}
      {showShotDetailModal && editingEvent && editingEvent.type === 'shot' && (
        <ShotDetailModal isOpen={showShotDetailModal} onClose={() => { setShowShotDetailModal(false); setEditingEvent(null); }} onSubmit={handleModalSubmit} initialDetails={editingEvent.event_data as ShotEventData || currentShotInitialData} />
      )}
      {showPassDetailModal && editingEvent && editingEvent.type === 'pass' && (
        <PassDetailModal
          isOpen={showPassDetailModal}
          onClose={() => { setShowPassDetailModal(false); setEditingEvent(null); }}
          onSubmit={handleModalSubmit}
          initialDetails={editingEvent.event_data as PassEventData || currentPassInitialData}
          passer={focusedPlayer} // focusedPlayer is the context for the pass being edited
          teamPlayers={ (focusedPlayerTeam === 'home' ? fullMatchRoster?.home : fullMatchRoster?.away)?.filter(p => p.id !== focusedPlayer?.id) || [] }
        />
      )}
      {showPressureDetailModal && editingEvent && editingEvent.type === 'pressure' && (
        <PressureDetailModal
          isOpen={showPressureDetailModal}
          onClose={() => { setShowPressureDetailModal(false); setEditingEvent(null); }}
          onSubmit={handleModalSubmit}
          initialDetails={editingEvent.event_data as PressureEventData || currentPressureInitialData}
          pressurer={focusedPlayer}
        />
      )}

      {/* Event Types Grid */}
      {focusedAssignedEventTypes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-2xl p-6 shadow-2xl border-2 border-purple-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Record Event for: {focusedPlayer?.name}
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 justify-items-center">
              {focusedAssignedEventTypes.map((eventType, index) => (
                <motion.div key={eventType.key} initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="relative w-full">
                  <div className="text-center">
                    <Button variant="outline" className="w-full h-auto p-2 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:bg-purple-50 dark:hover:bg-purple-700/50 border-purple-200 dark:border-purple-700" disabled={isRecording || !focusedPlayer} onClick={() => handleEventTypeClick(eventType)}>
                      <EventTypeSvg eventType={eventType.key} isRecording={recordingEventType === eventType.key} disabled={isRecording || !focusedPlayer} sizeClass="w-8 h-8 mb-1" />
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">{EVENT_TYPE_LABELS_LOCAL[eventType.key] || eventType.label}</span>
                    </Button>
                  </div>
                  {recordingEventType === eventType.key && ( <motion.div className="absolute -inset-1 rounded-lg border-2 border-green-500" animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 0.8, repeat: Infinity }} /> )}
                </motion.div>
              ))}
            </div>
            {isRecording && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center"> <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold"> <motion.div className="w-3 h-3 bg-green-500 rounded-full" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: Infinity }} /> Recording... </div> </motion.div> )}
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
