
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrackerStatusData {
  status: 'active' | 'inactive' | 'recording';
  action?: string;
  timestamp: number;
  battery_level?: number;
  network_quality?: 'excellent' | 'good' | 'poor';
}

export const useTrackerStatus = (matchId: string, userId: string) => {
  const [lastBroadcast, setLastBroadcast] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize channel and connection
  useEffect(() => {
    if (!userId || !matchId) {
      console.log('TrackerStatus: Missing userId or matchId', { userId, matchId });
      return;
    }

    const initializeChannel = async () => {
      try {
        console.log('TrackerStatus: Initializing channel for match:', matchId, 'user:', userId);
        
        // Clean up existing channel first
        if (channelRef.current) {
          console.log('TrackerStatus: Cleaning up existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          setIsConnected(false);
        }

        // Clear any existing timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // Use consistent channel name with useRealtimeMatch
        const channelName = `match-${matchId}`;
        console.log('TrackerStatus: Creating channel with name:', channelName);
        
        channelRef.current = supabase.channel(channelName, {
          config: {
            broadcast: { self: false }, // Don't receive our own broadcasts
            presence: { key: userId }
          }
        });
        
        // Subscribe to the channel
        console.log('TrackerStatus: Subscribing to channel...');
        channelRef.current.subscribe(async (status: string, err?: Error) => {
          console.log('TrackerStatus: Subscription status:', status, 'error:', err);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log('TrackerStatus: Successfully connected to channel');
            
            // Broadcast initial status immediately after connection
            setTimeout(() => {
              console.log('TrackerStatus: Broadcasting initial active status');
              broadcastStatusImmediate({
                status: 'active',
                timestamp: Date.now()
              });
            }, 100);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            console.error('TrackerStatus: Channel error:', status, err);
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            console.log('TrackerStatus: Channel closed');
          }
        });
        
      } catch (error) {
        console.error('TrackerStatus: Error initializing channel:', error);
        setIsConnected(false);
      }
    };

    initializeChannel();

    return () => {
      console.log('TrackerStatus: Cleaning up channel on unmount');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (channelRef.current) {
        // Broadcast inactive status before cleanup
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'tracker_update',
            payload: {
              type: 'tracker_status',
              user_id: userId,
              status: 'inactive',
              timestamp: Date.now()
            }
          });
        } catch (error) {
          console.log('TrackerStatus: Error broadcasting inactive status during cleanup:', error);
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [matchId, userId]);

  // Immediate broadcast function (no throttling)
  const broadcastStatusImmediate = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId) {
      console.log('TrackerStatus: Cannot broadcast - missing requirements', { userId, matchId });
      return;
    }

    if (!channelRef.current) {
      console.log('TrackerStatus: Cannot broadcast - no channel');
      return;
    }

    try {
      const payload = {
        type: 'tracker_status',
        user_id: userId,
        ...statusData,
        timestamp: Date.now()
      };

      console.log('TrackerStatus: Broadcasting status immediately:', payload);

      const result = await channelRef.current.send({
        type: 'broadcast',
        event: 'tracker_update',
        payload
      });

      console.log('TrackerStatus: Immediate broadcast result:', result);
    } catch (error) {
      console.error('TrackerStatus: Failed to broadcast status immediately:', error);
    }
  }, [matchId, userId]);

  // Throttled broadcast function
  const broadcastStatus = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId) {
      console.log('TrackerStatus: Cannot broadcast - missing requirements', { userId, matchId });
      return;
    }

    if (!channelRef.current) {
      console.log('TrackerStatus: Cannot broadcast - no channel');
      return;
    }

    const now = Date.now();
    
    // Throttle broadcasts to prevent spam (minimum 5 seconds between broadcasts)
    if (now - lastBroadcast < 5000) {
      console.log('TrackerStatus: Broadcast throttled');
      return;
    }

    try {
      const payload = {
        type: 'tracker_status',
        user_id: userId,
        ...statusData,
        timestamp: now
      };

      console.log('TrackerStatus: Broadcasting status:', payload);

      const result = await channelRef.current.send({
        type: 'broadcast',
        event: 'tracker_update',
        payload
      });

      console.log('TrackerStatus: Broadcast result:', result);
      setLastBroadcast(now);
    } catch (error) {
      console.error('TrackerStatus: Failed to broadcast status:', error);
    }
  }, [matchId, userId, lastBroadcast]);

  const cleanup = useCallback(() => {
    console.log('TrackerStatus: Manual cleanup called');
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'tracker_update',
          payload: {
            type: 'tracker_status',
            user_id: userId,
            status: 'inactive',
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.log('TrackerStatus: Error during manual cleanup:', error);
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, [userId]);

  return {
    broadcastStatus,
    broadcastStatusImmediate,
    isConnected,
    cleanup
  };
};
