import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useMatchState } from '@/hooks/useMatchState';
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration';
import { Match, Player, Team, TimeSegmentStatistics, Statistics, TeamStats, MatchEvent, EventType } from '@/types';
import MatchHeader from '@/components/match/MatchHeader';
import SetupScreen from '@/components/match/SetupScreen';
import MainTabContent from '@/components/match/MainTabContent';

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupPhase, setSetupPhase] = useState<'teams' | 'positions'>('teams');
  const [homeTeam, setHomeTeam] = useState<Team>({
    id: 'home',
    name: '',
    players: [],
    formation: '4-4-2'
  });
  const [awayTeam, setAwayTeam] = useState<Team>({
    id: 'away', 
    name: '',
    players: [],
    formation: '4-3-3'
  });
  const [teamPositions, setTeamPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [statistics, setStatistics] = useState<Statistics>({
    home: { passes: 0, shots: 0, tackles: 0, fouls: 0, possession: 50 },
    away: { passes: 0, shots: 0, tackles: 0, fouls: 0, possession: 50 },
    possession: { home: 50, away: 50 },
    shots: {
      home: { onTarget: 0, offTarget: 0 },
      away: { onTarget: 0, offTarget: 0 }
    },
    passes: {
      home: { successful: 0, attempted: 0 },
      away: { successful: 0, attempted: 0 }
    },
    ballsPlayed: { home: 0, away: 0 },
    ballsLost: { home: 0, away: 0 },
    duels: {
      home: { won: 0, lost: 0, aerial: 0 },
      away: { won: 0, lost: 0, aerial: 0 }
    },
    cards: {
      home: { yellow: 0, red: 0 },
      away: { yellow: 0, red: 0 }
    },
    crosses: {
      home: { total: 0, successful: 0 },
      away: { total: 0, successful: 0 }
    },
    dribbles: {
      home: { successful: 0, attempted: 0 },
      away: { successful: 0, attempted: 0 }
    },
    corners: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    freeKicks: { home: 0, away: 0 }
  });

  const loadMatch = async () => {
    if (!matchId) return;

    try {
      const { data: matchData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      setMatch(matchData);
      
      // Load team data
      if (matchData.home_team_players && matchData.away_team_players) {
        setHomeTeam({
          id: 'home',
          name: matchData.home_team_name,
          players: matchData.home_team_players,
          formation: matchData.home_team_formation || '4-4-2'
        });
        
        setAwayTeam({
          id: 'away',
          name: matchData.away_team_name,
          players: matchData.away_team_players,
          formation: matchData.away_team_formation || '4-3-3'
        });

        setSetupComplete(true);
      }

      // Load match events
      const { data: events, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
      }

      // Process events into time segments
      const processedEvents = events?.map(event => ({
        id: event.id,
        type: event.event_type as EventType,
        timestamp: event.timestamp || 0,
        playerId: event.player_id || 0,
        teamId: (event.team as 'home' | 'away') || 'home',
        coordinates: event.coordinates as { x: number; y: number } || { x: 0, y: 0 },
        user_id: event.created_by
      })) || [];

      // Create time segments
      const segments: TimeSegmentStatistics[] = [
        {
          startTime: 0,
          endTime: 30,
          timeSegment: '0-30min',
          events: processedEvents.filter(e => e.timestamp >= 0 && e.timestamp <= 30 * 60)
        }
        // Add more segments as needed
      ];

    } catch (error) {
      console.error('Error loading match:', error);
      toast({
        title: "Error",
        description: "Failed to load match data",
        variant: "destructive",
      });
    }
  };

  const handleEventRecorded = async (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    if (!match) return;

    try {
      const newEvent: MatchEvent = {
        id: crypto.randomUUID(),
        type: eventType,
        timestamp: Date.now(),
        playerId,
        teamId,
        coordinates,
        status: 'confirmed'
      };

      // Save to database
      await supabase.from('match_events').insert({
        match_id: match.id,
        event_type: eventType,
        player_id: playerId,
        team: teamId,
        coordinates: JSON.stringify(coordinates),
        timestamp: newEvent.timestamp,
        created_by: user?.id || ''
      });

      // Update statistics
      updateStatistics(eventType, teamId);

    } catch (error) {
      console.error('Error recording event:', error);
      toast({
        title: "Error",
        description: "Failed to record event",
        variant: "destructive",
      });
    }
  };

  const updateStatistics = (eventType: EventType, teamId: 'home' | 'away') => {
    setStatistics(prev => {
      const newStats = { ...prev };
      
      // Update team-specific stats
      if (eventType === 'pass') {
        newStats[teamId].passes += 1;
        newStats.passes[teamId].attempted += 1;
      } else if (eventType === 'shot') {
        newStats[teamId].shots += 1;
        newStats.shots[teamId].offTarget += 1;
      }
      // Add more stat updates as needed
      
      return newStats;
    });
  };

  const handleTeamUpdate = async (teamId: 'home' | 'away', players: Player[]) => {
    if (!match) return;

    try {
      const updateData = teamId === 'home' 
        ? { home_team_players: players }
        : { away_team_players: players };

      await supabase
        .from('matches')
        .update(updateData)
        .eq('id', match.id);

      if (teamId === 'home') {
        setHomeTeam(prev => ({ ...prev, players }));
      } else {
        setAwayTeam(prev => ({ ...prev, players }));
      }

    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handlePositionUpdate = async (teamId: string, playerId: number, position: { x: number; y: number }) => {
    setTeamPositions(prev => ({
      ...prev,
      [playerId]: position
    }));
  };

  const handleSetupComplete = async () => {
    setSetupComplete(true);
  };

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  if (!match) {
    return <div>Loading...</div>;
  }

  if (!setupComplete) {
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
    <div className="container mx-auto p-4">
      <MatchHeader
        match={match}
        timerValue={0}
        timerStatus="stopped"
        onTimerStart={async () => {}}
        onTimerStop={async () => {}}
        onTimerReset={async () => {}}
        userRole={userRole}
      />
      
      <MainTabContent
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        selectedPlayer={selectedPlayer}
        onSelectPlayer={setSelectedPlayer}
        mode={mode}
        onModeChange={setMode}
        statistics={statistics}
        events={[]}
        ballTrackingPoints={[]}
        timeSegments={[]}
        teamPositions={teamPositions}
        onEventRecord={handleEventRecorded}
        onTrackBallMovement={() => {}}
      />
    </div>
  );
};

export default MatchAnalysis;
