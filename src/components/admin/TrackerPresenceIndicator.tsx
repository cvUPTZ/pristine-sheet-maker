import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TrackerSyncEvent } from '@/types';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon'; // Ensure path is correct

interface TrackerUser {
  user_id: string;
  email?: string;
  full_name?: string;
  online_at: string; // From Supabase presence, may not be directly used if using custom status
  // last_event_type?: string; // Superseded
  // last_event_time?: number; // Superseded
  assigned_event_types?: string[];
  lastKnownAction?: string;
  lastActionTimestamp?: number;
  currentStatus?: 'active' | 'inactive' | 'paused' | 'unknown'; // Added 'unknown'
  statusTimestamp?: number;
}

interface TrackerPresenceIndicatorProps {
  matchId: string;
}

// Consistent with TrackerPianoInput's EVENT_TYPE_COLORS for background gradients
const EVENT_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'pass': { bg: 'bg-blue-500', text: 'text-white' },
  'shot': { bg: 'bg-red-500', text: 'text-white' },
  'goal': { bg: 'bg-green-500', text: 'text-white' },
  'foul': { bg: 'bg-yellow-500', text: 'text-black' }, // Yellow might need black text
  'save': { bg: 'bg-purple-500', text: 'text-white' },
  'offside': { bg: 'bg-orange-500', text: 'text-white' },
  'corner': { bg: 'bg-teal-500', text: 'text-white' },
  'sub': { bg: 'bg-indigo-500', text: 'text-white' },
  'active': { bg: 'bg-green-500', text: 'text-white' },
  'paused': { bg: 'bg-yellow-500', text: 'text-black' },
  'inactive': { bg: 'bg-gray-400', text: 'text-white' },
  'offline': { bg: 'bg-gray-400', text: 'text-white' },
  'default': { bg: 'bg-gray-500', text: 'text-white' }
};


const TrackerPresenceIndicator: React.FC<TrackerPresenceIndicatorProps> = ({ matchId }) => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  
  const handleEventReceived = useCallback((event: any) => {
    if (event.type === 'broadcast' && event.event === 'tracker_event' && event.payload) { // Corrected event.event check
      const syncEvent = event.payload as TrackerSyncEvent;

      // console.log('[TrackerPresence] Received tracker_event broadcast:', syncEvent);

      if (syncEvent.matchId && syncEvent.matchId !== matchId) {
        // console.log('[TrackerPresence] Event for different match, ignoring.');
        return;
      }

      setTrackers(prevTrackers => 
        prevTrackers.map(t => {
          if (t.user_id === syncEvent.trackerId) {
            let updatedTracker = { ...t };
            if (syncEvent.eventType === 'tracker_status') {
              updatedTracker = {
                ...t,
                currentStatus: syncEvent.payload.status,
                statusTimestamp: syncEvent.timestamp
              };
            } else if (syncEvent.eventType === 'tracker_action') {
              updatedTracker = {
                ...t,
                lastKnownAction: syncEvent.payload.currentAction || 'unknown_action',
                lastActionTimestamp: syncEvent.timestamp,
                // If an action is received, tracker is implicitly active
                currentStatus: t.currentStatus === 'inactive' ? 'active' : (t.currentStatus || 'active'), 
                statusTimestamp: syncEvent.timestamp 
              };
            }
            // console.log(`[TrackerPresence] Updated tracker ${t.user_id}:`, updatedTracker);
            return updatedTracker;
          }
          return t;
        })
      );
    } 
    // Removed old 'event_recorded' handling as it's covered by tracker_action
  }, [matchId]);

  const { onlineUsers, isOnline } = useRealtime({
    channelName: "tracker-admin-sync", // This is the channel TrackerPianoInput sends to
    userId: user?.id || `admin_listener_tracker_sync_${matchId}`, // Unique listener ID
    onEventReceived: handleEventReceived,
  });

  const fetchAssignedTrackers = useCallback(async () => {
    if (!matchId) return;
    // console.log(`[TrackerPresence] Fetching assigned trackers for matchId: ${matchId}`);
    try {
      const { data: assignments, error } = await supabase
        .from('match_tracker_assignments_view') // Using the view
        .select('tracker_user_id, tracker_email, assigned_event_types') // Select specific fields
        .eq('match_id', matchId);

      if (error) throw error;

      if (assignments) {
        // console.log('[TrackerPresence] Assignments fetched:', assignments);
        const trackerMap = new Map<string, TrackerUser>();
        assignments.forEach(assignment => {
          const userId = assignment.tracker_user_id;
          if (userId) { // Ensure userId is not null/undefined
            if (!trackerMap.has(userId)) {
              trackerMap.set(userId, {
                user_id: userId,
                email: assignment.tracker_email || undefined,
                online_at: '', // This will be updated by Supabase presence or custom logic
                assigned_event_types: assignment.assigned_event_types || [],
                currentStatus: 'unknown', // Initial status
                statusTimestamp: Date.now(),
              });
            } else {
              // Merge event types if a user has multiple assignments (though typically one assignment row per user per match)
              const existing = trackerMap.get(userId)!;
              existing.assigned_event_types = Array.from(new Set([...(existing.assigned_event_types || []), ...(assignment.assigned_event_types || [])]));
            }
          }
        });
        const fetchedTrackers = Array.from(trackerMap.values());
        // console.log('[TrackerPresence] Processed trackers from DB:', fetchedTrackers);
        setTrackers(fetchedTrackers);
      } else {
        setTrackers([]);
      }
    } catch (error) {
      console.error('[TrackerPresence] Error fetching assigned trackers:', error);
      setTrackers([]); // Reset on error
    }
  }, [matchId]);


  useEffect(() => {
    fetchAssignedTrackers();
  }, [fetchAssignedTrackers]); // fetchAssignedTrackers depends on matchId

  // Update tracker statuses based on Supabase Realtime 'onlineUsers' from 'tracker-admin-sync'
  useEffect(() => {
    // console.log('[TrackerPresence] Online users from useRealtime hook:', onlineUsers);
    setTrackers(prevTrackers =>
      prevTrackers.map(t => {
        const isUserInPresence = onlineUsers.some(ou => ou.user_id === t.user_id);
        // console.log(`[TrackerPresence] Checking presence for ${t.user_id}: ${isUserInPresence}`);
        if (isUserInPresence) {
          // If user is in presence channel, and not explicitly set to 'inactive' by a recent tracker_status event
          const fiveSecondsAgo = Date.now() - 5000;
          if (t.currentStatus !== 'inactive' || (t.statusTimestamp || 0) < fiveSecondsAgo) {
            // console.log(`[TrackerPresence] Marking ${t.user_id} as active due to presence.`);
            return {
              ...t,
              currentStatus: t.currentStatus === 'unknown' ? 'active' : t.currentStatus, // If unknown, set to active
              online_at: new Date().toISOString(), // Update online_at from presence
              // Do not overwrite statusTimestamp if currentStatus is already active from a direct event
              statusTimestamp: (t.currentStatus === 'active' && t.statusTimestamp) ? t.statusTimestamp : Date.now(),
            };
          }
        }
        return t;
      })
    );
  }, [onlineUsers]);


  // Cleanup and stale status detection
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const staleActionThreshold = 60 * 1000; // 1 minute for last action
      const staleStatusThreshold = 5 * 60 * 1000; // 5 minutes for overall status if not 'inactive'

      setTrackers(prevTrackers => prevTrackers.map(t => {
        let updatedTracker = { ...t };
        if (t.lastActionTimestamp && (now - t.lastActionTimestamp > staleActionThreshold)) {
          // updatedTracker.lastKnownAction = undefined; // Let it persist but rely on timestamp for "recent"
        }
        // If status is 'active' but not updated for a long time, and not in presence, mark as 'unknown' or 'inactive'
        // This depends on whether 'inactive' is reliably sent on TrackerPianoInput unmount.
        const isUserInPresence = onlineUsers.some(ou => ou.user_id === t.user_id);
        if (t.currentStatus === 'active' && 
            (now - (t.statusTimestamp || 0) > staleStatusThreshold) &&
            !isUserInPresence) {
          // console.log(`[TrackerPresence] Marking ${t.user_id} as inactive due to staleness and no presence.`);
          updatedTracker.currentStatus = 'inactive';
          updatedTracker.statusTimestamp = now; // Update timestamp for this change
        }
        return updatedTracker;
      }));
    }, 30000); // Run every 30 seconds

    return () => clearInterval(interval);
  }, [onlineUsers]); // Rerun if onlineUsers changes, to ensure correct presence check in interval

  const getTrackerDisplayInfo = (tracker: TrackerUser) => {
    const now = Date.now();
    let activityText = tracker.currentStatus === 'inactive' ? 'Offline' : tracker.currentStatus === 'paused' ? 'Paused' : 'Online';
    let isActivelyBroadcasting = false; // True if sending actions like arming/recording
    let iconKey = 'default';
    let badgeColorKey = tracker.currentStatus || 'default';

    const actionIsRecent = tracker.lastActionTimestamp && (now - tracker.lastActionTimestamp < 30000); // 30s recency for actions

    if (tracker.currentStatus === 'active') {
      if (actionIsRecent && tracker.lastKnownAction) {
        activityText = tracker.lastKnownAction.replace(/_/g, ' ').replace(/player \w+$/, ''); // Prettify and remove player ID
        if (activityText.length > 25) activityText = activityText.substring(0, 22) + '...';
        
        isActivelyBroadcasting = true;
        const actionParts = tracker.lastKnownAction.split('_');
        // For "arming_event_PASS_for_player_ID" or "recorded_event_locally_PASS_for_player_ID"
        if ((actionParts[0] === 'arming' || actionParts[0] === 'recorded') && actionParts.length >=3) {
            iconKey = actionParts[2].toLowerCase();
        } else if (actionParts[0] === 'selected' && actionParts[1] === 'player') {
            iconKey = 'default'; // Or a specific "player_select" icon
            activityText = `Selected P.${tracker.lastKnownAction.split('_')[2]}`;
        } else {
            iconKey = actionParts[1]?.toLowerCase() || 'default';
        }
        badgeColorKey = iconKey;
      } else {
        activityText = 'Active'; // General active state
        iconKey = 'default'; // Or an 'active' icon
        badgeColorKey = 'active';
      }
    } else if (tracker.currentStatus === 'paused') {
        iconKey = 'default'; // Or a 'pause' icon
        badgeColorKey = 'paused';
    } else if (tracker.currentStatus === 'inactive' || tracker.currentStatus === 'unknown') {
        iconKey = 'default'; // Or an 'offline' icon
        badgeColorKey = tracker.currentStatus === 'inactive' ? 'inactive' : 'offline';
    }
    
    const badgeStyle = EVENT_BADGE_COLORS[badgeColorKey] || EVENT_BADGE_COLORS.default;

    return {
      activityText,
      isActivelyBroadcasting,
      iconKey,
      badgeStyle,
      status: tracker.currentStatus,
      lastActionTimestamp: tracker.lastActionTimestamp
    };
  };


  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-slate-200">
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <motion.div
            animate={{ opacity: isOnline ? [0.5, 1, 0.5] : 1 }} // Pulse opacity if admin listener is online
            transition={{ duration: 2, repeat: isOnline ? Infinity : 0, ease: "easeInOut" }}
            className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 flex-shrink-0"
          />
          <span className="truncate">Live Tracker Status ({trackers.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence>
          {trackers.map((tracker, index) => {
            const displayInfo = getTrackerDisplayInfo(tracker);
            
            return (
              <motion.div
                key={tracker.user_id} // Key should be stable for the tracker
                layout // Animate layout changes
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className={`flex items-center justify-between p-2 md:p-3 bg-white rounded-lg shadow border ${displayInfo.isActivelyBroadcasting ? 'border-blue-300' : 'border-slate-200'} hover:shadow-md transition-all duration-200`}>
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <motion.div
                      className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full ${displayInfo.badgeStyle.bg} shadow flex items-center justify-center flex-shrink-0`}
                      animate={displayInfo.isActivelyBroadcasting ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.2, repeat: displayInfo.isActivelyBroadcasting ? Infinity : 0 }}
                    >
                      <EnhancedEventTypeIcon 
                        eventKey={displayInfo.iconKey}
                        size={16} // md:size-5 doesn't work directly as prop
                        className={`${displayInfo.badgeStyle.text} w-4 h-4 md:w-5 md:h-5`} // Control size via className if needed
                        isSelected={true} // Keep icon bright against colored background
                      />
                    </motion.div>

                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 text-xs md:text-sm truncate">
                        {tracker.email?.split('@')[0] || `User ${tracker.user_id.slice(-5)}`}
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <Badge
                          className={`text-xs ${displayInfo.badgeStyle.bg} ${displayInfo.badgeStyle.text} border-0`}
                        >
                          {displayInfo.activityText}
                        </Badge>
                        {displayInfo.lastActionTimestamp && displayInfo.status !== 'inactive' && (
                          <span className="text-xs text-slate-400 hidden md:inline">
                            {Math.floor((Date.now() - displayInfo.lastActionTimestamp) / 1000)}s ago
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {displayInfo.isActivelyBroadcasting && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="flex items-center gap-0.5 md:gap-1 flex-shrink-0 ml-2"
                      >
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${displayInfo.badgeStyle.bg}`}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {trackers.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 md:py-6 text-slate-500">
            <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 rounded-full bg-slate-200 flex items-center justify-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
            </div>
            <p className="font-medium text-xs md:text-sm">No trackers assigned or active</p>
            <p className="text-xs text-slate-400">Assign trackers to this match to see their status.</p>
          </motion.div>
        )}
      </CardContent>
       <motion.div
          className="grid grid-cols-3 gap-1 md:gap-2 p-2 md:p-3 border-t border-slate-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center">
            <div className="text-sm md:text-base font-bold text-slate-700">
                {trackers.filter(t => t.currentStatus === 'active' && (Date.now() - (t.statusTimestamp || 0) < 60000)).length}
            </div>
              <div className="text-xs text-slate-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-base font-bold text-blue-600">
                {trackers.filter(t => t.lastKnownAction && (Date.now() - (t.lastActionTimestamp || 0) < 30000)).length}
            </div>
              <div className="text-xs text-slate-500">Broadcasting</div>
          </div>
          <div className="text-center">
            <div className="text-sm md:text-base font-bold text-slate-700">
              {trackers.length}
            </div>
            <div className="text-xs text-slate-500">Assigned</div>
          </div>
        </motion.div>
    </Card>
  );
};

export default TrackerPresenceIndicator;
