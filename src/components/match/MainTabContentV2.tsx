
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import TrackerPresenceIndicator from '@/components/admin/TrackerPresenceIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';

interface MainTabContentV2Props {
  matchId: string;
  homeTeam: { name: string; formation?: string; };
  awayTeam: { name: string; formation?: string; };
  isTracking?: boolean;
  onEventRecord?: (eventType: any, player?: any, details?: any) => void;
}

const MainTabContentV2: React.FC<MainTabContentV2Props> = ({
  matchId,
  homeTeam,
  awayTeam,
}) => {
  console.log('[MainTabContentV2] Rendering with matchId:', matchId);
  const isMobile = useIsMobile();

  const { events, loading, isConnected } = useRealtimeMatch({
    matchId,
    onEventReceived: (event) => {
      console.log('[MainTabContentV2] New event received:', event);
    }
  });

  // Use unified tracker connection for status display
  const { trackers: unifiedTrackers } = useUnifiedTrackerConnection(matchId);

  const handleEventDelete = async (eventId: string) => {
    // Optimistic update
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Advanced Statistics Calculations
  const advancedStats = useMemo(() => {
    const calculatePassCompletion = (team: 'home' | 'away') => {
      const teamPasses = events.filter(e => e.team === team && e.type === 'pass');
      const totalPasses = teamPasses.length;
      if (totalPasses === 0) return { rate: NaN, total: 0, successful: 0 };
      const successfulPasses = teamPasses.filter(e => e.event_data?.success === true).length;
      return { rate: (successfulPasses / totalPasses) * 100, total: totalPasses, successful: successfulPasses };
    };

    const calculateShotsOnTarget = (team: 'home' | 'away') => {
      const teamShots = events.filter(e => e.team === team && e.type === 'shot');
      const totalShots = teamShots.length;
      if (totalShots === 0) return { rate: NaN, total: 0, onTarget: 0 };
      const shotsOnTarget = teamShots.filter(e => e.event_data?.on_target === true).length;
      return { rate: (shotsOnTarget / totalShots) * 100, total: totalShots, onTarget: shotsOnTarget };
    };

    const homePassCompletion = calculatePassCompletion('home');
    const awayPassCompletion = calculatePassCompletion('away');
    const homeShotsOnTarget = calculateShotsOnTarget('home');
    const awayShotsOnTarget = calculateShotsOnTarget('away');

    return {
      homePassCompletionRate: homePassCompletion.rate,
      awayPassCompletionRate: awayPassCompletion.rate,
      homeShotsOnTargetRate: homeShotsOnTarget.rate,
      awayShotsOnTargetRate: awayShotsOnTarget.rate,
    };
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="text-center">
          <div className="text-sm sm:text-base">Loading events...</div>
        </div>
      </div>
    );
  }

  const activeTrackers = unifiedTrackers.filter(t => t.status === 'active').length;
  const totalTrackers = unifiedTrackers.length;

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-1 sm:p-2 md:p-0">
      {/* Connection Status */}
      <div className="w-full">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
          <span>• {events.length} events</span>
          <span>• {activeTrackers}/{totalTrackers} trackers online</span>
        </div>
        
        {/* Enhanced Tracker Status Display */}
        {unifiedTrackers.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Tracker Status:</div>
            <div className="space-y-1">
              {unifiedTrackers.map(tracker => (
                <div key={tracker.user_id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    tracker.status === 'active' ? 'bg-green-500' : 
                    tracker.status === 'recording' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium">{tracker.email || tracker.user_id}</span>
                  <span className="text-gray-500">
                    {tracker.status === 'active' ? 'Online' : 
                     tracker.status === 'recording' ? 'Recording' : 'Offline'}
                  </span>
                  {tracker.battery_level && (
                    <span className={`text-xs ${tracker.battery_level <= 20 ? 'text-red-600' : 'text-green-600'}`}>
                      {tracker.battery_level}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
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
              {isMobile ? homeTeam.name.substring(0, 10) + (homeTeam.name.length > 10 ? '...' : '') : homeTeam.name} Events
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
              {isMobile ? awayTeam.name.substring(0, 10) + (awayTeam.name.length > 10 ? '...' : '') : awayTeam.name} Events
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
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? homeTeam.name.substring(0,10) + "..." : homeTeam.name}:</span>
              <span className="text-sm sm:text-base font-semibold">
                {isNaN(advancedStats.homePassCompletionRate) ? 'N/A' : `${advancedStats.homePassCompletionRate.toFixed(1)}%`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? awayTeam.name.substring(0,10) + "..." : awayTeam.name}:</span>
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
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? homeTeam.name.substring(0,10) + "..." : homeTeam.name}:</span>
              <span className="text-sm sm:text-base font-semibold">
                {isNaN(advancedStats.homeShotsOnTargetRate) ? 'N/A' : `${advancedStats.homeShotsOnTargetRate.toFixed(1)}%`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600 truncate">{isMobile ? awayTeam.name.substring(0,10) + "..." : awayTeam.name}:</span>
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
                  <EnhancedEventTypeIcon
                    eventType={event.type}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium capitalize text-xs sm:text-sm md:text-base truncate dark:text-slate-200">
                      {event.type}
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
