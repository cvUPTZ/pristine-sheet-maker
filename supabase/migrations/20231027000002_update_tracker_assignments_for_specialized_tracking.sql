
-- Update the match_tracker_assignments table to support one-tracker-one-player-one-event model
ALTER TABLE public.match_tracker_assignments 
ADD COLUMN IF NOT EXISTS player_id INTEGER,
ADD COLUMN IF NOT EXISTS player_team_id TEXT CHECK (player_team_id IN ('home', 'away')),
ADD COLUMN IF NOT EXISTS assigned_event_types TEXT[];

-- Update the existing tracker_id column to tracker_user_id for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_tracker_assignments' AND column_name = 'tracker_id') THEN
        ALTER TABLE public.match_tracker_assignments 
        RENAME COLUMN tracker_id TO tracker_user_id;
    END IF;
END $$;

-- Create a unique constraint to ensure one tracker per player-event combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tracker_player_event 
ON public.match_tracker_assignments(match_id, player_id, player_team_id, assigned_event_types)
WHERE player_id IS NOT NULL AND assigned_event_types IS NOT NULL;

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_match_tracker_player_assignments 
ON public.match_tracker_assignments(match_id, player_id, player_team_id);

-- Create a view for easier querying of assignments
CREATE OR REPLACE VIEW public.match_tracker_assignments_view AS
SELECT 
    mta.*,
    p.email as tracker_email,
    p.full_name as tracker_name,
    m.name as match_name,
    m.home_team_name,
    m.away_team_name
FROM public.match_tracker_assignments mta
LEFT JOIN public.profiles p ON mta.tracker_user_id = p.id
LEFT JOIN public.matches m ON mta.match_id = m.id;

-- Grant necessary permissions
GRANT SELECT ON public.match_tracker_assignments_view TO authenticated;
