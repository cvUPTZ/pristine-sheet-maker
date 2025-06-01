
import React, { useEffect } from 'react';
import { toast } from 'sonner';
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
}

interface TrackerNotificationSystemProps {
  trackers: TrackerStatus[];
  matchId: string;
}

const TrackerNotificationSystem: React.FC<TrackerNotificationSystemProps> = ({ 
  trackers, 
  matchId 
}) => {
  useEffect(() => {
    // Check for low battery trackers
    trackers.forEach(tracker => {
      if (tracker.battery_level && tracker.battery_level <= 20 && tracker.status === 'active') {
        toast.warning(
          <div className="flex items-center gap-2">
            <span>🔋</span>
            <div>
              <div className="font-medium">Low Battery Warning</div>
              <div className="text-sm text-gray-600">
                {tracker.email?.split('@')[0] || `Tracker ${tracker.user_id.slice(-4)}`} - {tracker.battery_level}%
              </div>
            </div>
          </div>,
          {
            id: `battery-${tracker.user_id}`,
            duration: 10000,
          }
        );
      }
    });

    // Check for inactive trackers
    const inactiveTrackers = trackers.filter(t => 
      t.status === 'inactive' || 
      (t.status === 'active' && Date.now() - t.last_activity > 120000) // 2 minutes
    );

    if (inactiveTrackers.length > 0) {
      toast.info(
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <div>
            <div className="font-medium">Tracker Status Update</div>
            <div className="text-sm text-gray-600">
              {inactiveTrackers.length} tracker(s) inactive
            </div>
          </div>
        </div>,
        {
          id: `inactive-trackers-${matchId}`,
          duration: 5000,
        }
      );
    }

    // Notify when trackers join/leave
    const activeTrackers = trackers.filter(t => t.status === 'active' || t.status === 'recording');
    if (activeTrackers.length > 0) {
      toast.success(
        <div className="flex items-center gap-2">
          <span>✅</span>
          <div>
            <div className="font-medium">Trackers Online</div>
            <div className="text-sm text-gray-600">
              {activeTrackers.length} tracker(s) active
            </div>
          </div>
        </div>,
        {
          id: `active-trackers-${matchId}`,
          duration: 3000,
        }
      );
    }
  }, [trackers, matchId]);

  // Notify on high event activity
  useEffect(() => {
    const highActivityTrackers = trackers.filter(tracker => {
      const totalEvents = tracker.event_counts ? 
        Object.values(tracker.event_counts).reduce((sum, count) => sum + count, 0) : 0;
      return totalEvents > 50; // Threshold for high activity
    });

    if (highActivityTrackers.length > 0) {
      highActivityTrackers.forEach(tracker => {
        const totalEvents = tracker.event_counts ? 
          Object.values(tracker.event_counts).reduce((sum, count) => sum + count, 0) : 0;
        
        toast.info(
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <div>
              <div className="font-medium">High Activity Tracker</div>
              <div className="text-sm text-gray-600">
                {tracker.email?.split('@')[0] || `Tracker ${tracker.user_id.slice(-4)}`} - {totalEvents} events
              </div>
            </div>
          </div>,
          {
            id: `high-activity-${tracker.user_id}`,
            duration: 5000,
          }
        );
      });
    }
  }, [trackers]);

  return null; // This component only handles notifications
};

export default TrackerNotificationSystem;
