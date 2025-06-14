
-- Create the 'videos' storage bucket if it doesn't already exist.
-- We make it public so that videos can be easily viewed.
-- RLS policies will still control who can upload, update, and delete.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'videos', 'videos', true, 5368709120, ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/mpeg']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'videos'
);

-- RLS Policies for storage.objects in the 'videos' bucket

-- 1. Allow public, unauthenticated read access to all objects in the 'videos' bucket.
DROP POLICY IF EXISTS "Public videos read access" ON storage.objects;
CREATE POLICY "Public videos read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

-- 2. Allow authenticated users to upload objects to the 'videos' bucket.
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

-- 3. Allow users to update their own objects.
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
CREATE POLICY "Users can update their own videos" ON storage.objects
  FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'videos');

-- 4. Allow users to delete their own objects.
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE USING (auth.uid() = owner);
