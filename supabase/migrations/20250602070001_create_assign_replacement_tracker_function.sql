
-- Create a function to assign replacement trackers (bypassing TypeScript type constraints)
CREATE OR REPLACE FUNCTION assign_replacement_tracker(
  assignment_id UUID,
  replacement_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.match_tracker_assignments 
  SET replacement_tracker_id = replacement_id
  WHERE id = assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_replacement_tracker IS 'Assigns a replacement tracker to a match tracker assignment';
