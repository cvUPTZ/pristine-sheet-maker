import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import MainTabContentV2 from '@/components/match/MainTabContentV2';
import SetupScreen from '@/components/match/SetupScreen';
import MatchTimer from '@/components/MatchTimer';
import { useMatchState } from '@/hooks/useMatchState';
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Team, Player, Formation, AssignedPlayerForMatch, Statistics, BallTrackingPoint } from '@/types';
import { toast } from 'sonner';

type PlayerType = Player;

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const { user, userRole, assignedEventTypes } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTimerValue, setCurrentTimerValue] = useState(0);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [timerLastStartedAt, setTimerLastStartedAt] = useState<string | null>(null);
  const [assignedPlayerInfo, setAssignedPlayerInfo] = useState<{ playerId: number; playerTeamId: string; } | null>(null);

  const {
    events,
    statistics,
    timeSegments,
    playerStats,
    ballTrackingPoints,
    homeTeam,
    awayTeam,
    selectedTeam,
    selectedPlayer,
    setupComplete,
    ballTrackingMode,
    activeTab,
    teamPositions,
    recordEvent,
    setStatistics,
    setActiveTab,
    setSelectedTeam,
    setSelectedPlayer,
    undoLastEvent,
    updateTeams,
    completeSetup,
    toggleBallTrackingMode,
    addBallTrackingPoint,
    generateMatchId,
    setTeamPositions,
    setBallTrackingPoints,
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    togglePassTrackingMode,
  } = useMatchState();

  const {
    isConnected,
    participants,
    recordEvent: collaborativeRecordEvent,
  } = useMatchCollaboration({
    matchId: matchId || '',
    userId: user?.id || '',
    teamId: selectedTeam,
  });

  useEffect(() => {
    const fetchMatch = async () => {
      console.log('fetchMatch called with matchId:', matchId);
      if (!matchId) {
        setLoading(false);
        return;
      }

      try {
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        console.log('Raw matchData from Supabase:', matchData);
        if (error) {
          console.error('Supabase error fetching single match:', error);
          console.error(`Error fetching match with ID: ${matchId}:`, error);
          showToast({
            title: "Error",
            description: `Failed to load match data for ID: ${matchId}`,
            variant: "destructive",
          });
          navigate('/matches');
          return;
        }

        setMatch(matchData);

        // Type cast with proper validation
        const homeTeamPlayers = Array.isArray(matchData.home_team_players) ? 
          (matchData.home_team_players as unknown as Player[]) : [];
        const awayTeamPlayers = Array.isArray(matchData.away_team_players) ? 
          (matchData.away_team_players as unknown as Player[]) : [];

        const homeTeamData: Team = {
          id: 'home',
          name: matchData.home_team_name || 'Home Team',
          formation: (matchData.home_team_formation || '4-4-2') as Formation,
          players: homeTeamPlayers
        };

        const awayTeamData: Team = {
          id: 'away',
          name: matchData.away_team_name || 'Away Team',
          formation: (matchData.away_team_formation || '4-3-3') as Formation,
          players: awayTeamPlayers
        };

        console.log('Processed homeTeamData to be passed to updateTeams:', homeTeamData);
        console.log('Processed awayTeamData to be passed to updateTeams:', awayTeamData);
        updateTeams(homeTeamData, awayTeamData);

        const initialStats: Statistics = {
          home: {
            shots: 0,
            shotsOnTarget: 0,
            goals: 0,
            assists: 0,
            passesAttempted: 0,
            passesCompleted: 0,
            foulsCommitted: 0,
            yellowCards: 0,
            redCards: 0,
            corners: 0,
            offsides: 0,
            tackles: 0,
            interceptions: 0,
            crosses: 0,
            clearances: 0,
            blocks: 0,
            possession: 50,
            totalXg: 0,
            supportPasses: 0,
            offensivePasses: 0,
            ballsRecovered: 0,
            ballsLost: 0,
            ballsPlayed: 0,
            contacts: 0,
            freeKicks: 0,
            sixMeterViolations: 0,
            possessionMinutes: 0,
            possessionPercentage: 50,
            dangerousFootShots: 0,
            nonDangerousFootShots: 0,
            footShotsOnTarget: 0,
            footShotsOffTarget: 0,
            footShotsPostHits: 0,
            footShotsBlocked: 0,
            dangerousHeaderShots: 0,
            nonDangerousHeaderShots: 0,
            headerShotsOnTarget: 0,
            headerShotsOffTarget: 0,
            headerShotsPostHits: 0,
            headerShotsBlocked: 0,
            duelsWon: 0,
            duelsLost: 0,
            aerialDuelsWon: 0,
            aerialDuelsLost: 0,
            decisivePasses: 0,
            successfulCrosses: 0,
            successfulDribbles: 0,
            longPasses: 0,
            forwardPasses: 0,
            backwardPasses: 0,
            lateralPasses: 0,
          },
          away: {
            shots: 0,
            shotsOnTarget: 0,
            goals: 0,
            assists: 0,
            passesAttempted: 0,
            passesCompleted: 0,
            foulsCommitted: 0,
            yellowCards: 0,
            redCards: 0,
            corners: 0,
            offsides: 0,
            tackles: 0,
            interceptions: 0,
            crosses: 0,
            clearances: 0,
            blocks: 0,
            possession: 50,
            totalXg: 0,
            supportPasses: 0,
            offensivePasses: 0,
            ballsRecovered: 0,
            ballsLost: 0,
            ballsPlayed: 0,
            contacts: 0,
            freeKicks: 0,
            sixMeterViolations: 0,
            possessionMinutes: 0,
            possessionPercentage: 50,
            dangerousFootShots: 0,
            nonDangerousFootShots: 0,
            footShotsOnTarget: 0,
            footShotsOffTarget: 0,
            footShotsPostHits: 0,
            footShotsBlocked: 0,
            dangerousHeaderShots: 0,
            nonDangerousHeaderShots: 0,
            headerShotsOnTarget: 0,
            headerShotsOffTarget: 0,
            headerShotsPostHits: 0,
            headerShotsBlocked: 0,
            duelsWon: 0,
            duelsLost: 0,
            aerialDuelsWon: 0,
            aerialDuelsLost: 0,
            decisivePasses: 0,
            successfulCrosses: 0,
            successfulDribbles: 0,
            longPasses: 0,
            forwardPasses: 0,
            backwardPasses: 0,
            lateralPasses: 0,
          },
          possession: { home: 50, away: 50 },
          shots: { home: { onTarget: 0, offTarget: 0 }, away: { onTarget: 0, offTarget: 0 } },
          passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
          ballsPlayed: { home: 0, away: 0 },
          ballsLost: { home: 0, away: 0 },
          duels: { home: { won: 0, total: 0 }, away: { won: 0, total: 0 } },
          crosses: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
          corners: { home: 0, away: 0 },
          offsides: { home: 0, away: 0 },
          fouls: { home: 0, away: 0 },
        };
        
        console.log('Match statistics from DB:', matchData.match_statistics);
        console.log('Initial stats for fallback:', initialStats);
        
        if (matchData.match_statistics && typeof matchData.match_statistics === 'object') {
          // Type cast with validation
          const stats = matchData.match_statistics as unknown;
          if (typeof stats === 'object' && stats !== null) {
            setStatistics({ ...initialStats, ...(stats as Partial<Statistics>) });
          } else {
            setStatistics(initialStats);
          }
        } else {
          setStatistics(initialStats);
        }
        
        console.log('Ball tracking data from DB:', matchData.ball_tracking_data);
        if (Array.isArray(matchData.ball_tracking_data)) {
          // Type cast with validation
          const ballData = matchData.ball_tracking_data as unknown[];
          const validBallData: BallTrackingPoint[] = ballData
            .filter((item): item is any => item !== null && typeof item === 'object')
            .map(item => item as BallTrackingPoint);
          setBallTrackingPoints(validBallData);
        } else {
          setBallTrackingPoints([]);
        }
        
        console.log('Timer current value from DB:', matchData.timer_current_value);
        setCurrentTimerValue(matchData.timer_current_value || 0);
        console.log('Timer status from DB:', matchData.timer_status);
        
        const validTimerStatuses: Array<'stopped' | 'running' | 'paused'> = ['stopped', 'running', 'paused'];
        if (matchData.timer_status && validTimerStatuses.includes(matchData.timer_status as 'stopped' | 'running' | 'paused')) {
          setTimerStatus(matchData.timer_status as 'stopped' | 'running' | 'paused');
        } else {
          setTimerStatus('stopped');
        }
        
        console.log('Timer last started at from DB:', matchData.timer_last_started_at);
        setTimerLastStartedAt(matchData.timer_last_started_at || null);

        console.log('Condition for completeSetup (homeTeamData.players.length > 0 && awayTeamData.players.length > 0):', homeTeamData.players.length > 0 && awayTeamData.players.length > 0);
        if (homeTeamData.players.length > 0 && awayTeamData.players.length > 0) {
          console.log('Calling completeSetup with:', homeTeamData, awayTeamData);
          completeSetup(homeTeamData, awayTeamData);
        }

      } catch (error: any) {
        console.error('Error during fetchMatch data processing:', error.message, error.stack);
        console.error(`Error loading match with ID: ${matchId}:`, error);
        showToast({
          title: "Error",
          description: `Failed to load match with ID: ${matchId}`,
          variant: "destructive",
        });
        navigate('/matches');
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [matchId, navigate, showToast, updateTeams, completeSetup]);

  useEffect(() => {
    const fetchAssignedPlayer = async () => {
      if (matchId && user?.id) {
        try {
          const { data, error } = await supabase
            .from('match_tracker_assignments')
            .select('player_id, player_team_id')
            .eq('match_id', matchId)
            .eq('tracker_user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching player assignment:', error.message);
            setAssignedPlayerInfo(null);
          } else if (data && data.player_id !== null) {
            setAssignedPlayerInfo({ playerId: data.player_id, playerTeamId: data.player_team_id });
          } else {
            console.log('No player assigned to this tracker for this match.');
            setAssignedPlayerInfo(null);
          }
        } catch (e) {
          console.error('Exception while fetching player assignment:', e);
          setAssignedPlayerInfo(null);
        }
      }
    };

    fetchAssignedPlayer();
  }, [matchId, user?.id]);

  const assignedPlayerForMatchProp = useMemo((): AssignedPlayerForMatch | null => {
    if (!assignedPlayerInfo || (!homeTeam?.players && !awayTeam?.players)) {
      return null;
    }

    const { playerId, playerTeamId } = assignedPlayerInfo;
    let foundPlayer: PlayerType | undefined;
    let teamName = '';

    if (playerTeamId === 'home' && homeTeam?.players) {
      foundPlayer = homeTeam.players.find(p => Number(p.id) === playerId);
      teamName = homeTeam.name;
    } else if (playerTeamId === 'away' && awayTeam?.players) {
      foundPlayer = awayTeam.players.find(p => Number(p.id) === playerId);
      teamName = awayTeam.name;
    }

    if (foundPlayer) {
      return {
        id: foundPlayer.id,
        name: foundPlayer.name,
        teamId: playerTeamId as 'home' | 'away',
        teamName: teamName,
      };
    }
    return null;
  }, [assignedPlayerInfo, homeTeam, awayTeam]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-timer-updates-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const newMatchData = payload.new as any;
          
          if (newMatchData.timer_status !== undefined && newMatchData.timer_status !== timerStatus) {
            setTimerStatus(newMatchData.timer_status);
          }
          if (newMatchData.timer_current_value !== undefined && newMatchData.timer_current_value !== currentTimerValue) {
            setCurrentTimerValue(newMatchData.timer_current_value);
          }
          if (newMatchData.timer_last_started_at !== timerLastStartedAt) {
            setTimerLastStartedAt(newMatchData.timer_last_started_at);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`Subscribed to match timer updates for ${matchId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Subscription error for match ${matchId}: ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, timerStatus, currentTimerValue, timerLastStartedAt, setTimerStatus, setCurrentTimerValue, setTimerLastStartedAt]);

  const handleTimerToggle = async () => {
    if (!matchId) return;

    try {
      const newStatus = timerStatus === 'running' ? 'paused' : 'running';
      const now = new Date().toISOString();
      
      let newTimerValue = currentTimerValue;

      if (newStatus === 'paused' && timerLastStartedAt) {
        const elapsedSinceLastStart = (Date.now() - new Date(timerLastStartedAt).getTime()) / 1000;
        newTimerValue = currentTimerValue + elapsedSinceLastStart;
      }

      setTimerStatus(newStatus);
      if (newStatus === 'running') {
        setTimerLastStartedAt(now);
      } else {
        setCurrentTimerValue(newTimerValue);
        setTimerLastStartedAt(null);
      }

      toast.success(`Timer ${newStatus === 'running' ? 'started' : 'paused'}`);
    } catch (error) {
      console.error('Error toggling timer:', error);
      toast.error('Failed to update timer');
    }
  };

  const handleTimerReset = async () => {
    if (!matchId) return;

    try {
      setTimerStatus('stopped');
      setCurrentTimerValue(0);
      setTimerLastStartedAt(null);
      toast.success('Timer reset');
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast.error('Failed to reset timer');
    }
  };

  const handleRecordEvent = (eventType: any, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    if (matchId && user?.id) {
      collaborativeRecordEvent(eventType, playerId, teamId, coordinates);
    } else {
      recordEvent(eventType, playerId, teamId, coordinates);
    }
  };

  const handleSave = async () => {
    if (!matchId) {
      const newMatchId = generateMatchId();
      navigate(`/match/${newMatchId}`);
      return;
    }

    try {
      // Type cast to proper Json types
      const { error } = await supabase
        .from('matches')
        .update({
          home_team_players: JSON.parse(JSON.stringify(homeTeam.players)) as any,
          away_team_players: JSON.parse(JSON.stringify(awayTeam.players)) as any,
          home_team_formation: homeTeam.formation,
          away_team_formation: awayTeam.formation,
          match_statistics: JSON.parse(JSON.stringify(statistics)) as any,
          ball_tracking_data: JSON.parse(JSON.stringify(ballTrackingPoints)) as any,
          timer_current_value: currentTimerValue,
          timer_status: timerStatus,
          timer_last_started_at: timerLastStartedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) {
        console.error('Error saving match:', error);
        showToast({
          title: "Error",
          description: "Failed to save match data",
          variant: "destructive",
        });
      } else {
        showToast({
          title: "Success",
          description: "Match data saved successfully",
        });
      }
    } catch (error) {
      console.error('Error saving match:', error);
      showToast({
        title: "Error",
        description: "Failed to save match data",
        variant: "destructive",
      });
    }
  };

  const handlePlayerSelect = (player: any) => {
    setSelectedPlayer(player);
  };

  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    if (ballTrackingMode) {
      addBallTrackingPoint({
        x: coordinates.x,
        y: coordinates.y,
        timestamp: Date.now(),
        player_id: selectedPlayer?.id || 0,
        team: selectedTeam
      });
    }
  };

  const handleCompleteSetup = (homeTeamData: Team, awayTeamData: Team) => {
    updateTeams(homeTeamData, awayTeamData);
    completeSetup(homeTeamData, awayTeamData);
  };

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab as 'piano' | 'details' | 'video' | 'stats' | 'pitch' | 'timeline');
  };

  const handleGoBack = () => {
    navigate('/matches');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading match...</div>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-4">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Matches
          </Button>
        </div>
        <SetupScreen
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          updateTeams={updateTeams}
          completeSetup={handleCompleteSetup}
          matchId={matchId}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Go Back Button */}
      <div className="p-4">
        <Button
          onClick={handleGoBack}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matches
        </Button>
      </div>

      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
          <MatchHeader 
            homeTeam={homeTeam} 
            awayTeam={awayTeam}
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            setMode={toggleBallTrackingMode}
            handleToggleTracking={toggleBallTrackingMode}
            handleSave={handleSave}
          />
          
          <div className="p-4 border-b">
            <MatchTimer 
              dbTimerValue={currentTimerValue}
              timerStatus={timerStatus}
              timerLastStartedAt={timerLastStartedAt}
            />
            <div className="flex gap-2 mt-2">
              <Button 
                onClick={handleTimerToggle}
                variant={timerStatus === 'running' ? 'destructive' : 'default'}
                className="flex-1"
              >
                {timerStatus === 'running' ? 'Pause' : 'Start'}
              </Button>
              <Button 
                onClick={handleTimerReset}
                variant="outline"
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </div>
          
          <MatchSidebar
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            selectedPlayer={selectedPlayer}
            onPlayerSelect={handlePlayerSelect}
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            toggleBallTrackingMode={toggleBallTrackingMode}
            ballTrackingPoints={ballTrackingPoints}
            statistics={statistics}
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            teamPositions={teamPositions}
            setTeamPositions={setTeamPositions}
            isPassTrackingModeActive={isPassTrackingModeActive}
            potentialPasser={potentialPasser}
            ballPathHistory={ballPathHistory}
            togglePassTrackingMode={togglePassTrackingMode}
            isRunning={timerStatus === 'running'}
            dbTimerValue={currentTimerValue}
            timerStatus={timerStatus}
            timerLastStartedAt={timerLastStartedAt}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-auto">
            {/* Use MainTabContentV2 for better real-time event tracking */}
            <MainTabContentV2
              matchId={matchId || ''}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchAnalysis;
