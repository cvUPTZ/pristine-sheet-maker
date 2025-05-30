
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
  last_event_type?: string; // Will be superseded by lastKnownAction
  last_event_time?: number; // Will be superseded by lastActionTimestamp
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
  // The recentEvents state and its cleanup can be removed if fully migrated
  // For now, we'll keep it but remove its usage in handleEventReceived's old path
  const [recentEvents, setRecentEvents] = useState<Map<string, { type: string; time: number }>>(new Map());

  const handleEventReceived = useCallback((event: any) => {
    console.log('[REALTIME_DEBUG] handleEventReceived CALLED. Raw event type from Supabase:', event.type, 'Raw Supabase event name:', event.event);
    // Check for the new broadcast structure
    if (event.type === 'broadcast' && event.payload && event.payload.event === 'tracker_event' && event.payload.payload) {
      const syncEvent = event.payload.payload as TrackerSyncEvent;
      console.log('[REALTIME_DEBUG] Received tracker_event (corrected path):', JSON.stringify(syncEvent, null, 2));

      if (syncEvent.matchId && syncEvent.matchId !== matchId) {
        console.log(`[REALTIME_DEBUG] Ignoring event for other matchId. Expected: ${matchId}, Got: ${syncEvent.matchId}`);
        return;
      }

      setTrackers(prevTrackers => {
        console.log('[REALTIME_DEBUG] Processing event in setTrackers (corrected path). Current syncEvent:', JSON.stringify(syncEvent, null, 2));
        console.log('[REALTIME_DEBUG] prevTrackers state (corrected path):', JSON.stringify(prevTrackers, null, 2));
        return prevTrackers.map(t => {
          if (t.user_id === syncEvent.trackerId) {
            if (syncEvent.eventType === 'tracker_status') {
              const updatedTracker = {
                ...t,
                currentStatus: syncEvent.payload.status,
                statusTimestamp: syncEvent.timestamp
              };
              console.log(`[REALTIME_DEBUG] Matched tracker_status for trackerId: ${t.user_id}. Old:`, JSON.stringify(t, null, 2), 'New:', JSON.stringify(updatedTracker, null, 2));
              return updatedTracker;
            } else if (syncEvent.eventType === 'tracker_action') {
              const updatedTracker = {
                ...t,
                lastKnownAction: syncEvent.payload.currentAction || 'unknown_action',
                lastActionTimestamp: syncEvent.timestamp,
                currentStatus: t.currentStatus === 'inactive' ? 'active' : t.currentStatus,
                statusTimestamp: syncEvent.timestamp
              };
              console.log(`[REALTIME_DEBUG] Matched tracker_action for trackerId: ${t.user_id}. Old:`, JSON.stringify(t, null, 2), 'New:', JSON.stringify(updatedTracker, null, 2));
              return updatedTracker;
            }
          }
          return t;
        });
      });
    } else if (event.type === 'event_recorded' && event.payload) {
      // This section handles the old 'event_recorded' direct events.
      // As per instruction, setRecentEvents is removed.
      // We will still update the main 'trackers' state for compatibility.
      const { created_by, event_type } = event.payload;
      if (created_by && event_type) {
        console.log(`[REALTIME_DEBUG] Received old 'event_recorded': User ${created_by}, Type ${event_type}`);
        // setRecentEvents(prev => new Map(prev.set(created_by, { type: event_type, time: Date.now() }))); // Removed as per instruction
        setTrackers(prevTrackers => prevTrackers.map(t => {
          if (t.user_id === created_by) {
            const updatedTracker = {
              ...t,
              last_event_type: event_type, // old field
              last_event_time: Date.now(), // old field
              lastKnownAction: `recorded_${event_type}`, // new field for compatibility
              lastActionTimestamp: Date.now(),
              currentStatus: 'active', // Assume active on old event type
              statusTimestamp: Date.now()
            };
            console.log(`[REALTIME_DEBUG] Matched old 'event_recorded' for trackerId: ${t.user_id}. Old:`, JSON.stringify(t, null, 2), 'New:', JSON.stringify(updatedTracker, null, 2));
            return updatedTracker;
          }
          return t;
        }));
      }
    }
  }, [matchId, setTrackers]); // matchId and setTrackers are dependencies

  const { onlineUsers, isOnline } = useRealtime({
    channelName: "tracker-admin-sync",
    userId: user?.id || 'admin_listener_tracker_sync',
    onEventReceived: handleEventReceived, // Pass the memoized callback
  });

  useEffect(() => {
    fetchAssignedTrackers();
  }, [matchId]);

  // Effect to update tracker statuses based on Supabase presence channel `onlineUsers`
  useEffect(() => {
    setTrackers(prevTrackers =>
      prevTrackers.map(t => {
        const isUserOnlineInPresence = onlineUsers.some(ou => ou.user_id === t.user_id);
        if (isUserOnlineInPresence) {
          // If user is in presence channel, mark as active, unless already known to be inactive recently
          // This avoids overriding a very recent 'inactive' event from TrackerPianoInput unmount
          const fiveSecondsAgo = Date.now() - 5000;
          if (t.currentStatus !== 'inactive' || (t.statusTimestamp || 0) < fiveSecondsAgo) {
            return {
              ...t,
              currentStatus: 'active',
              statusTimestamp: t.statusTimestamp || Date.now() // keep existing timestamp if available, else update
            };
          }
        }
        // Note: This doesn't set users to 'inactive' if they leave presence,
        // that's handled by the 'inactive' TrackerSyncEvent or timeout.
        return t;
      })
    );
  }, [onlineUsers, matchId]); // Rerun when onlineUsers or matchId changes

  useEffect(() => {
    // Clean up old events and statuses every 30 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      const activeThreshold = 30 * 1000; // 30 seconds for recent events

      setRecentEvents(prev => { // Keep cleaning old recentEvents map for now
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
          // updatedTracker.lastActionTimestamp = undefined; // Keep timestamp for historical reference?
        }
        if (t.statusTimestamp && (now - t.statusTimestamp > staleThreshold) && t.currentStatus !== 'inactive') {
          // If status is old and not explicitly 'inactive', mark as stale or revert to 'inactive'
          // This depends on whether 'inactive' is reliably sent on TrackerPianoInput unmount.
          // For now, let's assume 'inactive' is sent. If not, we might mark as 'inactive' here.
          // updatedTracker.currentStatus = 'inactive'; // Example of forcing inactive
          // updatedTracker.statusTimestamp = now;
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
    // Consider active if status is active and timestamp is recent, or if last action was recent
    const isActiveBasedOnTimestamp = (tracker.statusTimestamp && (now - tracker.statusTimestamp < 60000)) ||
                                     (tracker.lastActionTimestamp && (now - tracker.lastActionTimestamp < 60000));

    const isOnlineNow = isOnlineFromStatus && isActiveBasedOnTimestamp;

    let activityText = tracker.currentStatus === 'inactive' ? 'Offline' : (isOnlineNow ? 'Online' : 'Status Unknown');
    let isActivelyTracking = false;

    if (tracker.lastKnownAction && tracker.lastActionTimestamp && (now - tracker.lastActionTimestamp < 30000)) {
      activityText = tracker.lastKnownAction;
      isActivelyTracking = true;
    } else if (tracker.currentStatus === 'active' && tracker.statusTimestamp && (now - tracker.statusTimestamp < 30000)) {
      activityText = 'Active'; // General active state if no specific action recently
      isActivelyTracking = true; // Considered active for color indication
    } else if (tracker.currentStatus === 'paused') {
      activityText = 'Paused';
    }

    // Fallback for older event system if still needed
    const recentEvent = recentEvents.get(trackerId);
    if (!isActivelyTracking && recentEvent && (now - recentEvent.time < 30000)) {
        activityText = `Tracking ${recentEvent.type}`; // old style
        isActivelyTracking = true;
    }


    return {
      isOnline: isOnlineNow || isActivelyTracking, // Simplified online definition
      activityText,
      isActivelyTracking,
      lastKnownAction: tracker.lastKnownAction,
      lastActionTimestamp: tracker.lastActionTimestamp,
      currentStatus: tracker.currentStatus,
      statusTimestamp: tracker.statusTimestamp,
      // For color, use last action or general active status
      colorHint: tracker.lastKnownAction?.split('_')[1] || (isActivelyTracking ? tracker.currentStatus : 'offline')
    };
  };

  const getStatusColor = (tracker: TrackerUser) => {
    const status = getTrackerStatus(tracker.user_id); // Call new getTrackerStatus

    if (status.currentStatus === 'inactive' && (Date.now() - (status.statusTimestamp || 0) > 30000)) return 'from-gray-400 to-gray-500'; // Offline
    if (status.currentStatus === 'paused') return 'from-yellow-400 to-yellow-500'; // Paused

    if (status.isActivelyTracking) {
      // Try to get color from action, e.g., "recorded_pass_..." -> "pass"
      const actionParts = status.lastKnownAction?.split('_');
      let eventKeyForColor = actionParts && actionParts.length > 1 ? actionParts[1] : null;
      if (actionParts && actionParts[0] === 'arming' && actionParts.length > 2) eventKeyForColor = actionParts[2];


      if (eventKeyForColor && EVENT_COLORS[eventKeyForColor as keyof typeof EVENT_COLORS]) {
        return EVENT_COLORS[eventKeyForColor as keyof typeof EVENT_COLORS];
      }
      // Fallback for general 'active' or old system
      if (status.colorHint && EVENT_COLORS[status.colorHint as keyof typeof EVENT_COLORS]) {
         return EVENT_COLORS[status.colorHint as keyof typeof EVENT_COLORS];
      }
      return 'from-green-400 to-green-500'; // Generic active
    }

    if (status.isOnline) return 'from-green-400 to-green-500'; // Online but not actively sending actions

    return 'from-gray-400 to-gray-500'; // Default to offline
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
            // getTrackerStatus and getStatusColor now take the tracker object
            const status = getTrackerStatus(tracker.user_id); // This still returns the detailed status object
            const statusColor = getStatusColor(tracker); // Pass the tracker object
            
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
                      animate={status.isActivelyTracking ? { /* Animation for active tracking */
                        scale: [1, 1.05, 1],
                        // Example: Use a generic pulse or specific animation based on action
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
                            eventKey={status.colorHint || 'default'} // Use colorHint from status
                            size={16} 
                            isSelected={true} // isSelected might need re-evaluation based on new status
                            className="text-white md:w-6 md:h-6"
                          />
                        </motion.div>
                      ) : (
                        <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${status.isOnline || status.currentStatus === 'active' ? 'bg-white' : 'bg-gray-300'}`} />
                      )}
                    </motion.div>

                    {/* Tracker Info */}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 text-xs md:text-sm truncate">
                        {tracker.email?.split('@')[0] || `Tracker ${tracker.user_id.slice(-4)}`}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <Badge 
                          variant={(status.isOnline || status.currentStatus === 'active') ? "default" : "secondary"}
                          className={`text-xs ${(status.isOnline || status.currentStatus === 'active') ? 'bg-gradient-to-r ' + statusColor + ' text-white border-0' : ''}`}
                        >
                          <span className="hidden sm:inline">{getStatusText(tracker)}</span>
                          <span className="sm:hidden">{(status.isOnline || status.currentStatus === 'active') ? 'On' : 'Off'}</span>
                        </Badge>
                        {status.lastActionTimestamp && ( // Use lastActionTimestamp
                          <span className="text-xs text-slate-500 hidden md:inline">
                            {Math.floor((Date.now() - status.lastActionTimestamp) / 1000)}s ago
                          </span>
                        )}
                        {/* Display currentStatus if useful and not already part of getStatusText */}
                        {status.currentStatus && status.activityText !== status.currentStatus && (status.currentStatus === 'paused' || status.currentStatus === 'inactive') && (
                           <Badge variant="outline" className="text-xs hidden sm:inline">{status.currentStatus}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Activity Indicator - can be simplified or enhanced based on new states */}
                  <AnimatePresence>
                    {status.isActivelyTracking && !statusColor.includes('gray') && ( // Show for active, non-offline colors
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

                {/* Pulse Effect for Active Tracking - can be simplified or enhanced */}
                {status.isActivelyTracking && !statusColor.includes('gray') && (
                  <motion.div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${statusColor} opacity-10 pointer-events-none`} // Reduced opacity
                    animate={{
                      scale: [1, 1.02, 1], // Subtle scale
                      opacity: [0.1, 0.05, 0.1] // Subtle opacity change
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
                {/* onlineUsers from tracker-admin-sync might be different from presence on old channel */}
                {/* This should reflect users connected to the 'tracker-admin-sync' channel if available,
                    or count trackers with currentStatus 'active' */}
                {trackers.filter(t => t.currentStatus === 'active' && (Date.now() - (t.statusTimestamp || 0) < 60000)).length}
            </div>
              <div className="text-xs text-slate-500">Currently Active</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-lg font-bold text-green-600">
                {/* Count trackers with a recent action */}
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
