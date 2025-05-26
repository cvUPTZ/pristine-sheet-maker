
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MatchEvent, Player, EventType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/supabaseConfig';

interface MatchEventDB {
  id: string;
  match_id: string;
  event_type: string;
  player_id: number;
  team: string;
  coordinates: { x: number; y: number };
  timestamp: number;
  created_by: string;
  created_at: string;
}

interface CollaborativeUser {
  id: string;
  name: string;
  role: string;
  online: boolean;
  lastActivity: number;
}

interface UseMatchCollaborationProps {
  matchId?: string;
}

export const useMatchCollaboration = ({ matchId }: UseMatchCollaborationProps) => {
  const [users, setUsers] = useState<CollaborativeUser[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lastReceivedEvent, setLastReceivedEvent] = useState<MatchEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!matchId || !user) return;

    const loadEvents = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/match_events?match_id=eq.${matchId}&order=timestamp.asc`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
          const formattedEvents: MatchEvent[] = data.map((event: MatchEventDB) => ({
            id: event.id,
            matchId: event.match_id,
            teamId: event.team || '',
            playerId: event.player_id || 0,
            type: event.event_type as EventType,
            timestamp: event.timestamp,
            coordinates: event.coordinates ? { 
              x: event.coordinates.x || 0, 
              y: event.coordinates.y || 0 
            } : { x: 0, y: 0 }
          }));
          setEvents(formattedEvents);
        }
      } catch (error: any) {
        console.error('Error loading match events:', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [matchId, user]);

  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase.channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          const newEvent = payload.new as MatchEventDB;
          const formattedEvent: MatchEvent = {
            id: newEvent.id,
            matchId: newEvent.match_id,
            teamId: newEvent.team || '',
            playerId: newEvent.player_id || 0,
            type: newEvent.event_type as EventType,
            timestamp: newEvent.timestamp,
            coordinates: newEvent.coordinates ? { 
              x: newEvent.coordinates.x || 0, 
              y: newEvent.coordinates.y || 0 
            } : { x: 0, y: 0 }
          };
          setEvents(prev => [...prev, formattedEvent]);
          setLastReceivedEvent(formattedEvent); 
          
          toast({
            title: "New Event",
            description: `${newEvent.event_type} recorded at ${new Date().toLocaleTimeString()}`,
            variant: "default"
          });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presentUsers = Object.keys(state).map(key => {
          const userPresence = state[key][0] as any;
          return {
            id: key,
            name: userPresence.name,
            role: userPresence.role,
            online: true,
            lastActivity: Date.now()
          };
        });
        setUsers(presentUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const newUser = newPresences[0] as any;
        toast({
          title: "User joined",
          description: `${newUser.name} has joined the match tracking`,
        });
        
        setUsers(prev => {
          const existing = prev.find(u => u.id === key);
          if (existing) {
            return prev.map(u => u.id === key ? { ...u, online: true, lastActivity: Date.now() } : u);
          } else {
            return [...prev, { 
              id: key, 
              name: newUser.name, 
              role: newUser.role,
              online: true, 
              lastActivity: Date.now() 
            }];
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setUsers(prev => prev.map(u => u.id === key ? { ...u, online: false } : u));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=full_name`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            
            const profileData = await profileResponse.json();
            const fullName = profileData?.[0]?.full_name || user.email;
            
            const roleResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            
            const roleData = await roleResponse.json();
            const role = roleData?.[0]?.role || 'viewer';
              
            await channel.track({
              id: user.id,
              name: fullName,
              role: role,
              online_at: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Error setting up presence:', error);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  const recordEvent = async (
    eventType: EventType,
    playerId: number,
    teamId: string,
    coordinates: { x: number; y: number },
    timestamp: number,
    eventId?: string,
    relatedPlayerId?: number
  ) => {
    if (!matchId || !user) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/match_events`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: eventId,
          match_id: matchId,
          event_type: eventType,
          player_id: playerId,
          team: teamId,
          coordinates: coordinates,
          timestamp: timestamp,
          created_by: user.id,
          related_player_id: relatedPlayerId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error recording event:', error.message);
      toast({
        title: "Error",
        description: `Failed to record event: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return {
    users,
    events,
    lastReceivedEvent,
    isLoading,
    recordEvent
  };
};
