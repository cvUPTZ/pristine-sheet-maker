import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useRealtime } from './useRealtime';
import { MatchEvent } from '@/types';
import { useMatchState } from './useMatchState';

interface CollaborationOptions {
  matchId: string;
  userId: string;
  teamId: string;
  optimisticUpdates?: boolean;
}

export const useMatchCollaboration = ({
  matchId,
  userId,
  teamId,
  optimisticUpdates = true,
}: CollaborationOptions) => {
  const [isOnline, setIsOnline] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<MatchEvent[]>([]);
  const { addEvent, confirmEvent, updateEvent } = useMatchState();
  const [optimisticEvents, setOptimisticEvents] = useState<MatchEvent[]>([]);
  const [serverConfirmedEvents, setServerConfirmedEvents] = useState<MatchEvent[]>([]);
  const pendingEventsRef = useRef(pendingEvents);

  const {
    channel,
    presence,
    onlineUsers,
    isOnline: realtimeIsOnline,
    pushEvent,
  } = useRealtime({
    channelName: `match:${matchId}`,
    onEventReceived: (event) => {
      if (event.type === 'event_confirmed') {
        const confirmedEvent = event.payload as MatchEvent;
        console.log('Event confirmed by server:', confirmedEvent);

        confirmEvent(confirmedEvent.clientId || '');

        setServerConfirmedEvents((prev) => [...prev, confirmedEvent]);
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

    addEvent(newEvent);
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

  useEffect(() => {
    if (channel) {
      channel.on('add_event', (payload) => {
        const serverEvent = payload as MatchEvent;
        console.log('Received event from server:', serverEvent);

        const optimisticEvent = optimisticEvents.find((e) => e.optimisticCreationTime === serverEvent.optimisticCreationTime);

        if (optimisticEvent) {
          confirmEvent(optimisticEvent.clientId || '');

          updateEvent({
            id: serverEvent.id,
            clientId: optimisticEvent.clientId || '',
            status: 'confirmed'
          });
        } else {
          console.warn('Optimistic event not found for server event:', serverEvent);
          // addEvent(serverEvent);
        }
      });

      channel.on('event_confirmed', (payload) => {
        const confirmedEvent = payload as MatchEvent;
        console.log('Event confirmed by server:', confirmedEvent);

        const optimisticEvent = optimisticEvents.find((e) => e.clientId === confirmedEvent.clientId);

        if (optimisticEvent) {
          updateEvent({
            id: confirmedEvent.id,
            clientId: confirmedEvent.clientId || '',
            status: 'confirmed'
          });
        } else {
          console.warn('Optimistic event not found for confirmed event:', confirmedEvent);
        }
      });
    }

    return () => {
      channel?.removeAllListeners();
    };
  }, [channel, addEvent, confirmEvent, optimisticEvents, updateEvent]);

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

  const updateEventStatus = (confirmedEvent: MatchEvent) => {
    updateEvent({
          id: confirmedEvent.id,
          clientId: confirmedEvent.clientId || '',
          status: 'confirmed'
        });
  };

  return {
    sendEvent,
    presence,
    onlineUsers,
    isOnline,
  };
};
