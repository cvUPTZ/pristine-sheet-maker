import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRealtime } from './useRealtime';
import { MatchEvent, Player } from '@/types';

interface CollaborationOptions {
  matchId?: string;
  userId?: string;
  teamId?: string;
  optimisticUpdates?: boolean;
}

interface BallPath {
  id?: string;
  clientId?: string;
  startCoordinates: { x: number; y: number };
  endCoordinates: { x: number; y: number };
  status: 'optimistic' | 'pending_confirmation' | 'confirmed' | 'failed';
}

export const useMatchCollaboration = ({
  matchId,
  userId = 'default-user',
  teamId = 'default-team',
  optimisticUpdates = true,
}: CollaborationOptions) => {
  // If matchId is not provided, return a disabled state immediately.
  if (!matchId) {
    return {
      sendEvent: () => console.warn('Collaboration disabled: No matchId provided.'),
      recordEvent: () => console.warn('Collaboration disabled: No matchId provided.'),
      presence: {},
      onlineUsers: [],
      isOnline: false,
      isConnected: false,
      participants: [],
      events: [],
      lastReceivedEvent: null,
      users: [],
      collaborationError: null,
    };
  }

  const [isOnline, setIsOnline] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<MatchEvent[]>([]);
  const [optimisticEvents, setOptimisticEvents] = useState<MatchEvent[]>([]);
  const [serverConfirmedEvents, setServerConfirmedEvents] = useState<MatchEvent[]>([]);
  const [lastReceivedEvent, setLastReceivedEvent] = useState<MatchEvent | null>(null);
  const pendingEventsRef = useRef(pendingEvents);

  const {
    channel,
    presence,
    onlineUsers,
    isOnline: realtimeIsOnline,
    pushEvent,
    channelError,
  } = useRealtime({
    channelName: `match:${matchId}`,
    onEventReceived: (event) => {
      if (event.type === 'event_confirmed') {
        const confirmedEvent = event.payload as MatchEvent;
        setServerConfirmedEvents((prev) => [...prev, confirmedEvent]);
        setLastReceivedEvent(confirmedEvent);
      }
    },
    userId: userId,
  });

  useEffect(() => {
    setIsOnline(realtimeIsOnline);
  }, [realtimeIsOnline]);

  useEffect(() => {
    pendingEventsRef.current = pendingEvents;
  }, [pendingEvents]);

  const createOptimisticEvent = (eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'>) => {
    if (!isOnline && optimisticUpdates) {
      console.warn('Offline: Event will not be synced until online.');
    }

    const optimisticId = uuidv4();
    const optimisticCreationTime = Date.now();

    const newEvent: MatchEvent = {
      ...eventData,
      id: optimisticId,
      clientId: optimisticId,
      status: 'confirmed',
      optimisticCreationTime: optimisticCreationTime,
      user_id: userId,
    };

    setOptimisticEvents((prev) => [...prev, newEvent]);
    return newEvent;
  };

  const sendEvent = (eventData: Omit<MatchEvent, 'id' | 'status' | 'clientId' | 'optimisticCreationTime' | 'user_id'>) => {
    const newEvent = createOptimisticEvent(eventData);

    if (isOnline) {
      setPendingEvents((prev) => [...prev, newEvent]);
      pushEvent({ type: 'add_event', payload: newEvent });
    } else {
      console.log('Not online, not sending event');
    }
  };

  const recordEvent = (
    eventType: string,
    playerId: number,
    teamId: 'home' | 'away',
    coordinates: { x: number; y: number },
    relatedPlayerId?: number
  ) => {
    const eventData = {
      match_id: matchId!,
      team_id: teamId,
      player_id: playerId,
      type: eventType as any,
      timestamp: Date.now(),
      coordinates,
      team: teamId,
    };
    sendEvent(eventData);
  };

  useEffect(() => {
    if (channel) {
      channel.on('broadcast', { event: 'add_event' }, (payload) => {
        const serverEvent = payload.payload as MatchEvent;
        setLastReceivedEvent(serverEvent);
      });

      channel.on('broadcast', { event: 'event_confirmed' }, (payload) => {
        const confirmedEvent = payload.payload as MatchEvent;
        setLastReceivedEvent(confirmedEvent);
      });
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channel, optimisticEvents]);

  useEffect(() => {
    const processPendingEvents = async () => {
      if (isOnline && pendingEvents.length > 0) {
        for (const event of pendingEvents) {
          try {
            pushEvent({ type: 'add_event', payload: event });
            setPendingEvents((prev) => prev.filter((e) => e.clientId !== event.clientId));
          } catch (error) {
            console.error('Failed to send event:', event, error);
            break;
          }
        }
      }
    };

    processPendingEvents();
  }, [isOnline, pushEvent, pendingEvents, userId]);

  return {
    sendEvent,
    recordEvent,
    presence,
    onlineUsers,
    isOnline,
    isConnected: isOnline,
    participants: onlineUsers,
    events: [...optimisticEvents, ...serverConfirmedEvents],
    lastReceivedEvent,
    users: onlineUsers,
    collaborationError: channelError,
  };
};
