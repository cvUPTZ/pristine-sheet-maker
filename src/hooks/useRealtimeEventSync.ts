
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeEvent {
  id: string;
  match_id: string;
  event_type: string;
  player_id: number | null;
  team: string | null;
  timestamp: number;
  coordinates: { x: number; y: number } | null;
  created_by: string;
  created_at: string;
}

interface TrackerPresence {
  user_id: string;
  email?: string;
  online_at: string;
  last_event_type?: string;
  last_event_time?: number;
  status: 'online' | 'tracking' | 'offline';
}

interface UseRealtimeEventSyncProps {
  matchId: string;
  onEventReceived?: (event: RealtimeEvent) => void;
  onTrackerPresenceUpdate?: (trackers: TrackerPresence[]) => void;
}

export const useRealtimeEventSync = ({
  matchId,
  onEventReceived,
  onTrackerPresenceUpdate
}: UseRealtimeEventSyncProps) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedTrackers, setConnectedTrackers] = useState<TrackerPresence[]>([]);

  // Initialize real-time channel
  useEffect(() => {
    if (!matchId || !user?.id) return;

    const realtimeChannel = supabase.channel(`match:${matchId}:live-updates`);

    // Subscribe to match events
    realtimeChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'match_events',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        console.log('Real-time event received:', payload.new);
        if (onEventReceived && payload.new) {
          onEventReceived(payload.new as RealtimeEvent);
        }
        
        // Broadcast event confirmation
        realtimeChannel.send({
          type: 'broadcast',
          event: 'event_recorded',
          payload: {
            event_type: payload.new.event_type,
            created_by: payload.new.created_by,
            timestamp: Date.now()
          }
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = realtimeChannel.presenceState();
        const trackers = Object.values(presenceState).flat().map((presence: any) => ({
          user_id: presence.user_id || '',
          email: presence.email || '',
          online_at: presence.online_at || new Date().toISOString(),
          last_event_type: presence.last_event_type,
          last_event_time: presence.last_event_time,
          status: presence.status || 'online'
        })) as TrackerPresence[];
        setConnectedTrackers(trackers);
        if (onTrackerPresenceUpdate) {
          onTrackerPresenceUpdate(trackers);
        }
        console.log('Tracker presence synced:', trackers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Tracker joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Tracker left:', key, leftPresences);
      })
      .on('broadcast', { event: 'event_recorded' }, (payload) => {
        console.log('Event broadcast received:', payload);
        // Update tracker activity status
        setConnectedTrackers(prev => prev.map(tracker => 
          tracker.user_id === payload.payload.created_by
            ? {
                ...tracker,
                last_event_type: payload.payload.event_type,
                last_event_time: payload.payload.timestamp,
                status: 'tracking' as const
              }
            : tracker
        ));
      })
      .subscribe(async (status) => {
        console.log('Real-time subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await realtimeChannel.track({
            user_id: user.id,
            email: user.email,
            online_at: new Date().toISOString(),
            status: 'online'
          });
        }
      });

    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [matchId, user?.id, onEventReceived, onTrackerPresenceUpdate]);

  // Function to broadcast tracker activity
  const broadcastTrackerActivity = useCallback((eventType: string) => {
    if (channel && isConnected) {
      channel.send({
        type: 'broadcast',
        event: 'tracker_activity',
        payload: {
          user_id: user?.id,
          event_type: eventType,
          timestamp: Date.now()
        }
      });
    }
  }, [channel, isConnected, user?.id]);

  // Function to update tracker status
  const updateTrackerStatus = useCallback(async (status: 'online' | 'tracking' | 'offline') => {
    if (channel && isConnected) {
      await channel.track({
        user_id: user?.id,
        email: user?.email,
        online_at: new Date().toISOString(),
        status
      });
    }
  }, [channel, isConnected, user?.id, user?.email]);

  return {
    isConnected,
    connectedTrackers,
    broadcastTrackerActivity,
    updateTrackerStatus,
    channel
  };
};
