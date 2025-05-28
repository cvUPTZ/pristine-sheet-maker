import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Assuming this context provides user roles
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import  MatchHeader  from '@/components/match/MatchHeader'; // Your component for the top bar
import  MainTabContent  from '@/components/match/MainTabContent'; // Your component for tracking mode content
import  PianoRoll  from '@/components/match/PianoInput'; // Your component for piano roll view
import { toast } from 'sonner'; // For notifications
import { Button } from '@/components/ui/button'; // ShadCN Button
import { EventType, MatchEvent, Player as PlayerType, Team as TeamTypeImport, Statistics, TimeSegmentStatistics } from '@/types'; // Import types, using TeamTypeImport for imported Team
import useMatchData, {
  TeamHeaderData as HookTeamHeaderData,
  MatchDataInHook, // Make sure this type correctly defines what useMatchData.match returns
  MatchEvent as HookMatchEvent
} from '@/hooks/useMatchData'; // Your custom hook for fetching match data
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration'; // Import the collaboration hook

// Define or import detailed Player and Team types if MainTabContent or other parts need them
// These are distinct from the simpler TeamHeaderData provided by the hook for the MatchHeader.
interface AssignedPlayerForMatch {
  id: string | number; // Or more specific if player ID type is known
  name: string;
  teamId: 'home' | 'away'; // Or string, if team IDs are not strictly 'home'/'away'
  teamName: string;
}

interface Player {
  id: string; // Or number, ensure consistency
  name: string;
  position: string;
  number: number;
  // Add other relevant player details
}

interface TeamType {
  name: string;
  formation: string;
  players: Player[];
  // Add other relevant team details like logo, coach, etc.
}

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>(); // Get matchId from URL
  const navigate = useNavigate();
  const { userRole, user } = useAuth(); // Get user role and user object for conditional UI and data fetching

  // Instantiate useMatchCollaboration hook
  const { sendEvent: sendCollaborationEvent } = useMatchCollaboration({
    matchId: matchId, // From useParams
    userId: user?.id,
    // teamId is not set at the hook level, but per event
  });

  // Fetching core match data, header-specific team data, and events using the custom hook
  const {
    match: matchDataFromHook, // This should be of type MatchDataInHook or similar
    homeTeam: homeTeamHeaderDataFromHook, // This should be of type HookTeamHeaderData
    awayTeam: awayTeamHeaderDataFromHook, // This should be of type HookTeamHeaderData
    events: eventsFromHook, // Array of HookMatchEvent
    isLoading: isLoadingMatchData,
    error: matchDataError,
    refetchMatchData // Optional: if your hook provides a way to manually refetch
  } = useMatchData(matchId); // Pass the matchId to the hook

  // Local UI/Interaction States
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano'); // To toggle between views

  // PianoRoll specific states
  const [pianoSelectedEventType, setPianoSelectedEventType] = useState<EventType | null>(null);
  const [pianoSelectedTeam, setPianoSelectedTeam] = useState<TeamType | null>(null);
  const [pianoSelectedPlayer, setPianoSelectedPlayer] = useState<Player | null>(null);
  const [isPassTrackingMode, setIsPassTrackingMode] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Placeholder

  // MainTabContent specific states
  const [activeTab, setActiveTab] = useState<string>('pitch');
  const [teamPositions, setTeamPositions] = useState<Record<string, Record<string, { x: number; y: number }>>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null); // Using local Player type
  const [selectedTeamId, setSelectedTeamId] = useState<'home' | 'away'>('home');
  const [ballTrackingPoints, setBallTrackingPoints] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null); // Initialize with null or default structure
  const [playerStats, setPlayerStats] = useState<any>({}); // Define a proper type later if possible

  // State for tracker assignments
  const [assignedPlayerForMatch, setAssignedPlayerForMatch] = useState<AssignedPlayerForMatch | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);

  // Local state for more detailed team compositions (e.g., for player lists in MainTabContent)
  // These are typically initialized with defaults or fetched separately if not fully covered by useMatchData
  const [homeTeamFull, setHomeTeamFull] = useState<TeamType>({
    name: 'Home Team',
    formation: '4-3-3',
    players: Array.from({ length: 11 }, (_, i) => ({ id: `H${i+1}`, name: `Home Player ${i+1}`, position: 'Forward', number: i+1 }))
  });
  const [awayTeamFull, setAwayTeamFull] = useState<TeamType>({
    name: 'Away Team',
    formation: '4-4-2',
    players: Array.from({ length: 11 }, (_, i) => ({ id: `A${i+1}`, name: `Away Player ${i+1}`, position: 'Midfielder', number: i+1 }))
  });

  // Effect to synchronize local detailed team data if the simpler header data from the hook changes
  // This is useful if MainTabContent needs to display team names/formations consistent with MatchHeader
  useEffect(() => {
    if (homeTeamHeaderDataFromHook) {
      setHomeTeamFull(prev => ({
        ...prev,
        name: homeTeamHeaderDataFromHook.name || "Home Team", // Fallback
        formation: homeTeamHeaderDataFromHook.formation || prev.formation // Fallback or keep previous
      }));
    }
    if (awayTeamHeaderDataFromHook) {
      setAwayTeamFull(prev => ({
        ...prev,
        name: awayTeamHeaderDataFromHook.name || "Away Team", // Fallback
        formation: awayTeamHeaderDataFromHook.formation || prev.formation // Fallback or keep previous
      }));
    }
  }, [homeTeamHeaderDataFromHook, awayTeamHeaderDataFromHook]);

  // Effect to fetch tracker assignments
  useEffect(() => {
    if (matchId && user?.id && userRole === 'tracker') {
      const fetchAssignments = async () => {
        setIsLoadingAssignments(true);
        setAssignmentError(null);
        setAssignedPlayerForMatch(null);
        setAssignedEventTypes([]);

        try {
          const { data, error } = await supabase
            .from('match_tracker_assignments')
            .select('assigned_player_id, assigned_event_types')
            .eq('match_id', matchId)
            .eq('tracker_id', user.id)
            .maybeSingle(); // Fetches a single row or null if not found

          if (error) {
            // PGRST116 means no rows found, which is not necessarily an error for assignments
            if (error.code === 'PGRST116') {
              // No assignment found for this tracker and match
              console.log('No assignment found for this tracker on this match.');
              // setAssignedPlayerForMatch(null) and setAssignedEventTypes([]) already done
            } else {
              throw error; // Re-throw other errors
            }
          }

          if (data) {
            // Simplified transformation: Assumes assigned_player_id is the player's name or a usable ID.
            // A more robust solution would fetch player details from a 'players' table
            // or expect more detailed info stored in match_tracker_assignments.
            const playerInfo: AssignedPlayerForMatch = {
              id: data.assigned_player_id || 'unknown-player',
              name: data.assigned_player_id || 'Unknown Player', // Placeholder name
              // Team association would ideally come from player data or the assignment itself.
              // For now, using a placeholder. This needs to be improved later.
              teamId: 'home', // Placeholder
              teamName: homeTeamFull?.name || 'Home Team' // Placeholder, or derive from context
            };
            setAssignedPlayerForMatch(playerInfo);
            setAssignedEventTypes(data.assigned_event_types || []);
          }
        } catch (err: any) {
          console.error('Error fetching tracker assignments:', err);
          setAssignmentError(`Failed to fetch assignments: ${err.message}`);
        } finally {
          setIsLoadingAssignments(false);
        }
      };

      fetchAssignments();
    } else {
      // Not a tracker or missing IDs, so clear any previous assignment state
      setAssignedPlayerForMatch(null);
      setAssignedEventTypes([]);
      setIsLoadingAssignments(false);
    }
  }, [matchId, user?.id, userRole, supabase, homeTeamFull?.name]); // homeTeamFull?.name is a temporary dep for placeholder

  // Derived data for MainTabContent
  const timeSegments = useMemo(():: TimeSegmentStatistics[] => {
    // Placeholder logic: This should eventually process eventsFromHook to create segments.
    // For now, returning an empty array or a mock segment.
    if (!eventsFromHook || eventsFromHook.length === 0) return [];
    // Example: Group events into 15-minute segments (very basic)
    // This is a simplified example. Actual segmentation might be more complex.
    const segmentDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const segments: TimeSegmentStatistics[] = [];
    // Assuming events are sorted by timestamp
    // This is a naive implementation, real segmentation would be more robust
    // and calculate actual statistics per segment.
    if (matchDataFromHook?.start_time) {
        let segmentStart = new Date(matchDataFromHook.start_time).getTime();
        let segmentEnd = segmentStart + segmentDuration;
        let currentSegment = 1;
        while(segmentEnd < (new Date(matchDataFromHook.end_time || Date.now()).getTime() + segmentDuration)) { // Ensure last segment is captured
             segments.push({
                segment: `${currentSegment * 15} min`,
                duration: segmentDuration / 1000, // duration in seconds
                stats: { shots: 0, goals: 0, possession: 0 }, // Placeholder stats
             });
             segmentStart = segmentEnd;
             segmentEnd += segmentDuration;
             currentSegment++;
        }
    }
    return segments;
  }, [eventsFromHook, matchDataFromHook?.start_time, matchDataFromHook?.end_time]);

  // UI Action Handlers
  const handleToggleTracking = () => {
    // toast.info(`Tracking mode toggled. (Placeholder)`);
    setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking');
  };

  const handleSave = () => {
    console.log('MatchHeader Save button clicked. Data saving logic to be implemented here.');
    toast.info('Save functionality is under development. Match data not yet saved.');
  };

  // PianoRoll Handlers
  const handlePianoEventAdd = (event: MatchEvent) => { // MatchEvent from @/types
    console.log('Piano Event Added, sending via useMatchCollaboration:', event);
    
    const { 
      id, status, clientId, user_id, optimisticCreationTime, // Fields to omit for sendCollaborationEvent
      matchId: eventMatchId, // PianoInput might have a placeholder matchId
      ...restOfEvent 
    } = event;

    if (!matchId) {
        console.error("Match ID is missing from URL, cannot record piano event via collaboration.");
        toast.error("Error: Match ID is missing for piano event.");
        return;
    }
    if (!user?.id && !restOfEvent.user_id) { // Check if user_id can be derived
        console.error("User ID is missing, cannot record piano event via collaboration.");
        toast.error("Error: User ID is missing for piano event.");
        return;
    }

    sendCollaborationEvent({
      ...restOfEvent,
      matchId: matchId, // Prioritize current matchId from useParams
      // user_id from restOfEvent if available, otherwise hook might use its own userId
    });
    toast.success(`Piano event ${event.type} recorded.`);
  };
  const handlePianoEventTypeSelect = (eventType: EventType) => { setPianoSelectedEventType(eventType); };
  const handlePianoTeamSelect = (team: TeamType) => { setPianoSelectedTeam(team); setPianoSelectedPlayer(null); }; // Using local TeamType
  const handlePianoPlayerSelect = (player: Player) => { setPianoSelectedPlayer(player); }; // Using local Player type

  // MainTabContent Handlers
  const handlePlayerSelectInAnalysis = (player: Player) => { setSelectedPlayer(player); }; // Using local Player type
  const handleSetSelectedTeamInAnalysis = (teamId: 'home' | 'away') => { setSelectedTeamId(teamId); setSelectedPlayer(null); };
  const handlePitchClickInAnalysis = (coordinates: { x: number; y: number }) => { console.log('Pitch clicked:', coordinates); };
  const handleAddBallTrackingPointInAnalysis = (point: { x: number; y: number }) => { setBallTrackingPoints(prev => [...prev, { ...point, timestamp: Date.now() }]); };
  const handleRecordEventInAnalysis = (
    eventType: EventType, 
    playerId: string,     
    teamIdStr: 'home' | 'away', 
    coordinates?: { x: number; y: number }
  ) => {
    if (!matchId) {
      console.error("Match ID is missing, cannot record event.");
      toast.error("Error: Match ID is missing.");
      return;
    }
    if (!user?.id) {
      console.error("User ID is missing, cannot record event.");
      toast.error("Error: User ID is missing.");
      return;
    }
    if (!homeTeamFull?.id || !awayTeamFull?.id) {
      console.error("Team IDs are not loaded, cannot determine actual team ID for event.");
      toast.error("Error: Team information incomplete.");
      return;
    }

    const actualTeamId = teamIdStr === 'home' ? homeTeamFull.id : awayTeamFull.id;

    const eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'> = {
      matchId: matchId,
      teamId: actualTeamId, 
      playerId: playerId, 
      type: eventType,
      timestamp: Date.now(), 
      coordinates: coordinates || { x: 0, y: 0 }, 
    };

    console.log('Sending event via useMatchCollaboration:', eventData);
    sendCollaborationEvent(eventData); 

    toast.success(`Event ${eventType} recorded for player ${playerId}.`);
  };
  const handleUndoInAnalysis = () => { console.log('Undo action triggered from MainTabContent'); };
  const handleSaveInAnalysis = () => { console.log('Save action triggered from MainTabContent'); };
  const handleSetStatisticsInAnalysis = (stats: Statistics) => { setStatistics(stats); };


  // Memoized transformation of events for components like a timeline (if different from raw events)
  // This timelineEvents is different from timeSegments. timeSegments is for stats over periods.
  const timelineEvents = useMemo(() => {
    if (!eventsFromHook || !Array.isArray(eventsFromHook)) return []; // Guard against undefined/non-array
    return eventsFromHook.map(event => ({
      time: event.timestamp, // Assuming timestamp is a key property
      label: event.event_type, // Assuming event_type is a key property
      // Potentially add more transformed properties specific to the timeline component
      // e.g., color, icon based on event_type
    }));
  }, [eventsFromHook]);


  // --- Render Logic ---

  // 1. Loading State
  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <p className="text-xl">Loading match details...</p>
        {/* You could add a spinner component here */}
      </div>
    );
  }

  // 2. Error State or Missing Essential Data
  // This guard is crucial to prevent rendering with undefined data that child components might expect
  if (matchDataError || !matchDataFromHook || !homeTeamHeaderDataFromHook || !awayTeamHeaderDataFromHook) {
    let message = 'Match not found or there was an issue loading its data.';
    if (matchDataError) {
      // Attempt to get a more specific error message
      message = typeof matchDataError === 'string' ? matchDataError : ((matchDataError as Error)?.message || 'An error occurred.');
    } else if (!matchDataFromHook) {
      message = 'Core match data is missing. Please try again or contact support.';
    } else if (!homeTeamHeaderDataFromHook) {
      message = 'Home team details are missing. Please try again or contact support.';
    } else if (!awayTeamHeaderDataFromHook) {
      message = 'Away team details are missing. Please try again or contact support.';
    }

    return (
      <div className="container mx-auto p-4 text-center flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">{message}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} variant="outline">Go Home</Button>
          {matchId && typeof refetchMatchData === 'function' && (
            <Button onClick={() => refetchMatchData(matchId)}>Try Reloading Data</Button>
          )}
        </div>
      </div>
    );
  }

  // 3. Successful Data Load: Render the main analysis UI
  // At this point, matchDataFromHook, homeTeamHeaderDataFromHook, and awayTeamHeaderDataFromHook
  // are guaranteed to be defined. Their internal properties (like .name) should also be guaranteed
  // by the useMatchData hook (i.e., the hook should provide defaults if the source is sparse).
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MatchHeader
        matchName={matchDataFromHook.name} // Expects string
        matchStatus={matchDataFromHook.status} // Expects string
        homeTeam={homeTeamHeaderDataFromHook} // Expects HookTeamHeaderData (with .name, .logo, .formation as strings)
        awayTeam={awayTeamHeaderDataFromHook} // Expects HookTeamHeaderData
        mode={mode}
        setMode={setMode} // Pass setter if MatchHeader directly controls mode
        onToggleTracking={handleToggleTracking} // Pass handler
        onSave={handleSave} // Pass handler
        // Add any other props MatchHeader needs, like userRole for conditional buttons
        userRole={userRole}
      />

      {/* Conditional rendering based on the selected mode */}
      <div className="flex-grow overflow-auto p-2 md:p-4"> {/* Added overflow-auto for content scroll */}
        {mode === 'piano' && (
          <PianoRoll
            events={eventsFromHook || []} // Pass events, ensure it's an array
            homeTeam={homeTeamFull}
            awayTeam={awayTeamFull}
            onEventAdd={handlePianoEventAdd}
            elapsedTime={elapsedTime}
            selectedEventType={pianoSelectedEventType}
            onEventTypeSelect={handlePianoEventTypeSelect}
            selectedTeam={pianoSelectedTeam}
            onTeamSelect={handlePianoTeamSelect}
            selectedPlayer={pianoSelectedPlayer}
            onPlayerSelect={handlePianoPlayerSelect}
            isPassTrackingMode={isPassTrackingMode}
            // duration={matchDataFromHook.duration || 3600} // Example: default to 60 mins if duration isn't in hook data
            // onEventClick={(event) => console.log('PianoRoll Event clicked:', event)}
          />
        )}

        {mode === 'tracking' && (
          <MainTabContent
            matchId={matchDataFromHook.id}
            userRole={userRole || ''}
            assignedPlayerForMatch={assignedPlayerForMatch}
            assignedEventTypes={assignedEventTypes}
            
            // Updated props with new state and handlers
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            homeTeam={homeTeamFull} // Using local TeamType
            awayTeam={awayTeamFull} // Using local TeamType
            teamPositions={teamPositions}
            selectedPlayer={selectedPlayer} // Using local Player type
            selectedTeam={selectedTeamId}
            setSelectedTeam={handleSetSelectedTeamInAnalysis}
            handlePlayerSelect={handlePlayerSelectInAnalysis}
            ballTrackingPoints={ballTrackingPoints}
            handlePitchClick={handlePitchClickInAnalysis}
            addBallTrackingPoint={handleAddBallTrackingPointInAnalysis}
            statistics={statistics}
            setStatistics={handleSetStatisticsInAnalysis}
            playerStats={playerStats}
            handleUndo={handleUndoInAnalysis}
            handleSave={handleSaveInAnalysis} // This is for MainTabContent's own save logic
            timeSegments={timeSegments}
            recordEvent={handleRecordEventInAnalysis}
            events={eventsFromHook || []}
          />
        )}

        {/* Fallback for any other unhandled modes (optional) */}
        {mode !== 'piano' && mode !== 'tracking' && (
          <div className="text-center p-10">
            <p className="text-muted-foreground">
              Selected mode: <span className="font-semibold">{mode}</span>.
              No specific UI is configured for this view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchAnalysis;

// Ensure local Player and TeamType are compatible with imported PlayerType and TeamTypeImport
// For now, we assume they are compatible or can be adjusted later.
// The types Player and TeamType defined in this file are used for local state (e.g. selectedPlayer),
// while PlayerType (for individual players) and TeamTypeImport (for team structures) are imported from '@/types'.
// MainTabContent props like homeTeam/awayTeam might expect TeamTypeImport.
// For now, homeTeamFull/awayTeamFull (local TeamType) are passed; this might need adjustment
// if MainTabContent strictly requires TeamTypeImport and their structures are incompatible.
// Similarly, selectedPlayer (local Player) is passed; ensure compatible with MainTabContent's expected PlayerType.