import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import SetupScreen from '@/components/match/SetupScreen';
import { Statistics, Team, TimeSegmentStatistics } from '@/types';

interface Match {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  timer_current_value: number | null;
  timer_status: string | null;
  home_team_players: any;
  away_team_players: any;
  home_team_formation: string | null;
  away_team_formation: string | null;
}

interface Player {
  id: number;
  name: string;
  position: { x: number; y: number };
}

const initialStatistics: Statistics = {
  home: {
    passes: 0,
    shots: 0,
    tackles: 0,
    fouls: 0,
    possession: 50,
  },
  away: {
    passes: 0,
    shots: 0,
    tackles: 0,
    fouls: 0,
    possession: 50,
  },
};

const MatchAnalysis = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, userRole, assignedEventTypes } = useAuth();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timerValue, setTimerValue] = useState(0);
  const [timerStatus, setTimerStatus] = useState<'running' | 'stopped' | 'reset'>('reset');
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [ballTrackingPoints, setBallTrackingPoints] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);
  const [mode, setMode] = useState<'select' | 'ball'>('select');
  const [statistics, setStatistics] = useState<Statistics>(initialStatistics);
  const [playerStats, setPlayerStats] = useState<any>({});
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>([]);
  const [activeTab, setActiveTab] = useState('pitch');
  const [setupPhase, setSetupPhase] = useState<'teams' | 'positions' | 'complete'>('teams');
  const [assignedPlayerForMatch, setAssignedPlayerForMatch] = useState<{ id: number; name: string; teamId: 'home' | 'away'; teamName: string } | null>(null);

  const fetchMatch = useCallback(async () => {
    if (!matchId) {
      setError('Match ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) {
        console.error('Error fetching match:', error);
        setError(error.message);
      } else if (data) {
        setMatch(data);
        setTimerValue(data.timer_current_value || 0);
        setTimerStatus(data.timer_status as 'running' | 'stopped' | 'reset' || 'reset');

        // Parse player data safely
        const parsePlayers = (players: any) => {
          try {
            return typeof players === 'string' ? JSON.parse(players) : players;
          } catch (e) {
            console.error("Error parsing player data:", e);
            return [];
          }
        };

        setHomeTeamPlayers(parsePlayers(data.home_team_players));
        setAwayTeamPlayers(parsePlayers(data.away_team_players));
      } else {
        setError('Match not found');
      }
    } catch (err: any) {
      console.error('Error fetching match:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  useEffect(() => {
    if (match && match.status !== 'scheduled') {
      setSetupPhase('complete');
    }
  }, [match]);

  const handleTimerStart = async () => {
    setTimerStatus('running');
    const startTime = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('matches')
        .update({ timer_status: 'running', timer_last_started_at: startTime })
        .eq('id', matchId);

      if (error) {
        console.error('Error updating timer status:', error);
        toast({ title: 'Error', description: 'Failed to start timer', variant: 'destructive' });
        setTimerStatus('stopped');
      }
    } catch (err: any) {
      console.error('Error updating timer status:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setTimerStatus('stopped');
    }
  };

  const handleTimerStop = async () => {
    setTimerStatus('stopped');

    try {
      const { error } = await supabase
        .from('matches')
        .update({ timer_status: 'stopped' })
        .eq('id', matchId);

      if (error) {
        console.error('Error updating timer status:', error);
        toast({ title: 'Error', description: 'Failed to stop timer', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Error updating timer status:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleTimerReset = async () => {
    setTimerValue(0);
    setTimerStatus('reset');

    try {
      const { error } = await supabase
        .from('matches')
        .update({ timer_current_value: 0, timer_status: 'reset' })
        .eq('id', matchId);

      if (error) {
        console.error('Error resetting timer:', error);
        toast({ title: 'Error', description: 'Failed to reset timer', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Error resetting timer:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (timerStatus === 'running') {
      intervalId = setInterval(() => {
        setTimerValue((prevTimerValue) => prevTimerValue + 1);
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [timerStatus]);

  useEffect(() => {
    const updateTimerValue = async () => {
      try {
        const { error } = await supabase
          .from('matches')
          .update({ timer_current_value: timerValue })
          .eq('id', matchId);

        if (error) {
          console.error('Error updating timer value:', error);
        }
      } catch (err: any) {
        console.error('Error updating timer value:', err);
      }
    };

    if (timerStatus === 'stopped') {
      updateTimerValue();
    }
  }, [timerValue, timerStatus, matchId]);

  const handlePlayerSelect = (playerId: number) => {
    setSelectedPlayer(playerId);
  };

  const handlePitchClick = (event: any) => {
    if (mode === 'ball') {
      const rect = event.target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      addBallTrackingPoint({ x, y });
    }
  };

  const addBallTrackingPoint = (point: { x: number; y: number }) => {
    const timestamp = Date.now();
    setBallTrackingPoints(prevPoints => [...prevPoints, { ...point, timestamp }]);
  };

  const handleSetupComplete = async () => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'scheduled' })
        .eq('id', matchId);

      if (error) {
        console.error('Error updating match status:', error);
        toast({ title: 'Error', description: 'Failed to update match status', variant: 'destructive' });
      } else {
        setSetupPhase('complete');
        toast({ title: 'Match setup complete', description: 'The match is now scheduled.' });
      }
    } catch (err: any) {
      console.error('Error updating match status:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleTeamUpdate = async (teamId: 'home' | 'away', players: Player[]) => {
    try {
      const playersJSON = JSON.stringify(players);
      const updateObject = teamId === 'home' ? { home_team_players: playersJSON } : { away_team_players: playersJSON };

      const { error } = await supabase
        .from('matches')
        .update(updateObject)
        .eq('id', matchId);

      if (error) {
        console.error(`Error updating ${teamId} team players:`, error);
        toast({ title: 'Error', description: `Failed to update ${teamId} team players`, variant: 'destructive' });
      } else {
        if (teamId === 'home') {
          setHomeTeamPlayers(players);
        } else {
          setAwayTeamPlayers(players);
        }
        toast({ title: 'Team updated', description: `Successfully updated ${teamId} team players.` });
      }
    } catch (err: any) {
      console.error(`Error updating ${teamId} team players:`, err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handlePositionUpdate = async (teamId: string, playerId: number, position: { x: number; y: number }) => {
    try {
      const players = teamId === 'home' ? [...homeTeamPlayers] : [...awayTeamPlayers];
      const playerIndex = players.findIndex(p => p.id === playerId);

      if (playerIndex === -1) {
        console.error(`Player with ID ${playerId} not found in ${teamId} team.`);
        toast({ title: 'Error', description: `Player not found in ${teamId} team.`, variant: 'destructive' });
        return;
      }

      players[playerIndex] = { ...players[playerIndex], position: position };

      const playersJSON = JSON.stringify(players);
      const updateObject = teamId === 'home' ? { home_team_players: playersJSON } : { away_team_players: playersJSON };

      const { error } = await supabase
        .from('matches')
        .update(updateObject)
        .eq('id', matchId);

      if (error) {
        console.error(`Error updating position for player ${playerId} in ${teamId}:`, error);
        toast({ title: 'Error', description: `Failed to update position for player ${playerId} in ${teamId}.`, variant: 'destructive' });
      } else {
        if (teamId === 'home') {
          setHomeTeamPlayers(players);
        } else {
          setAwayTeamPlayers(players);
        }
        toast({ title: 'Position updated', description: `Successfully updated position for player ${playerId} in ${teamId}.` });
      }
    } catch (err: any) {
      console.error(`Error updating position for player ${playerId} in ${teamId}:`, err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const recordEvent = async (eventType: string, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    if (!matchId || !user) {
      console.error("Match ID or user not available.");
      return;
    }

    try {
      const { data: player, error: playerError } = await supabase
        .from(teamId === 'home' ? 'home_team_players' : 'away_team_players')
        .select('name, team_id')
        .eq('id', playerId)
        .single();

      if (playerError) {
        console.error("Error fetching player details:", playerError);
        toast({ title: 'Error', description: 'Failed to fetch player details', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('match_events')
        .insert([
          {
            match_id: matchId,
            event_type: eventType,
            player_id: playerId,
            team: teamId,
            timestamp: timerValue,
            coordinates: coordinates,
            created_by: user.id
          }
        ]);

      if (error) {
        console.error("Error recording event:", error);
        toast({ title: 'Error', description: 'Failed to record event', variant: 'destructive' });
      } else {
        console.log(`${eventType} recorded for player ${playerId} of team ${teamId} at ${coordinates.x}, ${coordinates.y}`);
        fetchTimeSegments();
      }
    } catch (err: any) {
      console.error("Error recording event:", err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const fetchTimeSegments = useCallback(async () => {
    if (!matchId) return;

    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error("Error fetching match events:", error);
        toast({ title: 'Error', description: 'Failed to fetch match events', variant: 'destructive' });
        return;
      }

      const segments: TimeSegmentStatistics[] = [];
      let currentSegment: TimeSegmentStatistics = {
        startTime: 0,
        endTime: 60,
        events: []
      };

      if (data && Array.isArray(data)) {
        data.forEach(event => {
          if (event.timestamp >= currentSegment.startTime && event.timestamp <= currentSegment.endTime) {
            currentSegment.events?.push(event);
          } else {
            segments.push(currentSegment);
            currentSegment = {
              startTime: currentSegment.endTime,
              endTime: currentSegment.endTime + 60,
              events: [event]
            };
          }
        });
        segments.push(currentSegment);
      }

      setTimeSegments(segments);
    } catch (err: any) {
      console.error("Error processing match events:", err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [matchId, toast]);

  useEffect(() => {
    fetchTimeSegments();
  }, [fetchTimeSegments]);

  const handleUndo = () => {
    // Implement undo logic here
    console.log('Undo action');
  };

  const handleSave = () => {
    // Implement save logic here
    console.log('Save action');
  };

  const teamPositions = useMemo(() => {
    if (!match) return {};
    
    const positions: Record<string, Record<number, { x: number; y: number }>> = {};
    
    if (match.home_team_players) {
      try {
        const homePlayers = typeof match.home_team_players === 'string' 
          ? JSON.parse(match.home_team_players) 
          : match.home_team_players;
        
        positions.home = {};
        if (Array.isArray(homePlayers)) {
          homePlayers.forEach((player: any) => {
            if (player && typeof player.id === 'number' && player.position) {
              positions.home[player.id] = player.position;
            }
          });
        }
      } catch (error) {
        console.error('Error parsing home team players:', error);
        positions.home = {};
      }
    }
    
    if (match.away_team_players) {
      try {
        const awayPlayers = typeof match.away_team_players === 'string' 
          ? JSON.parse(match.away_team_players) 
          : match.away_team_players;
        
        positions.away = {};
        if (Array.isArray(awayPlayers)) {
          awayPlayers.forEach((player: any) => {
            if (player && typeof player.id === 'number' && player.position) {
              positions.away[player.id] = player.position;
            }
          });
        }
      } catch (error) {
        console.error('Error parsing away team players:', error);
        positions.away = {};
      }
    }
    
    return positions;
  }, [match]);

  useEffect(() => {
    const getAssignedPlayer = async () => {
      if (!matchId || !user) return;

      try {
        const { data: assignmentDataArray, error: assignmentError } = await supabase
          .from('match_tracker_assignments')
          .select('player_id, player_team_id')
          .eq('match_id', matchId)
          .eq('tracker_user_id', user.id);

        if (assignmentError) {
          console.error('Error fetching match tracker assignment:', assignmentError);
          setAssignedPlayerForMatch(null); // Ensure state is reset on error
          return;
        }

        const assignmentData = assignmentDataArray && assignmentDataArray.length > 0 ? assignmentDataArray[0] : null;

        if (assignmentData) {
          const team = assignmentData.player_team_id;
          const playerId = assignmentData.player_id;

          const players = team === 'home' ? homeTeamPlayers : awayTeamPlayers;
          const assignedPlayer = players.find(player => player.id === playerId);

          if (assignedPlayer) {
            setAssignedPlayerForMatch({
              id: assignedPlayer.id,
              name: assignedPlayer.name,
              teamId: team,
              teamName: team === 'home' ? match?.home_team_name : match?.away_team_name
            });
          } else {
            console.warn('Assigned player not found in team.');
            setAssignedPlayerForMatch(null);
          }
        } else {
          // No assignment found
          setAssignedPlayerForMatch(null);
        }
      } catch (error) {
        console.error('Error fetching assigned player:', error);
        setAssignedPlayerForMatch(null); // Ensure state is reset on catch
      }
    };

    getAssignedPlayer();
  }, [matchId, user, homeTeamPlayers, awayTeamPlayers, match]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">{error || 'Match not found'}</div>
      </div>
    );
  }

  const homeTeam: Team = {
    id: 'home',
    name: match.home_team_name,
    players: homeTeamPlayers,
    formation: match.home_team_formation || '4-4-2'
  };

  const awayTeam: Team = {
    id: 'away', 
    name: match.away_team_name,
    players: awayTeamPlayers,
    formation: match.away_team_formation || '4-3-3'
  };

  if (setupPhase !== 'complete') {
    return (
      <SetupScreen
        setupPhase={setupPhase}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSetupComplete={handleSetupComplete}
        onTeamUpdate={handleTeamUpdate}
        teamPositions={teamPositions}
        onPositionUpdate={handlePositionUpdate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MatchHeader
        match={match}
        timerValue={timerValue}
        timerStatus={timerStatus}
        onTimerStart={handleTimerStart}
        onTimerStop={handleTimerStop}
        onTimerReset={handleTimerReset}
        userRole={userRole}
      />
      
      <div className="flex">
        <MatchSidebar
          selectedTeam={selectedTeam}
          onTeamSelect={setSelectedTeam}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          selectedPlayer={selectedPlayer}
          onPlayerSelect={handlePlayerSelect}
          mode={mode}
          onModeChange={setMode}
          onUndo={handleUndo}
          onSave={handleSave}
          userRole={userRole}
        />
        
        <main className="flex-1 p-6">
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
            mode={mode}
            handlePitchClick={handlePitchClick}
            addBallTrackingPoint={addBallTrackingPoint}
            statistics={statistics}
            setStatistics={setStatistics}
            playerStats={playerStats}
            handleUndo={handleUndo}
            handleSave={handleSave}
            timeSegments={timeSegments}
            recordEvent={recordEvent}
            assignedPlayerForMatch={assignedPlayerForMatch}
            assignedEventTypes={assignedEventTypes || []}
            userRole={userRole}
            matchId={matchId || ''}
          />
        </main>
      </div>
    </div>
  );
};

export default MatchAnalysis;
