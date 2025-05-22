
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MatchEvent, Player, EventType } from '@/types';
import { useToast } from '@/components/ui/use-toast';

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
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load initial match events
  useEffect(() => {
    if (!matchId || !user) return;

    const loadEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId)
          .order('timestamp', { ascending: true });

        if (error) throw error;
        
        // Convert DB events to app format
        if (data) {
          const formattedEvents: MatchEvent[] = data.map(event => ({
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

  // Subscribe to realtime events and presence
  useEffect(() => {
    if (!matchId || !user) return;

    // Set up realtime subscription for match events
    const channel = supabase.channel(`match:${matchId}`)
      // Listen for new match events
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          const newEvent = payload.new;
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
          
          toast({
            title: "New Event",
            description: `${newEvent.event_type} recorded at ${new Date().toLocaleTimeString()}`,
            variant: "default"
          });
        }
      )
      // Track user presence
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
          // Get user profile to track presence
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
            
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
            
          // Track user presence
          await channel.track({
            id: user.id,
            name: profileData?.full_name || user.email,
            role: roleData?.role || 'viewer',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  // Record an event and broadcast to all users
  const recordEvent = async (
    eventType: EventType,
    playerId: number,
    teamId: string,
    coordinates: { x: number; y: number },
    timestamp: number
  ) => {
    if (!matchId || !user) return;

    try {
      const { data, error } = await supabase
        .from('match_events')
        .insert({
          match_id: matchId,
          event_type: eventType,
          player_id: playerId,
          team: teamId,
          coordinates: coordinates,
          timestamp: timestamp,
          created_by: user.id
        })
        .select();

      if (error) throw error;

      // Local optimistic update is not needed as the postgres_changes subscription will handle it
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
    isLoading,
    recordEvent
  };
};
