

-- Create the 'flag' storage bucket if it doesn't already exist.
-- We make it public so that flags can be easily viewed.
-- RLS policies will still control who can upload, update, and delete.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'flag', 'flag', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'flag'
);

-- RLS Policies for storage.objects in the 'flag' bucket

-- 1. Allow public, unauthenticated read access to all objects in the 'flag' bucket.
DROP POLICY IF EXISTS "Public flags read access" ON storage.objects;
DROP POLICY IF EXISTS "Public flag read access" ON storage.objects;
CREATE POLICY "Public flag read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'flag');

-- 2. Allow admins to upload flag images.
-- The upload path must be in the format: {match_id}/{file_name}
DROP POLICY IF EXISTS "Authenticated users can upload flags" ON storage.objects;
DROP POLICY IF EXISTS "Match creator admin can upload flags" ON storage.objects;
DROP POLICY IF EXISTS "Match creator admin can upload flag" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload flags" ON storage.objects;
CREATE POLICY "Admin can upload flags" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flag' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

-- 3. Allow admins to update flag objects.
DROP POLICY IF EXISTS "Users can update their own flags" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own flag" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update flags" ON storage.objects;
CREATE POLICY "Admin can update flags" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'flag' AND
    public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    bucket_id = 'flag' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

-- 4. Allow admins to delete flag objects.
DROP POLICY IF EXISTS "Users can delete their own flags" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own flag" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete flags" ON storage.objects;
CREATE POLICY "Admin can delete flags" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'flag' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

