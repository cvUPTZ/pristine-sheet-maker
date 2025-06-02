
-- Add timer-related columns to the matches table
ALTER TABLE public.matches 
ADD COLUMN timer_status TEXT DEFAULT 'stopped',
ADD COLUMN timer_current_value INTEGER DEFAULT 0,
ADD COLUMN timer_last_started_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX idx_matches_timer_status ON public.matches(timer_status);

-- Add comments for documentation
COMMENT ON COLUMN public.matches.timer_status IS 'Timer status: stopped, running, paused';
COMMENT ON COLUMN public.matches.timer_current_value IS 'Current timer value in seconds';
COMMENT ON COLUMN public.matches.timer_last_started_at IS 'Timestamp when timer was last started';
