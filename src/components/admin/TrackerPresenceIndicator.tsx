
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { useRealtimeEventSync } from '@/hooks/useRealtimeEventSync';

interface TrackerUser {
  user_id: string;
  email?: string;
  full_name?: string;
  online_at: string;
  last_event_type?: string;
  last_event_time?: number;
  assigned_event_types?: string[];
  status: 'online' | 'tracking' | 'offline';
}

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
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [recentEvents, setRecentEvents] = useState<Map<string, { type: string; time: number }>>(new Map());

  // Real-time synchronization
  const { connectedTrackers } = useRealtimeEventSync({
    matchId,
    onEventReceived: (event) => {
      if (event.created_by) {
        setRecentEvents(prev => new Map(prev.set(event.created_by, {
          type: event.event_type,
          time: Date.now()
        })));
      }
    },
    onTrackerPresenceUpdate: (presenceTrackers) => {
      // Merge presence data with assigned tracker data
      setTrackers(prev => {
        const updatedTrackers = [...prev];
        
        presenceTrackers.forEach(presenceTracker => {
          const existingIndex = updatedTrackers.findIndex(t => t.user_id === presenceTracker.user_id);
          
          if (existingIndex >= 0) {
            updatedTrackers[existingIndex] = {
              ...updatedTrackers[existingIndex],
              ...presenceTracker,
              online_at: presenceTracker.online_at
            };
          } else {
            updatedTrackers.push(presenceTracker);
          }
        });

        // Mark trackers as offline if they're not in presence
        return updatedTrackers.map(tracker => ({
          ...tracker,
          status: presenceTrackers.some(p => p.user_id === tracker.user_id) 
            ? (tracker.status || 'online')
            : 'offline'
        }));
      });
    }
  });

  useEffect(() => {
    fetchAssignedTrackers();
  }, [matchId]);

  useEffect(() => {
    // Clean up old events every 30 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentEvents(prev => {
        const updated = new Map(prev);
        for (const [userId, eventData] of updated) {
          if (now - eventData.time > 30000) { // Remove events older than 30 seconds
            updated.delete(userId);
          }
        }
        return updated;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAssignedTrackers = async () => {
    try {
      const { data: assignments } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (assignments) {
        const trackerMap = new Map<string, TrackerUser>();
        
        assignments.forEach(assignment => {
          const userId = assignment.tracker_user_id;
          if (userId && !trackerMap.has(userId)) {
            trackerMap.set(userId, {
              user_id: userId,
              email: assignment.tracker_email || undefined,
              online_at: '',
              assigned_event_types: [],
              status: 'offline'
            });
          }
        });

        setTrackers(Array.from(trackerMap.values()));
      }
    } catch (error) {
      console.error('Error fetching assigned trackers:', error);
    }
  };

  const getTrackerStatus = (trackerId: string) => {
    const tracker = trackers.find(t => t.user_id === trackerId);
    const recentEvent = recentEvents.get(trackerId);
    const isOnline = tracker?.status !== 'offline';
    
    return {
      isOnline,
      lastEventType: recentEvent?.type,
      lastEventTime: recentEvent?.time,
      isActivelyTracking: recentEvent && (Date.now() - recentEvent.time < 30000),
      status: tracker?.status || 'offline'
    };
  };

  const getStatusColor = (status: ReturnType<typeof getTrackerStatus>) => {
    if (!status.isOnline) return 'from-gray-400 to-gray-500';
    if (status.status === 'tracking' && status.lastEventType) {
      return EVENT_COLORS[status.lastEventType as keyof typeof EVENT_COLORS] || EVENT_COLORS.default;
    }
    return 'from-green-400 to-green-500';
  };

  const getStatusText = (status: ReturnType<typeof getTrackerStatus>) => {
    if (!status.isOnline) return 'Offline';
    if (status.status === 'tracking' && status.lastEventType) {
      return `Tracking ${status.lastEventType}`;
    }
    return 'Online';
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <motion.div
            animate={{ rotate: connectedTrackers.length > 0 ? 360 : 0 }}
            transition={{ duration: 2, repeat: connectedTrackers.length > 0 ? Infinity : 0, ease: "linear" }}
            className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"
          />
          <span className="truncate">Live Tracker Status ({connectedTrackers.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-4">
        <AnimatePresence>
          {trackers.map((tracker, index) => {
            const status = getTrackerStatus(tracker.user_id);
            const statusColor = getStatusColor(status);
            
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
                    {/* Status Indicator */}
                    <motion.div
                      className={`relative w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-r ${statusColor} shadow-lg flex items-center justify-center flex-shrink-0`}
                      animate={status.status === 'tracking' ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(59, 130, 246, 0.7)',
                          '0 0 0 10px rgba(59, 130, 246, 0)',
                          '0 0 0 0 rgba(59, 130, 246, 0)'
                        ]
                      } : {}}
                      transition={{ duration: 1.5, repeat: status.status === 'tracking' ? Infinity : 0 }}
                    >
                      {status.status === 'tracking' && status.lastEventType ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <EnhancedEventTypeIcon 
                            eventKey={status.lastEventType} 
                            size={16} 
                            isSelected={true}
                            className="text-white md:w-6 md:h-6"
                          />
                        </motion.div>
                      ) : (
                        <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${status.isOnline ? 'bg-white' : 'bg-gray-300'}`} />
                      )}
                    </motion.div>

                    {/* Tracker Info */}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 text-xs md:text-sm truncate">
                        {tracker.email?.split('@')[0] || `Tracker ${tracker.user_id.slice(-4)}`}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <Badge 
                          variant={status.isOnline ? "default" : "secondary"}
                          className={`text-xs ${status.isOnline ? 'bg-gradient-to-r ' + statusColor + ' text-white border-0' : ''}`}
                        >
                          <span className="hidden sm:inline">{getStatusText(status)}</span>
                          <span className="sm:hidden">{status.isOnline ? 'On' : 'Off'}</span>
                        </Badge>
                        {status.lastEventTime && (
                          <span className="text-xs text-slate-500 hidden md:inline">
                            {Math.floor((Date.now() - status.lastEventTime) / 1000)}s ago
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Activity Indicator */}
                  <AnimatePresence>
                    {status.status === 'tracking' && (
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

                {/* Pulse Effect for Active Tracking */}
                {status.status === 'tracking' && (
                  <motion.div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${statusColor} opacity-20`}
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.2, 0.1, 0.2]
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

        {/* Summary Stats */}
        <motion.div 
          className="grid grid-cols-3 gap-1 md:gap-2 pt-2 md:pt-4 border-t border-slate-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-slate-800">
              {connectedTrackers.filter(t => t.status !== 'offline').length}
            </div>
            <div className="text-xs text-slate-500">Online</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-green-600">
              {connectedTrackers.filter(t => t.status === 'tracking').length}
            </div>
            <div className="text-xs text-slate-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-slate-800">
              {trackers.length}
            </div>
            <div className="text-xs text-slate-500">Total</div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default TrackerPresenceIndicator;
