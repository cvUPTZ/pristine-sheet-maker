
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackerActivityManager } from '@/hooks/useTrackerActivityManager';
import { useTrackerAbsenceDetection } from '@/hooks/useTrackerAbsenceDetection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TrackerStatusIndicator from './TrackerStatusIndicator';
import AbsenceSummaryDashboard from './AbsenceSummaryDashboard';
import ReplacementTrackerFinder from './ReplacementTrackerFinder';

interface TrackerAbsenceManagerProps {
  matchId: string;
}

interface AssignedTracker {
  id: string;
  tracker_user_id: string;
  tracker_name?: string;
  tracker_email?: string;
}

const TrackerAbsenceManager: React.FC<TrackerAbsenceManagerProps> = ({ matchId }) => {
  const [assignedTrackers, setAssignedTrackers] = useState<AssignedTracker[]>([]);
  const [showReplacementFinder, setShowReplacementFinder] = useState<string>('');
  const [isAssigningReplacement, setIsAssigningReplacement] = useState(false);
  
  const {
    trackerActivities,
    loading: activitiesLoading,
    updateTrackerActivity,
    findInactiveTrackers,
    findReplacementTracker,
    refetch: refetchActivities
  } = useTrackerActivityManager(matchId);

  const handleTrackerAbsence = async (trackerId: string, reason: string) => {
    console.log(`[TrackerAbsenceManager] Handling absence for tracker ${trackerId}: ${reason}`);
    setShowReplacementFinder(trackerId);
    
    // Call the Supabase function to handle tracker absence
    try {
      const { error } = await supabase.rpc('handle_tracker_absence', {
        p_absent_tracker_user_id: trackerId,
        p_match_id: matchId,
        p_replacement_tracker_user_id: null
      });
      
      if (error) {
        console.error('Error calling handle_tracker_absence:', error);
      }
    } catch (error) {
      console.error('Error handling tracker absence:', error);
    }
  };
  
  const {
    detectedAbsences,
    clearAbsenceStatus
  } = useTrackerAbsenceDetection({
    matchId,
    inactivityThreshold: 180000, // 3 minutes
    onTrackerAbsent: handleTrackerAbsence
  });

  const fetchAssignedTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select(`
          id,
          tracker_user_id,
          profiles!tracker_user_id (
            full_name,
            email
          )
        `)
        .eq('match_id', matchId);

      if (error) throw error;

      const trackers: AssignedTracker[] = (data || []).map(assignment => ({
        id: assignment.id,
        tracker_user_id: assignment.tracker_user_id,
        tracker_name: (assignment.profiles as any)?.full_name,
        tracker_email: (assignment.profiles as any)?.email
      }));

      setAssignedTrackers(trackers);
    } catch (error) {
      console.error('Error fetching assigned trackers:', error);
      toast.error('Failed to fetch assigned trackers');
    }
  };

  const handleManualAbsence = async (trackerId: string) => {
    await handleTrackerAbsence(trackerId, 'Manually marked as absent');
  };

  const handleReconnect = (trackerId: string) => {
    clearAbsenceStatus(trackerId);
    setShowReplacementFinder('');
    updateTrackerActivity(trackerId);
  };

  const handleAssignReplacement = async (absentTrackerId: string, replacementId: string) => {
    setIsAssigningReplacement(true);
    try {
      // Update the assignment to use the replacement tracker
      const { error } = await supabase
        .from('match_tracker_assignments')
        .update({ tracker_user_id: replacementId })
        .eq('match_id', matchId)
        .eq('tracker_user_id', absentTrackerId);

      if (error) throw error;

      // Call the Supabase function with replacement
      const { error: funcError } = await supabase.rpc('handle_tracker_absence', {
        p_absent_tracker_user_id: absentTrackerId,
        p_match_id: matchId,
        p_replacement_tracker_user_id: replacementId
      });

      if (funcError) throw funcError;

      toast.success(`Replacement tracker assigned successfully`);
      setShowReplacementFinder('');
      await fetchAssignedTrackers();
      await refetchActivities();
    } catch (error) {
      console.error('Error assigning replacement:', error);
      toast.error('Failed to assign replacement tracker');
    } finally {
      setIsAssigningReplacement(false);
    }
  };

  useEffect(() => {
    fetchAssignedTrackers();
  }, [matchId]);

  // Calculate summary statistics
  const totalTrackers = assignedTrackers.length;
  const activeTrackers = trackerActivities.length;
  const inactiveTrackers = findInactiveTrackers();
  const absentTrackers = detectedAbsences.length;
  const averageResponseTime = trackerActivities.length > 0 
    ? Math.round(
        trackerActivities.reduce((sum, activity) => {
          const timeDiff = Date.now() - new Date(activity.last_active_at).getTime();
          return sum + (timeDiff / 1000);
        }, 0) / trackerActivities.length
      )
    : 0;

  if (activitiesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading absence monitoring data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AbsenceSummaryDashboard
        totalTrackers={totalTrackers}
        activeTrackers={activeTrackers}
        absentTrackers={absentTrackers}
        averageResponseTime={averageResponseTime}
      />

      <AnimatePresence>
        {showReplacementFinder && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ReplacementTrackerFinder
              absentTrackerId={showReplacementFinder}
              availableTrackers={[]} // Will be populated by the component
              onAssignReplacement={handleAssignReplacement}
              isLoading={isAssigningReplacement}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Tracker Absence Monitor
            <Button
              variant="outline"
              size="sm"
              onClick={refetchActivities}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned Trackers ({assignedTrackers.length})
            </h4>
            
            <AnimatePresence>
              {assignedTrackers.map(tracker => {
                const activity = trackerActivities.find(a => a.user_id === tracker.tracker_user_id);
                const isAbsent = detectedAbsences.includes(tracker.tracker_user_id);
                const isInactive = inactiveTrackers.some(t => t.user_id === tracker.tracker_user_id);
                
                return (
                  <TrackerStatusIndicator
                    key={tracker.id}
                    activity={{
                      user_id: tracker.tracker_user_id,
                      last_seen: activity ? new Date(activity.last_active_at).getTime() : Date.now(),
                      status: isAbsent ? 'inactive' : (isInactive ? 'inactive' : 'active'),
                      consecutive_missed_heartbeats: 0
                    }}
                    isAbsent={isAbsent}
                    onMarkAbsent={handleManualAbsence}
                    onReconnect={handleReconnect}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {assignedTrackers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No trackers assigned to this match</p>
              <p className="text-sm">Assign trackers to enable absence monitoring</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerAbsenceManager;
