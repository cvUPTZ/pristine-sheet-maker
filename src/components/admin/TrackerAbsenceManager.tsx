
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, UserX, RefreshCw, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackerAbsenceDetection } from '@/hooks/useTrackerAbsenceDetection';
import { useRealtimeMatch } from '@/hooks/useRealtimeMatch';

interface TrackerAbsenceManagerProps {
  matchId: string;
}

const TrackerAbsenceManager: React.FC<TrackerAbsenceManagerProps> = ({ matchId }) => {
  const { trackers } = useRealtimeMatch({ matchId });
  
  // Define handleTrackerAbsence callback
  const handleTrackerAbsence = async (trackerId: string, reason: string) => {
    console.log(`[TrackerAbsenceManager] Handling absence for tracker ${trackerId}: ${reason}`);
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

  const getActivityBadgeColor = (lastSeen: number): "default" | "secondary" | "destructive" => {
    const timeSinceLastSeen = Date.now() - lastSeen;
    if (timeSinceLastSeen < 60000) return 'default'; // < 1 minute
    if (timeSinceLastSeen < 180000) return 'secondary'; // < 3 minutes
    return 'destructive'; // > 3 minutes
  };

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
  };

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Tracker Absence Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detected Absences */}
        {detectedAbsences.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-700 flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Detected Absences ({detectedAbsences.length})
            </h4>
            <AnimatePresence>
              {detectedAbsences.map(trackerId => (
                <motion.div
                  key={trackerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 bg-red-100 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <UserX className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-red-800">
                        Tracker {trackerId.slice(-4)}
                      </div>
                      <div className="text-sm text-red-600">
                        Status: Absent
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReconnect(trackerId)}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => findReplacementTracker(trackerId)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      Find Replacement
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Active Tracker Activities */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tracker Activity Monitor
          </h4>
          <div className="space-y-2">
            {trackerActivities.map(activity => (
              <motion.div
                key={activity.user_id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'recording' ? 'bg-green-500 animate-pulse' :
                    activity.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <div className="font-medium text-gray-800">
                      Tracker {activity.user_id.slice(-4)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatLastSeen(activity.last_seen)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getActivityBadgeColor(activity.last_seen)}>
                    {activity.status}
                  </Badge>
                  {activity.consecutive_missed_heartbeats > 0 && (
                    <Badge variant="secondary">
                      {activity.consecutive_missed_heartbeats} missed
                    </Badge>
                  )}
                  {!detectedAbsences.includes(activity.user_id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualAbsence(activity.user_id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Mark Absent
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {trackerActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tracker activity detected</p>
            <p className="text-sm">Trackers will appear here once they join the match</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerAbsenceManager;
