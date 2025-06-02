
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
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        channelRef.current = supabase.channel(`match-${matchId}`);
        
        const status = await channelRef.current.subscribe();
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Broadcast initial active status
          broadcastStatus({
            status: 'active',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Failed to initialize channel:', error);
        setIsConnected(false);
      }
    };

    initializeChannel();

    return () => {
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
    };
  }, [matchId, userId]);

  const broadcastStatus = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId || !channelRef.current) return;

    const now = Date.now();
    
    // Throttle broadcasts to prevent spam (minimum 1 second between broadcasts)
    if (now - lastBroadcast < 1000) return;

    try {
      const payload = {
        type: 'tracker_status',
        user_id: userId,
        ...statusData,
        timestamp: now
      };

      await channelRef.current.send({
        type: 'broadcast',
        event: 'tracker_update',
        payload
      });

      setLastBroadcast(now);
    } catch (error) {
      console.error('Failed to broadcast status:', error);
    }
  }, [matchId, userId, lastBroadcast]);

  const cleanup = useCallback(() => {
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
