
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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        } else {
          setIsOnline(false);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [channelName, userId]);

  const pushEvent = (event: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: event.type,
        payload: event.payload,
      });
    }
  };

  // Set up event listening
  useEffect(() => {
    if (channelRef.current && onEventReceived) {
      channelRef.current.on('broadcast', { event: '*' }, onEventReceived);
    }
  }, [onEventReceived]);

  return {
    channel: channelRef.current,
    presence,
    onlineUsers,
    isOnline,
    pushEvent,
  };
};
