// MainTabContentV2.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { useUnifiedTrackerConnection } from '@/hooks/useUnifiedTrackerConnection';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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
      // Use optional chaining and type assertion for event_data
      const successfulPasses = teamPasses.filter(e => {
        const eventData = e.event_data as any;
        return eventData?.success === true;
      }).length;
      return { rate: (successfulPasses / totalPasses) * 100, total: totalPasses, successful: successfulPasses };
    };

    const calculateShotsOnTarget = (team: 'home' | 'away') => {
      const teamShots = events.filter(e => e.team === team && e.type === 'shot');
      const totalShots = teamShots.length;
      if (totalShots === 0) return { rate: NaN, total: 0, onTarget: 0 };
      // Use optional chaining and type assertion for event_data
      const shotsOnTarget = teamShots.filter(e => {
        const eventData = e.event_data as any;
        return eventData?.on_target === true;
      }).length;
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

  // Helper functions for tracker status
  const getTotalEventCount = (eventCounts: Record<string, number> | undefined) => {
    if (!eventCounts) return 0;
    return Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
  };

  const getStatusColor = (tracker: any) => {
    if (tracker.status === 'recording') {
      const action = tracker.current_action || '';
      const eventType = action.split('_')[1];
      return 'from-blue-500 to-blue-600';
    }
    if (tracker.status === 'active') return 'from-green-400 to-green-500';
    return 'from-gray-400 to-gray-500';
  };

  const getStatusText = (tracker: any) => {
    if (tracker.status === 'recording' && tracker.current_action) {
      const action = tracker.current_action.split('_');
      return action.length > 1 ? `Recording ${action[1]}` : 'Recording';
    }
    return tracker.status === 'active' ? 'Active' : 'Offline';
  };

  const isActivelyTracking = (tracker: any) => {
    return tracker.status === 'recording' || 
           (tracker.status === 'active' && Date.now() - tracker.last_activity < 30000);
  };

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
        
        {/* Enhanced Tracker Status Display with TrackerPresenceIndicator styling */}
        {unifiedTrackers.length > 0 && (
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg border-slate-200 mb-3 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <motion.div
                  animate={{ rotate: isConnected ? 360 : 0 }}
                  transition={{ duration: 2, repeat: isConnected ? Infinity : 0, ease: "linear" }}
                  className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"
                />
                <span className="truncate">Tracker Status ({unifiedTrackers.length})</span>
                <div className="flex items-center gap-1 ml-auto">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-slate-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-2 md:space-y-4">
              <AnimatePresence>
                {unifiedTrackers.map((tracker, index) => {
                  const statusColor = getStatusColor(tracker);
                  const statusText = getStatusText(tracker);
                  const isActive = isActivelyTracking(tracker);
                  const totalEvents = getTotalEventCount(tracker.event_counts);

                  return (
                    <motion.div
                      key={tracker.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative"
                    >
                      <div className="flex items-center justify-between p-2 md:p-4 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <motion.div
                            className={`relative w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-r ${statusColor} shadow-lg flex items-center justify-center flex-shrink-0`}
                            animate={isActive ? {
                              scale: [1, 1.05, 1],
                              boxShadow: [
                                `0 0 0 0px rgba(59, 130, 246, 0.5)`,
                                `0 0 0 5px rgba(59, 130, 246, 0.2)`,
                                `0 0 0 0px rgba(59, 130, 246, 0)`,
                              ]
                            } : {}}
                            transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                          >
                            <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${tracker.status === 'active' ? 'bg-white' : 'bg-gray-300'}`} />
                          </motion.div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium text-slate-800 text-xs md:text-sm truncate">
                                {tracker.email?.split('@')[0] || `Tracker ${tracker.user_id.slice(-4)}`}
                              </div>
                              {totalEvents > 0 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {totalEvents} events
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                              <Badge
                                variant={tracker.status === 'active' || tracker.status === 'recording' ? "default" : "secondary"}
                                className={`text-xs ${(tracker.status === 'active' || tracker.status === 'recording') ? 'bg-gradient-to-r ' + statusColor + ' text-white border-0' : ''}`}
                              >
                                <span className="hidden sm:inline">{statusText}</span>
                                <span className="sm:hidden">{tracker.status === 'active' || tracker.status === 'recording' ? 'On' : 'Off'}</span>
                              </Badge>
                              
                              {/* THIS CODE WILL NOW WORK */}
                              {tracker.battery_level !== undefined && (
                                <Badge variant="outline" className={`text-xs ${tracker.battery_level <= 20 ? 'text-red-600' : 'text-green-600'}`}>
                                  🔋 {tracker.battery_level}%
                                </Badge>
                              )}
                              
                              <span className="text-xs text-slate-500 hidden md:inline">
                                {Math.floor((Date.now() - tracker.last_activity) / 1000)}s ago
                              </span>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="flex items-center gap-1 flex-shrink-0"
                            >
                              {[...Array(3)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r ${statusColor}`}
                                  animate={{ 
                                    scale: [0.5, 1, 0.5],
                                    opacity: [0.3, 1, 0.3]
                                  }}
                                  transition={{ 
                                    duration: 1.5, 
                                    repeat: Infinity, 
                                    delay: i * 0.2 
                                  }}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {isActive && (
                        <motion.div
                          className={`absolute inset-0 rounded-xl bg-gradient-to-r ${statusColor} opacity-10 pointer-events-none`}
                          animate={{
                            scale: [1, 1.02, 1],
                            opacity: [0.1, 0.05, 0.1]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {unifiedTrackers.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4 md:py-8 text-slate-500"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="font-medium text-sm md:text-base">No trackers assigned</p>
                  <p className="text-xs md:text-sm">Assign trackers to see their activity</p>
                </motion.div>
              )}

              <motion.div
                className="grid grid-cols-4 gap-1 md:gap-2 pt-2 md:pt-4 border-t border-slate-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-center">
                  <div className="text-sm md:text-lg font-bold text-slate-800">
                    {unifiedTrackers.filter(t => t.status === 'active' || t.status === 'recording').length}
                  </div>
                  <div className="text-xs text-slate-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-lg font-bold text-green-600">
                    {unifiedTrackers.filter(t => t.status === 'recording').length}
                  </div>
                  <div className="text-xs text-slate-500">Recording</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-lg font-bold text-slate-800">
                    {unifiedTrackers.reduce((sum, t) => sum + getTotalEventCount(t.event_counts), 0)}
                  </div>
                  <div className="text-xs text-slate-500">Events</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-lg font-bold text-orange-600">
                    {unifiedTrackers.filter(t => t.battery_level && t.battery_level <= 20).length}
                  </div>
                  <div className="text-xs text-slate-500">Low Battery</div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <Card className="min-w-0 hover:bg-slate-100 dark:hover:bg-slate-800/50">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium sm:font-semibold sm:text-base">Total Events</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0 hover:bg-slate-100 dark:hover:bg-slate-800/50">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium sm:font-semibold sm:text-base truncate">
              {isMobile ? homeTeam.name.substring(0, 10) + (homeTeam.name.length > 10 ? '...' : '') : homeTeam.name} Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold">
              {events.filter(e => e.team === 'home').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0 sm:col-span-2 lg:col-span-1 hover:bg-slate-100 dark:hover:bg-slate-800/50">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium sm:font-semibold sm:text-base truncate">
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
        <Card className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium sm:font-semibold sm:text-base">Passing Accuracy</CardTitle>
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
        <Card className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm font-medium sm:font-semibold sm:text-base">Shooting Accuracy</CardTitle>
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
          <CardTitle className="text-base sm:text-lg font-semibold">Recent Events</CardTitle>
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