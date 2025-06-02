
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackerActivity {
  match_id: string;
  user_id: string;
  last_active_at: string;
}

export const useTrackerActivityManager = (matchId: string) => {
  const [trackerActivities, setTrackerActivities] = useState<TrackerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackerActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('match_tracker_activity')
        .select('*')
        .eq('match_id', matchId);

      if (error) throw error;
      setTrackerActivities(data || []);
    } catch (error) {
      console.error('Error fetching tracker activities:', error);
      toast.error('Failed to fetch tracker activities');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const updateTrackerActivity = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('match_tracker_activity')
        .upsert({
          match_id: matchId,
          user_id: userId,
          last_active_at: new Date().toISOString()
        });

      if (error) throw error;
      await fetchTrackerActivities();
    } catch (error) {
      console.error('Error updating tracker activity:', error);
      toast.error('Failed to update tracker activity');
    }
  }, [matchId, fetchTrackerActivities]);

  const findInactiveTrackers = useCallback((thresholdMinutes: number = 3) => {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return trackerActivities.filter(activity => 
      new Date(activity.last_active_at) < threshold
    );
  }, [trackerActivities]);

  const findReplacementTracker = useCallback(async (absentTrackerId: string) => {
    try {
      const { data: availableTrackers, error } = await supabase
        .rpc('find_replacement_tracker', {
          p_match_id: matchId,
          p_absent_tracker_id: absentTrackerId
        });

      if (error) throw error;
      return availableTrackers;
    } catch (error) {
      console.error('Error finding replacement tracker:', error);
      return null;
    }
  }, [matchId]);

  useEffect(() => {
    fetchTrackerActivities();
    
    // Set up real-time subscription for activity updates
    const channel = supabase
      .channel(`tracker_activity_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_tracker_activity',
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
    refetch: fetchTrackerActivities
  };
};
