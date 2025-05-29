
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/lib/database.types';
import { Clock, Users, Activity } from 'lucide-react';

interface MatchEvent {
  id: string;
  event_type: string;
  timestamp: number | null;
  player_id: number | null;
  team: string | null;
  coordinates: any;
  created_at: string;
  created_by: string;
  match_id: string;
}

const RealTimeMatchEvents: React.FC = () => {
  const [liveMatches, setLiveMatches] = useState<Tables<'matches'>[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMatches();
    
    // Subscribe to live match updates
    const matchesChannel = supabase
      .channel('live-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.live'
        },
        () => {
          fetchLiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedMatch) {
      fetchMatchEvents(selectedMatch);
      
      // Subscribe to events for selected match
      const eventsChannel = supabase
        .channel(`match-events-${selectedMatch}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_events',
            filter: `match_id=eq.${selectedMatch}`
          },
          (payload: any) => {
            console.log('Event update:', payload);
            if (payload.eventType === 'INSERT') {
              setEvents(prev => [payload.new as MatchEvent, ...prev]);
            }
          }
        )
        .subscribe((status: any, err: any) => {
          console.log('Events subscription status:', status, err);
        });

      return () => {
        supabase.removeChannel(eventsChannel);
      };
    }
  }, [selectedMatch]);

  const fetchLiveMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching live matches:', error);
      } else {
        setLiveMatches(data || []);
        if (data && data.length > 0 && !selectedMatch) {
          setSelectedMatch(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching live matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchEvents = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching match events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching match events:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading live matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Live Match Events</h2>
      </div>

      {liveMatches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Live Matches</h3>
            <p className="text-gray-600">There are currently no live matches to monitor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Live Matches List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Live Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => setSelectedMatch(match.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMatch === match.id
                      ? 'bg-blue-100 border-2 border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {match.home_team_name} vs {match.away_team_name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'No date'}
                  </div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Live
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Events Feed */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Events
                {selectedMatch && (
                  <span className="text-sm font-normal text-gray-600">
                    ({events.length} events)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMatch ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No events recorded yet</p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {event.event_type}
                          </Badge>
                          <div className="text-sm">
                            <div className="font-medium">
                              Player #{event.player_id || 'Unknown'} - {event.team || 'Unknown team'}
                            </div>
                            <div className="text-gray-600">
                              {event.timestamp ? `${Math.floor(event.timestamp / 60)}:${(event.timestamp % 60).toString().padStart(2, '0')}` : 'No time'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Select a match to view events</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RealTimeMatchEvents;
