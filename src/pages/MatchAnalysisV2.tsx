import React, { useState, useEffect, useMemo } from 'react'; // Added useState, useEffect, useMemo
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // To get current user for useUserPermissions
import useMatchData, { MatchEvent as HookMatchEvent } from '@/hooks/useMatchData'; // Import HookMatchEvent
import { useUserPermissions, RolePermissions } from '@/hooks/useUserPermissions'; // Assuming RolePermissions is exported
import { Button } from '@/components/ui/button'; // For error display
import MatchHeader from '@/components/match/MatchHeader'; // Import MatchHeader
import RealTimeMatchEvents from '@/components/admin/RealTimeMatchEvents'; // Import RealTimeMatchEvents
import MainTabContentV2 from '@/components/match/MainTabContentV2'; // Import MainTabContentV2
import PianoInputComponent from '@/components/match/PianoInputComponent'; // Import PianoInputComponent
import { Player, MatchEvent as GlobalMatchEvent, EventType as GlobalEventType } from '@/types'; // Import Player and other types
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration'; // Import useMatchCollaboration
import { toast } from 'sonner'; // Import toast

// Placeholder for TeamType if not globally defined, ensure it matches what PitchView/MainTabContentV2 expect
interface TeamType {
  id: string;
  name: string;
  formation: string;
  players: Player[];
}
import { supabase } from '@/integrations/supabase/client'; // Ensure Supabase client is imported

// Placeholder for AssignedPlayerForMatch if not globally defined
interface AssignedPlayerForMatch {
  id: string | number; // Player's ID
  name: string; // Player's name, to be resolved from roster
  teamId: 'home' | 'away'; // Player's team context
}

// Placeholder for TimeSegmentStatistics if not globally defined
interface TimeSegmentStatistics {
  startTime: number;
  endTime: number;
  timeSegment: string;
  events: HookMatchEvent[]; // Assuming HookMatchEvent is the type for events in segments
}
const MatchAnalysisV2: React.FC = () => {
  const {
    matchId
  } = useParams<{
    matchId: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth(); // Get the current user object

  const {
    match: matchDataFromHook,
    homeTeam: homeTeamHeaderDataFromHook,
    awayTeam: awayTeamHeaderDataFromHook,
    events: eventsFromHook,
    // We might not use events directly in V2's skeleton initially
    isLoading: isLoadingMatch,
    error: matchError
  } = useMatchData(matchId);
  const {
    permissions,
    role: userRoleFromPermissionsHook,
    // Renamed to avoid conflict if useAuth also provided role
    isLoading: isLoadingPermissions,
    error: permissionsError
  } = useUserPermissions(user?.id); // Pass current user's ID

  // Determine if user has any tracking tab permissions
  const hasAnyTrackingPermissions = permissions ? permissions.pitchView || permissions.statistics || permissions.timeline || permissions.analytics : false;

  // Adjust initial mode state
  const initialMode = permissions && permissions.pianoInput && !hasAnyTrackingPermissions ? 'piano' : 'piano';
  const [mode, setMode] = useState<'piano' | 'tracking'>(initialMode);

  // Effect to update mode if permissions load after initial state set and initialMode logic needs re-evaluation
  // This is important if permissions are not available at the time of initial useState call.
  useEffect(() => {
    if (permissions) {
      // Only run if permissions are loaded
      const newInitialMode = permissions.pianoInput && !hasAnyTrackingPermissions ? 'piano' : 'piano';
      // Set mode only if it's different from current to avoid potential loops or unnecessary re-renders
      // For example, if user manually changed mode before this effect runs after permission load.
      // However, for a true "initial" mode setting based on permissions, this direct set is okay.
      // If we want to preserve user's manual mode switch, more complex logic would be needed here.
      setMode(newInitialMode);
    }
  }, [permissions, hasAnyTrackingPermissions]); // Rerun when permissions or hasAnyTrackingPermissions changes

  // State for homeTeamFull and awayTeamFull (mimicking original MatchAnalysis)
  const [homeTeamFull, setHomeTeamFull] = useState<TeamType>({
    id: 'home',
    name: 'Home Team',
    formation: '4-3-3',
    players: Array.from({
      length: 11
    }, (_, i) => ({
      id: i + 1,
      name: `Home Player ${i + 1}`,
      position: 'Forward',
      jersey_number: i + 1,
      team_id: 'home'
    }))
  });
  const [awayTeamFull, setAwayTeamFull] = useState<TeamType>({
    id: 'away',
    name: 'Away Team',
    formation: '4-4-2',
    players: Array.from({
      length: 11
    }, (_, i) => ({
      id: i + 12,
      name: `Away Player ${i + 1}`,
      position: 'Midfielder',
      jersey_number: i + 12,
      team_id: 'away'
    }))
  });

  // Placeholder states for assignedPlayerForMatch and assignedEventTypes (needs real fetching logic)
  const [assignedPlayerForMatch, setAssignedPlayerForMatch] = useState<AssignedPlayerForMatch | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false); // Added state
  const [assignmentError, setAssignmentError] = useState<string | null>(null); // Added state

  // Update full team data when hook data changes (similar to original MatchAnalysis)
  useEffect(() => {
    if (homeTeamHeaderDataFromHook) {
      setHomeTeamFull(prev => ({
        ...prev,
        name: homeTeamHeaderDataFromHook.name || "Home Team",
        formation: homeTeamHeaderDataFromHook.formation || prev.formation
        // TODO: Populate players from matchDataFromHook.home_team_players if available
      }));
    }
    if (awayTeamHeaderDataFromHook) {
      setAwayTeamFull(prev => ({
        ...prev,
        name: awayTeamHeaderDataFromHook.name || "Away Team",
        formation: awayTeamHeaderDataFromHook.formation || prev.formation
        // TODO: Populate players from matchDataFromHook.away_team_players if available
      }));
    }
  }, [homeTeamHeaderDataFromHook, awayTeamHeaderDataFromHook]);

  // useEffect for fetching tracker assignments
  useEffect(() => {
    // Ensure homeTeamFull and awayTeamFull are loaded before attempting to map player names if needed
    if (matchId && user?.id && userRoleFromPermissionsHook === 'tracker' && homeTeamFull.players.length > 0 && awayTeamFull.players.length > 0) {
      const fetchAssignments = async () => {
        setIsLoadingAssignments(true);
        setAssignmentError(null);
        setAssignedPlayerForMatch(null); // Reset before fetching
        setAssignedEventTypes([]); // Reset before fetching

        try {
          console.log(`[MatchAnalysisV2] Fetching assignments for tracker ${user.id} on match ${matchId}`);
          const {
            data: assignmentData,
            error: assignmentErrorFetch
          } = await supabase.from('match_tracker_assignments').select('player_id, player_team_id, assigned_event_types') // player_team_id is crucial
          .eq('match_id', matchId).eq('tracker_user_id', user.id) // Ensure this column name is correct for your table
          .maybeSingle(); // Assuming a tracker has at most one assignment entry per match

          if (assignmentErrorFetch) {
            if (assignmentErrorFetch.code === 'PGRST116') {
              // "Not a single row was found"
              console.log('[MatchAnalysisV2] No specific assignment found for this tracker on this match.');
              // No specific player assigned, tracker might be assigned to the match generally
              // or has no specific player assignment. PianoInputComponent will show "No players assigned".
            } else {
              throw assignmentErrorFetch;
            }
          }
          if (assignmentData) {
            console.log('[MatchAnalysisV2] Assignment data fetched:', assignmentData);
            // Set assigned event types
            if (assignmentData.assigned_event_types && Array.isArray(assignmentData.assigned_event_types)) {
              setAssignedEventTypes(assignmentData.assigned_event_types);
            } else {
              setAssignedEventTypes([]); // Default to empty if not set or not an array
            }

            // If a specific player is assigned in this entry
            if (assignmentData.player_id && assignmentData.player_team_id) {
              const assignedPlayerTeamId = assignmentData.player_team_id as 'home' | 'away';
              const playerList = assignedPlayerTeamId === 'home' ? homeTeamFull.players : awayTeamFull.players;
              const foundPlayer = (playerList || []).find(p => String(p.id) === String(assignmentData.player_id));
              if (foundPlayer) {
                setAssignedPlayerForMatch({
                  id: String(foundPlayer.id),
                  name: foundPlayer.name,
                  // Name resolved from the full roster
                  teamId: assignedPlayerTeamId
                });
              } else {
                console.warn(`[MatchAnalysisV2] Assigned player ID ${assignmentData.player_id} (team: ${assignedPlayerTeamId}) not found in team rosters.`);
                // Set a placeholder or leave assignedPlayerForMatch as null
                // For now, if player not found in roster, treat as no specific player assigned for UI consistency
                setAssignedPlayerForMatch(null);
              }
            } else {
              // No specific player assigned in this assignment entry
              setAssignedPlayerForMatch(null);
            }
          } else {
            // No assignment entry found at all
            setAssignedPlayerForMatch(null);
            setAssignedEventTypes([]);
          }
        } catch (err: any) {
          console.error('[MatchAnalysisV2] Error fetching tracker assignments:', err);
          setAssignmentError(`Failed to fetch assignments: ${err.message}`);
          setAssignedPlayerForMatch(null); // Reset on error
          setAssignedEventTypes([]); // Reset on error
        } finally {
          setIsLoadingAssignments(false);
        }
      };
      fetchAssignments();
    } else if (userRoleFromPermissionsHook !== 'tracker') {
      // Clear assignments if user is not a tracker or necessary data isn't loaded
      setAssignedPlayerForMatch(null);
      setAssignedEventTypes([]);
      setIsLoadingAssignments(false);
      setAssignmentError(null);
    }
  }, [matchId, user?.id, userRoleFromPermissionsHook, homeTeamFull,
  // Dependency for player name lookup
  awayTeamFull // Dependency for player name lookup
  // supabase client is stable, not needed as dep normally
  ]);

  // New state variables for PitchView integration
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<'home' | 'away'>('home');
  const [ballTrackingPoints, setBallTrackingPoints] = useState<Array<{
    x: number;
    y: number;
    timestamp: number;
  }>>([]);
  const handleToggleTracking = () => {
    console.log('[MatchAnalysisV2] Toggle Tracking clicked. Current mode:', mode);
    setMode(currentMode => currentMode === 'tracking' ? 'piano' : 'tracking');
  };
  const handleSave = () => {
    console.log('[MatchAnalysisV2] Save Match clicked. No action implemented yet.');
  };

  // Handler functions for PitchView
  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
    console.log('[MatchAnalysisV2] Player selected:', player);
  };
  const handlePitchClick = (coordinates: {
    x: number;
    y: number;
  }) => {
    console.log('[MatchAnalysisV2] Pitch clicked at:', coordinates);
  };
  const addBallTrackingPoint = (point: {
    x: number;
    y: number;
  }) => {
    setBallTrackingPoints(prev => [...prev, {
      ...point,
      timestamp: Date.now()
    }]);
    console.log('[MatchAnalysisV2] Ball tracking point added:', point);
  };

  // Feature flag for collaboration
  const DISABLE_COLLABORATION_FEATURE = false; // Re-enable collaboration feature

  // Initialize sendCollaborationEvent and collaborationError
  let sendCollaborationEvent = (...args: any[]) => {
    // Default dummy function if collaboration is disabled or not yet initialized
    console.warn('[MatchAnalysisV2] sendCollaborationEvent called but collaboration is not active.', args);
  };
  let collaborationError: Error | null = null;
  if (!matchId && !DISABLE_COLLABORATION_FEATURE) {
    console.warn('[MatchAnalysisV2] matchId is undefined, collaboration hook will be disabled.');
    // collaborationError = new Error("Match ID is missing, collaboration disabled."); // Optionally set error
  } else if (matchId && !DISABLE_COLLABORATION_FEATURE) {
    const collaborationHookResult = useMatchCollaboration({
      // Hook is called conditionally based on matchId
      matchId: matchId,
      userId: user?.id
    });
    sendCollaborationEvent = collaborationHookResult.sendEvent;
    collaborationError = collaborationHookResult.collaborationError;
  } else if (DISABLE_COLLABORATION_FEATURE) {
    console.log('[MatchAnalysisV2] Real-time collaboration feature is currently disabled by flag.');
  }

  // Effect to display collaboration errors
  useEffect(() => {
    if (collaborationError) {
      console.error('[MatchAnalysisV2] Collaboration Error:', collaborationError);
      toast.error(`Real-time collaboration issue: ${collaborationError.message || 'Connection error'}`, {
        duration: 5000 // Show for 5 seconds
      });
    }
  }, [collaborationError]);
  const recordEventForPitchView = (eventType: GlobalEventType, playerId: string | number, teamId: 'home' | 'away', coordinates?: {
    x: number;
    y: number;
  }) => {
    if (!matchId || !user?.id) {
      console.error("[MatchAnalysisV2] Error: Missing match or user information for recordEventForPitchView.");
      return;
    }
    const eventData: Omit<GlobalMatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'> = {
      match_id: matchId,
      team_id: teamId,
      player_id: Number(playerId),
      event_type: eventType,
      timestamp: Date.now(),
      coordinates: coordinates || {
        x: 0,
        y: 0
      }
    };
    sendCollaborationEvent(eventData);
    console.log(`[MatchAnalysisV2] Event ${eventType} recorded for player ${playerId}. Data:`, eventData);
  };

  // Dummy statistics state for now, as MainTabContentV2 expects it
  const [statistics, setStatistics] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>({});

  // TimeSegments calculation (from original MatchAnalysis)
  const timeSegments = useMemo((): TimeSegmentStatistics[] => {
    if (!eventsFromHook || eventsFromHook.length === 0 || !matchDataFromHook?.created_at) return [];
    const segmentDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const segments: TimeSegmentStatistics[] = [];
    let matchStartTime = new Date(matchDataFromHook.created_at).getTime();

    // Find the earliest event timestamp if match_created_at is unreliable or events start later
    // For now, assuming created_at is the reference.
    // Could also use matchDataFromHook.start_time if that's a more accurate field for game start.

    let currentSegment = 1;
    // Loop based on typical match duration or until current time, for live matches.
    // For simplicity, let's assume a 90-minute match for completed games, or up to current time for live.
    // This part might need refinement based on actual match status and duration.
    const matchEndTimeEstimate = matchStartTime + 90 * 60 * 1000 + 15 * 60 * 1000; // 90 min + potential extra time

    let segmentStart = matchStartTime;
    while (segmentStart < matchEndTimeEstimate) {
      const segmentEnd = segmentStart + segmentDuration;
      segments.push({
        startTime: segmentStart,
        endTime: segmentEnd,
        timeSegment: `${(currentSegment - 1) * 15} - ${currentSegment * 15} min`,
        events: (eventsFromHook || []).filter(event => event.timestamp >= segmentStart && event.timestamp < segmentEnd)
      });
      if (segmentEnd > new Date().getTime() && matchDataFromHook.status !== 'completed') {
        // Stop if segment end is in future for non-completed
        break;
      }
      segmentStart = segmentEnd;
      currentSegment++;
      if (currentSegment > 8) break; // Max ~120 mins (8 segments of 15 mins)
    }
    return segments;
  }, [eventsFromHook, matchDataFromHook?.created_at, matchDataFromHook?.status]);

  // Combined loading state
  if (isLoadingMatch || isLoadingPermissions) {
    return <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <p className="text-xl">Loading match information...</p>
      </div>;
  }

  // Combined error state
  if (matchError || permissionsError) {
    let message = "An error occurred.";
    if (matchError) {
      const errorMessage = typeof matchError === 'string' ? matchError : (matchError as Error)?.message;
      message = `Error loading match data: ${errorMessage || 'Unknown error'}`;
    } else if (permissionsError) {
      const errorMessage = typeof permissionsError === 'string' ? permissionsError : (permissionsError as Error)?.message;
      message = `Error loading user permissions: ${errorMessage || 'Unknown error'}`;
    }

    // Log detailed errors to console for debugging
    console.error("MatchAnalysisV2 Error:", {
      matchError,
      permissionsError
    });
    return <div className="container mx-auto p-4 text-center flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">{message}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} variant="outline">Go Home</Button>
        </div>
      </div>;
  }

  // Fallback if data or permissions are somehow still null after loading without error
  // This addresses the previous mystery where logs showed data but UI didn't match.
  if (!matchDataFromHook || !homeTeamHeaderDataFromHook || !awayTeamHeaderDataFromHook || !permissions) {
    console.error('[MatchAnalysisV2] Critical data missing after load without explicit error:', {
      matchDataFromHook,
      homeTeamHeaderDataFromHook,
      awayTeamHeaderDataFromHook,
      permissions
    });
    return <div className="container mx-auto p-4 text-center flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">
          Critical data or permissions are missing. Cannot render the page. Please try again or contact support.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} variant="outline">Go Home</Button>
        </div>
      </div>;
  }

  // --- Main Content Area (Placeholder for now) ---
  // Based on permissions, we will render different components here.
  // For example: MatchHeader, PianoInputComponent, MainTabContentV2 etc.

  return <div className="flex flex-col h-screen bg-gray-50"> {/* Mimicking MatchAnalysis original structure */}
      <MatchHeader
    // name={matchDataFromHook.name || 'Unnamed Match'} // Not accepted by current MatchHeader
    // status={matchDataFromHook.status} // Not accepted by current MatchHeader
    homeTeam={homeTeamHeaderDataFromHook} awayTeam={awayTeamHeaderDataFromHook} mode={mode} setMode={setMode} handleToggleTracking={handleToggleTracking} handleSave={handleSave}
    // userRole={userRoleFromPermissionsHook} // MatchHeader.tsx doesn't take userRole directly
    />

      {/* Temporary display of role and permissions for debugging - REMOVE or move later */}
      
      {/* End temporary display */}

      <div className="flex-grow overflow-auto p-2 md:p-4">
        {/* Case 1: User has Piano Input permission */}
        {permissions.pianoInput && (mode === 'piano' || permissions.pianoInput && !hasAnyTrackingPermissions) && user && matchId && <PianoInputComponent matchId={matchId} userId={user.id} assignedPlayers={assignedPlayerForMatch ? [assignedPlayerForMatch] : null} assignedEventTypes={assignedEventTypes} sendCollaborationEvent={sendCollaborationEvent} homeTeamPlayers={homeTeamFull?.players || []} awayTeamPlayers={awayTeamFull?.players || []} homeTeamName={homeTeamFull?.name || 'Home'} awayTeamName={awayTeamFull?.name || 'Away'} />}

        {/* Case 2: User is in 'tracking' mode AND has permissions for at least one tracking tab */}
        {mode === 'tracking' && hasAnyTrackingPermissions && <MainTabContentV2 matchId={matchId} permissions={permissions} homeTeam={homeTeamFull} awayTeam={awayTeamFull} events={eventsFromHook || []} statistics={statistics} setStatistics={setStatistics} playerStats={playerStats} timeSegments={timeSegments || []} sendCollaborationEvent={sendCollaborationEvent} ballTrackingPoints={ballTrackingPoints} recordEventForPitchView={recordEventForPitchView} // Corrected prop name based on previous steps
      selectedPlayer={selectedPlayer} selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId} handlePlayerSelect={handlePlayerSelect} handlePitchClick={handlePitchClick} addBallTrackingPoint={addBallTrackingPoint} />}

        {/* Fallback Messages */}
        {mode === 'piano' && !permissions.pianoInput && <div className="p-4 text-center text-muted-foreground">
            You do not have permission to use the Piano Input mode.
          </div>}
        {mode === 'tracking' && !hasAnyTrackingPermissions && <div className="p-4 text-center text-muted-foreground">
            You do not have permissions for any of the tracking views (Pitch, Stats, etc.).
          </div>}
        
        {/* General fallback if no permissions for anything interactive, and not covered by above specific mode fallbacks */}
        {!(permissions.pianoInput && (mode === 'piano' || permissions.pianoInput && !hasAnyTrackingPermissions)) && !(mode === 'tracking' && hasAnyTrackingPermissions) &&
      // Not in tracking mode with perms
      !(!permissions.pianoInput && mode === 'piano') &&
      // Not in piano mode without piano perms
      !(!hasAnyTrackingPermissions && mode === 'tracking') &&
      // Not in tracking mode without tracking perms
      !permissions.pianoInput && !hasAnyTrackingPermissions &&
      // The actual general fallback condition
      <div className="p-4 text-center text-muted-foreground">
                You do not have permissions for any interactive match analysis modes.
             </div>}
      </div>

      {/* Optional RealTimeMatchEvents for admin - to be added later based on permissions.liveEvents */}
      {permissions.liveEvents && matchId && <div className="mt-6 p-4 border rounded-lg bg-gray-100 dark:bg-gray-700">
          <h2 className="text-xl font-semibold mb-3">Live Match Events Feed</h2>
          <RealTimeMatchEvents matchId={matchId} />
        </div>}
    </div>;
};
export default MatchAnalysisV2;