
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
  const [isOnline, setIsOnline] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<MatchEvent[]>([]);
  const [optimisticEvents, setOptimisticEvents] = useState<MatchEvent[]>([]);
  const [serverConfirmedEvents, setServerConfirmedEvents] = useState<MatchEvent[]>([]);
  const [lastReceivedEvent, setLastReceivedEvent] = useState<MatchEvent | null>(null);
  const [isPassTrackingModeActive, setIsPassTrackingModeActive] = useState(false);
  const [potentialPasser, setPotentialPasser] = useState<Player | null>(null);
  const [ballPathHistory, setBallPathHistory] = useState<BallPath[]>([]);
  const pendingEventsRef = useRef(pendingEvents);

  const {
    channel,
    presence,
    onlineUsers,
    isOnline: realtimeIsOnline,
    pushEvent,
  } = useRealtime({
    channelName: `match:${matchId || 'default'}`,
    onEventReceived: (event) => {
      if (event.type === 'event_confirmed') {
        const confirmedEvent = event.payload as MatchEvent;
        console.log('Event confirmed by server:', confirmedEvent);
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
      status: 'optimistic',
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
    teamId: string,
    coordinates: { x: number; y: number },
    relatedPlayerId?: number
  ) => {
    const eventData = {
      matchId: matchId || 'default',
      teamId,
      playerId,
      type: eventType as any,
      timestamp: Date.now(),
      coordinates,
      relatedPlayerId,
    };
    sendEvent(eventData);
  };

  const togglePassTrackingMode = () => {
    setIsPassTrackingModeActive(!isPassTrackingModeActive);
  };

  useEffect(() => {
    if (channel) {
      channel.on('broadcast', { event: 'add_event' }, (payload) => {
        const serverEvent = payload.payload as MatchEvent;
        console.log('Received event from server:', serverEvent);
        setLastReceivedEvent(serverEvent);
      });

      channel.on('broadcast', { event: 'event_confirmed' }, (payload) => {
        const confirmedEvent = payload.payload as MatchEvent;
        console.log('Event confirmed by server:', confirmedEvent);
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
        console.log('Attempting to send pending events:', pendingEvents);

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
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    togglePassTrackingMode,
  };
};
