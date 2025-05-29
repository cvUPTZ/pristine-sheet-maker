
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { DisplayableMatchEvent, MatchEventPayload, MatchRosterPlayer, EventType } from '@/components/match/types';

const ALL_SYSTEM_EVENT_TYPES: EventType[] = [
    { key: 'pass', label: 'Pass' },
    { key: 'shot', label: 'Shot' },
    { key: 'foul', label: 'Foul' },
    { key: 'goal', label: 'Goal' },
    { key: 'save', label: 'Save' },
    { key: 'offside', label: 'Offside' },
    { key: 'corner', label: 'Corner Kick' },
    { key: 'sub', label: 'Substitution' },
];

interface RealTimeMatchEventsProps {
  matchId: string | null;
}

export function RealTimeMatchEvents({ matchId }: RealTimeMatchEventsProps) {
  const [events, setEvents] = useState<DisplayableMatchEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [matchPlayers, setMatchPlayers] = useState<Map<string, MatchRosterPlayer>>(new Map());

  const eventTypeMap = useMemo(() => 
    new Map(ALL_SYSTEM_EVENT_TYPES.map(et => [et.key, et.label])), 
  []);

  const formatEvent = useCallback((event: MatchEventPayload): DisplayableMatchEvent => {
    const player = event.player_roster_id ? matchPlayers.get(event.player_roster_id) : null;
    return {
      ...event,
      event_type_label: eventTypeMap.get(event.event_type_key) || event.event_type_key,
      player_name: player?.player_name || null,
      player_jersey_number: player?.jersey_number || null,
      team_context: player?.team_context || event.team_context || null,
      is_new: false,
    };
  }, [matchPlayers, eventTypeMap]);

  // Fetch initial data and players
  useEffect(() => {
    if (!matchId) {
      setEvents([]);
      setMatchPlayers(new Map());
      return;
    }

    let isMounted = true;
    setLoadingInitial(true);
    setError(null);

    async function fetchInitialData() {
      try {
        // Fetch players for the match
        const { data: playersData, error: playersError } = await supabase
          .from('match_rosters')
          .select('*')
          .eq('match_id', matchId);

        if (playersError) throw playersError;
        if (isMounted) {
          const playersMap = new Map(playersData.map((p: MatchRosterPlayer) => [p.id, p as MatchRosterPlayer]));
          setMatchPlayers(playersMap);
        
          // Fetch initial events after players are fetched and map is ready
          const { data: initialEventsData, error: initialEventsError } = await supabase
            .from('match_events')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: false })
            .limit(20);

          if (initialEventsError) throw initialEventsError;
          
          if (isMounted) {
            const formattedInitialEvents = (initialEventsData || []).map((event: any) => {
                 const player = event.player_roster_id ? playersMap.get(event.player_roster_id) : null;
                 return {
                    ...event,
                    event_type_label: eventTypeMap.get(event.event_type_key) || event.event_type_key,
                    player_name: player?.player_name || null,
                    player_jersey_number: player?.jersey_number || null,
                    team_context: player?.team_context || event.team_context || null,
                    is_new: false,
                 } as DisplayableMatchEvent;
            });
            setEvents(formattedInitialEvents.reverse());
          }
        }
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        if (isMounted) setError(err.message || 'Failed to load initial data.');
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    fetchInitialData();
    return () => { isMounted = false; };
  }, [matchId, eventTypeMap]);

  // Real-time subscription
  useEffect(() => {
    if (!matchId) return;

    let channel: RealtimeChannel | null = null;

    const subscription = supabase
      .channel(`match_events_for_${matchId}`)
      .on<MatchEventPayload>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
        (payload: any) => {
          console.log('New event received:', payload.new);
          const formattedNewEvent = formatEvent({ ...payload.new as MatchEventPayload });
          setEvents((prevEvents) => [
            { ...formattedNewEvent, is_new: true },
            ...prevEvents.map(e => ({...e, is_new: false}))
          ].slice(0, 50));

          setTimeout(() => {
            setEvents(currentEvents => 
              currentEvents.map(e => e.id === formattedNewEvent.id ? {...e, is_new: false} : e)
            );
          }, 3000);
        }
      )
      .subscribe((status: any, err: any) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to match_events for match ${matchId}`);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error for match ${matchId}:`, err);
          setError(`Real-time connection error: ${err?.message || 'Failed to subscribe'}`);
        }
      });
      
    channel = subscription;

    return () => {
      if (channel) {
        console.log(`Unsubscribing from match_events for match ${matchId}`);
        supabase.removeChannel(channel).catch((err: any) => console.error("Error removing channel", err));
      }
    };
  }, [matchId, formatEvent]);

  if (!matchId) {
    return <div className="p-4 text-center text-gray-500">Please select a match to view live events.</div>;
  }

  if (loadingInitial) {
    return <div className="p-4 text-center">Loading initial events...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white h-[500px] overflow-y-auto flex flex-col-reverse">
      {events.length === 0 && <p className="text-center text-gray-500">No events yet for this match.</p>}
      <ul className="space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className={`p-3 rounded-md border transition-all duration-500 ease-out
                        ${event.is_new ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
              <span>{new Date(event.created_at).toLocaleTimeString()}</span>
              <span>ID: {event.id.substring(0, 8)}</span>
            </div>
            <p className="font-semibold text-lg text-gray-900">
              {event.event_type_label || 'Unknown Event'}
            </p>
            {event.player_name && (
              <p className="text-sm text-gray-700">
                Player: {event.player_name} (#{event.player_jersey_number})
                {event.team_context && <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${event.team_context === 'home' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>{event.team_context.toUpperCase()}</span>}
              </p>
            )}
            {!event.player_name && event.team_context && (
                 <p className="text-sm text-gray-700">
                    Team: <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${event.team_context === 'home' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>{event.team_context.toUpperCase()}</span>
                 </p>
            )}
            {event.event_data && (
              <pre className="mt-1 text-xs bg-gray-100 p-1.5 rounded overflow-x-auto">
                {JSON.stringify(event.event_data, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
