
-- Add job_config column to video_jobs table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_jobs' AND column_name = 'job_config'
    ) THEN
        ALTER TABLE video_jobs ADD COLUMN job_config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Update the existing jobs to have a default job_config if null
UPDATE video_jobs SET job_config = '{}' WHERE job_config IS NULL;
