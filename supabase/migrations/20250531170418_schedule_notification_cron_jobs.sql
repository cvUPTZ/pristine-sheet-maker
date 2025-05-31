-- This migration schedules cron jobs using pg_cron.
-- Ensure that the pg_cron extension is enabled in your Supabase project.
-- Supabase docs for pg_cron: https://supabase.com/docs/guides/database/extensions/pgcron

-- Remove existing jobs if they exist, to ensure idempotency.
-- Note: cron.unschedule will raise a notice if the job does not exist, which is generally fine for migrations.
-- For stricter error handling, a DO $$ BEGIN ... EXCEPTION WHEN ... END $$; block could be used.

-- Unschedule 'monitor-battery-levels' job if it exists
SELECT cron.unschedule('monitor-battery-levels');

-- Schedule the 'public.monitor_tracker_battery_levels' function to run every 10 minutes.
-- This job checks for trackers with low battery and sends notifications.
SELECT cron.schedule(
    'monitor-battery-levels', -- Job name
    '*/10 * * * *',           -- Cron schedule: every 10 minutes
    $$SELECT public.monitor_tracker_battery_levels()$$ -- SQL command to execute
);

COMMENT ON EXTENSION pg_cron IS 'pg_cron is used to schedule periodic jobs like monitoring battery levels and sending match reminders.';


-- Unschedule 'schedule-match-reminders' job if it exists
SELECT cron.unschedule('schedule-match-reminders');

-- Schedule the 'public.schedule_match_reminders' function to run every 5 minutes.
-- This job checks for upcoming matches and sends reminders to assigned trackers.
SELECT cron.schedule(
    'schedule-match-reminders', -- Job name
    '*/5 * * * *',            -- Cron schedule: every 5 minutes
    $$SELECT public.schedule_match_reminders()$$ -- SQL command to execute
);

-- Note: After applying this migration, you can check the status of cron jobs
-- by querying the cron.job table: SELECT * FROM cron.job;
-- And logs for cron job executions can typically be found in your Supabase project's database logs.
