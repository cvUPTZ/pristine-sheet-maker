
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';

interface TrackerStatus {
  user_id: string;
  email?: string;
  status: 'active' | 'inactive' | 'recording';
  last_activity: number;
  current_action?: string;
  event_counts?: Record<string, number>;
  battery_level?: number;
  network_quality?: 'excellent' | 'good' | 'poor';
}

interface TrackerStatusCardProps {
  tracker: TrackerStatus;
  index: number;
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

const TrackerStatusCard: React.FC<TrackerStatusCardProps> = ({ tracker, index }) => {
  const getStatusColor = () => {
    if (tracker.status === 'recording') {
      const action = tracker.current_action || '';
      const eventType = action.split('_')[1];
      return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] || EVENT_COLORS.default;
    }
    if (tracker.status === 'active') return 'from-green-400 to-green-500';
    return 'from-gray-400 to-gray-500';
  };

  const getStatusText = () => {
    if (tracker.status === 'recording' && tracker.current_action) {
      const action = tracker.current_action.split('_');
      return action.length > 1 ? `Recording ${action[1]}` : 'Recording';
    }
    return tracker.status === 'active' ? 'Active' : 'Offline';
  };

  const isActivelyTracking = () => {
    return tracker.status === 'recording' || 
           (tracker.status === 'active' && Date.now() - tracker.last_activity < 30000);
  };

  const getTotalEventCount = () => {
    if (!tracker.event_counts) return 0;
    return Object.values(tracker.event_counts).reduce((sum, count) => sum + count, 0);
  };

  const getEventCountsArray = () => {
    if (!tracker.event_counts) return [];
    return Object.entries(tracker.event_counts)
      .filter(([, count]) => count > 0)
      .sort(([,a], [,b]) => b - a);
  };

  const getBatteryColor = () => {
    if (!tracker.battery_level) return 'text-gray-500';
    if (tracker.battery_level <= 20) return 'text-red-600';
    if (tracker.battery_level <= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getNetworkQualityColor = () => {
    switch (tracker.network_quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();
  const isActive = isActivelyTracking();
  const totalEvents = getTotalEventCount();
  const eventCountsArray = getEventCountsArray();

  return (
    <motion.div
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
              
              {/* Battery Status */}
              {tracker.battery_level !== undefined && (
                <Badge variant="outline" className={`text-xs ${getBatteryColor()}`}>
                  🔋 {tracker.battery_level}%
                </Badge>
              )}
              
              {/* Network Quality */}
              {tracker.network_quality && (
                <Badge variant="outline" className={`text-xs ${getNetworkQualityColor()}`}>
                  📶 {tracker.network_quality}
                </Badge>
              )}
              
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
};

export default TrackerStatusCard;
