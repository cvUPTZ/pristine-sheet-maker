
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchEvent, EventType } from '@/types';

interface UseRealtimeMatchOptions {
  matchId: string;
  onEventReceived?: (event: MatchEvent) => void;
}

interface TrackerData {
  user_id: string;
  email: string;
  status: 'active' | 'inactive' | 'recording';
  last_activity: number;
  event_counts: Record<string, number>;
  battery_level?: number;
}

export const useRealtimeMatch = ({ matchId, onEventReceived }: UseRealtimeMatchOptions) => {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [trackers, setTrackers] = useState<TrackerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Transform database event to our MatchEvent type
  const transformEvent = useCallback((dbEvent: any): MatchEvent => ({
    id: dbEvent.id,
    match_id: dbEvent.match_id,
    type: dbEvent.event_type as EventType,
    event_type: dbEvent.event_type,
    timestamp: dbEvent.timestamp || 0,
    team: dbEvent.team as 'home' | 'away',
    coordinates: dbEvent.coordinates || { x: 0, y: 0 },
    player_id: dbEvent.player_id,
    created_by: dbEvent.created_by,
    event_data: dbEvent.event_data || {}
  }), []);

  // Fetch initial events
  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const transformedEvents = (data || []).map(transformEvent);
      setEvents(transformedEvents);
      
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId, transformEvent]);

  // Fetch initial tracker data
  const fetchTrackers = useCallback(async () => {
    try {
      const { data: assignments } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (assignments) {
        const trackerData: TrackerData[] = assignments
          .filter(assignment => assignment.tracker_user_id && assignment.tracker_user_id !== null)
          .map(assignment => ({
            user_id: assignment.tracker_user_id!,
            email: assignment.tracker_email || '',
            status: 'inactive' as const,
            last_activity: Date.now(),
            event_counts: {}
          }));
        setTrackers(trackerData);
      }
    } catch (error) {
      console.error('Error fetching trackers:', error);
    }
  }, [matchId]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newEvent = transformEvent(payload.new);
      
      setEvents(prev => {
        if (prev.find(e => e.id === newEvent.id)) return prev;
        const updated = [...prev, newEvent].sort((a, b) => a.timestamp - b.timestamp);
        return updated;
      });
      onEventReceived?.(newEvent);
    } else if (payload.eventType === 'DELETE') {
      setEvents(prev => prev.filter(e => e.id !== payload.old.id));
    } else if (payload.eventType === 'UPDATE') {
      const updatedEvent = transformEvent(payload.new);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  }, [transformEvent, onEventReceived]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!matchId) return;

    // Fetch initial data
    fetchEvents();
    fetchTrackers();

    // Set up match events subscription
    const eventsChannel = supabase
      .channel(`match_events_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`
        },
        handleRealtimeEvent
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(eventsChannel);
    };
  }, [matchId, fetchEvents, fetchTrackers, handleRealtimeEvent]);

  return {
    events,
    trackers,
    loading,
    isConnected,
    refetch: fetchEvents
  };
};
