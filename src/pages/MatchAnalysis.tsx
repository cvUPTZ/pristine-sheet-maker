import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; // Assuming this context provides user roles
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import MatchHeader from "@/components/match/MatchHeader"; // Your component for the top bar
import MainTabContent from "@/components/match/MainTabContent"; // Your component for tracking mode content
import PianoRoll from "@/components/match/PianoInput"; // Your component for piano roll view
import { toast } from "sonner"; // For notifications
import { Button } from "@/components/ui/button"; // ShadCN Button
import {
  EventType,
  MatchEvent,
  Player as PlayerType,
  Team as TeamTypeImport,
  Statistics,
  TimeSegmentStatistics,
} from "@/types"; // Import types, using TeamTypeImport for imported Team
import useMatchData, {
  TeamHeaderData as HookTeamHeaderData,
  MatchDataInHook, // Make sure this type correctly defines what useMatchData.match returns
  MatchEvent as HookMatchEvent,
} from "@/hooks/useMatchData"; // Your custom hook for fetching match data
import { useMatchCollaboration } from "@/hooks/useMatchCollaboration"; // Import the collaboration hook
import RealTimeMatchEvents from '@/components/admin/RealTimeMatchEvents'; // Import RealTimeMatchEvents

// Define or import detailed Player and Team types if MainTabContent or other parts need them
// These are distinct from the simpler TeamHeaderData provided by the hook for the MatchHeader.
interface AssignedPlayerForMatch {
  id: string | number; // Or more specific if player ID type is known
  name: string;
  teamId: "home" | "away"; // Or string, if team IDs are not strictly 'home'/'away'
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
  id: string; // Added ID to TeamType for consistency with event recording
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
    refetchMatchData, // Optional: if your hook provides a way to manually refetch
  } = useMatchData(matchId); // Pass the matchId to the hook

  // Local UI/Interaction States
  const [mode, setMode] = useState<"piano" | "tracking">("piano"); // To toggle between views

  // PianoRoll specific states
  const [pianoSelectedEventType, setPianoSelectedEventType] =
    useState<EventType | null>(null);
  const [pianoSelectedTeam, setPianoSelectedTeam] = useState<TeamType | null>(
    null
  );
  const [pianoSelectedPlayer, setPianoSelectedPlayer] = useState<Player | null>(
    null
  );
  const [isPassTrackingMode, setIsPassTrackingMode] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Placeholder

  // MainTabContent specific states
  const [activeTab, setActiveTab] = useState<string>("pitch");
  const [teamPositions, setTeamPositions] = useState<
    Record<string, Record<string, { x: number; y: number }>>
  >({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null); // Using local Player type
  const [selectedTeamId, setSelectedTeamId] = useState<"home" | "away">("home");
  const [ballTrackingPoints, setBallTrackingPoints] = useState<
    Array<{ x: number; y: number; timestamp: number }>
  >([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null); // Initialize with null or default structure
  const [playerStats, setPlayerStats] = useState<any>({}); // Define a proper type later if possible

  // State for tracker assignments
  const [assignedPlayerForMatch, setAssignedPlayerForMatch] =
    useState<AssignedPlayerForMatch | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] =
    useState<boolean>(false);

  // Local state for more detailed team compositions (e.g., for player lists in MainTabContent)
  // These are typically initialized with defaults or fetched separately if not fully covered by useMatchData
  const [homeTeamFull, setHomeTeamFull] = useState<TeamType>({
    id: "home_team_placeholder_id", // Placeholder ID
    name: "Home Team",
    formation: "4-3-3",
    players: Array.from({ length: 11 }, (_, i) => ({
      id: `H${i + 1}`,
      name: `Home Player ${i + 1}`,
      position: "Forward",
      number: i + 1,
    })),
  });
  const [awayTeamFull, setAwayTeamFull] = useState<TeamType>({
    id: "away_team_placeholder_id", // Placeholder ID
    name: "Away Team",
    formation: "4-4-2",
    players: Array.from({ length: 11 }, (_, i) => ({
      id: `A${i + 1}`,
      name: `Away Player ${i + 1}`,
      position: "Midfielder",
      number: i + 1,
    })),
  });

  // Effect to synchronize local detailed team data if the simpler header data from the hook changes
  // This is useful if MainTabContent needs to display team names/formations consistent with MatchHeader
  useEffect(() => {
    if (homeTeamHeaderDataFromHook) {
      setHomeTeamFull((prev) => ({
        ...prev,
        id: homeTeamHeaderDataFromHook.id || prev.id, // Sync ID
        name: homeTeamHeaderDataFromHook.name || "Home Team", // Fallback
        formation: homeTeamHeaderDataFromHook.formation || prev.formation, // Fallback or keep previous
        // Note: Players list might need more sophisticated syncing if hook provides player data
      }));
    }
    if (awayTeamHeaderDataFromHook) {
      setAwayTeamFull((prev) => ({
        ...prev,
        id: awayTeamHeaderDataFromHook.id || prev.id, // Sync ID
        name: awayTeamHeaderDataFromHook.name || "Away Team", // Fallback
        formation: awayTeamHeaderDataFromHook.formation || prev.formation, // Fallback or keep previous
      }));
    }
  }, [homeTeamHeaderDataFromHook, awayTeamHeaderDataFromHook]);

  // Effect to fetch tracker assignments
  useEffect(() => {
    if (matchId && user?.id && userRole === "tracker") {
      const fetchAssignments = async () => {
        setIsLoadingAssignments(true);
        setAssignmentError(null);
        setAssignedPlayerForMatch(null);
        setAssignedEventTypes([]);

        try {
          const { data, error } = await supabase
            .from("match_tracker_assignments")
            .select("assigned_player_id, assigned_event_types")
            .eq("match_id", matchId)
            .eq("tracker_id", user.id)
            .maybeSingle(); // Fetches a single row or null if not found

          if (error) {
            if (error.code === "PGRST116") {
              console.log(
                "No assignment found for this tracker on this match."
              );
            } else {
              throw error;
            }
          }

          if (data) {
            // Fetch actual player details based on assigned_player_id
            // For simplicity, assuming assigned_player_id directly maps to a player object or needs to be looked up.
            // This part requires knowing how player data is structured and accessible.
            // For now, using a placeholder or simplified lookup.
            let playerTeamId: "home" | "away" = "home"; // Default or determine based on player
            let playerTeamName = homeTeamFull?.name || "Home Team";

            // Example: If player ID indicates team, or if we need to fetch player's team
            // This is a placeholder: you might need to query your `players` table
            // or `match_players` table to get full player details including team.
            const { data: playerData, error: playerError } = await supabase
              .from('players') // Assuming a 'players' table
              .select('name, team_id') // Fetch name and team_id
              .eq('id', data.assigned_player_id)
              .single();
            
            let playerName = "Unknown Player";
            if (playerData) {
                playerName = playerData.name;
                // Logic to determine if player is home or away based on playerData.team_id
                // This assumes homeTeamFull.id and awayTeamFull.id are actual team IDs
                if (playerData.team_id === homeTeamFull.id) {
                    playerTeamId = "home";
                    playerTeamName = homeTeamFull.name;
                } else if (playerData.team_id === awayTeamFull.id) {
                    playerTeamId = "away";
                    playerTeamName = awayTeamFull.name;
                } else {
                    // Fallback if team_id doesn't match loaded teams
                    // This might indicate a data consistency issue or need for broader team data access
                    console.warn(`Assigned player's team ID (${playerData.team_id}) does not match loaded teams.`);
                }
            } else if (playerError) {
                console.error("Error fetching assigned player details:", playerError);
            }


            const playerInfo: AssignedPlayerForMatch = {
              id: data.assigned_player_id || "unknown-player",
              name: playerName, 
              teamId: playerTeamId, 
              teamName: playerTeamName, 
            };
            setAssignedPlayerForMatch(playerInfo);
            setAssignedEventTypes(data.assigned_event_types || []);
          }
        } catch (err: any) {
          console.error("Error fetching tracker assignments:", err);
          setAssignmentError(`Failed to fetch assignments: ${err.message}`);
        } finally {
          setIsLoadingAssignments(false);
        }
      };

      fetchAssignments();
    } else {
      setAssignedPlayerForMatch(null);
      setAssignedEventTypes([]);
      setIsLoadingAssignments(false);
    }
  }, [matchId, user?.id, userRole, supabase, homeTeamFull?.name, homeTeamFull?.id, awayTeamFull?.id]); 

  // Derived data for MainTabContent
  const timeSegments = useMemo((): TimeSegmentStatistics[] => {
    if (!eventsFromHook || eventsFromHook.length === 0) return [];
    const segmentDuration = 15 * 60 * 1000; 
    const segments: TimeSegmentStatistics[] = [];
    if (matchDataFromHook?.start_time) {
      let segmentStart = new Date(matchDataFromHook.start_time).getTime();
      let segmentEnd = segmentStart + segmentDuration;
      let currentSegment = 1;
      const matchEndTime = matchDataFromHook.end_time 
        ? new Date(matchDataFromHook.end_time).getTime() 
        : Date.now();

      while (segmentStart < matchEndTime) {
        segments.push({
          segment: `${(currentSegment -1) * 15}-${currentSegment * 15} min`,
          duration: segmentDuration / 1000, 
          stats: { shots: 0, goals: 0, possession: 0 }, 
        });
        segmentStart = segmentEnd;
        segmentEnd += segmentDuration;
        currentSegment++;
        if (segmentStart >= matchEndTime && (segmentEnd - segmentDuration) < matchEndTime) {
          // Capture the last partial segment if match doesn't end exactly on a 15-min mark
           segments[segments.length -1].duration = (matchEndTime - (segmentEnd - segmentDuration)) / 1000;
        }
      }
    }
    return segments;
  }, [
    eventsFromHook,
    matchDataFromHook?.start_time,
    matchDataFromHook?.end_time,
  ]);

  // UI Action Handlers
  const handleToggleTracking = () => {
    setMode((prevMode) => (prevMode === "tracking" ? "piano" : "tracking"));
  };

  const handleSave = () => {
    console.log(
      "MatchHeader Save button clicked. Data saving logic to be implemented here."
    );
    toast.info(
      "Save functionality is under development. Match data not yet saved."
    );
  };

  // PianoRoll Handlers
  const handlePianoEventAdd = (event: MatchEvent) => {
    console.log("Piano Event Added, sending via useMatchCollaboration:", event);

    const {
      id,
      status,
      clientId,
      user_id, // keep user_id if PianoInput provides it, otherwise hook uses its own
      optimisticCreationTime, 
      matchId: eventMatchId, 
      ...restOfEvent
    } = event;

    if (!matchId) {
      console.error(
        "Match ID is missing from URL, cannot record piano event via collaboration."
      );
      toast.error("Error: Match ID is missing for piano event.");
      return;
    }
    
    const finalUserId = user_id || user?.id; 
    if (!finalUserId) {
      console.error(
        "User ID is missing, cannot record piano event via collaboration."
      );
      toast.error("Error: User ID is missing for piano event.");
      return;
    }

    sendCollaborationEvent({
      ...restOfEvent,
      matchId: matchId, 
      user_id: finalUserId, 
    });
    toast.success(`Piano event ${event.type} recorded.`);
  };
  const handlePianoEventTypeSelect = (eventType: EventType) => {
    setPianoSelectedEventType(eventType);
  };
  const handlePianoTeamSelect = (team: TeamType) => {
    setPianoSelectedTeam(team);
    setPianoSelectedPlayer(null);
  }; 
  const handlePianoPlayerSelect = (player: Player) => {
    setPianoSelectedPlayer(player);
  }; 

  // MainTabContent Handlers
  const handlePlayerSelectInAnalysis = (player: Player) => {
    setSelectedPlayer(player);
  }; 
  const handleSetSelectedTeamInAnalysis = (teamId: "home" | "away") => {
    setSelectedTeamId(teamId);
    setSelectedPlayer(null);
  };
  const handlePitchClickInAnalysis = (coordinates: {
    x: number;
    y: number;
  }) => {
    console.log("Pitch clicked:", coordinates);
  };
  const handleAddBallTrackingPointInAnalysis = (point: {
    x: number;
    y: number;
  }) => {
    setBallTrackingPoints((prev) => [
      ...prev,
      { ...point, timestamp: Date.now() },
    ]);
  };
  const handleRecordEventInAnalysis = (
    eventType: EventType,
    playerId: string,
    teamIdStr: "home" | "away",
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
    
    // Use the synced IDs from homeTeamFull and awayTeamFull
    const actualTeamId = teamIdStr === "home" ? homeTeamFull.id : awayTeamFull.id;
    if (!actualTeamId || actualTeamId.includes("_placeholder_")) {
        console.error("Actual team ID is not loaded or is a placeholder. Cannot record event for team:", teamIdStr, "Resolved to:", actualTeamId);
        toast.error("Error: Team information incomplete or placeholder. Cannot record event.");
        return;
    }


    const eventData: Omit<
      MatchEvent,
      "id" | "status" | "clientId" | "optimisticCreationTime" 
    > = {
      matchId: matchId,
      teamId: actualTeamId, 
      playerId: playerId,
      type: eventType,
      timestamp: new Date().toISOString(), // Using ISO string for timestamp
      coordinates: coordinates || { x: 0, y: 0 },
      user_id: user.id, // Explicitly include user_id
    };

    console.log("Sending event via useMatchCollaboration:", eventData);
    sendCollaborationEvent(eventData);

    toast.success(`Event ${eventType} recorded for player ${playerId}.`);
  };
  const handleUndoInAnalysis = () => {
    console.log("Undo action triggered from MainTabContent");
  };
  const handleSaveInAnalysis = () => {
    console.log("Save action triggered from MainTabContent");
  };
  const handleSetStatisticsInAnalysis = (stats: Statistics) => {
    setStatistics(stats);
  };

  const timelineEvents = useMemo(() => {
    if (!eventsFromHook || !Array.isArray(eventsFromHook)) return []; 
    return eventsFromHook.map((event: HookMatchEvent) => ({ // Ensure event type is HookMatchEvent
      time: typeof event.timestamp === 'string' ? new Date(event.timestamp).getTime() : event.timestamp,
      label: event.type, // Assuming HookMatchEvent has 'type' not 'event_type'
                         // Or adjust if HookMatchEvent property is event.event_type
    }));
  }, [eventsFromHook]);


  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <p className="text-xl">Loading match details...</p>
      </div>
    );
  }

  if (
    matchDataError ||
    !matchDataFromHook ||
    !homeTeamHeaderDataFromHook ||
    !awayTeamHeaderDataFromHook
  ) {
    let message = "Match not found or there was an issue loading its data.";
    if (matchDataError) {
      message =
        typeof matchDataError === "string"
          ? matchDataError
          : (matchDataError as Error)?.message || "An error occurred.";
    } else if (!matchDataFromHook) {
      message =
        "Core match data is missing. Please try again or contact support.";
    } else if (!homeTeamHeaderDataFromHook) {
      message =
        "Home team details are missing. Please try again or contact support.";
    } else if (!awayTeamHeaderDataFromHook) {
      message =
        "Away team details are missing. Please try again or contact support.";
    }

    return (
      <div className="container mx-auto p-4 text-center flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">{message}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/")} variant="outline">
            Go Home
          </Button>
          {matchId && typeof refetchMatchData === "function" && (
            <Button onClick={() => refetchMatchData(matchId)}>
              Try Reloading Data
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MatchHeader
        matchName={matchDataFromHook.name || "Unnamed Match"}
        matchStatus={matchDataFromHook.status || "Scheduled"} 
        homeTeam={homeTeamHeaderDataFromHook} 
        awayTeam={awayTeamHeaderDataFromHook} 
        mode={mode}
        setMode={setMode} 
        onToggleTracking={handleToggleTracking} 
        onSave={handleSave} 
        userRole={userRole}
      />

      <div className="flex-grow overflow-auto p-2 md:p-4">
        {mode === "piano" && (
          <PianoRoll
            events={eventsFromHook || []} 
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
          />
        )}
        {mode === "tracking" && (
          <MainTabContent
            matchId={matchDataFromHook.id}
            userRole={userRole || ""}
            assignedPlayerForMatch={assignedPlayerForMatch}
            assignedEventTypes={assignedEventTypes}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            homeTeam={homeTeamFull} 
            awayTeam={awayTeamFull} 
            teamPositions={teamPositions}
            selectedPlayer={selectedPlayer} 
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
            handleSave={handleSaveInAnalysis} 
            timeSegments={timeSegments}
            recordEvent={handleRecordEventInAnalysis}
            events={eventsFromHook || []}
          />
        )}
        {mode !== "piano" && mode !== "tracking" && (
          <div className="text-center p-10">
            <p className="text-muted-foreground">
              Selected mode: <span className="font-semibold">{mode}</span>. No
              specific UI is configured for this view.
            </p>
          </div>
        )}
      </div>

      {userRole === 'admin' && matchId && (
        <div className="p-2 md:p-4">
          <RealTimeMatchEvents matchId={matchId} />
        </div>
      )}
    </div>
  );
};

export default MatchAnalysis;