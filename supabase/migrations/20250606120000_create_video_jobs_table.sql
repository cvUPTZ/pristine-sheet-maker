
-- Create job status enum
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create video_jobs table
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status job_status DEFAULT 'pending',
  input_video_path TEXT NOT NULL, -- Path in Supabase Storage
  video_title TEXT,
  video_duration INTEGER, -- Duration in seconds
  result_data JSONB,
  error_message TEXT,
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own jobs" ON video_jobs 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON video_jobs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to update jobs (for Colab worker)
CREATE POLICY "Service role can update jobs" ON video_jobs 
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create index for efficient job querying
CREATE INDEX idx_video_jobs_status_created ON video_jobs(status, created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_video_jobs_updated_at 
  BEFORE UPDATE ON video_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
