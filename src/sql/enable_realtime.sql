
-- Enable Realtime for tracker_assignments table
alter table public.tracker_assignments replica identity full;
begin;
  -- Add the table to the publication
  select supabase_functions.create_or_replace_publication(
    'supabase_realtime',
    'INSERT, UPDATE, DELETE',
    'tracker_assignments'
  );
commit;
