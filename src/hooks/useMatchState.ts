
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Match, MatchEvent, Statistics, BallTrackingPoint, TimeSegmentStatistics, Player } from '@/types';

export const useMatchState = (matchId: string) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
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
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>([]);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>([]);
  const [timerValue, setTimerValue] = useState(0);
  const [timerStatus, setTimerStatus] = useState<'running' | 'stopped' | 'reset'>('stopped');
  const { toast } = useToast();

  // Load match data
  useEffect(() => {
    const loadMatch = async () => {
      if (!matchId) return;

      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (error) throw error;
        
        // Parse player data
        const parsedMatch = {
          ...data,
          home_team_players: typeof data.home_team_players === 'string' 
            ? JSON.parse(data.home_team_players) 
            : data.home_team_players || [],
          away_team_players: typeof data.away_team_players === 'string' 
            ? JSON.parse(data.away_team_players) 
            : data.away_team_players || []
        };
        
        setMatch(parsedMatch);

        // Load existing statistics
        if (data.match_statistics) {
          const stats = typeof data.match_statistics === 'string' 
            ? JSON.parse(data.match_statistics) 
            : data.match_statistics;
          setStatistics(stats);
        }

        // Load ball tracking data
        if (data.ball_tracking_data) {
          const ballData = typeof data.ball_tracking_data === 'string' 
            ? JSON.parse(data.ball_tracking_data) 
            : data.ball_tracking_data;
          setBallTrackingPoints(ballData);
        }

      } catch (error) {
        console.error('Error loading match:', error);
        toast({
          title: "Error",
          description: "Failed to load match data",
          variant: "destructive",
        });
      }
    };

    loadMatch();
  }, [matchId, toast]);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      if (!matchId) return;

      try {
        const { data, error } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId)
          .order('timestamp', { ascending: true });

        if (error) throw error;
        
        const formattedEvents: MatchEvent[] = data.map(event => ({
          id: event.id,
          type: event.event_type as any,
          timestamp: event.timestamp || 0,
          playerId: event.player_id || 0,
          teamId: (event.team as 'home' | 'away') || 'home',
          coordinates: typeof event.coordinates === 'string' 
            ? JSON.parse(event.coordinates) 
            : event.coordinates || { x: 0, y: 0 },
          status: 'confirmed'
        }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };

    loadEvents();
  }, [matchId]);

  const addEvent = async (newEvent: Omit<MatchEvent, 'id'>) => {
    try {
      const eventWithId: MatchEvent = {
        ...newEvent,
        id: crypto.randomUUID(),
        status: 'confirmed'
      };

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save to database
      const { error } = await supabase.from('match_events').insert({
        match_id: matchId,
        event_type: newEvent.type,
        timestamp: newEvent.timestamp,
        player_id: newEvent.playerId,
        team: newEvent.teamId,
        coordinates: JSON.stringify(newEvent.coordinates),
        created_by: user?.id || ''
      });

      if (error) throw error;

      // Update local state
      setEvents(prev => [...prev, eventWithId]);
      
      // Update statistics
      updateStatistics(newEvent.type, newEvent.teamId);

    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Error",
        description: "Failed to add event",
        variant: "destructive",
      });
    }
  };

  const updateStatistics = (eventType: string, teamId: 'home' | 'away') => {
    setStatistics(prev => {
      const newStats = { ...prev };
      
      // Update team-specific stats based on event type
      switch (eventType) {
        case 'pass':
          newStats[teamId].passes += 1;
          newStats.passes[teamId].attempted += 1;
          break;
        case 'shot':
          newStats[teamId].shots += 1;
          newStats.shots[teamId].offTarget += 1;
          break;
        case 'tackle':
          newStats[teamId].tackles += 1;
          break;
        case 'foul':
          newStats[teamId].fouls += 1;
          break;
        // Add more cases as needed
      }
      
      return newStats;
    });
  };

  const addBallTrackingPoint = (point: BallTrackingPoint) => {
    setBallTrackingPoints(prev => [...prev, point]);
  };

  const startTimer = async () => {
    setTimerStatus('running');
    
    if (match) {
      await supabase
        .from('matches')
        .update({ 
          timer_status: 'running',
          timer_last_started_at: new Date().toISOString()
        })
        .eq('id', match.id);
    }
  };

  const stopTimer = async () => {
    setTimerStatus('stopped');
    
    if (match) {
      await supabase
        .from('matches')
        .update({ 
          timer_status: 'stopped',
          timer_current_value: timerValue
        })
        .eq('id', match.id);
    }
  };

  const resetTimer = async () => {
    setTimerValue(0);
    setTimerStatus('reset');
    
    if (match) {
      await supabase
        .from('matches')
        .update({ 
          timer_status: 'reset',
          timer_current_value: 0
        })
        .eq('id', match.id);
    }
  };

  return {
    match,
    events,
    statistics,
    ballTrackingPoints,
    timeSegments,
    timerValue,
    timerStatus,
    addEvent,
    addBallTrackingPoint,
    startTimer,
    stopTimer,
    resetTimer,
    updateStatistics
  };
};
