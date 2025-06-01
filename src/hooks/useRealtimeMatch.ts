
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchEvent, EventType } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface UseRealtimeMatchOptions {
  matchId: string;
  onEventReceived?: (event: MatchEvent) => void;
}

interface TrackerStatus {
  user_id: string;
  email?: string;
  status: 'active' | 'inactive' | 'recording';
  last_activity: number;
  current_action?: string;
  event_counts?: Record<string, number>;
}

export const useRealtimeMatch = ({ matchId, onEventReceived }: UseRealtimeMatchOptions) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [trackers, setTrackers] = useState<TrackerStatus[]>([]);
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

  // Calculate event counts for each tracker
  const calculateEventCounts = useCallback((allEvents: MatchEvent[]) => {
    const eventCountsByTracker: Record<string, Record<string, number>> = {};
    
    allEvents.forEach(event => {
      if (event.created_by) {
        if (!eventCountsByTracker[event.created_by]) {
          eventCountsByTracker[event.created_by] = {};
        }
        const eventType = event.event_type || event.type;
        eventCountsByTracker[event.created_by][eventType] = 
          (eventCountsByTracker[event.created_by][eventType] || 0) + 1;
      }
    });
    
    return eventCountsByTracker;
  }, []);

  // Fetch initial events
  const fetchEvents = useCallback(async () => {
    console.log('[useRealtimeMatch] Fetching events for match:', matchId);
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const transformedEvents = (data || []).map(transformEvent);
      setEvents(transformedEvents);
      
      // Update tracker event counts
      const eventCounts = calculateEventCounts(transformedEvents);
      setTrackers(prev => prev.map(tracker => ({
        ...tracker,
        event_counts: eventCounts[tracker.user_id] || {}
      })));
      
      console.log('[useRealtimeMatch] Loaded events:', transformedEvents.length);
    } catch (error) {
      console.error('[useRealtimeMatch] Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId, transformEvent, calculateEventCounts]);

  // Fetch tracker assignments and initialize their status
  const fetchTrackers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (data) {
        const trackerMap = new Map<string, TrackerStatus>();
        data.forEach(assignment => {
          if (assignment.tracker_user_id && !trackerMap.has(assignment.tracker_user_id)) {
            trackerMap.set(assignment.tracker_user_id, {
              user_id: assignment.tracker_user_id,
              email: assignment.tracker_email || undefined,
              status: 'inactive',
              last_activity: Date.now(),
              event_counts: {}
            });
          }
        });
        
        const initialTrackers = Array.from(trackerMap.values());
        setTrackers(initialTrackers);
        console.log('[useRealtimeMatch] Initial trackers loaded:', initialTrackers);
      }
    } catch (error) {
      console.error('[useRealtimeMatch] Error fetching trackers:', error);
    }
  }, [matchId]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log('[useRealtimeMatch] Real-time event:', payload);

    if (payload.eventType === 'INSERT') {
      const newEvent = transformEvent(payload.new);
      
      // Update tracker status to 'recording' when they create an event
      if (newEvent.created_by) {
        setTrackers(prev => prev.map(t => 
          t.user_id === newEvent.created_by 
            ? { 
                ...t, 
                status: 'recording', 
                last_activity: Date.now(), 
                current_action: `recording_${newEvent.type}`,
                event_counts: {
                  ...t.event_counts,
                  [newEvent.event_type]: (t.event_counts?.[newEvent.event_type] || 0) + 1
                }
              }
            : t
        ));
        
        // Reset to active after 3 seconds
        setTimeout(() => {
          setTrackers(prev => prev.map(t => 
            t.user_id === newEvent.created_by 
              ? { ...t, status: 'active', current_action: undefined }
              : t
          ));
        }, 3000);
      }
      
      setEvents(prev => {
        if (prev.find(e => e.id === newEvent.id)) return prev;
        const updated = [...prev, newEvent].sort((a, b) => a.timestamp - b.timestamp);
        console.log('[useRealtimeMatch] Event added, total:', updated.length);
        return updated;
      });
      onEventReceived?.(newEvent);
    } else if (payload.eventType === 'DELETE') {
      const deletedEvent = transformEvent(payload.old);
      
      // Update tracker event counts when event is deleted
      if (deletedEvent.created_by) {
        setTrackers(prev => prev.map(t => 
          t.user_id === deletedEvent.created_by 
            ? { 
                ...t,
                event_counts: {
                  ...t.event_counts,
                  [deletedEvent.event_type]: Math.max(0, (t.event_counts?.[deletedEvent.event_type] || 0) - 1)
                }
              }
            : t
        ));
      }
      
      setEvents(prev => prev.filter(e => e.id !== payload.old.id));
    } else if (payload.eventType === 'UPDATE') {
      const updatedEvent = transformEvent(payload.new);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  }, [transformEvent, onEventReceived]);

  // Handle tracker presence updates
  const handleTrackerUpdate = useCallback((payload: any) => {
    console.log('[useRealtimeMatch] Tracker update received:', payload);
    
    if (payload.type === 'tracker_status') {
      setTrackers(prev => {
        const updated = prev.map(t => 
          t.user_id === payload.user_id 
            ? { 
                ...t, 
                status: payload.status, 
                last_activity: payload.timestamp || Date.now(), 
                current_action: payload.action 
              }
            : t
        );
        
        // If tracker not found in current list, add them (for dynamic joining)
        if (!prev.find(t => t.user_id === payload.user_id)) {
          updated.push({
            user_id: payload.user_id,
            status: payload.status,
            last_activity: payload.timestamp || Date.now(),
            current_action: payload.action,
            event_counts: {}
          });
        }
        
        console.log('[useRealtimeMatch] Trackers updated:', updated);
        return updated;
      });
    }
  }, []);

  // Broadcast tracker status
  const broadcastStatus = useCallback((status: 'active' | 'inactive' | 'recording', action?: string) => {
    if (!user?.id) return;
    
    console.log('[useRealtimeMatch] Broadcasting status:', { status, action, userId: user.id });
    
    const channel = supabase.channel(`match-${matchId}`);
    channel.send({
      type: 'broadcast',
      event: 'tracker_update',
      payload: {
        type: 'tracker_status',
        user_id: user.id,
        status,
        action,
        timestamp: Date.now()
      }
    }).then(() => {
      console.log('[useRealtimeMatch] Status broadcast sent successfully');
    }).catch((error) => {
      console.error('[useRealtimeMatch] Error broadcasting status:', error);
    });
  }, [matchId, user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!matchId) return;

    console.log('[useRealtimeMatch] Setting up subscriptions for match:', matchId);

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
        console.log('[useRealtimeMatch] Events subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Set up tracker presence subscription
    const trackerChannel = supabase
      .channel(`match_${matchId}`)
      .on('broadcast', { event: 'tracker_update' }, handleTrackerUpdate)
      .subscribe((status) => {
        console.log('[useRealtimeMatch] Tracker subscription status:', status);
      });

    // Broadcast that we're online
    if (user?.id) {
      setTimeout(() => {
        broadcastStatus('active');
      }, 1000); // Delay to ensure channel is ready
    }

    return () => {
      console.log('[useRealtimeMatch] Cleaning up subscriptions');
      if (user?.id) {
        broadcastStatus('inactive');
      }
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(trackerChannel);
    };
  }, [matchId, fetchEvents, fetchTrackers, handleRealtimeEvent, handleTrackerUpdate, broadcastStatus, user?.id]);

  return {
    events,
    trackers,
    loading,
    isConnected,
    broadcastStatus,
    refetch: fetchEvents
  };
};
