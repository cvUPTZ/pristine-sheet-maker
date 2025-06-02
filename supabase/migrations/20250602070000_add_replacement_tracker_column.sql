
-- Add replacement_tracker_id column to match_tracker_assignments table
ALTER TABLE public.match_tracker_assignments 
ADD COLUMN replacement_tracker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_tracker_assignments.replacement_tracker_id 
IS 'Foreign key to the backup/replacement tracker user assigned to this assignment in case the primary tracker becomes unavailable.';

-- Create index for better performance
CREATE INDEX idx_match_tracker_assignments_replacement_tracker_id 
ON public.match_tracker_assignments(replacement_tracker_id);

-- Update the view to include replacement tracker information
CREATE OR REPLACE VIEW public.match_tracker_assignments_view AS
SELECT 
    mta.*,
    p.email as tracker_email,
    rp.email as replacement_tracker_email,
    rp.full_name as replacement_tracker_name
FROM public.match_tracker_assignments mta
LEFT JOIN public.profiles p ON mta.tracker_user_id = p.id
LEFT JOIN public.profiles rp ON mta.replacement_tracker_id = rp.id;

COMMENT ON VIEW public.match_tracker_assignments_view 
IS 'Enhanced view of match tracker assignments including both primary and replacement tracker information.';
