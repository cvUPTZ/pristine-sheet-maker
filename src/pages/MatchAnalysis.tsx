
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import SetupScreen from '@/components/match/SetupScreen';
import MatchTimer from '@/components/MatchTimer';
import { useMatchState } from '@/hooks/useMatchState';
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Team, Player } from '@/types';
import { toast } from 'sonner';

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const { user } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTimerValue, setCurrentTimerValue] = useState(0);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [timerLastStartedAt, setTimerLastStartedAt] = useState<string | null>(null);

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
    // saveMatch, // Renamed to generateMatchId
    // generatePlayerStatistics, // Removed, use playerStats directly
    // generateTimeSegmentStatistics, // Removed, use timeSegments directly
    generateMatchId, // Renamed from saveMatch
    setTeamPositions,
    setBallTrackingPoints, // Added for loading data
    // Pass tracking UI states to be sourced from useMatchState
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    togglePassTrackingMode,
  } = useMatchState();

  // Initialize collaboration
  const {
    isConnected,
    participants,
    recordEvent: collaborativeRecordEvent,
    // isPassTrackingModeActive, // Removed, will use from useMatchState
    // potentialPasser, // Removed, will use from useMatchState
    // ballPathHistory, // Removed, will use from useMatchState
    // togglePassTrackingMode, // Removed, will use from useMatchState
  } = useMatchCollaboration({
    matchId: matchId || '',
    userId: user?.id || '',
    teamId: selectedTeam,
  });

  useEffect(() => {
    const fetchMatch = async () => {
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

        if (error) {
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

        // Convert match data to Team objects with proper type checking
        const homeTeamPlayers = Array.isArray(matchData.home_team_players) ? matchData.home_team_players as Player[] : [];
        const awayTeamPlayers = Array.isArray(matchData.away_team_players) ? matchData.away_team_players as Player[] : [];

        const homeTeamData: Team = {
          id: 'home',
          name: matchData.home_team_name || 'Home Team',
          formation: matchData.home_team_formation || '4-4-2',
          players: homeTeamPlayers
        };

        const awayTeamData: Team = {
          id: 'away',
          name: matchData.away_team_name || 'Away Team',
          formation: matchData.away_team_formation || '4-3-3',
          players: awayTeamPlayers
        };

        updateTeams(homeTeamData, awayTeamData);

        // Initialize statistics, ball tracking, and timer values from matchData
        const initialStats = { // Default statistics structure
          possession: { home: 50, away: 50 },
          shots: { home: { onTarget: 0, offTarget: 0 }, away: { onTarget: 0, offTarget: 0 } },
          passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
          ballsPlayed: { home: 0, away: 0 },
          ballsLost: { home: 0, away: 0 },
          duels: { home: { won: 0, lost: 0, aerial: 0 }, away: { won: 0, lost: 0, aerial: 0 } },
          cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
          crosses: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
          dribbles: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
          corners: { home: 0, away: 0 },
          offsides: { home: 0, away: 0 },
          freeKicks: { home: 0, away: 0 },
        };
        setStatistics(matchData.match_statistics || initialStats);
        setBallTrackingPoints(matchData.ball_tracking_data || []);
        setCurrentTimerValue(matchData.timer_current_value || 0);
        setTimerStatus(matchData.timer_status || 'stopped');
        setTimerLastStartedAt(matchData.timer_last_started_at || null);

        // If teams are set up, mark setup as complete
        if (homeTeamData.players.length > 0 && awayTeamData.players.length > 0) {
          completeSetup(homeTeamData, awayTeamData);
        }

      } catch (error) {
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

  // Real-time subscription for timer updates
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
          const newMatchData = payload.new as any; // Cast to your Match type or any
          
          // Compare and update timer state to prevent unnecessary re-renders or loops
          if (newMatchData.timer_status !== undefined && newMatchData.timer_status !== timerStatus) {
            setTimerStatus(newMatchData.timer_status);
          }
          if (newMatchData.timer_current_value !== undefined && newMatchData.timer_current_value !== currentTimerValue) {
            setCurrentTimerValue(newMatchData.timer_current_value);
          }
          // Ensure null values are handled correctly for timer_last_started_at
          if (newMatchData.timer_last_started_at !== timerLastStartedAt) {
            setTimerLastStartedAt(newMatchData.timer_last_started_at);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`Subscribed to match timer updates for ${matchId}`); // Debug log removed
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Subscription error for match ${matchId}: ${status}`, err);
          // Optionally, display a toast or attempt to resubscribe
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, timerStatus, currentTimerValue, timerLastStartedAt, setTimerStatus, setCurrentTimerValue, setTimerLastStartedAt]);


  // Handle timer updates
  const handleTimerToggle = async () => {
    if (!matchId) return;

    try {
      const newStatus = timerStatus === 'running' ? 'paused' : 'running';
      const now = new Date().toISOString();
      
      let newTimerValue = currentTimerValue;

      if (newStatus === 'paused' && timerLastStartedAt) {
        // Calculate current timer value when pausing
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
      const newMatchId = generateMatchId(); // Updated from saveMatch
      navigate(`/match/${newMatchId}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team_players: JSON.parse(JSON.stringify(homeTeam.players)),
          away_team_players: JSON.parse(JSON.stringify(awayTeam.players)),
          home_team_formation: homeTeam.formation,
          away_team_formation: awayTeam.formation,
          match_statistics: statistics,
          ball_tracking_data: ballTrackingPoints,
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
        playerId: selectedPlayer?.id || 0,
        teamId: selectedTeam
      });
    }
  };

  const handleCompleteSetup = (homeTeamData: Team, awayTeamData: Team) => {
    updateTeams(homeTeamData, awayTeamData);
    completeSetup(homeTeamData, awayTeamData);
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
      <SetupScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        updateTeams={updateTeams}
        completeSetup={handleCompleteSetup}
        matchId={matchId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
            handlePlayerSelect={handlePlayerSelect}
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            toggleBallTrackingMode={toggleBallTrackingMode}
            ballTrackingPoints={ballTrackingPoints}
            statistics={statistics}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            teamPositions={teamPositions}
            setTeamPositions={setTeamPositions}
            isPassTrackingModeActive={isPassTrackingModeActive}
            potentialPasser={potentialPasser}
            ballPathHistory={ballPathHistory}
            togglePassTrackingMode={togglePassTrackingMode}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-auto">
            <MainTabContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              teamPositions={teamPositions}
              selectedPlayer={selectedPlayer}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              handlePlayerSelect={handlePlayerSelect}
              ballTrackingPoints={ballTrackingPoints}
              mode={ballTrackingMode ? 'tracking' : 'piano'}
              handlePitchClick={handlePitchClick}
              addBallTrackingPoint={addBallTrackingPoint}
              statistics={statistics}
              setStatistics={setStatistics}
              playerStats={playerStats} // Use memoized playerStats
              handleUndo={undoLastEvent}
              handleSave={handleSave}
              timeSegments={timeSegments} // Use memoized timeSegments
              recordEvent={handleRecordEvent}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchAnalysis;
