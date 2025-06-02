
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
        // Clean up existing channel first
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Create new channel
        const channelName = `match-${matchId}`;
        channelRef.current = supabase.channel(channelName);
        
        // Subscribe to the channel
        const status = await channelRef.current.subscribe();
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Broadcast initial active status after a short delay to ensure channel is ready
          setTimeout(() => {
            broadcastStatus({
              status: 'active',
              timestamp: Date.now()
            });
          }, 500);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
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
      setIsConnected(false);
    };
  }, [matchId, userId]);

  const broadcastStatus = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId || !channelRef.current || !isConnected) return;

    const now = Date.now();
    
    // Throttle broadcasts to prevent spam (minimum 2 seconds between broadcasts)
    if (now - lastBroadcast < 2000) return;

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
      // Silent fail to prevent console spam
    }
  }, [matchId, userId, lastBroadcast, isConnected]);

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
