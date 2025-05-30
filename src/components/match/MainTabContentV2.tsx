
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Team, MatchEvent, EventType } from '@/types';
import TrackerPresenceIndicator from '@/components/admin/TrackerPresenceIndicator';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchEvents(); // Initial fetch

    const channel = supabase
      .channel(`match-events-for-${matchId}`) // Unique channel name per match
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('Realtime change to match_events received:', payload);
          // Re-fetch all events to update counts and the recent events list
          fetchEvents();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to match-events-for-${matchId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to match-events-for-${matchId}:`, err);
        }
      });

    return () => {
      console.log(`Unsubscribing from match-events-for-${matchId}`);
      supabase.removeChannel(channel);
    };
  }, [matchId]); // Keep matchId as a dependency. fetchEvents should be stable.

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
    return (
      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="text-center">
          <div className="text-sm sm:text-base">Loading events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-1 sm:p-2 md:p-0">
      {/* Tracker Presence Indicator */}
      <div className="w-full">
        <TrackerPresenceIndicator matchId={matchId} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <Card className="min-w-0">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {isMobile ? homeTeam.name.substring(0, 10) + (homeTeam.name.length > 10 ? '...' : '') : homeTeam.name} Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'home').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {isMobile ? awayTeam.name.substring(0, 10) + (awayTeam.name.length > 10 ? '...' : '') : awayTeam.name} Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'away').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card className="w-full">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-sm sm:text-base md:text-lg">Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-1 sm:space-y-2 max-h-48 sm:max-h-64 md:max-h-96 overflow-y-auto">
            {events.slice(-10).reverse().map((event) => (
              <div key={event.id} className="flex justify-between items-center p-2 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                    event.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium capitalize text-xs sm:text-sm md:text-base truncate">
                      {event.type}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">
                      {event.player_id ? `Player ${event.player_id}` : 'Team event'} - {Math.floor(event.timestamp / 60)}'
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEventDelete(event.id)}
                  className="text-red-600 hover:text-red-800 text-xs sm:text-sm px-2 py-1 flex-shrink-0 rounded hover:bg-red-50 transition-colors"
                >
                  {isMobile ? '×' : 'Delete'}
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-6 sm:py-8 md:py-12 text-gray-500">
                <p className="text-xs sm:text-sm md:text-base">No events recorded yet</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Events will appear here as they are tracked
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTabContentV2;
