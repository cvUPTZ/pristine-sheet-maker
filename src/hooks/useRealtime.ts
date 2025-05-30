
import { useEffect, useState, useRef } from 'react';
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
  const [channelError, setChannelError] = useState<Error | null>(null); // Add channelError state
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
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status, err) => { // Add err parameter
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
          setChannelError(null); // Clear error on successful subscription
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
          // For other statuses, you might not want to set an error, or just a generic one.
          // For now, only explicit error statuses set channelError.
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [channelName, userId]);

  const pushEvent = (event: any) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: event.type,
          payload: event.payload,
        });
      } catch (sendError: any) {
        console.error('Error sending event via channel:', sendError);
        setChannelError(new Error(`Failed to send event: ${sendError.message || 'Unknown error'}`));
        // Optionally, re-throw or handle more specifically if needed
      }
    } else {
      // Handle case where channel is not available (e.g., set an error or log)
      console.warn('Cannot push event: Realtime channel is not available.');
      setChannelError(new Error('Cannot push event: Realtime channel not available.'));
    }
  };

  // Set up event listening
  useEffect(() => {
    if (channelRef.current && onEventReceived) {
      const eventHandlerWrapper = (event: any) => {
        console.log('[useRealtime_DEBUG] Raw event received by broadcast listener:', JSON.stringify(event, null, 2));
        onEventReceived(event); // Call the original callback
      };
      channelRef.current.on('broadcast', { event: '*' }, eventHandlerWrapper);
    }
    // Cleanup: Explicitly remove the listener if the effect re-runs or component unmounts
    // Although Supabase client might handle this on unsubscribe, being explicit is safer.
    return () => {
      if (channelRef.current && onEventReceived) {
        // Supabase RealtimeChannel type doesn't directly expose 'off' for specific wrapped handlers easily.
        // Relying on channel.unsubscribe() in the main useEffect to clean up all listeners.
        // If specific 'off' is needed, the handler wrapper instance would need to be stable or managed.
      }
    };
  }, [onEventReceived]); // Dependency array remains the same

  return {
    channel: channelRef.current,
    presence,
    onlineUsers,
    isOnline,
    pushEvent,
    channelError, // New return value
  };
};
