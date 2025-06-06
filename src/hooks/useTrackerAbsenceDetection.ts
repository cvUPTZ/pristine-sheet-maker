
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackerAbsenceDetectionOptions {
  matchId: string;
  inactivityThreshold?: number;
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
  inactivityThreshold = 180000,
  onTrackerAbsent
}: TrackerAbsenceDetectionOptions) => {
  const [trackerActivities, setTrackerActivities] = useState<Map<string, TrackerActivityInfo>>(new Map());
  const [detectedAbsences, setDetectedAbsences] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout>();

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
        
        toast.warning(`Tracker Absence Detected: Tracker ${trackerId.slice(-4)} - ${reason}`, {
          id: `absence-${trackerId}`,
          duration: 8000,
        });
        
        onTrackerAbsent?.(trackerId, reason);
      }
    });

    if (newAbsences.size > 0) {
      setDetectedAbsences(prev => new Set([...prev, ...newAbsences]));
    }
  }, [trackerActivities, inactivityThreshold, detectedAbsences, onTrackerAbsent]);

  const clearAbsenceStatus = useCallback((trackerId: string) => {
    setDetectedAbsences(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackerId);
      return newSet;
    });
    
    toast.success(`Tracker Reconnected: Tracker ${trackerId.slice(-4)} is back online`, {
      id: `reconnected-${trackerId}`,
      duration: 5000,
    });
  }, []);

  const findReplacementTracker = useCallback(async (absentTrackerId: string): Promise<string | null> => {
    try {
      const { data: trackerUsers, error: trackersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('tracker_id')
        .eq('match_id', matchId);

      if (assignmentsError) throw assignmentsError;

      const assignedTrackerIds = new Set(assignments?.map(a => a.tracker_id) || []);
      
      const availableTrackers = trackerUsers?.filter(tracker => 
        tracker.id !== absentTrackerId && 
        !assignedTrackerIds.has(tracker.id) &&
        !detectedAbsences.has(tracker.id)
      ) || [];

      if (availableTrackers.length > 0) {
        return availableTrackers[0].id;
      }

      return null;
    } catch (error) {
      console.error('[AbsenceDetection] Error finding replacement tracker:', error);
      return null;
    }
  }, [matchId, detectedAbsences]);

  const handleTrackerAbsence = useCallback(async (absentTrackerId: string, reason: string) => {
    console.log(`[AbsenceDetection] Handling absence for tracker ${absentTrackerId}: ${reason}`);
    
    const replacementId = await findReplacementTracker(absentTrackerId);
    
    if (replacementId) {
      try {
        console.log(`[AbsenceDetection] Would assign replacement tracker ${replacementId} for ${absentTrackerId}`);

        toast.success(`Replacement Found: Tracker ${replacementId.slice(-4)} available for absent tracker ${absentTrackerId.slice(-4)}`, {
          duration: 6000,
        });
        
        console.log(`[AbsenceDetection] Replacement tracker ${replacementId} found for ${absentTrackerId}`);
      } catch (error) {
        console.error('[AbsenceDetection] Error handling tracker absence:', error);
        
        toast.error(`Failed to Process Replacement: Error finding replacement for tracker ${absentTrackerId.slice(-4)}`, {
          duration: 8000,
        });
      }
    } else {
      toast.warning(`No Replacement Available: No available trackers to replace ${absentTrackerId.slice(-4)}`, {
        duration: 8000,
      });
    }
  }, [findReplacementTracker]);

  useEffect(() => {
    if (!matchId) return;

    intervalRef.current = setInterval(checkForAbsentTrackers, 30000);

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
    handleTrackerAbsence,
    findReplacementTracker
  };
};
