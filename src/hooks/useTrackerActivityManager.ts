
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackerActivity {
  user_id: string;
  last_active_at: string;
  status: 'active' | 'inactive' | 'recording';
}

export const useTrackerActivityManager = (matchId: string) => {
  const [trackerActivities, setTrackerActivities] = useState<TrackerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackerActivities = useCallback(async () => {
    try {
      // Get tracker assignments and their last activity
      const { data: assignments, error } = await supabase
        .from('match_tracker_assignments')
        .select(`
          tracker_user_id,
          profiles!tracker_user_id (
            id,
            updated_at
          )
        `)
        .eq('match_id', matchId);

      if (error) throw error;

      const activities: TrackerActivity[] = (assignments || []).map(assignment => ({
        user_id: assignment.tracker_user_id,
        last_active_at: (assignment.profiles as any)?.updated_at || new Date().toISOString(),
        status: 'active' as const
      }));

      setTrackerActivities(activities);
    } catch (error) {
      console.error('Error fetching tracker activities:', error);
      toast.error('Failed to fetch tracker activities');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const updateTrackerActivity = useCallback(async (userId: string) => {
    try {
      // Update the user's profile updated_at timestamp to track activity
      const { error } = await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchTrackerActivities();
    } catch (error) {
      console.error('Error updating tracker activity:', error);
      toast.error('Failed to update tracker activity');
    }
  }, [fetchTrackerActivities]);

  const findInactiveTrackers = useCallback((thresholdMinutes: number = 3) => {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return trackerActivities.filter(activity => 
      new Date(activity.last_active_at) < threshold
    );
  }, [trackerActivities]);

  const findReplacementTracker = useCallback(async (absentTrackerId: string) => {
    try {
      // Get all tracker users
      const { data: availableTrackers, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker');

      if (error) throw error;

      // Get currently assigned trackers
      const { data: assignments, error: assignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('tracker_user_id');

      if (assignmentsError) throw assignmentsError;

      const assignedTrackerIds = new Set(assignments?.map(a => a.tracker_user_id) || []);
      
      // Filter out assigned trackers and the absent tracker
      const available = (availableTrackers || [])
        .filter(tracker => 
          tracker.id !== absentTrackerId && 
          !assignedTrackerIds.has(tracker.id)
        );

      return available.length > 0 ? available[0] : null;
    } catch (error) {
      console.error('Error finding replacement tracker:', error);
      return null;
    }
  }, []);

  const sendNotificationWithSound = useCallback(async (
    userId: string, 
    matchId: string, 
    title: string, 
    message: string, 
    type: string,
    withSound: boolean = false
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          match_id: matchId,
          type: type,
          title: title,
          message: message,
          notification_data: { 
            with_sound: withSound,
            timestamp: new Date().toISOString()
          }
        });

      if (error) throw error;

      console.log(`Notification sent to ${userId}: ${title}`);
      
      // If sound is requested, play notification sound
      if (withSound && 'Audio' in window) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkqBjqZ2u/EcyMFLYbP8tiKOAoctM5/kF1fmNOzqLhD'); // Simple beep sound
          audio.play().catch(e => console.log('Could not play notification sound:', e));
        } catch (e) {
          console.log('Audio not supported or failed:', e);
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, []);

  useEffect(() => {
    fetchTrackerActivities();
    
    // Set up real-time subscription for assignment updates
    const channel = supabase
      .channel(`tracker_activity_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_tracker_assignments',
          filter: `match_id=eq.${matchId}`
        },
        () => {
          fetchTrackerActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchTrackerActivities]);

  return {
    trackerActivities,
    loading,
    updateTrackerActivity,
    findInactiveTrackers,
    findReplacementTracker,
    sendNotificationWithSound,
    refetch: fetchTrackerActivities
  };
};
