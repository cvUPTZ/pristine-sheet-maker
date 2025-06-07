
// src/hooks/useVideoJobs.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';

export const useVideoJobs = () => {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const userJobs = await VideoJobService.getUserJobs();
      setJobs(userJobs);
    } catch (error: any) {
      toast.error(`Failed to load jobs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /**
   * The single, unified function to submit ANY kind of job.
   */
  const submitJob = async (
    source: { type: 'upload', file: File } | { type: 'youtube', url: string },
    config: { title: string, duration?: number, segmentDuration?: number }
  ): Promise<VideoJob | null> => {
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('You must be logged in to submit a job.');

      let videoPath: string;
      if (source.type === 'upload') {
        toast.info("Uploading video file...");
        videoPath = await VideoJobService.uploadVideo(source.file);
      } else {
        // For YouTube, the path is the URL itself. The worker will download it.
        videoPath = source.url;
      }
      toast.success("Video source ready. Creating analysis job...");

      const jobData = {
        input_video_path: videoPath,
        video_title: config.title,
        video_duration: config.duration,
        user_id: user.user.id,
        job_config: {
          source_type: source.type,
          should_segment: (config.segmentDuration || 0) > 0 && (config.segmentDuration || 0) < (config.duration || Infinity),
          segment_duration: config.segmentDuration
        }
      };

      const { data: newJob, error } = await supabase.from('video_jobs').insert(jobData).select().single();
      if (error) throw new Error(`Failed to create job: ${error.message}`);
      
      // Ensure the returned job matches VideoJob interface by handling null/undefined conversions
      const videoJob: VideoJob = {
        id: newJob.id,
        created_at: newJob.created_at,
        updated_at: newJob.updated_at,
        status: newJob.status,
        input_video_path: newJob.input_video_path,
        video_title: newJob.video_title || undefined,
        video_duration: newJob.video_duration || undefined,
        result_data: newJob.result_data || undefined,
        error_message: newJob.error_message || undefined,
        progress: newJob.progress || 0,
        user_id: newJob.user_id,
        job_config: newJob.job_config || {}
      };
      
      toast.success(`Job "${videoJob.video_title}" submitted successfully!`);
      setJobs(prevJobs => [videoJob, ...prevJobs]);
      return videoJob;

    } catch (error: any) {
      toast.error(error.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await VideoJobService.deleteJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast.success('Job deleted successfully.');
    } catch (error: any) {
      toast.error(`Failed to delete job: ${error.message}`);
    }
  };

  const updateJob = (updatedJob: VideoJob) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  return { jobs, loading, submitting, submitJob, deleteJob, updateJob };
};
