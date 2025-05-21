
-- Function to get a specific user's tracker assignments
CREATE OR REPLACE FUNCTION get_tracker_assignments(user_id UUID)
RETURNS SETOF tracker_assignments
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM tracker_assignments WHERE tracker_id = user_id;
$$;

-- Function to get all tracker assignments (for admin use)
CREATE OR REPLACE FUNCTION get_all_tracker_assignments()
RETURNS SETOF tracker_assignments
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM tracker_assignments;
$$;

-- Function to create a tracker assignment
CREATE OR REPLACE FUNCTION create_tracker_assignment(
  p_tracker_id UUID,
  p_event_category TEXT,
  p_created_by UUID
)
RETURNS SETOF tracker_assignments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment tracker_assignments;
BEGIN
  INSERT INTO tracker_assignments (tracker_id, event_category, created_by)
  VALUES (p_tracker_id, p_event_category, p_created_by)
  RETURNING * INTO v_assignment;
  
  RETURN QUERY SELECT * FROM tracker_assignments WHERE id = v_assignment.id;
END;
$$;

-- Function to delete a tracker assignment
CREATE OR REPLACE FUNCTION delete_tracker_assignment(p_assignment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM tracker_assignments WHERE id = p_assignment_id;
END;
$$;
