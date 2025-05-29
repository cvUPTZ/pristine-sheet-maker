
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Match {
  id: string;
  name: string | null;
  status: string;
  match_date: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_formation: string | null;
  away_team_formation: string | null;
  home_team_score: number | null;
  away_team_score: number | null;
  created_at: string;
  updated_at: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  referee: string | null;
  weather_conditions: string | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  pitch_conditions: string | null;
  attendance: number | null;
  competition: string | null;
  ball_tracking_data: any;
}

interface MatchRosterPlayer {
  id: string;
  player_name: string;
  jersey_number: number;
  team_context: 'home' | 'away';
}

interface RealTimeMatchEventsProps {
  matchId?: string;
}

const RealTimeMatchEvents: React.FC<RealTimeMatchEventsProps> = ({ matchId }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId || '');
  const [roster, setRoster] = useState<Map<string, MatchRosterPlayer>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchMatchRoster();
      fetchEvents();
      subscribeToEvents();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [selectedMatchId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type safe mapping to ensure created_at is never null
      const typedMatches: Match[] = (data || []).map(match => ({
        ...match,
        created_at: match.created_at || new Date().toISOString()
      }));

      setMatches(typedMatches);
      
      if (!selectedMatchId && typedMatches.length > 0) {
        setSelectedMatchId(typedMatches[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchRoster = async () => {
    if (!selectedMatchId) return;

    try {
      // Since match_rosters table doesn't exist, we'll create mock roster data
      const mockRoster = new Map<string, MatchRosterPlayer>();
      
      // Add some mock players for demonstration
      for (let i = 1; i <= 11; i++) {
        mockRoster.set(`home_${i}`, {
          id: `home_${i}`,
          player_name: `Home Player ${i}`,
          jersey_number: i,
          team_context: 'home'
        });
        
        mockRoster.set(`away_${i}`, {
          id: `away_${i}`,
          player_name: `Away Player ${i}`,
          jersey_number: i,
          team_context: 'away'
        });
      }
      
      setRoster(mockRoster);
    } catch (error) {
      console.error('Error fetching match roster:', error);
    }
  };

  const fetchEvents = async () => {
    if (!selectedMatchId) return;

    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', selectedMatchId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const subscribeToEvents = () => {
    const channel = supabase
      .channel(`match_events_${selectedMatchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${selectedMatchId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setEvents(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe((status: any, err: any) => {
        if (err) {
          console.error('Subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getPlayerInfo = (playerId: string) => {
    return roster.get(playerId) || { player_name: 'Unknown Player', jersey_number: 0, team_context: 'home' };
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const handleMatchSelect = (matchId: string) => {
    setSelectedMatchId(matchId);
    setEvents([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading real-time events...</p>
        </CardContent>
      </Card>
    );
  }

  if (!matches.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>No matches available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Match Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Match</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedMatchId}
            onChange={(e) => handleMatchSelect(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.name || `${match.home_team_name} vs ${match.away_team_name}`} - {match.status}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Real-time Events */}
      <Card>
        <CardHeader>
          <CardTitle>Live Match Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No events recorded yet</p>
            ) : (
              events.map((event, index) => {
                const playerInfo = getPlayerInfo(event.player_id || '');
                return (
                  <div key={index} className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{event.event_type}</Badge>
                        <Badge variant={playerInfo.team_context === 'home' ? 'default' : 'secondary'}>
                          {playerInfo.team_context === 'home' ? 'Home' : 'Away'}
                        </Badge>
                      </div>
                      <p className="font-medium">
                        {playerInfo.player_name} #{playerInfo.jersey_number}
                      </p>
                      {event.coordinates && (
                        <p className="text-sm text-gray-600">
                          Position: ({Math.round(event.coordinates.x)}, {Math.round(event.coordinates.y)})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeMatchEvents;
