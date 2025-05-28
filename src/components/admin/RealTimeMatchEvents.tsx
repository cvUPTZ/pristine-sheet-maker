import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchEvent } from '@/types'; // Assuming MatchEvent is defined in @/types
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // For styling
import { ScrollArea } from '@/components/ui/scroll-area'; // For long lists
import { Badge } from '@/components/ui/badge'; // For event types

interface RealTimeMatchEventsProps {
  matchId: string;
}

const RealTimeMatchEvents: React.FC<RealTimeMatchEventsProps> = ({ matchId }) => {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // useEffect for Initial Fetch
  useEffect(() => {
    if (!matchId) {
      setEvents([]);
      setInitialLoading(false);
      return;
    }

    const fetchInitialEvents = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId)
          .order('timestamp', { ascending: false }); // Show newest first, or true for oldest

        if (fetchError) throw fetchError;
        setEvents(data || []);
      } catch (err: any) {
        console.error("Error fetching initial events:", err);
        setError(`Failed to fetch initial events: ${err.message}`);
        setEvents([]);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialEvents();
  }, [matchId]);

  // useEffect for Real-time Subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`realtime-match-events-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          console.log('New event received:', payload);
          const newEvent = payload.new as MatchEvent;
          // Add to state, ensuring no duplicates if necessary (though INSERT should be new)
          setEvents((prevEvents) => {
            if (prevEvents.find(e => e.id === newEvent.id)) {
              return prevEvents; // Already exists
            }
            return [newEvent, ...prevEvents]; // Add to top for newest first
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to match_events for match ${matchId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error on match_events for ${matchId}:`, err);
          setError(`Real-time subscription failed: ${err?.message || 'Unknown error'}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from match_events for match ${matchId}`);
    };
  }, [matchId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Match Events (Match ID: {matchId})</CardTitle>
      </CardHeader>
      <CardContent>
        {initialLoading && <p>Loading initial events...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!initialLoading && events.length === 0 && !error && <p>No events recorded for this match yet.</p>}
        {!initialLoading && events.length > 0 && (
          <ScrollArea className="h-72 w-full"> {/* Adjust height as needed */}
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="p-2 border rounded-md shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{event.type}</span>
                    <Badge variant="outline">{new Date(event.timestamp).toLocaleTimeString()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Player ID: {event.playerId}</p>
                  {event.coordinates && (
                    <p className="text-sm text-muted-foreground">
                      Coords: ({event.coordinates.x}, {event.coordinates.y})
                    </p>
                  )}
                  {/* Add more event details as needed */}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeMatchEvents;
