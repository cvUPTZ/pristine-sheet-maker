
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REPORT_INTERVAL_MS = 60 * 1000; // Report activity every 60 seconds

/**
 * Custom hook to periodically report user activity for a specific match.
 * It performs an UPSERT to the `match_tracker_activity` table.
 * The `last_active_at` column is expected to be updated by a database trigger
 * or by its default value on insert.
 *
 * @param userId The ID of the user whose activity is being reported.
 * @param matchId The ID of the match for which activity is being reported.
 */
const useMatchActivityReporter = (userId: string | undefined, matchId: string | undefined): void => {
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const reportActivity = useCallback(async () => {
    if (!userId || !matchId) {
      // This case should ideally be prevented by the useEffect dependency check,
      // but it's good for safety.
      console.log('useMatchActivityReporter: userId or matchId is undefined. Skipping report.');
      return;
    }

    // console.log(`useMatchActivityReporter: Reporting activity for user ${userId} on match ${matchId}`);

    const { error } = await supabase
      .from('match_tracker_activity')
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
          // last_active_at is handled by the database trigger on update,
          // or default NOW() on insert.
        },
        {
          onConflict: 'match_id,user_id', // Composite primary key
        }
      );

    if (error) {
      console.error('useMatchActivityReporter: Error reporting match activity:', error.message);
    } else {
      // console.log(`useMatchActivityReporter: Successfully reported activity for user ${userId} on match ${matchId}`);
    }
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

      // console.log(`useMatchActivityReporter: Interval set for user ${userId}, match ${matchId}`);
    } else {
      // console.log('useMatchActivityReporter: userId or matchId is undefined. Interval not set.');
    }

    // Cleanup function to clear the interval when the component unmounts
    // or when userId/matchId dependencies change before the next effect run.
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        // console.log(`useMatchActivityReporter: Interval cleared for user ${userId}, match ${matchId}`);
      }
    };
  }, [userId, matchId, reportActivity]); // reportActivity is memoized by useCallback

  // This hook does not return any value; its purpose is side effects.
};

export default useMatchActivityReporter;
