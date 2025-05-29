
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Team, MatchEvent, EventType } from '@/types';

interface MainTabContentV2Props {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
}

const MainTabContentV2: React.FC<MainTabContentV2Props> = ({
  matchId,
  homeTeam,
  awayTeam,
}) => {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [matchId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const transformedEvents: MatchEvent[] = (data || []).map(event => ({
        id: event.id,
        type: event.event_type as EventType,
        timestamp: event.timestamp || 0,
        team: event.team as 'home' | 'away',
        coordinates: event.coordinates ? event.coordinates as { x: number; y: number } : undefined,
        player: event.player_id ? findPlayerById(event.player_id, event.team as 'home' | 'away') : undefined,
      }));

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const findPlayerById = (playerId: number, team: 'home' | 'away') => {
    const teamPlayers = team === 'home' ? homeTeam.players : awayTeam.players;
    return teamPlayers.find(player => player.id === playerId);
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const addEvent = async (eventData: Partial<MatchEvent>) => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .insert([{
          match_id: matchId,
          event_type: eventData.type as string,
          timestamp: eventData.timestamp,
          team: eventData.team,
          player_id: eventData.player?.id,
          coordinates: eventData.coordinates,
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        }])
        .select()
        .single();

      if (error) throw error;

      const newEvent: MatchEvent = {
        id: data.id,
        type: data.event_type as EventType,
        timestamp: data.timestamp || 0,
        team: data.team as 'home' | 'away',
        coordinates: data.coordinates as { x: number; y: number } | undefined,
        player: data.player_id ? findPlayerById(data.player_id, data.team as 'home' | 'away') : undefined,
      };

      setEvents(prev => [...prev, newEvent].sort((a, b) => a.timestamp - b.timestamp));
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{homeTeam.name} Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.team === 'home').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{awayTeam.name} Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.team === 'away').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.slice(-10).reverse().map((event) => (
              <div key={event.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    event.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium capitalize">{event.type}</div>
                    <div className="text-sm text-gray-600">
                      {event.player?.name || 'Unknown player'} - {Math.floor(event.timestamp / 60)}'
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEventDelete(event.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No events recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTabContentV2;
