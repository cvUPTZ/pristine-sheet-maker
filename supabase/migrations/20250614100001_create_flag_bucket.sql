
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

-- 2. Allow the admin who created the match to upload flag images.
-- The upload path must be in the format: {match_id}/{file_name}
DROP POLICY IF EXISTS "Authenticated users can upload flags" ON storage.objects;
DROP POLICY IF EXISTS "Match creator admin can upload flags" ON storage.objects;
DROP POLICY IF EXISTS "Match creator admin can upload flag" ON storage.objects;
CREATE POLICY "Match creator admin can upload flag" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flag' AND
    (SELECT public.get_user_role(auth.uid())) = 'admin' AND
    (
      SELECT created_by FROM public.matches WHERE id = (path_tokens[1])::uuid
    ) = auth.uid()
  );

-- 3. Allow users to update their own objects.
DROP POLICY IF EXISTS "Users can update their own flags" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own flag" ON storage.objects;
CREATE POLICY "Users can update their own flag" ON storage.objects
  FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'flag');

-- 4. Allow users to delete their own objects.
DROP POLICY IF EXISTS "Users can delete their own flags" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own flag" ON storage.objects;
CREATE POLICY "Users can delete their own flag" ON storage.objects
  FOR DELETE USING (auth.uid() = owner);

