-- This migration schedules the check_tracker_activity cron job using pg_cron.
-- Ensure that the pg_cron extension is enabled in your Supabase project.

-- Remove the existing job if it exists, to ensure idempotency.
-- cron.unschedule raises a NOTICE if the job does not exist, which is acceptable.
SELECT cron.unschedule('check-tracker-activity');

-- Schedule the 'public.check_tracker_activity' function to run every minute.
-- This job checks for inactive trackers in live matches and attempts to find replacements.
-- The 1-minute frequency is chosen because the inactivity threshold within the function
-- is typically a few minutes (e.g., 3 minutes), so frequent checks are needed.
SELECT cron.schedule(
    'check-tracker-activity', -- Job name
    '* * * * *',              -- Cron schedule: every minute
    $$SELECT public.check_tracker_activity()$$ -- SQL command to execute
);

COMMENT ON EXTENSION pg_cron IS 'pg_cron is used to schedule periodic jobs including checking tracker activity, monitoring battery levels, and sending match reminders.';

-- After applying this migration, verify the job in cron.job: SELECT * FROM cron.job WHERE jobname = 'check-tracker-activity';
-- Logs can be found in Supabase project database logs.
