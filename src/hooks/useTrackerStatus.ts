
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

        // Use the exact same channel name as useRealtimeMatch
        const channelName = `match-${matchId}`;
        console.log('TrackerStatus: Creating channel with name:', channelName);
        
        channelRef.current = supabase.channel(channelName, {
          config: {
            broadcast: { self: true }
          }
        });
        
        // Subscribe to the channel with detailed logging
        console.log('TrackerStatus: Subscribing to channel...');
        const status = await channelRef.current.subscribe((status: string, err?: Error) => {
          console.log('TrackerStatus: Subscription callback - status:', status, 'error:', err);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log('TrackerStatus: Successfully connected to channel');
            
            // Broadcast initial active status after connection is confirmed
            setTimeout(() => {
              console.log('TrackerStatus: Broadcasting initial active status');
              broadcastStatus({
                status: 'active',
                timestamp: Date.now()
              });
            }, 500);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            console.error('TrackerStatus: Channel error:', status, err);
          } else {
            console.log('TrackerStatus: Channel status changed to:', status);
          }
        });
        
        console.log('TrackerStatus: Initial subscription result:', status);
      } catch (error) {
        console.error('TrackerStatus: Error initializing channel:', error);
        setIsConnected(false);
      }
    };

    initializeChannel();

    return () => {
      console.log('TrackerStatus: Cleaning up channel on unmount');
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

  const broadcastStatus = useCallback(async (statusData: TrackerStatusData) => {
    if (!userId || !matchId) {
      console.log('TrackerStatus: Cannot broadcast - missing requirements', { userId, matchId });
      return;
    }

    if (!channelRef.current) {
      console.log('TrackerStatus: Cannot broadcast - no channel');
      return;
    }

    if (!isConnected) {
      console.log('TrackerStatus: Cannot broadcast - not connected');
      return;
    }

    const now = Date.now();
    
    // Throttle broadcasts to prevent spam (minimum 3 seconds between broadcasts)
    if (now - lastBroadcast < 3000) {
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
      console.log('TrackerStatus: Status broadcasted successfully');
    } catch (error) {
      console.error('TrackerStatus: Failed to broadcast status:', error);
    }
  }, [matchId, userId, lastBroadcast, isConnected]);

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
        console.log('TrackerStatus: Error during manual cleanup:', error);
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, [userId]);

  // Log connection state changes
  useEffect(() => {
    console.log('TrackerStatus: Connection state changed to:', isConnected);
  }, [isConnected]);

  return {
    broadcastStatus,
    isConnected,
    cleanup
  };
};
