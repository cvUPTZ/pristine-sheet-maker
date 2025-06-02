
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

  // Initialize channel and connection
  useEffect(() => {
    if (!userId || !matchId) return;

    const initializeChannel = async () => {
      try {
        console.log('TrackerStatus: Initializing channel for match:', matchId, 'user:', userId);
        
        // Clean up existing channel first
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Use the same channel name as useRealtimeMatch for consistency
        const channelName = `match-${matchId}`;
        channelRef.current = supabase.channel(channelName);
        
        // Subscribe to the channel
        const status = await channelRef.current.subscribe();
        console.log('TrackerStatus: Channel subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('TrackerStatus: Connected successfully');
          
          // Broadcast initial active status after a short delay to ensure channel is ready
          setTimeout(() => {
            console.log('TrackerStatus: Broadcasting initial active status');
            broadcastStatus({
              status: 'active',
              timestamp: Date.now()
            });
          }, 1000);
        } else {
          setIsConnected(false);
          console.log('TrackerStatus: Failed to connect');
        }
      } catch (error) {
        console.error('TrackerStatus: Error initializing channel:', error);
        setIsConnected(false);
      }
    };

    initializeChannel();

    return () => {
      console.log('TrackerStatus: Cleaning up channel');
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
          // Ignore errors during cleanup
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [matchId, userId]);

  const broadcastStatus = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId || !channelRef.current) {
      console.log('TrackerStatus: Cannot broadcast - missing requirements', { userId, matchId, hasChannel: !!channelRef.current });
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

      await channelRef.current.send({
        type: 'broadcast',
        event: 'tracker_update',
        payload
      });

      setLastBroadcast(now);
      console.log('TrackerStatus: Status broadcasted successfully');
    } catch (error) {
      console.error('TrackerStatus: Failed to broadcast status:', error);
    }
  }, [matchId, userId, lastBroadcast]);

  const cleanup = useCallback(() => {
    console.log('TrackerStatus: Manual cleanup called');
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
        // Ignore errors during cleanup
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, [userId]);

  return {
    broadcastStatus,
    isConnected,
    cleanup
  };
};
