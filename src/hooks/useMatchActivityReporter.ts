
import { useEffect, useCallback, useRef } from 'react';
// import { supabase } from '@/integrations/supabase/client';

const REPORT_INTERVAL_MS = 60 * 1000; // Report activity every 60 seconds

/**
 * Custom hook to periodically report user activity for a specific match.
 * Currently disabled because the match_tracker_activity table doesn't exist.
 *
 * @param userId The ID of the user whose activity is being reported.
 * @param matchId The ID of the match for which activity is being reported.
 */
const useMatchActivityReporter = (userId: string | undefined, matchId: string | undefined): void => {
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const reportActivity = useCallback(async () => {
    if (!userId || !matchId) {
      console.log('useMatchActivityReporter: userId or matchId is undefined. Skipping report.');
      return;
    }

    // Currently disabled - table doesn't exist in database
    console.log(`useMatchActivityReporter: Would report activity for user ${userId} on match ${matchId} (disabled)`);

    // TODO: Enable when match_tracker_activity table is created
    /*
    const { error } = await supabase
      .from('match_tracker_activity')
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
        },
        {
          onConflict: 'match_id,user_id',
        }
      );

    if (error) {
      console.error('useMatchActivityReporter: Error reporting match activity:', error.message);
    }
    */
  }, [userId, matchId]);

  useEffect(() => {
    // Clear any existing interval when userId or matchId changes
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (userId && matchId) {
      // Report activity immediately on mount or when IDs become valid
      reportActivity();

      // Then set up the interval for periodic reporting
      intervalIdRef.current = setInterval(() => {
        reportActivity();
      }, REPORT_INTERVAL_MS);

      console.log(`useMatchActivityReporter: Interval set for user ${userId}, match ${matchId} (disabled mode)`);
    } else {
      console.log('useMatchActivityReporter: userId or matchId is undefined. Interval not set.');
    }

    // Cleanup function to clear the interval when the component unmounts
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [userId, matchId, reportActivity]);

  // This hook does not return any value; its purpose is side effects.
};

export default useMatchActivityReporter;
