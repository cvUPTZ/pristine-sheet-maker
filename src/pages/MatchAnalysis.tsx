
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MatchHeader from '@/components/match/MatchHeader';
import MainTabContent from '@/components/match/MainTabContent';
import PianoRoll from '@/components/match/PianoInput';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EventType, MatchEvent, Player as PlayerType, Team as TeamTypeImport, Statistics, TimeSegmentStatistics } from '@/types';
import useMatchData, {
  TeamHeaderData as HookTeamHeaderData,
  MatchDataInHook,
  MatchEvent as HookMatchEvent
} from '@/hooks/useMatchData';
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration';
import RealTimeMatchEvents from '@/components/admin/RealTimeMatchEvents';

// Define detailed Player and Team types for local state
interface AssignedPlayerForMatch {
  id: string | number;
  name: string;
  teamId: 'home' | 'away';
  teamName: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
}

interface TeamType {
  id?: string;
  name: string;
  formation: string;
  players: Player[];
}

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();

  // Instantiate useMatchCollaboration hook
  const { sendEvent: sendCollaborationEvent } = useMatchCollaboration({
    matchId: matchId,
    userId: user?.id,
  });

  // Fetching core match data using the custom hook
  const {
    match: matchDataFromHook,
    homeTeam: homeTeamHeaderDataFromHook,
    awayTeam: awayTeamHeaderDataFromHook,
    events: eventsFromHook,
    isLoading: isLoadingMatchData,
    error: matchDataError,
    refetchMatchData
  } = useMatchData(matchId);

  // Local UI/Interaction States
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');

  // PianoRoll specific states
  const [pianoSelectedEventType, setPianoSelectedEventType] = useState<EventType | null>(null);
  const [pianoSelectedTeam, setPianoSelectedTeam] = useState<TeamType | null>(null);
  const [pianoSelectedPlayer, setPianoSelectedPlayer] = useState<Player | null>(null);
  const [isPassTrackingMode, setIsPassTrackingMode] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // MainTabContent specific states
  const [activeTab, setActiveTab] = useState<string>('pitch');
  const [teamPositions, setTeamPositions] = useState<Record<string, Record<string, { x: number; y: number }>>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<'home' | 'away'>('home');
  const [ballTrackingPoints, setBallTrackingPoints] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [playerStats, setPlayerStats] = useState<any>({});

  // State for tracker assignments
  const [assignedPlayerForMatch, setAssignedPlayerForMatch] = useState<AssignedPlayerForMatch | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);

  // Local state for more detailed team compositions
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

  // Effect to synchronize local detailed team data
  useEffect(() => {
    if (homeTeamHeaderDataFromHook) {
      setHomeTeamFull(prev => ({
        ...prev,
        name: homeTeamHeaderDataFromHook.name || "Home Team",
        formation: homeTeamHeaderDataFromHook.formation || prev.formation
      }));
    }
    if (awayTeamHeaderDataFromHook) {
      setAwayTeamFull(prev => ({
        ...prev,
        name: awayTeamHeaderDataFromHook.name || "Away Team",
        formation: awayTeamHeaderDataFromHook.formation || prev.formation
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
            .maybeSingle();

          if (error) {
            if (error.code === 'PGRST116') {
              console.log('No assignment found for this tracker on this match.');
            } else {
              throw error;
            }
          }

          if (data) {
            const playerInfo: AssignedPlayerForMatch = {
              id: data.assigned_player_id || 'unknown-player',
              name: data.assigned_player_id || 'Unknown Player',
              teamId: 'home',
              teamName: homeTeamFull?.name || 'Home Team'
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
      setAssignedPlayerForMatch(null);
      setAssignedEventTypes([]);
      setIsLoadingAssignments(false);
    }
  }, [matchId, user?.id, userRole, supabase, homeTeamFull?.name]);

  // Derived data for MainTabContent
  const timeSegments = useMemo((): TimeSegmentStatistics[] => {
    if (!eventsFromHook || eventsFromHook.length === 0) return [];
    
    const segmentDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const segments: TimeSegmentStatistics[] = [];
    
    if (matchDataFromHook?.start_time) {
        let segmentStart = new Date(matchDataFromHook.start_time).getTime();
        let segmentEnd = segmentStart + segmentDuration;
        let currentSegment = 1;
        while(segmentEnd < (new Date(matchDataFromHook.end_time || Date.now()).getTime() + segmentDuration)) {
             segments.push({
                segment: `${currentSegment * 15} min`,
                duration: segmentDuration / 1000,
                stats: { shots: 0, goals: 0, possession: 0 },
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
    setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking');
  };

  const handleSave = () => {
    console.log('MatchHeader Save button clicked. Data saving logic to be implemented here.');
    toast.info('Save functionality is under development. Match data not yet saved.');
  };

  // PianoRoll Handlers
  const handlePianoEventAdd = (event: MatchEvent) => {
    console.log('Piano Event Added, sending via useMatchCollaboration:', event);
    
    const { 
      id, status, clientId, user_id, optimisticCreationTime,
      matchId: eventMatchId,
      ...restOfEvent 
    } = event;

    if (!matchId) {
        console.error("Match ID is missing from URL, cannot record piano event via collaboration.");
        toast.error("Error: Match ID is missing for piano event.");
        return;
    }
    if (!user?.id && !restOfEvent.user_id) {
        console.error("User ID is missing, cannot record piano event via collaboration.");
        toast.error("Error: User ID is missing for piano event.");
        return;
    }

    sendCollaborationEvent({
      ...restOfEvent,
      matchId: matchId,
    });
    toast.success(`Piano event ${event.type} recorded.`);
  };
  
  const handlePianoEventTypeSelect = (eventType: EventType) => { setPianoSelectedEventType(eventType); };
  const handlePianoTeamSelect = (team: TeamType) => { setPianoSelectedTeam(team); setPianoSelectedPlayer(null); };
  const handlePianoPlayerSelect = (player: Player) => { setPianoSelectedPlayer(player); };

  // MainTabContent Handlers
  const handlePlayerSelectInAnalysis = (player: Player) => { setSelectedPlayer(player); };
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
      teamId: actualTeamId || '', 
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

  // Memoized transformation of events for timeline
  const timelineEvents = useMemo(() => {
    if (!eventsFromHook || !Array.isArray(eventsFromHook)) return [];
    return eventsFromHook.map(event => ({
      time: event.timestamp,
      label: event.event_type,
    }));
  }, [eventsFromHook]);

  // Loading State
  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <p className="text-xl">Loading match details...</p>
      </div>
    );
  }

  // Error State or Missing Essential Data
  if (matchDataError || !matchDataFromHook || !homeTeamHeaderDataFromHook || !awayTeamHeaderDataFromHook) {
    let message = 'Match not found or there was an issue loading its data.';
    if (matchDataError) {
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

  // Successful Data Load: Render the main analysis UI
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MatchHeader
        matchName={matchDataFromHook.name}
        matchStatus={matchDataFromHook.status}
        homeTeam={homeTeamHeaderDataFromHook}
        awayTeam={awayTeamHeaderDataFromHook}
        mode={mode}
        setMode={setMode}
        onToggleTracking={handleToggleTracking}
        onSave={handleSave}
        userRole={userRole}
      />

      <div className="flex-grow overflow-auto p-2 md:p-4">
        {mode === 'piano' && (
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

        {mode === 'tracking' && (
          <MainTabContent
            matchId={matchDataFromHook.id}
            userRole={userRole || ''}
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

        {mode !== 'piano' && mode !== 'tracking' && (
          <div className="text-center p-10">
            <p className="text-muted-foreground">
              Selected mode: <span className="font-semibold">{mode}</span>.
              No specific UI is configured for this view.
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
