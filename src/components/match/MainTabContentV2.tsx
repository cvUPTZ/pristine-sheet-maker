
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Team, MatchEvent, EventType } from '@/types';
import TrackerPresenceIndicator from '@/components/admin/TrackerPresenceIndicator';

interface MainTabContentV2Props {
  matchId: string;
  homeTeam: { name: string; formation?: string; };
  awayTeam: { name: string; formation?: string; };
  isTracking?: boolean;
  onEventRecord?: (eventType: any, player?: any, details?: any) => void;
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
        match_id: event.match_id,
        type: event.event_type as EventType,
        event_type: event.event_type,
        timestamp: event.timestamp || 0,
        team: event.team as 'home' | 'away',
        coordinates: event.coordinates ? event.coordinates as { x: number; y: number } : { x: 0, y: 0 },
        player_id: event.player_id,
        created_by: event.created_by
      }));

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="p-4">Loading events...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Tracker Presence Indicator */}
      <TrackerPresenceIndicator matchId={matchId} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium truncate">{homeTeam.name} Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'home').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium truncate">{awayTeam.name} Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'away').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
            {events.slice(-10).reverse().map((event) => (
              <div key={event.id} className="flex justify-between items-center p-2 md:p-3 border rounded-lg">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0 ${
                    event.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium capitalize text-sm md:text-base">{event.type}</div>
                    <div className="text-xs md:text-sm text-gray-600 truncate">
                      Player ID: {event.player_id || 'Unknown'} - {Math.floor(event.timestamp / 60)}'
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEventDelete(event.id)}
                  className="text-red-600 hover:text-red-800 text-xs md:text-sm px-2 py-1 flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <p className="text-sm md:text-base">No events recorded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTabContentV2;
