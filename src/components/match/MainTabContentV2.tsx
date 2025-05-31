import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Team, MatchEvent, EventType } from '@/types'; // Ensure your types are correctly defined
import TrackerPresenceIndicator from '@/components/admin/TrackerPresenceIndicator';
import { useIsMobile } from '@/hooks/use-mobile'; // Ensure this hook exists

interface MainTabContentV2Props {
  matchId: string;
  homeTeam: { name: string; formation?: string; };
  awayTeam: { name: string; formation?: string; };
  isTracking?: boolean; // This prop seems unused, consider removing if not needed
  onEventRecord?: (eventType: any, player?: any, details?: any) => void; // This prop seems unused
}

const MainTabContentV2: React.FC<MainTabContentV2Props> = ({
  matchId,
  homeTeam,
  awayTeam,
}) => {
  console.log(`[MainTabContentV2] Rendering. matchId: ${matchId}`);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const transformSupabaseEvent = useCallback((dbEvent: any): MatchEvent => ({
    id: dbEvent.id,
    match_id: dbEvent.match_id,
    type: dbEvent.event_type as EventType, // Cast to your EventType enum/type
    event_type: dbEvent.event_type, // Keep raw event_type if needed
    timestamp: dbEvent.timestamp || 0, // Ensure timestamp is a number
    team: dbEvent.team as 'home' | 'away',
    coordinates: dbEvent.coordinates ? dbEvent.coordinates as { x: number; y: number } : { x: 0, y: 0 },
    player_id: dbEvent.player_id,
    created_by: dbEvent.created_by,
    event_data: dbEvent.event_data || {}, // Ensure event_data exists, default to empty object
  }), []);


  const fetchEvents = useCallback(async () => {
    console.log(`[MainTabContentV2] fetchEvents called for matchId: ${matchId}`);
    // setLoading(true); // Already set initially, only set to true if re-fetching explicitly not on mount
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('[MainTabContentV2] Error fetching events:', error);
        throw error;
      }
      
      const transformedEvents: MatchEvent[] = (data || []).map(transformSupabaseEvent);
      setEvents(transformedEvents);
      console.log(`[MainTabContentV2] fetchEvents success. ${transformedEvents.length} events loaded for matchId: ${matchId}.`);
    } catch (error) {
      // Error already logged
    } finally {
      setLoading(false);
    }
  }, [matchId, transformSupabaseEvent]);

  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log(`[MainTabContentV2] handleRealtimeEvent received. Type: ${payload.eventType}, Table: ${payload.table}, MatchID in payload: ${payload.new?.match_id || payload.old?.match_id}`);

    setEvents(prevEvents => {
      const prevEventsCount = prevEvents.length;
      let newEvents = [...prevEvents];

      switch (payload.eventType) {
        case 'INSERT': {
          const newRecord = payload.new;
          if (newRecord.match_id !== matchId) {
            console.log(`[MainTabContentV2] INSERT event for different match_id (${newRecord.match_id}), ignoring.`);
            return prevEvents; // Important: return previous state if no change
          }
          const newEvent = transformSupabaseEvent(newRecord);
          if (!newEvents.find(e => e.id === newEvent.id)) {
            newEvents.push(newEvent);
            newEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            console.log(`[MainTabContentV2] INSERT processed. Event ${newEvent.id} added. Events count: ${prevEventsCount} -> ${newEvents.length}`);
          } else {
            console.log(`[MainTabContentV2] INSERT skipped, event ${newEvent.id} already exists.`);
          }
          break;
        }
        case 'UPDATE': {
          const updatedRecord = payload.new;
          if (updatedRecord.match_id !== matchId) {
             console.log(`[MainTabContentV2] UPDATE event for different match_id (${updatedRecord.match_id}), ignoring.`);
            return prevEvents;
          }
          const updatedEvent = transformSupabaseEvent(updatedRecord);
          const index = newEvents.findIndex(e => e.id === updatedEvent.id);
          if (index !== -1) {
            newEvents[index] = updatedEvent;
            newEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Re-sort if timestamp could change
            console.log(`[MainTabContentV2] UPDATE processed. Event ${updatedEvent.id} updated. Events count: ${newEvents.length}`);
          } else {
             console.log(`[MainTabContentV2] UPDATE received for an event not in current state: ${updatedEvent.id}. Adding it.`);
             newEvents.push(updatedEvent);
             newEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          }
          break;
        }
        case 'DELETE': {
          const oldRecord = payload.old;
          // Supabase often sends just {id: "..."} in payload.old for RLS scenarios
          // So, ensure oldRecord.id is reliable or consider payload.old.match_id if available.
          // However, the channel filter should be the primary guard for match_id.
          const oldEventId = oldRecord.id;
          if (!oldEventId) {
            console.warn('[MainTabContentV2] DELETE event received without an ID in payload.old.', payload);
            return prevEvents;
          }
          
          const initialLength = newEvents.length;
          newEvents = newEvents.filter(e => e.id !== oldEventId);
          if (newEvents.length < initialLength) {
            console.log(`[MainTabContentV2] DELETE processed. Event ${oldEventId} removed. Events count: ${initialLength} -> ${newEvents.length}`);
          } else {
            console.log(`[MainTabContentV2] DELETE processed for event ${oldEventId}, but it was not found in current state.`);
          }
          break;
        }
        default:
          console.log('[MainTabContentV2] Unknown realtime eventType:', payload.eventType);
      }
      return newEvents; // Always return the new state (or old if no change)
    });
  }, [matchId, transformSupabaseEvent]); // Added matchId and transformSupabaseEvent

  useEffect(() => {
    if (!matchId) {
      console.log("[MainTabContentV2] matchId is not set. Skipping fetch and subscription.");
      setLoading(false);
      setEvents([]); // Clear events if matchId becomes invalid
      return;
    }
    
    console.log(`[MainTabContentV2] useEffect for matchId ${matchId}: setting up subscription.`);
    fetchEvents(); // Initial fetch

    const channel = supabase
      .channel(`match-events-for-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        handleRealtimeEvent 
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[MainTabContentV2] Successfully SUBSCRIBED to match-events-for-${matchId}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[MainTabContentV2] TIMED_OUT subscribing to match-events-for-${matchId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[MainTabContentV2] CHANNEL_ERROR subscribing to match-events-for-${matchId}:`, err);
        } else if (status === 'CLOSED') {
          console.log(`[MainTabContentV2] Subscription CLOSED for match-events-for-${matchId}.`);
        } else {
           console.log(`[MainTabContentV2] Subscription status for match-events-for-${matchId}: ${status}`, err ? JSON.stringify(err) : '');
        }
      });

    return () => {
      console.log(`[MainTabContentV2] Cleaning up subscription for matchId: ${matchId}.`);
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchEvents, handleRealtimeEvent]);

  const handleEventDelete = async (eventId: string) => {
    // Optimistic UI update
    setEvents(prev => prev.filter(event => event.id !== eventId));
    console.log(`[MainTabContentV2] Optimistically deleting event ${eventId}`);
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('[MainTabContentV2] Error deleting event from DB:', error);
        // Revert optimistic update or re-fetch to ensure consistency
        toast.error(`Failed to delete event: ${error.message}`);
        fetchEvents(); // Re-fetch on error
        throw error;
      }
      console.log(`[MainTabContentV2] Successfully deleted event ${eventId} from DB.`);
      // Realtime DELETE event should also fire and be handled, which is fine.
    } catch (error) {
      // Error already logged
    }
  };

  const advancedStats = useMemo(() => {
    const calculateStat = (team: 'home' | 'away', type: EventType, successField: string, totalField?: string) => {
      const teamEvents = events.filter(e => e.team === team && e.type === type);
      const total = totalField ? teamEvents.filter(e => e.event_data?.[totalField] === true).length : teamEvents.length;
      
      if (total === 0) return { rate: NaN, total: 0, successful: 0 };
      
      const successful = teamEvents.filter(e => e.event_data?.[successField] === true).length;
      return { rate: (successful / total) * 100, total, successful };
    };

    const homePassCompletion = calculateStat('home', 'pass', 'success');
    const awayPassCompletion = calculateStat('away', 'pass', 'success');
    const homeShotsOnTarget = calculateStat('home', 'shot', 'on_target'); // Assuming 'on_target' implies a shot attempt
    const awayShotsOnTarget = calculateStat('away', 'shot', 'on_target');

    return {
      homePassCompletionRate: homePassCompletion.rate,
      awayPassCompletionRate: awayPassCompletion.rate,
      homeShotsOnTargetRate: homeShotsOnTarget.rate,
      awayShotsOnTargetRate: awayShotsOnTarget.rate,
    };
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-8 h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-sm sm:text-base text-gray-600">Loading match events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-1 sm:p-2 md:p-0">
      <div className="w-full">
        <TrackerPresenceIndicator matchId={matchId} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <Card className="min-w-0">
          <CardHeader className="pb-2 p-3 sm:p-4"><CardTitle className="text-xs sm:text-sm font-medium">Total Events</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0"><div className="text-lg sm:text-xl md:text-2xl font-bold">{events.length}</div></CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2 p-3 sm:p-4"><CardTitle className="text-xs sm:text-sm font-medium truncate">{isMobile ? homeTeam.name.substring(0, 10) + (homeTeam.name.length > 10 ? '...' : '') : homeTeam.name} Events</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0"><div className="text-lg sm:text-xl md:text-2xl font-bold">{events.filter(e => e.team === 'home').length}</div></CardContent>
        </Card>
        <Card className="min-w-0 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 p-3 sm:p-4"><CardTitle className="text-xs sm:text-sm font-medium truncate">{isMobile ? awayTeam.name.substring(0, 10) + (awayTeam.name.length > 10 ? '...' : '') : awayTeam.name} Events</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0"><div className="text-lg sm:text-xl md:text-2xl font-bold">{events.filter(e => e.team === 'away').length}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4"><CardTitle className="text-xs sm:text-sm font-medium">Passing Accuracy</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-1">
            <div className="flex justify-between items-center"><span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? homeTeam.name.substring(0,10) + "..." : homeTeam.name}:</span><span className="text-sm sm:text-base font-semibold">{isNaN(advancedStats.homePassCompletionRate) ? 'N/A' : `${advancedStats.homePassCompletionRate.toFixed(1)}%`}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? awayTeam.name.substring(0,10) + "..." : awayTeam.name}:</span><span className="text-sm sm:text-base font-semibold">{isNaN(advancedStats.awayPassCompletionRate) ? 'N/A' : `${advancedStats.awayPassCompletionRate.toFixed(1)}%`}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4"><CardTitle className="text-xs sm:text-sm font-medium">Shooting Accuracy</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-1">
            <div className="flex justify-between items-center"><span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? homeTeam.name.substring(0,10) + "..." : homeTeam.name}:</span><span className="text-sm sm:text-base font-semibold">{isNaN(advancedStats.homeShotsOnTargetRate) ? 'N/A' : `${advancedStats.homeShotsOnTargetRate.toFixed(1)}%`}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? awayTeam.name.substring(0,10) + "..." : awayTeam.name}:</span><span className="text-sm sm:text-base font-semibold">{isNaN(advancedStats.awayShotsOnTargetRate) ? 'N/A' : `${advancedStats.awayShotsOnTargetRate.toFixed(1)}%`}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader className="p-3 sm:p-4 md:p-6"><CardTitle className="text-sm sm:text-base md:text-lg">Recent Events (Last 10)</CardTitle></CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-1 sm:space-y-2 max-h-48 sm:max-h-64 md:max-h-[28rem] overflow-y-auto"> {/* Increased max-h */}
            {events.length > 0 ? events.slice(-10).reverse().map((event) => (
              <div key={event.id} className="flex justify-between items-center p-2 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${event.team === 'home' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium capitalize text-xs sm:text-sm md:text-base truncate">{event.type.replace(/_/g, ' ')}</div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">
                      {event.player_id ? `Player ${event.player_id}` : 'Team event'} - {event.timestamp ? Math.floor(event.timestamp / 60) : 'N/A'}'
                    </div>
                  </div>
                </div>
                <button onClick={() => handleEventDelete(event.id)} className="text-red-600 hover:text-red-800 text-xs sm:text-sm px-2 py-1 flex-shrink-0 rounded hover:bg-red-50 transition-colors">
                  {isMobile ? '×' : 'Delete'}
                </button>
              </div>
            )) : (
              <div className="text-center py-6 sm:py-8 md:py-12 text-gray-500">
                <p className="text-xs sm:text-sm md:text-base">No events recorded yet for this match.</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Events will appear here in real-time as they are tracked.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTabContentV2;
