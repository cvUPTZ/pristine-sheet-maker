
import { useState, useCallback, useRef } from 'react';
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

  const broadcastStatus = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId) return;

    const now = Date.now();
    
    // Throttle broadcasts to prevent spam (minimum 1 second between broadcasts)
    if (now - lastBroadcast < 1000) return;

    try {
      if (!channelRef.current) {
        channelRef.current = supabase.channel(`match-${matchId}`);
        await channelRef.current.subscribe();
      }

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
      console.log('[TrackerStatus] Status broadcast successful:', payload);
    } catch (error) {
      console.error('[TrackerStatus] Failed to broadcast status:', error);
    }
  }, [matchId, userId, lastBroadcast]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return {
    broadcastStatus,
    isConnected,
    cleanup
  };
};
