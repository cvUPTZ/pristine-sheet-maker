import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';

interface TrackerPresenceIndicatorProps {
  matchId: string;
}

const EVENT_COLORS = {
  'pass': 'from-blue-500 to-blue-600',
  'shot': 'from-red-500 to-red-600',
  'goal': 'from-green-500 to-green-600',
  'foul': 'from-yellow-500 to-yellow-600',
  'save': 'from-purple-500 to-purple-600',
  'offside': 'from-orange-500 to-orange-600',
  'corner': 'from-teal-500 to-teal-600',
  'sub': 'from-indigo-500 to-indigo-600',
  'default': 'from-gray-500 to-gray-600'
};

const TrackerPresenceIndicator: React.FC<TrackerPresenceIndicatorProps> = ({ matchId }) => {
  const { trackers, isConnected } = useRealtimeMatch({ matchId });

  const getStatusColor = (tracker: any) => {
    if (tracker.status === 'recording') {
      const action = tracker.current_action || '';
      const eventType = action.split('_')[1];
      return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] || EVENT_COLORS.default;
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

  const getTotalEventCount = (eventCounts: Record<string, number> | undefined) => {
    if (!eventCounts) return 0;
    return Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
  };

  const getEventCountsArray = (eventCounts: Record<string, number> | undefined) => {
    if (!eventCounts) return [];
    return Object.entries(eventCounts)
      .filter(([, count]) => count > 0)
      .sort(([,a], [,b]) => b - a);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <motion.div
            animate={{ rotate: isConnected ? 360 : 0 }}
            transition={{ duration: 2, repeat: isConnected ? Infinity : 0, ease: "linear" }}
            className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"
          />
          <span className="truncate">Tracker Status ({trackers.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-4">
        <AnimatePresence>
          {trackers.map((tracker, index) => {
            const statusColor = getStatusColor(tracker);
            const statusText = getStatusText(tracker);
            const isActive = isActivelyTracking(tracker);
            const totalEvents = getTotalEventCount(tracker.event_counts);
            const eventCountsArray = getEventCountsArray(tracker.event_counts);
            
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
                      {tracker.status === 'recording' && tracker.current_action ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <EnhancedEventTypeIcon 
                            eventType={tracker.current_action.split('_')[1] as any || 'default'}
                            size={16} 
                            className="text-white md:w-6 md:h-6"
                          />
                        </motion.div>
                      ) : (
                        <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${tracker.status === 'active' ? 'bg-white' : 'bg-gray-300'}`} />
                      )}
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
                        <span className="text-xs text-slate-500 hidden md:inline">
                          {Math.floor((Date.now() - tracker.last_activity) / 1000)}s ago
                        </span>
                      </div>
                      
                      {/* Event Type Counts with Icons */}
                      {eventCountsArray.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {eventCountsArray.map(([eventType, count]) => (
                            <motion.div 
                              key={eventType} 
                              className="flex items-center gap-1 text-xs text-slate-700 bg-slate-100 rounded-full px-2 py-1 border border-slate-200"
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <EnhancedEventTypeIcon 
                                eventType={eventType as any}
                                size={14} 
                                className="w-3.5 h-3.5 flex-shrink-0"
                              />
                              <span className="font-medium">{count}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}
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

        {trackers.length === 0 && (
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
          className="grid grid-cols-3 gap-1 md:gap-2 pt-2 md:pt-4 border-t border-slate-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-slate-800">
              {trackers.filter(t => t.status === 'active' || t.status === 'recording').length}
            </div>
            <div className="text-xs text-slate-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-green-600">
              {trackers.filter(t => t.status === 'recording').length}
            </div>
            <div className="text-xs text-slate-500">Recording</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-slate-800">
              {trackers.reduce((sum, t) => sum + getTotalEventCount(t.event_counts), 0)}
            </div>
            <div className="text-xs text-slate-500">Events</div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default TrackerPresenceIndicator;
