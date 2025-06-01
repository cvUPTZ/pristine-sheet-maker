import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Team, MatchEvent, EventType } from '@/types'; // EventType is GlobalEventType
import TrackerPresenceIndicator from '@/components/admin/TrackerPresenceIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';

interface MainTabContentV2Props {
  matchId: string;
  homeTeam?: { name?: string; formation?: string; } | null;
  awayTeam?: { name?: string; formation?: string; } | null;
  isTracking?: boolean;
  onEventRecord?: (eventType: any, player?: any, details?: any) => void;
}

const MainTabContentV2: React.FC<MainTabContentV2Props> = ({
  matchId,
  homeTeam,
  awayTeam,
}) => {
  console.log('[MainTabContentV2 DEBUG] Component rendering. matchId:', matchId);
  
  // Add safety checks and default values
  const safeHomeTeam = homeTeam || { name: 'Home Team' };
  const safeAwayTeam = awayTeam || { name: 'Away Team' };
  const homeTeamName = safeHomeTeam.name || 'Home Team';
  const awayTeamName = safeAwayTeam.name || 'Away Team';
  
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const isMobile = useIsMobile();

  const fetchEvents = useCallback(async () => {
    console.log(`[MainTabContentV2 DEBUG] fetchEvents triggered for matchId: ${matchId}`);
    // setLoading(true); // Optional: set loading state at the beginning of fetch
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId) // matchId is a dependency of useCallback
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Ensure to use transformSupabaseEvent which should include event_data
      const transformedEvents: MatchEvent[] = (data || []).map(transformSupabaseEvent);
      setEvents(transformedEvents);
      console.log(`[MainTabContentV2 DEBUG] fetchEvents completed. Number of events fetched: ${transformedEvents.length}`);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId]); // Dependency: matchId

  const transformSupabaseEvent = (dbEvent: any): MatchEvent => ({
    id: dbEvent.id,
    match_id: dbEvent.match_id,
    type: dbEvent.event_type as EventType,
    event_type: dbEvent.event_type,
    timestamp: dbEvent.timestamp || 0,
    team: dbEvent.team as 'home' | 'away',
    coordinates: dbEvent.coordinates ? dbEvent.coordinates as { x: number; y: number } : { x: 0, y: 0 },
    player_id: dbEvent.player_id,
    created_by: dbEvent.created_by,
    event_data: dbEvent.event_data // Crucial: Make sure event_data is included for stats
  });

  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log('[MainTabContentV2 DEBUG] handleRealtimeEvent called. Full payload:', JSON.stringify(payload, null, 2));

    setEvents(prevEvents => {
      let newEvents = [...prevEvents];
      switch (payload.eventType) {
        case 'INSERT': {
          const newEvent = transformSupabaseEvent(payload.new);
          // Avoid duplicates, though Supabase often handles this for single subscriptions
          if (!newEvents.find(e => e.id === newEvent.id)) {
            newEvents.push(newEvent);
            // Sort by timestamp to maintain order, important for recent events display
            newEvents.sort((a, b) => a.timestamp - b.timestamp);
            console.log('[MainTabContentV2 DEBUG] INSERT processed. New event added. Total events:', newEvents.length);
          } else {
            console.log('[MainTabContentV2 DEBUG] INSERT skipped, event already exists:', newEvent.id);
          }
          break;
        }
        case 'UPDATE': {
          const updatedEvent = transformSupabaseEvent(payload.new);
          const index = newEvents.findIndex(e => e.id === updatedEvent.id);
          if (index !== -1) {
            newEvents[index] = updatedEvent;
            newEvents.sort((a, b) => a.timestamp - b.timestamp);
            console.log('[MainTabContentV2 DEBUG] UPDATE processed. Event updated. Total events:', newEvents.length);
          } else {
            // If not found, it could be an event not yet in state, add it (optional, depends on desired behavior)
            // newEvents.push(updatedEvent);
            // newEvents.sort((a, b) => a.timestamp - b.timestamp);
            console.log('[MainTabContentV2 DEBUG] UPDATE received for an event not in current state:', updatedEvent.id);
          }
          break;
        }
        case 'DELETE': {
          const oldEventId = payload.old.id;
          newEvents = newEvents.filter(e => e.id !== oldEventId);
          console.log('[MainTabContentV2 DEBUG] DELETE processed. Event removed. Total events:', newEvents.length);
          break;
        }
        default:
          console.log('[MainTabContentV2 DEBUG] Unknown eventType in payload:', payload.eventType);
      }
      return newEvents;
    });
    // Add this line immediately after the setEvents call:
    setRenderTrigger(prev => prev + 1);
  }, []); // No dependencies as setEvents with functional update is used

  useEffect(() => {
    fetchEvents(); // Initial fetch

    const channel = supabase
      .channel(`match-events-for-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        handleRealtimeEvent // Use the memoized callback here
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[MainTabContentV2 DEBUG] Successfully SUBSCRIBED to match-events-for-${matchId}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[MainTabContentV2 DEBUG] TIMED_OUT subscribing to match-events-for-${matchId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[MainTabContentV2 DEBUG] CHANNEL_ERROR subscribing to match-events-for-${matchId}:`, err);
        } else {
          console.log(`[MainTabContentV2 DEBUG] Subscription status for match-events-for-${matchId}: ${status}`, err ? JSON.stringify(err) : '');
        }
      });

    return () => {
      console.log(`[MainTabContentV2 DEBUG] Cleaning up match_events subscription for matchId: ${matchId}. Channel:`, channel);
      console.log(`Unsubscribing from match-events-for-${matchId}`); // Kept original log too
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchEvents, handleRealtimeEvent]); // Added handleRealtimeEvent

  const handleEventDelete = async (eventId: string) => {
    // Optimistic UI update (already in place) + DB deletion
    // The realtime listener for DELETE will also fire, make sure it's handled gracefully
    // (current implementation of handleRealtimeEvent for DELETE should be fine)
    setEvents(prev => prev.filter(event => event.id !== eventId));
    // This local optimistic update can be removed if we solely rely on real-time DELETE event
    // However, keeping it provides immediate feedback to the user.
    // The real-time handler will then try to remove it again, which is harmless.

    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // No need to call setEvents here again if optimistic update is kept,
      // or if we rely purely on the realtime update.
      // setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      // Potentially revert optimistic update if DB delete fails
      // fetchEvents(); // Or re-fetch to ensure consistency
    }
  };

  // --- Advanced Statistics Calculations ---
  const advancedStats = useMemo(() => {
    const calculatePassCompletion = (team: 'home' | 'away') => {
      const teamPasses = events.filter(e => e.team === team && e.type === 'pass');
      const totalPasses = teamPasses.length;
      if (totalPasses === 0) return { rate: NaN, total: 0, successful: 0 }; // Return NaN for rate if no passes
      const successfulPasses = teamPasses.filter(e => e.event_data?.success === true).length;
      return { rate: (successfulPasses / totalPasses) * 100, total: totalPasses, successful: successfulPasses };
    };

    const calculateShotsOnTarget = (team: 'home' | 'away') => {
      const teamShots = events.filter(e => e.team === team && e.type === 'shot');
      const totalShots = teamShots.length;
      if (totalShots === 0) return { rate: NaN, total: 0, onTarget: 0 }; // Return NaN for rate if no shots
      const shotsOnTarget = teamShots.filter(e => e.event_data?.on_target === true).length;
      return { rate: (shotsOnTarget / totalShots) * 100, total: totalShots, onTarget: shotsOnTarget };
    };

    const homePassCompletion = calculatePassCompletion('home');
    const awayPassCompletion = calculatePassCompletion('away');
    const homeShotsOnTarget = calculateShotsOnTarget('home');
    const awayShotsOnTarget = calculateShotsOnTarget('away');

    // console.log('[MainTabContentV2 DEBUG] Advanced stats calculated:', { homePassCompletion, awayPassCompletion, homeShotsOnTarget, awayShotsOnTarget });

    return {
      homePassCompletionRate: homePassCompletion.rate,
      awayPassCompletionRate: awayPassCompletion.rate,
      homeShotsOnTargetRate: homeShotsOnTarget.rate,
      awayShotsOnTargetRate: awayShotsOnTarget.rate,
    };
  }, [events]);
  // --- End Advanced Statistics Calculations ---

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="text-center">
          <div className="text-sm sm:text-base">Loading events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-1 sm:p-2 md:p-0">
      {/* Tracker Presence Indicator */}
      <div className="w-full">
        <TrackerPresenceIndicator matchId={matchId} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <Card className="min-w-0">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {isMobile ? homeTeamName.substring(0, 10) + (homeTeamName.length > 10 ? '...' : '') : homeTeamName} Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'home').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {isMobile ? awayTeamName.substring(0, 10) + (awayTeamName.length > 10 ? '...' : '') : awayTeamName} Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'away').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Passing Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? homeTeamName.substring(0,10) + "..." : homeTeamName}:</span>
              <span className="text-sm sm:text-base font-semibold">
                {isNaN(advancedStats.homePassCompletionRate) ? 'N/A' : `${advancedStats.homePassCompletionRate.toFixed(1)}%`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? awayTeamName.substring(0,10) + "..." : awayTeamName}:</span>
              <span className="text-sm sm:text-base font-semibold">
                {isNaN(advancedStats.awayPassCompletionRate) ? 'N/A' : `${advancedStats.awayPassCompletionRate.toFixed(1)}%`}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Shooting Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? homeTeamName.substring(0,10) + "..." : homeTeamName}:</span>
              <span className="text-sm sm:text-base font-semibold">
                {isNaN(advancedStats.homeShotsOnTargetRate) ? 'N/A' : `${advancedStats.homeShotsOnTargetRate.toFixed(1)}%`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? awayTeamName.substring(0,10) + "..." : awayTeamName}:</span>
              <span className="text-sm sm:text-base font-semibold">
                {isNaN(advancedStats.awayShotsOnTargetRate) ? 'N/A' : `${advancedStats.awayShotsOnTargetRate.toFixed(1)}%`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card className="w-full">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-sm sm:text-base md:text-lg">Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-1 sm:space-y-2 max-h-48 sm:max-h-64 md:max-h-96 overflow-y-auto">
            {events.slice(-10).reverse().map((event) => (
              <div key={event.id} className="flex justify-between items-center p-2 sm:p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {/* Replace the colored dot with EnhancedEventTypeIcon */}
                  <EnhancedEventTypeIcon
                    eventKey={event.type} // event.type is already GlobalEventType
                    size="md" // Equivalent to 24px, good for lists
                    // Consider adding highContrast or other props if theme requires
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium capitalize text-xs sm:text-sm md:text-base truncate dark:text-slate-200">
                      {event.type} {/* Display event type string */}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate">
                      {event.player_id ? `P${event.player_id}` : (event.team ? `${event.team.charAt(0).toUpperCase()}` : 'Event')} - {Math.floor(event.timestamp / 60)}'
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEventDelete(event.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs sm:text-sm px-2 py-1 flex-shrink-0 rounded hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                >
                  {isMobile ? '×' : 'Del'}
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-6 sm:py-8 md:py-12 text-gray-500 dark:text-slate-400">
                <p className="text-xs sm:text-sm md:text-base">No events recorded yet</p>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-500 mt-1">
                  Events will appear here as they are tracked.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTabContentV2;