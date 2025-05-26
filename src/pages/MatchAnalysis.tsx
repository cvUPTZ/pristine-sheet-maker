import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast as useShadcnToast } from '@/components/ui/use-toast'; // Aliased to avoid conflict
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import SetupScreen from '@/components/match/SetupScreen';
import MatchTimer from '@/components/MatchTimer';
import { useMatchState } from '@/hooks/useMatchState';
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Team, Player, Match, EventType, Statistics, BallTrackingPoint } from '@/types'; // Added missing types for clarity
import { toast as sonnerToast } from 'sonner'; // Aliased to avoid conflict

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast: showShadcnToast } = useShadcnToast(); // Using aliased toast
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTimerValue, setCurrentTimerValue] = useState(0);
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [timerLastStartedAt, setTimerLastStartedAt] = useState<string | null>(null);

  const {
    // events, // Not directly used in this component's render logic from useMatchState
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
    toggleBallTrackingMode, // This comes from useMatchState
    addBallTrackingPoint,
    generateMatchId,
    setTeamPositions,
    setBallTrackingPoints,
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    togglePassTrackingMode,
  } = useMatchState();

  // Initialize collaboration
  const {
    recordEvent: collaborativeRecordEvent,
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
      setLoading(true); // Ensure loading is true at the start
      try {
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (error) {
          console.error(`Error fetching match with ID: ${matchId}:`, error);
          showShadcnToast({
            title: "Error",
            description: `Failed to load match data for ID: ${matchId}`,
            variant: "destructive",
          });
          navigate('/matches');
          setLoading(false); // Ensure loading is set to false
          return;
        }

        if (!matchData) {
          showShadcnToast({
            title: "Not Found",
            description: `No match found with ID: ${matchId}.`,
            variant: "destructive",
          });
          navigate('/matches');
          setLoading(false);
          return;
        }
        
        // CORRECTED: Cast matchData.status and ensure overall object matches Match type for setMatch
        setMatch({
          ...matchData,
          // Ensure all properties of Match are present or cast if necessary
          id: matchData.id,
          created_at: matchData.created_at,
          updated_at: matchData.updated_at,
          created_by: matchData.created_by,
          home_team_name: matchData.home_team_name,
          away_team_name: matchData.away_team_name,
          home_team_formation: matchData.home_team_formation,
          away_team_formation: matchData.away_team_formation,
          home_team_players: matchData.home_team_players, // Assuming Supabase returns this as JSON/array
          away_team_players: matchData.away_team_players, // Assuming Supabase returns this as JSON/array
          status: matchData.status as Match['status'], // Explicit cast for status
          description: matchData.description,
          // Add other Match properties if they come from DB and are part of Match type
          // These are from your useMatchState, some might be derived or stored differently in DB
          match_statistics: (matchData as any).match_statistics,
          ball_tracking_data: (matchData as any).ball_tracking_data,
          timer_current_value: (matchData as any).timer_current_value,
          timer_status: (matchData as any).timer_status as Match['timer_status'],
          timer_last_started_at: (matchData as any).timer_last_started_at,
        } as Match);


        const homeTeamPlayers = Array.isArray((matchData as any).home_team_players)
          ? ((matchData as any).home_team_players as Player[])
          : [];
        const awayTeamPlayers = Array.isArray((matchData as any).away_team_players)
          ? ((matchData as any).away_team_players as Player[])
          : [];

        const homeTeamData: Team = {
          id: 'home', // Or derive from matchData if available (e.g., matchData.home_team_id)
          name: (matchData as any).home_team_name || 'Home Team',
          formation: (matchData as any).home_team_formation || '4-4-2',
          players: homeTeamPlayers
        };

        const awayTeamData: Team = {
          id: 'away', // Or derive from matchData
          name: (matchData as any).away_team_name || 'Away Team',
          formation: (matchData as any).away_team_formation || '4-3-3',
          players: awayTeamPlayers
        };

        updateTeams(homeTeamData, awayTeamData);

        const initialStats: Statistics = { // Default statistics structure
          possession: { home: 50, away: 50 },
          shots: { home: { onTarget: 0, offTarget: 0, total:0 }, away: { onTarget: 0, offTarget: 0, total:0 } },
          passes: { home: { successful: 0, attempted: 0, total:0 }, away: { successful: 0, attempted: 0, total:0 } },
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
        // CORRECTED: Accessing properties from matchData using 'as any' temporarily
        setStatistics((matchData as any).match_statistics || initialStats);
        setBallTrackingPoints((matchData as any).ball_tracking_data || []);
        setCurrentTimerValue((matchData as any).timer_current_value || 0);
        setTimerStatus((matchData as any).timer_status || 'stopped');
        setTimerLastStartedAt((matchData as any).timer_last_started_at || null);

        if (homeTeamData.players.length > 0 && awayTeamData.players.length > 0) {
          completeSetup(homeTeamData, awayTeamData);
        }

      } catch (error) {
        console.error(`Error loading match with ID: ${matchId}:`, error);
        showShadcnToast({
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, navigate, showShadcnToast]); // Removed state setters like updateTeams, completeSetup from deps as per react-hooks/exhaustive-deps common practice if they are stable references

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
  }, [matchId, timerStatus, currentTimerValue, timerLastStartedAt]);


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
      
      // Optimistically update local state
      setTimerStatus(newStatus);
      if (newStatus === 'running') {
        setTimerLastStartedAt(now);
      } else {
        setCurrentTimerValue(newTimerValue); // Set calculated value when pausing
        setTimerLastStartedAt(null);
      }
      
      // Update Supabase (could be moved to a separate function if complex)
      await supabase
        .from('matches')
        .update({
          timer_status: newStatus,
          timer_current_value: newTimerValue, // Send the calculated value when pausing
          timer_last_started_at: newStatus === 'running' ? now : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      sonnerToast.success(`Timer ${newStatus === 'running' ? 'started' : 'paused'}`);
    } catch (error) {
      console.error('Error toggling timer:', error);
      sonnerToast.error('Failed to update timer');
    }
  };

  const handleTimerReset = async () => {
    if (!matchId) return;

    try {
      // Optimistically update local state
      setTimerStatus('stopped');
      setCurrentTimerValue(0);
      setTimerLastStartedAt(null);

      // Update Supabase
       await supabase
        .from('matches')
        .update({
          timer_status: 'stopped',
          timer_current_value: 0,
          timer_last_started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);
      sonnerToast.success('Timer reset');
    } catch (error) {
      console.error('Error resetting timer:', error);
      sonnerToast.error('Failed to reset timer');
    }
  };

  const handleRecordEventWrapper = (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    if (matchId && user?.id) {
      collaborativeRecordEvent(eventType, playerId, teamId, coordinates);
    } else {
      // Fallback to local recording if no matchId or user (though matchId should exist here)
      recordEvent(eventType, playerId, teamId, coordinates);
    }
  };

  const handleSave = async () => {
    if (!matchId || !homeTeam || !awayTeam) { // Added homeTeam/awayTeam check
      const newMatchId = generateMatchId(); // This implies creating a new match
      // Logic for creating a new match if matchId is not present
      // This might involve navigating or setting up a new match structure
      // For now, let's assume saving is for an existing match
      console.warn("Attempted to save without a matchId or team data. New match flow would be needed.");
      showShadcnToast({
        title: "Cannot Save",
        description: "Match ID or team data is missing.",
        variant: "destructive",
      });
      // navigate(`/match/${newMatchId}`); // This would be for creating a new match
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team_players: homeTeam.players as any, // Cast to any if Supabase expects plain JSON
          away_team_players: awayTeam.players as any,
          home_team_formation: homeTeam.formation,
          away_team_formation: awayTeam.formation,
          match_statistics: statistics as any,
          ball_tracking_data: ballTrackingPoints as any,
          timer_current_value: currentTimerValue,
          timer_status: timerStatus,
          timer_last_started_at: timerLastStartedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (error) {
        console.error('Error saving match:', error);
        showShadcnToast({
          title: "Error",
          description: "Failed to save match data: " + error.message,
          variant: "destructive",
        });
      } else {
        showShadcnToast({
          title: "Success",
          description: "Match data saved successfully",
        });
      }
    } catch (error) {
      console.error('Error saving match:', error);
      showShadcnToast({
        title: "Error",
        description: "An unexpected error occurred while saving match data.",
        variant: "destructive",
      });
    }
  };

  const handlePlayerSelectWrapper = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handlePitchClickWrapper = (coordinates: { x: number; y: number }) => {
    if (ballTrackingMode && selectedPlayer) { // Ensure selectedPlayer for context if needed
      addBallTrackingPoint({
        x: coordinates.x,
        y: coordinates.y,
        timestamp: Date.now(),
        playerId: selectedPlayer.id, // Use selectedPlayer ID
        teamId: selectedTeam // selectedTeam is from useMatchState
      });
    } else if (ballTrackingMode) {
         addBallTrackingPoint({ // Fallback if no player selected, or general ball tracking
            x: coordinates.x,
            y: coordinates.y,
            timestamp: Date.now(),
            playerId: 0, // Or null, or a generic "ball" ID
            teamId: selectedTeam // Or determine contextually if not team-specific
      });
    }
  };

  // CORRECTED: Signature changed to match SetupScreen's prop type
  const handleCompleteSetupWrapper = () => {
    if (homeTeam && awayTeam) {
      // updateTeams(home, away); // This is already done by SetupScreen via its own updateTeams prop
      completeSetup(homeTeam, awayTeam); // Use homeTeam, awayTeam from useMatchState
    } else {
        showShadcnToast({
            title: "Setup Error",
            description: "Home or away team not available for setup completion.",
            variant: "destructive"
        });
    }
  };

  // CORRECTED: Signature for updateTeams prop for SetupScreen
  const handleUpdateTeamsWrapper = (teams: { home: Team; away: Team }) => {
    updateTeams(teams.home, teams.away);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading match...</div>
      </div>
    );
  }

  if (!setupComplete || !homeTeam || !awayTeam) { // Added !homeTeam || !awayTeam check
    return (
      <SetupScreen
        homeTeam={homeTeam} // Pass current homeTeam from state
        awayTeam={awayTeam} // Pass current awayTeam from state
        updateTeams={handleUpdateTeamsWrapper} // CORRECTED: Use wrapper
        completeSetup={handleCompleteSetupWrapper} // CORRECTED: Use wrapper
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
            setMode={toggleBallTrackingMode} // This toggles ballTrackingMode
            handleToggleTracking={toggleBallTrackingMode} // Usually for a dedicated button
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
                {timerStatus === 'running' ? 'Pause' : timerStatus === 'paused' ? 'Resume' : 'Start'}
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
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            // CORRECTED: Removed toggleBallTrackingMode as it's not a prop of MatchSidebar per error
            ballTrackingPoints={ballTrackingPoints}
            statistics={statistics}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            teamPositions={teamPositions}
            setTeamPositions={setTeamPositions}
            isPassTrackingModeActive={isPassTrackingModeActive}
            potentialPasser={potentialPasser}
            ballPathHistory={ballPathHistory}
            togglePassTrackingMode={togglePassTrackingMode} // This is the correct prop
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
              handlePlayerSelect={handlePlayerSelectWrapper}
              ballTrackingPoints={ballTrackingPoints}
              mode={ballTrackingMode ? 'tracking' : 'piano'}
              handlePitchClick={handlePitchClickWrapper}
              addBallTrackingPoint={addBallTrackingPoint}
              statistics={statistics}
              setStatistics={setStatistics}
              playerStats={playerStats}
              handleUndo={undoLastEvent}
              handleSave={handleSave}
              timeSegments={timeSegments}
              recordEvent={handleRecordEventWrapper}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchAnalysis;
