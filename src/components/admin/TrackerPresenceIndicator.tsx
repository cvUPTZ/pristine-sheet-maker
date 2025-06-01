
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TrackerSyncEvent } from '@/types';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';

interface TrackerUser {
  user_id: string;
  email?: string;
  full_name?: string;
  online_at: string;
  last_event_type?: string;
  last_event_time?: number;
  assigned_event_types?: string[];
  lastKnownAction?: string;
  lastActionTimestamp?: number;
  currentStatus?: 'active' | 'inactive' | 'paused';
  statusTimestamp?: number;
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

  const handleEventReceived = useCallback((event: any) => {
    if (event.type === 'broadcast' && event.event === 'broadcast' && event.payload) {
      const syncEvent = event.payload as TrackerSyncEvent;

      if (syncEvent.matchId && syncEvent.matchId !== matchId) {
        return;
      }

      setTrackers(prevTrackers => {
        return prevTrackers.map(t => {
          if (t.user_id === syncEvent.trackerId) {
            if (syncEvent.eventType === 'tracker_status') {
              return {
                ...t,
                currentStatus: syncEvent.payload.status,
                statusTimestamp: syncEvent.timestamp
              };
            } else if (syncEvent.eventType === 'tracker_action') {
              return {
                ...t,
                lastKnownAction: syncEvent.payload.currentAction || 'unknown_action',
                lastActionTimestamp: syncEvent.timestamp,
                currentStatus: t.currentStatus === 'inactive' ? 'active' : t.currentStatus,
                statusTimestamp: syncEvent.timestamp
              };
            }
          }
          return t;
        });
      });
    } else if (event.type === 'event_recorded' && event.payload) {
      const { created_by, event_type } = event.payload;
      if (created_by && event_type) {
        setTrackers(prevTrackers => prevTrackers.map(t => {
          if (t.user_id === created_by) {
            return {
              ...t,
              last_event_type: event_type,
              last_event_time: Date.now(),
              lastKnownAction: `recorded_${event_type}`,
              lastActionTimestamp: Date.now(),
              currentStatus: 'active',
              statusTimestamp: Date.now()
            };
          }
          return t;
        }));
      }
    }
  }, [matchId, setTrackers]);

  const { onlineUsers, isOnline } = useRealtime({
    channelName: "tracker-admin-sync",
    userId: user?.id || 'admin_listener_tracker_sync',
    onEventReceived: handleEventReceived,
  });

  useEffect(() => {
    fetchAssignedTrackers();
  }, [matchId]);

  useEffect(() => {
    setTrackers(prevTrackers =>
      prevTrackers.map(t => {
        const isUserOnlineInPresence = onlineUsers.some(ou => ou.user_id === t.user_id);
        if (isUserOnlineInPresence) {
          const fiveSecondsAgo = Date.now() - 5000;
          if (t.currentStatus !== 'inactive' || (t.statusTimestamp || 0) < fiveSecondsAgo) {
            return {
              ...t,
              currentStatus: 'active',
              statusTimestamp: t.statusTimestamp || Date.now()
            };
          }
        }
        return t;
      })
    );
  }, [onlineUsers, matchId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000;
      const activeThreshold = 30 * 1000;

      setRecentEvents(prev => {
        const updated = new Map(prev);
        for (const [userId, eventData] of updated) {
          if (now - eventData.time > activeThreshold) {
            updated.delete(userId);
          }
        }
        return updated;
      });

      setTrackers(prevTrackers => prevTrackers.map(t => {
        let updatedTracker = { ...t };
        if (t.lastActionTimestamp && (now - t.lastActionTimestamp > staleThreshold)) {
          updatedTracker.lastKnownAction = undefined;
        }
        return updatedTracker;
      }));
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
              assigned_event_types: []
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
    if (!tracker) {
      return { isOnline: false, activityText: 'Unknown', isActivelyTracking: false };
    }

    const now = Date.now();
    const isOnlineFromStatus = tracker.currentStatus === 'active';
    const isActiveBasedOnTimestamp = (tracker.statusTimestamp && (now - tracker.statusTimestamp < 60000)) ||
                                     (tracker.lastActionTimestamp && (now - tracker.lastActionTimestamp < 60000));

    const isOnlineNow = isOnlineFromStatus && isActiveBasedOnTimestamp;

    let activityText = tracker.currentStatus === 'inactive' ? 'Offline' : (isOnlineNow ? 'Online' : 'Status Unknown');
    let isActivelyTracking = false;

    if (tracker.lastKnownAction && tracker.lastActionTimestamp && (now - tracker.lastActionTimestamp < 30000)) {
      activityText = tracker.lastKnownAction;
      isActivelyTracking = true;
    } else if (tracker.currentStatus === 'active' && tracker.statusTimestamp && (now - tracker.statusTimestamp < 30000)) {
      activityText = 'Active';
      isActivelyTracking = true;
    } else if (tracker.currentStatus === 'paused') {
      activityText = 'Paused';
    }

    const recentEvent = recentEvents.get(trackerId);
    if (!isActivelyTracking && recentEvent && (now - recentEvent.time < 30000)) {
        activityText = `Tracking ${recentEvent.type}`;
        isActivelyTracking = true;
    }

    return {
      isOnline: isOnlineNow || isActivelyTracking,
      activityText,
      isActivelyTracking,
      lastKnownAction: tracker.lastKnownAction,
      lastActionTimestamp: tracker.lastActionTimestamp,
      currentStatus: tracker.currentStatus,
      statusTimestamp: tracker.statusTimestamp,
      colorHint: tracker.lastKnownAction?.split('_')[1] || (isActivelyTracking ? tracker.currentStatus : 'offline')
    };
  };

  const getStatusColor = (tracker: TrackerUser) => {
    const status = getTrackerStatus(tracker.user_id);

    if (status.currentStatus === 'inactive' && (Date.now() - (status.statusTimestamp || 0) > 30000)) return 'from-gray-400 to-gray-500';
    if (status.currentStatus === 'paused') return 'from-yellow-400 to-yellow-500';

    if (status.isActivelyTracking) {
      const actionParts = status.lastKnownAction?.split('_');
      let eventKeyForColor = actionParts && actionParts.length > 1 ? actionParts[1] : null;
      if (actionParts && actionParts[0] === 'arming' && actionParts.length > 2) eventKeyForColor = actionParts[2];

      if (eventKeyForColor && EVENT_COLORS[eventKeyForColor as keyof typeof EVENT_COLORS]) {
        return EVENT_COLORS[eventKeyForColor as keyof typeof EVENT_COLORS];
      }
      if (status.colorHint && EVENT_COLORS[status.colorHint as keyof typeof EVENT_COLORS]) {
         return EVENT_COLORS[status.colorHint as keyof typeof EVENT_COLORS];
      }
      return 'from-green-400 to-green-500';
    }

    if (status.isOnline) return 'from-green-400 to-green-500';

    return 'from-gray-400 to-gray-500';
  };

  const getStatusText = (tracker: TrackerUser) => {
    const status = getTrackerStatus(tracker.user_id);
    return status.activityText;
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <motion.div
            animate={{ rotate: isOnline ? 360 : 0 }}
            transition={{ duration: 2, repeat: isOnline ? Infinity : 0, ease: "linear" }}
            className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex-shrink-0"
          />
          <span className="truncate">Tracker Status ({trackers.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-4">
        <AnimatePresence>
          {trackers.map((tracker, index) => {
            const status = getTrackerStatus(tracker.user_id);
            const statusColor = getStatusColor(tracker);
            
            return (
              <motion.div
                key={`${tracker.user_id}-${tracker.lastActionTimestamp}-${tracker.currentStatus}`}
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
                      animate={status.isActivelyTracking ? {
                        scale: [1, 1.05, 1],
                        boxShadow: statusColor.includes('gray') ? undefined : [
                          `0 0 0 0px ${statusColor.split(' ')[1].replace('to-', 'from-')}/50`,
                          `0 0 0 5px ${statusColor.split(' ')[1].replace('to-', 'from-')}/0`,
                          `0 0 0 0px ${statusColor.split(' ')[1].replace('to-', 'from-')}/0`,
                        ]
                      } : {}}
                      transition={{ duration: 1.5, repeat: status.isActivelyTracking ? Infinity : 0 }}
                    >
                      {status.isActivelyTracking && (status.lastKnownAction || status.colorHint) ? (
                        <motion.div
                          animate={{ rotate: status.lastKnownAction?.includes("selected_player") ? 0 : 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <EnhancedEventTypeIcon 
                            eventType={status.colorHint as any || 'default'}
                            size={16} 
                            className="text-white md:w-6 md:h-6"
                          />
                        </motion.div>
                      ) : (
                        <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${status.isOnline || status.currentStatus === 'active' ? 'bg-white' : 'bg-gray-300'}`} />
                      )}
                    </motion.div>

                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 text-xs md:text-sm truncate">
                        {tracker.email?.split('@')[0] || `Tracker ${tracker.user_id.slice(-4)}`}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <Badge
                          variant={(status.isOnline || status.currentStatus === 'active') ? "default" : "secondary"}
                          className={`text-xs ${(status.isOnline || status.currentStatus === 'active') ? 'bg-gradient-to-r ' + statusColor + ' text-white border-0' : ''}`}
                        >
                          <span className="hidden sm:inline">{status.activityText}</span>
                          <span className="sm:hidden">{(status.isOnline || status.currentStatus === 'active') ? 'On' : 'Off'}</span>
                        </Badge>
                        {status.lastActionTimestamp && (
                          <span className="text-xs text-slate-500 hidden md:inline">
                            {Math.floor((Date.now() - status.lastActionTimestamp) / 1000)}s ago
                          </span>
                        )}
                        {status.currentStatus && status.activityText !== status.currentStatus && (status.currentStatus === 'paused' || status.currentStatus === 'inactive') && (
                           <Badge variant="outline" className="text-xs hidden sm:inline">{status.currentStatus}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {status.isActivelyTracking && !statusColor.includes('gray') && (
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

                {status.isActivelyTracking && !statusColor.includes('gray') && (
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
                {trackers.filter(t => t.currentStatus === 'active' && (Date.now() - (t.statusTimestamp || 0) < 60000)).length}
            </div>
              <div className="text-xs text-slate-500">Currently Active</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-green-600">
                {trackers.filter(t => t.lastKnownAction && (Date.now() - (t.lastActionTimestamp || 0) < 30000)).length}
            </div>
              <div className="text-xs text-slate-500">Recent Actions</div>
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
