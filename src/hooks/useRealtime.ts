import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  channelName: string;
  onEventReceived?: (event: any) => void;
  userId: string;
}

export const useRealtime = ({ channelName, onEventReceived, userId }: UseRealtimeOptions) => {
  const [isOnline, setIsOnline] = useState(false);
  const [presence, setPresence] = useState({});
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [channelError, setChannelError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Set up presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        setPresence(newState);
        const users = Object.values(newState).flat();
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Removed excessive logging
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Removed excessive logging
      })
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
          setChannelError(null);
          try {
            await channel.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
          } catch (trackError: any) {
            console.error('Error tracking presence:', trackError);
            setChannelError(new Error(`Presence tracking failed: ${trackError.message || 'Unknown error'}`));
          }
        } else {
          setIsOnline(false);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Realtime channel error:', status, err);
            setChannelError(err || new Error(`Channel ${status.toLowerCase()}`));
          }
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [channelName, userId]);

  const pushEvent = useCallback((event: any) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: event.type,
          payload: event.payload,
        });
      } catch (sendError: any) {
        console.error('Error sending event via channel:', sendError);
      }
    } else {
      console.warn('Cannot push event: Realtime channel is not available.');
    }
  }, []);

  // Set up event listening
  useEffect(() => {
    if (channelRef.current && onEventReceived) {
      const eventHandlerWrapper = (event: any) => {
        onEventReceived(event);
      };
      channelRef.current.on('broadcast', { event: '*' }, eventHandlerWrapper);
    }
    
    return () => {
      // Cleanup handled by channel.unsubscribe() in main useEffect
    };
  }, [onEventReceived]);

  return {
    channel: channelRef.current,
    presence,
    onlineUsers,
    isOnline,
    pushEvent,
    channelError,
  };
};
