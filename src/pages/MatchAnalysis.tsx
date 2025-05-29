import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MatchHeader from '@/components/match/MatchHeader';
import MainTabContent from '@/components/match/MainTabContent';
import { PianoInput } from '@/components/match/PianoInput';
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

interface AssignedPlayerForMatch {
  id: string | number;
  name: string;
  teamId: 'home' | 'away';
  teamName: string;
}

interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
}

interface TeamType {
  id: string;
  name: string;
  formation: string;
  players: Player[];
}

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();

  const { sendEvent: sendCollaborationEvent } = useMatchCollaboration({
    matchId: matchId,
    userId: user?.id,
  });

  const {
    match: matchDataFromHook,
    homeTeam: homeTeamHeaderDataFromHook,
    awayTeam: awayTeamHeaderDataFromHook,
    events: eventsFromHook,
    isLoading: isLoadingMatchData,
    error: matchDataError
  } = useMatchData(matchId);

  // Logging props and state from useMatchData
  console.log('[MatchAnalysis] matchId from params:', matchId);
  console.log('[MatchAnalysis] Hook data: isLoadingMatchData:', isLoadingMatchData, 'matchDataError:', matchDataError, 'matchDataFromHook:', matchDataFromHook, 'homeTeamHeaderDataFromHook:', homeTeamHeaderDataFromHook, 'awayTeamHeaderDataFromHook:', awayTeamHeaderDataFromHook);

  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [activeTab, setActiveTab] = useState<string>('pitch');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<'home' | 'away'>('home');
  const [ballTrackingPoints, setBallTrackingPoints] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [playerStats, setPlayerStats] = useState<any>({});

  const [assignedPlayerForMatch, setAssignedPlayerForMatch] = useState<AssignedPlayerForMatch | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);

  const [homeTeamFull, setHomeTeamFull] = useState<TeamType>({
    id: 'home',
    name: 'Home Team',
    formation: '4-3-3',
    players: Array.from({ length: 11 }, (_, i) => ({ id: i+1, name: `Home Player ${i+1}`, position: 'Forward', number: i+1 }))
  });
  const [awayTeamFull, setAwayTeamFull] = useState<TeamType>({
    id: 'away',
    name: 'Away Team',
    formation: '4-4-2',
    players: Array.from({ length: 11 }, (_, i) => ({ id: i+12, name: `Away Player ${i+1}`, position: 'Midfielder', number: i+1 }))
  });

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
              name: String(data.assigned_player_id) || 'Unknown Player',
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
  }, [matchId, user?.id, userRole, homeTeamFull?.name]);

  const timeSegments = useMemo((): TimeSegmentStatistics[] => {
    if (!eventsFromHook || eventsFromHook.length === 0) return [];
    
    const segmentDuration = 15 * 60 * 1000;
    const segments: TimeSegmentStatistics[] = [];
    
    if (matchDataFromHook?.created_at) {
        let segmentStart = new Date(matchDataFromHook.created_at).getTime();
        let segmentEnd = segmentStart + segmentDuration;
        let currentSegment = 1;
        const endTime = new Date().getTime();
        
        while(segmentEnd < endTime) {
             segments.push({
                startTime: segmentStart,
                endTime: segmentEnd,
                timeSegment: `${currentSegment * 15} min`,
                events: []
             });
             segmentStart = segmentEnd;
             segmentEnd += segmentDuration;
             currentSegment++;
        }
    }
    return segments;
  }, [eventsFromHook, matchDataFromHook?.created_at]);

  if (isLoadingMatchData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <p className="text-xl">Loading match details...</p>
      </div>
    );
  }

  if (matchDataError || !matchDataFromHook || !homeTeamHeaderDataFromHook || !awayTeamHeaderDataFromHook) {
    // Log which condition(s) are true
    console.log('[MatchAnalysis] Displaying error/unavailable message. Conditions:');
    console.log('[MatchAnalysis] - matchDataError:', matchDataError);
    console.log('[MatchAnalysis] - !matchDataFromHook:', !matchDataFromHook);
    console.log('[MatchAnalysis] - !homeTeamHeaderDataFromHook:', !homeTeamHeaderDataFromHook);
    console.log('[MatchAnalysis] - !awayTeamHeaderDataFromHook:', !awayTeamHeaderDataFromHook);

    let message: string;
    if (matchDataError) {
      // Prioritize the error message from the hook
      const errorMessage = typeof matchDataError === 'string' ? matchDataError : ((matchDataError as Error)?.message);
      message = `Error: ${errorMessage || 'An unknown error occurred while fetching match data.'}`;
    } else if (!matchDataFromHook) {
      message = 'Match data could not be loaded. The core match information is missing.';
    } else if (!homeTeamHeaderDataFromHook) {
      message = 'Home team data could not be loaded. Please check match configuration.';
    } else if (!awayTeamHeaderDataFromHook) {
      message = 'Away team data could not be loaded. Please check match configuration.';
    } else {
      // This case should ideally not be reached if one ofthe previous conditions is true,
      // but it serves as a fallback.
      message = 'Match data is currently unavailable. Please try again later or contact support if the issue persists.';
    }

    return (
      <div className="container mx-auto p-4 text-center flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-lg mb-4">{message}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} variant="outline">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MatchHeader
        name={matchDataFromHook.name || 'Unnamed Match'}
        status={matchDataFromHook.status}
        homeTeam={homeTeamHeaderDataFromHook}
        awayTeam={awayTeamHeaderDataFromHook}
        mode={mode}
        setMode={setMode}
        onToggleTracking={() => setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking')}
        onSave={() => {
          console.log('MatchHeader Save button clicked. Data saving logic to be implemented here.');
          toast.info('Save functionality is under development. Match data not yet saved.');
        }}
        userRole={userRole}
      />

      <div className="flex-grow overflow-auto p-2 md:p-4">
        {mode === 'piano' && (
          <PianoInput
            fullMatchRoster={null}
            assignedEventTypes={null}
            assignedPlayers={null}
            onEventRecord={(eventType, player, details) => {
              if (player) {
                const eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'> = {
                  matchId: matchId || '',
                  teamId: player.team_context === 'home' ? 'home' : 'away',
                  playerId: Number(player.id),
                  type: eventType.key as EventType,
                  timestamp: Date.now(),
                  coordinates: { x: 0, y: 0 },
                };
                sendCollaborationEvent(eventData);
                toast.success(`Piano event ${eventType.key} recorded.`);
              }
            }}
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
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeamId}
            setSelectedTeam={(teamId: 'home' | 'away') => {
              setSelectedTeamId(teamId);
              setSelectedPlayer(null);
            }}
            handlePlayerSelect={(player: Player) => setSelectedPlayer(player)}
            ballTrackingPoints={ballTrackingPoints}
            handlePitchClick={(coordinates: { x: number; y: number }) => console.log('Pitch clicked:', coordinates)}
            addBallTrackingPoint={(point: { x: number; y: number }) => setBallTrackingPoints(prev => [...prev, { ...point, timestamp: Date.now() }])}
            statistics={statistics}
            setStatistics={(stats: Statistics) => setStatistics(stats)}
            playerStats={playerStats}
            handleUndo={() => console.log('Undo action triggered from MainTabContent')}
            handleSave={() => console.log('Save action triggered from MainTabContent')}
            timeSegments={timeSegments}
            recordEvent={(eventType: EventType, playerId: string | number, teamIdStr: 'home' | 'away', coordinates?: { x: number; y: number }) => {
              if (!matchId || !user?.id) {
                toast.error("Error: Missing match or user information.");
                return;
              }
              const actualTeamId = teamIdStr;
              const eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'> = {
                matchId: matchId,
                teamId: actualTeamId,
                playerId: Number(playerId),
                type: eventType,
                timestamp: Date.now(),
                coordinates: coordinates || { x: 0, y: 0 },
              };
              sendCollaborationEvent(eventData);
              toast.success(`Event ${eventType} recorded for player ${playerId}.`);
            }}
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
