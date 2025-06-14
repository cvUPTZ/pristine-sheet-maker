
-- Create the 'flags' storage bucket if it doesn't already exist.
-- We make it public so that flags can be easily viewed.
-- RLS policies will still control who can upload, update, and delete.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'flags', 'flags', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'flags'
);

-- RLS Policies for storage.objects in the 'flags' bucket

-- 1. Allow public, unauthenticated read access to all objects in the 'flags' bucket.
DROP POLICY IF EXISTS "Public flags read access" ON storage.objects;
CREATE POLICY "Public flags read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'flags');

-- 2. Allow authenticated users to upload objects to the 'flags' bucket.
DROP POLICY IF EXISTS "Authenticated users can upload flags" ON storage.objects;
CREATE POLICY "Authenticated users can upload flags" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'flags');

-- 3. Allow users to update their own objects.
DROP POLICY IF EXISTS "Users can update their own flags" ON storage.objects;
CREATE POLICY "Users can update their own flags" ON storage.objects
  FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'flags');

-- 4. Allow users to delete their own objects.
DROP POLICY IF EXISTS "Users can delete their own flags" ON storage.objects;
CREATE POLICY "Users can delete their own flags" ON storage.objects
  FOR DELETE USING (auth.uid() = owner);
