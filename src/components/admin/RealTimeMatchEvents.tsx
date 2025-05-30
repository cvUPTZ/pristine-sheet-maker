
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Activity } from 'lucide-react';

interface MatchEvent {
  id: string;
  event_type: string;
  player_id: number | null;
  team: string | null;
  timestamp: number | null;
  created_at: string;
  created_by: string;
}

interface Match {
  id: string;
  name: string | null;
  status: string;
  home_team_name: string;
  away_team_name: string;
}

interface RealTimeMatchEventsProps {
  matchId?: string;
}

const RealTimeMatchEvents: React.FC<RealTimeMatchEventsProps> = ({ matchId }) => {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchEvents();
      subscribeToEvents();
    }
  }, [selectedMatchId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          name,
          status,
          home_team_name,
          away_team_name
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedMatches: Match[] = data || [];
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

  const fetchEvents = async () => {
    if (!selectedMatchId) return;
    
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', selectedMatchId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const subscribeToEvents = () => {
    if (!selectedMatchId) return;

    const subscription = supabase
      .channel(`match-events-${selectedMatchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${selectedMatchId}`,
        },
        (payload) => {
          setEvents(prev => [payload.new as MatchEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'goal': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-yellow-100 text-yellow-800';
      case 'foul': return 'bg-red-100 text-red-800';
      case 'pass': return 'bg-blue-100 text-blue-800';
      case 'shot': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4">Loading live events...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-time Match Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No live matches found</p>
        ) : (
          <div className="space-y-4">
            {/* Match Selector */}
            <div className="flex gap-2 flex-wrap">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatchId(match.id)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    selectedMatchId === match.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                </button>
              ))}
            </div>

            {/* Events List */}
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No events recorded yet</p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getEventColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Player {event.player_id || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Team: {event.team || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatTimestamp(event.timestamp)}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeMatchEvents;
