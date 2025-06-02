
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import TrackerStatusCard from './TrackerStatusCard';
import TrackerNotificationSystem from './TrackerNotificationSystem';
import TrackerAbsenceManager from './TrackerAbsenceManager';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';

interface TrackerPresenceIndicatorProps {
  matchId: string;
}

const TrackerPresenceIndicator: React.FC<TrackerPresenceIndicatorProps> = ({ matchId }) => {
  const { trackers = [], isConnected } = useRealtimeMatch({ matchId });

  const getTotalEventCount = (eventCounts: Record<string, number> | undefined) => {
    if (!eventCounts) return 0;
    return Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
  };

  const getAggregatedEventCounts = () => {
    const aggregated: Record<string, number> = {};
    // Add safety check for trackers array
    if (!trackers || !Array.isArray(trackers)) {
      return aggregated;
    }
    
    trackers.forEach(tracker => {
      if (tracker.event_counts) {
        Object.entries(tracker.event_counts).forEach(([eventType, count]) => {
          aggregated[eventType] = (aggregated[eventType] || 0) + count;
        });
      }
    });
    return aggregated;
  };

  const aggregatedEventCounts = getAggregatedEventCounts();
  const topEventTypes = Object.entries(aggregatedEventCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <TrackerNotificationSystem trackers={trackers || []} matchId={matchId} />
      
      {/* Main Tracker Status Card */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <motion.div
              animate={{ rotate: isConnected ? 360 : 0 }}
              transition={{ duration: 2, repeat: isConnected ? Infinity : 0, ease: "linear" }}
              className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"
            />
            <span className="truncate">Tracker Status ({(trackers || []).length})</span>
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
            {trackers && trackers.map((tracker, index) => (
              <TrackerStatusCard 
                key={tracker.user_id}
                tracker={tracker}
                index={index}
              />
            ))}
          </AnimatePresence>

          {(!trackers || trackers.length === 0) && (
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

          {/* Event Type Breakdown with Icons */}
          {topEventTypes.length > 0 && (
            <motion.div
              className="pt-2 md:pt-4 border-t border-slate-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="text-xs md:text-sm font-medium text-slate-700 mb-2">Event Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {topEventTypes.map(([eventType, count]) => (
                  <motion.div
                    key={eventType}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EnhancedEventTypeIcon 
                      eventType={eventType as any}
                      size={16}
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-800 capitalize truncate">
                        {eventType}
                      </div>
                      <div className="text-xs text-slate-500">{count}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
                {(trackers || []).filter(t => t.status === 'active' || t.status === 'recording').length}
              </div>
              <div className="text-xs text-slate-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-sm md:text-lg font-bold text-green-600">
                {(trackers || []).filter(t => t.status === 'recording').length}
              </div>
              <div className="text-xs text-slate-500">Recording</div>
            </div>
            <div className="text-center">
              <div className="text-sm md:text-lg font-bold text-slate-800">
                {(trackers || []).reduce((sum, t) => sum + getTotalEventCount(t.event_counts), 0)}
              </div>
              <div className="text-xs text-slate-500">Events</div>
            </div>
            <div className="text-center">
              <div className="text-sm md:text-lg font-bold text-orange-600">
                {(trackers || []).filter(t => t.battery_level && t.battery_level <= 20).length}
              </div>
              <div className="text-xs text-slate-500">Low Battery</div>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Absence Manager */}
      <TrackerAbsenceManager matchId={matchId} />
    </div>
  );
};

export default TrackerPresenceIndicator;
