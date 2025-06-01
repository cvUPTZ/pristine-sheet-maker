
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackerAbsenceDetectionOptions {
  matchId: string;
  inactivityThreshold?: number; // in milliseconds
  onTrackerAbsent?: (trackerId: string, reason: string) => void;
}

interface TrackerActivityInfo {
  user_id: string;
  last_seen: number;
  status: 'active' | 'inactive' | 'recording';
  consecutive_missed_heartbeats: number;
}

export const useTrackerAbsenceDetection = ({
  matchId,
  inactivityThreshold = 180000, // 3 minutes default
  onTrackerAbsent
}: TrackerAbsenceDetectionOptions) => {
  const [trackerActivities, setTrackerActivities] = useState<Map<string, TrackerActivityInfo>>(new Map());
  const [detectedAbsences, setDetectedAbsences] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout>();

  // Update tracker activity when we receive heartbeats
  const updateTrackerActivity = useCallback((trackerId: string, status: 'active' | 'inactive' | 'recording') => {
    setTrackerActivities(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(trackerId);
      
      newMap.set(trackerId, {
        user_id: trackerId,
        last_seen: Date.now(),
        status,
        consecutive_missed_heartbeats: status === 'inactive' ? (existing?.consecutive_missed_heartbeats || 0) + 1 : 0
      });
      
      return newMap;
    });
  }, []);

  // Check for absent trackers
  const checkForAbsentTrackers = useCallback(() => {
    const now = Date.now();
    const newAbsences = new Set<string>();

    trackerActivities.forEach((activity, trackerId) => {
      const timeSinceLastSeen = now - activity.last_seen;
      const isInactive = timeSinceLastSeen > inactivityThreshold;
      const hasConsecutiveMissedHeartbeats = activity.consecutive_missed_heartbeats >= 3;
      
      if ((isInactive || hasConsecutiveMissedHeartbeats) && !detectedAbsences.has(trackerId)) {
        newAbsences.add(trackerId);
        
        const reason = isInactive 
          ? `No activity for ${Math.round(timeSinceLastSeen / 60000)} minutes`
          : `Missed ${activity.consecutive_missed_heartbeats} consecutive heartbeats`;
        
        console.log(`[AbsenceDetection] Tracker ${trackerId} detected as absent: ${reason}`);
        
        // Notify about the absence
        toast.warning(
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <div>
              <div className="font-medium">Tracker Absence Detected</div>
              <div className="text-sm text-gray-600">
                Tracker {trackerId.slice(-4)} - {reason}
              </div>
            </div>
          </div>,
          {
            id: `absence-${trackerId}`,
            duration: 8000,
          }
        );
        
        onTrackerAbsent?.(trackerId, reason);
      }
    });

    if (newAbsences.size > 0) {
      setDetectedAbsences(prev => new Set([...prev, ...newAbsences]));
    }
  }, [trackerActivities, inactivityThreshold, detectedAbsences, onTrackerAbsent]);

  // Clear absence status when tracker becomes active again
  const clearAbsenceStatus = useCallback((trackerId: string) => {
    setDetectedAbsences(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackerId);
      return newSet;
    });
    
    toast.success(
      <div className="flex items-center gap-2">
        <span>✅</span>
        <div>
          <div className="font-medium">Tracker Reconnected</div>
          <div className="text-sm text-gray-600">
            Tracker {trackerId.slice(-4)} is back online
          </div>
        </div>
      </div>,
      {
        id: `reconnected-${trackerId}`,
        duration: 5000,
      }
    );
  }, []);

  // Record tracker activity in the database
  const recordTrackerActivity = useCallback(async (trackerId: string) => {
    try {
      await supabase
        .from('match_tracker_activity')
        .upsert({
          match_id: matchId,
          user_id: trackerId,
          last_active_at: new Date().toISOString()
        }, {
          onConflict: 'match_id,user_id'
        });
    } catch (error) {
      console.error('[AbsenceDetection] Error recording tracker activity:', error);
    }
  }, [matchId]);

  // Find replacement tracker
  const findReplacementTracker = useCallback(async (absentTrackerId: string): Promise<string | null> => {
    try {
      // Get all tracker users
      const { data: trackerUsers, error: trackersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      // Get current match assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('tracker_id')
        .eq('match_id', matchId);

      if (assignmentsError) throw assignmentsError;

      const assignedTrackerIds = new Set(assignments?.map(a => a.tracker_id) || []);
      
      // Find available trackers (not assigned to this match and not the absent one)
      const availableTrackers = trackerUsers?.filter(tracker => 
        tracker.id !== absentTrackerId && 
        !assignedTrackerIds.has(tracker.id) &&
        !detectedAbsences.has(tracker.id)
      ) || [];

      if (availableTrackers.length > 0) {
        // Return the first available tracker
        return availableTrackers[0].id;
      }

      return null;
    } catch (error) {
      console.error('[AbsenceDetection] Error finding replacement tracker:', error);
      return null;
    }
  }, [matchId, detectedAbsences]);

  // Handle tracker absence with replacement logic
  const handleTrackerAbsence = useCallback(async (absentTrackerId: string, reason: string) => {
    console.log(`[AbsenceDetection] Handling absence for tracker ${absentTrackerId}: ${reason}`);
    
    // Try to find a replacement
    const replacementId = await findReplacementTracker(absentTrackerId);
    
    if (replacementId) {
      try {
        // Call the database function to handle the absence
        const { error } = await supabase.rpc('handle_tracker_absence', {
          p_absent_tracker_user_id: absentTrackerId,
          p_match_id: matchId,
          p_replacement_tracker_user_id: replacementId
        });

        if (error) throw error;

        toast.success(
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <div>
              <div className="font-medium">Replacement Assigned</div>
              <div className="text-sm text-gray-600">
                New tracker assigned for absent tracker {absentTrackerId.slice(-4)}
              </div>
            </div>
          </div>,
          {
            duration: 6000,
          }
        );
        
        console.log(`[AbsenceDetection] Replacement tracker ${replacementId} assigned for ${absentTrackerId}`);
      } catch (error) {
        console.error('[AbsenceDetection] Error handling tracker absence:', error);
        
        toast.error(
          <div className="flex items-center gap-2">
            <span>❌</span>
            <div>
              <div className="font-medium">Failed to Assign Replacement</div>
              <div className="text-sm text-gray-600">
                Error processing absence for tracker {absentTrackerId.slice(-4)}
              </div>
            </div>
          </div>,
          {
            duration: 8000,
          }
        );
      }
    } else {
      toast.warning(
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <div>
            <div className="font-medium">No Replacement Available</div>
            <div className="text-sm text-gray-600">
              No available trackers to replace {absentTrackerId.slice(-4)}
            </div>
          </div>
        </div>,
        {
          duration: 8000,
        }
      );
    }
  }, [matchId, findReplacementTracker]);

  // Start monitoring
  useEffect(() => {
    if (!matchId) return;

    // Set up periodic absence checking
    intervalRef.current = setInterval(checkForAbsentTrackers, 30000); // Check every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [matchId, checkForAbsentTrackers]);

  return {
    trackerActivities: Array.from(trackerActivities.values()),
    detectedAbsences: Array.from(detectedAbsences),
    updateTrackerActivity,
    clearAbsenceStatus,
    recordTrackerActivity,
    handleTrackerAbsence,
    findReplacementTracker
  };
};
