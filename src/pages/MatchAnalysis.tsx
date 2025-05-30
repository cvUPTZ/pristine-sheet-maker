
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MatchHeader from '@/components/match/MatchHeader';
import MainTabContentV2 from '@/components/match/MainTabContentV2';
import { PianoInput } from '@/components/match/PianoInput';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EventType, MatchEvent, Player as PlayerType, Team as TeamTypeImport, Statistics, TimeSegmentStatistics } from '@/types';
import useMatchData, {
  TeamHeaderData as HookTeamHeaderData,
  MatchDataInHook,
  Formation
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
  formation: Formation;
  players: Player[];
}

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();

  const DISABLE_COLLABORATION_FEATURE = true;

  let sendCollaborationEvent = (...args: any[]) => { 
    console.warn('Collaboration feature is disabled. sendEvent called but did nothing.', args); 
  };

  if (!DISABLE_COLLABORATION_FEATURE) {
    const collaborationHookResult = useMatchCollaboration({
      matchId: matchId,
      userId: user?.id,
    });
    sendCollaborationEvent = collaborationHookResult.sendEvent;
  } else {
    console.log('[MatchAnalysis] Real-time collaboration feature is currently disabled for testing.');
  }

  const {
    match: matchDataFromHook,
    homeTeam: homeTeamHeaderDataFromHook,
    awayTeam: awayTeamHeaderDataFromHook,
    events: eventsFromHook,
    isLoading: isLoadingMatchData,
    error: matchDataError
  } = useMatchData(matchId);

  console.log('[MatchAnalysis] matchId from params:', matchId);
  console.log('[MatchAnalysis] Hook data: isLoadingMatchData:', isLoadingMatchData, 'matchDataError:', matchDataError, 'matchDataFromHook:', matchDataFromHook, 'homeTeamHeaderDataFromHook:', homeTeamHeaderDataFromHook, 'awayTeamHeaderDataFromHook:', awayTeamHeaderDataFromHook);

  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<'home' | 'away'>('home');
  const [statistics, setStatistics] = useState<Statistics>({
    possession: { home: 0, away: 0 },
    shots: { home: { onTarget: 0, offTarget: 0 }, away: { onTarget: 0, offTarget: 0 } },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
    ballsPlayed: { home: 0, away: 0 },
    ballsLost: { home: 0, away: 0 },
    duels: { home: {}, away: {} },
    crosses: { home: {}, away: {} }
  });

  const [assignedPlayerForMatch, setAssignedPlayerForMatch] = useState<AssignedPlayerForMatch | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);

  const [homeTeamFull, setHomeTeamFull] = useState<TeamType>({
    id: 'home',
    name: 'Home Team',
    formation: '4-3-3' as Formation,
    players: Array.from({ length: 11 }, (_, i) => ({ id: i+1, name: `Home Player ${i+1}`, position: 'Forward', number: i+1 }))
  });
  const [awayTeamFull, setAwayTeamFull] = useState<TeamType>({
    id: 'away',
    name: 'Away Team',
    formation: '4-4-2' as Formation,
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
    console.log('[MatchAnalysis] Displaying error/unavailable message. Conditions:');
    console.log('[MatchAnalysis] - matchDataError:', matchDataError);
    console.log('[MatchAnalysis] - !matchDataFromHook:', !matchDataFromHook);
    console.log('[MatchAnalysis] - !homeTeamHeaderDataFromHook:', !homeTeamHeaderDataFromHook);
    console.log('[MatchAnalysis] - !awayTeamHeaderDataFromHook:', !awayTeamHeaderDataFromHook);

    let message: string;
    if (matchDataError) {
      const errorMessage = typeof matchDataError === 'string' ? matchDataError : ((matchDataError as Error)?.message);
      message = `Error: ${errorMessage || 'An unknown error occurred while fetching match data.'}`;
    } else if (!matchDataFromHook) {
      message = 'Match data could not be loaded. The core match information is missing.';
    } else if (!homeTeamHeaderDataFromHook) {
      message = 'Home team data could not be loaded. Please check match configuration.';
    } else if (!awayTeamHeaderDataFromHook) {
      message = 'Away team data could not be loaded. Please check match configuration.';
    } else {
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
        handleToggleTracking={() => setMode(prevMode => prevMode === 'tracking' ? 'piano' : 'tracking')}
        handleSave={() => {
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
            onEventRecord={async (eventType, player, details) => {
              if (player) {
                const eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'> = {
                  match_id: matchId || '',
                  team_id: player.team_context === 'home' ? 'home' : 'away',
                  player_id: Number(player.id),
                  type: eventType.key as EventType,
                  event_type: eventType.key,
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
          <MainTabContentV2
            matchId={matchDataFromHook.id}
            homeTeam={homeTeamHeaderDataFromHook}
            awayTeam={awayTeamHeaderDataFromHook}
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
