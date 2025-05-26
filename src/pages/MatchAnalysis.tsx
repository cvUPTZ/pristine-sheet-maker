
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
import { Team } from '@/types';
import { toast } from 'sonner';

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const { user, session } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);
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
    saveMatch,
    generatePlayerStatistics,
    generateTimeSegmentStatistics,
    setTeamPositions,
  } = useMatchState();

  // Initialize collaboration
  const {
    isConnected,
    participants,
    recordEvent: collaborativeRecordEvent,
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    togglePassTrackingMode,
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
          console.error('Error fetching match:', error);
          showToast({
            title: "Error",
            description: "Failed to load match data",
            variant: "destructive",
          });
          navigate('/matches');
          return;
        }

        setMatch(matchData);

        // Convert match data to Team objects
        const homeTeamData: Team = {
          id: 'home',
          name: matchData.home_team_name || 'Home Team',
          formation: matchData.home_team_formation || '4-4-2',
          players: matchData.home_team_players || []
        };

        const awayTeamData: Team = {
          id: 'away',
          name: matchData.away_team_name || 'Away Team',
          formation: matchData.away_team_formation || '4-3-3',
          players: matchData.away_team_players || []
        };

        updateTeams(homeTeamData, awayTeamData);

        // Initialize timer values
        setCurrentTimerValue(matchData.current_timer_value || 0);
        setTimerStatus(matchData.timer_status || 'stopped');
        setTimerLastStartedAt(matchData.timer_last_started_at);

        // If teams are set up, mark setup as complete
        if (homeTeamData.players.length > 0 && awayTeamData.players.length > 0) {
          completeSetup(homeTeamData, awayTeamData);
        }

      } catch (error) {
        console.error('Error loading match:', error);
        showToast({
          title: "Error",
          description: "Failed to load match",
          variant: "destructive",
        });
        navigate('/matches');
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [matchId, navigate, showToast, updateTeams, completeSetup]);

  // Handle timer updates
  const handleTimerToggle = async () => {
    if (!matchId) return;

    try {
      const newStatus = timerStatus === 'running' ? 'paused' : 'running';
      const now = new Date().toISOString();
      
      let updateData: any = {
        timer_status: newStatus,
      };

      if (newStatus === 'running') {
        updateData.timer_last_started_at = now;
      } else {
        // Calculate current timer value when pausing
        if (timerLastStartedAt) {
          const elapsedSinceLastStart = (Date.now() - new Date(timerLastStartedAt).getTime()) / 1000;
          updateData.current_timer_value = currentTimerValue + elapsedSinceLastStart;
        }
      }

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) {
        console.error('Error updating timer:', error);
        toast.error('Failed to update timer');
        return;
      }

      setTimerStatus(newStatus);
      if (newStatus === 'running') {
        setTimerLastStartedAt(now);
      } else {
        if (timerLastStartedAt) {
          const elapsedSinceLastStart = (Date.now() - new Date(timerLastStartedAt).getTime()) / 1000;
          setCurrentTimerValue(prev => prev + elapsedSinceLastStart);
        }
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
      const { error } = await supabase
        .from('matches')
        .update({
          timer_status: 'stopped',
          current_timer_value: 0,
          timer_last_started_at: null,
        })
        .eq('id', matchId);

      if (error) {
        console.error('Error resetting timer:', error);
        toast.error('Failed to reset timer');
        return;
      }

      setTimerStatus('stopped');
      setCurrentTimerValue(0);
      setTimerLastStartedAt(null);
      toast.success('Timer reset');
    } catch (error) {
      console.error('Error resetting timer:', error);
      toast.error('Failed to reset timer');
    }
  };

  const handleRecordEvent = (eventType: any, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }, relatedPlayerId?: number) => {
    if (matchId && user?.id) {
      collaborativeRecordEvent(eventType, playerId, teamId, coordinates, relatedPlayerId);
    } else {
      recordEvent(eventType, playerId, teamId, coordinates);
    }
  };

  const handleSave = async () => {
    if (!matchId) {
      const newMatchId = saveMatch();
      navigate(`/match/${newMatchId}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team_players: homeTeam.players,
          away_team_players: awayTeam.players,
          home_team_formation: homeTeam.formation,
          away_team_formation: awayTeam.formation,
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
          <MatchHeader homeTeam={homeTeam} awayTeam={awayTeam} />
          
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
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
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
              playerStats={generatePlayerStatistics()}
              handleUndo={undoLastEvent}
              handleSave={handleSave}
              timeSegments={generateTimeSegmentStatistics()}
              recordEvent={handleRecordEvent}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchAnalysis;
