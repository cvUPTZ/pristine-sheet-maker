import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackerAbsenceDetection } from '@/hooks/useTrackerAbsenceDetection';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';
import TrackerStatusIndicator from './TrackerStatusIndicator';
import AbsenceSummaryDashboard from './AbsenceSummaryDashboard';
import ReplacementTrackerFinder from './ReplacementTrackerFinder';

interface TrackerAbsenceManagerProps {
  matchId: string;
}

const TrackerAbsenceManager: React.FC<TrackerAbsenceManagerProps> = ({ matchId }) => {
  const { trackers } = useRealtimeMatch({ matchId });
  const [showReplacementFinder, setShowReplacementFinder] = useState<string>('');
  const [isAssigningReplacement, setIsAssigningReplacement] = useState(false);
  
  // Define handleTrackerAbsence callback
  const handleTrackerAbsence = async (trackerId: string, reason: string) => {
    console.log(`[TrackerAbsenceManager] Handling absence for tracker ${trackerId}: ${reason}`);
    setShowReplacementFinder(trackerId);
  };
  
  const {
    trackerActivities,
    detectedAbsences,
    updateTrackerActivity,
    clearAbsenceStatus,
    findReplacementTracker
  } = useTrackerAbsenceDetection({
    matchId,
    inactivityThreshold: 180000, // 3 minutes
    onTrackerAbsent: handleTrackerAbsence
  });

  // Update activities when tracker status changes
  useEffect(() => {
    trackers.forEach(tracker => {
      updateTrackerActivity(tracker.user_id, tracker.status);
    });
  }, [trackers, updateTrackerActivity]);

  const formatLastSeen = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const handleManualAbsence = async (trackerId: string) => {
    await handleTrackerAbsence(trackerId, 'Manually marked as absent');
  };

  const handleReconnect = (trackerId: string) => {
    clearAbsenceStatus(trackerId);
    setShowReplacementFinder('');
  };

  const handleAssignReplacement = async (absentTrackerId: string, replacementId: string) => {
    setIsAssigningReplacement(true);
    try {
      // Here you would implement the actual replacement logic
      console.log(`Assigning replacement ${replacementId} for absent tracker ${absentTrackerId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowReplacementFinder('');
    } catch (error) {
      console.error('Error assigning replacement:', error);
    } finally {
      setIsAssigningReplacement(false);
    }
  };

  // Calculate summary statistics
  const totalTrackers = trackerActivities.length;
  const activeTrackers = trackerActivities.filter(t => t.status === 'active' || t.status === 'recording').length;
  const absentTrackers = detectedAbsences.length;
  const averageResponseTime = trackerActivities.length > 0 
    ? Math.round(trackerActivities.reduce((sum, t) => sum + (Date.now() - t.last_seen) / 1000, 0) / trackerActivities.length)
    : 0;

  // Mock available trackers for replacement (in real app, this would come from API)
  const availableTrackers = [
    { id: 'tracker-backup-1', email: 'backup1@example.com', lastSeen: Date.now() - 30000, batteryLevel: 85 },
    { id: 'tracker-backup-2', email: 'backup2@example.com', lastSeen: Date.now() - 60000, batteryLevel: 65 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <AbsenceSummaryDashboard
        totalTrackers={totalTrackers}
        activeTrackers={activeTrackers}
        absentTrackers={absentTrackers}
        averageResponseTime={averageResponseTime}
      />

      {/* Replacement Finder */}
      <AnimatePresence>
        {showReplacementFinder && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ReplacementTrackerFinder
              absentTrackerId={showReplacementFinder}
              availableTrackers={availableTrackers}
              onAssignReplacement={handleAssignReplacement}
              isLoading={isAssigningReplacement}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tracker Management */}
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Tracker Absence Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Tracker Activities */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Trackers ({trackerActivities.length})
            </h4>
            
            <AnimatePresence>
              {trackerActivities.map(activity => (
                <TrackerStatusIndicator
                  key={activity.user_id}
                  activity={activity}
                  isAbsent={detectedAbsences.includes(activity.user_id)}
                  onMarkAbsent={handleManualAbsence}
                  onReconnect={handleReconnect}
                />
              ))}
            </AnimatePresence>
          </div>

          {trackerActivities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tracker activity detected</p>
              <p className="text-sm">Trackers will appear here once they join the match</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerAbsenceManager;
