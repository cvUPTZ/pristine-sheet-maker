
// src/hooks/useVideoJobs.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';
import { VideoProcessingPipeline, ProcessingPipelineConfig } from '../services/videoProcessingPipeline';

export const useVideoJobs = () => {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const userJobs = await VideoJobService.getUserJobs(user.user.id);
        setJobs(userJobs);
      }
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
    toast.info("Submitting job to processing pipeline...");
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('You must be logged in to submit a job.');

      const pipelineConfig: ProcessingPipelineConfig = {
        enableAIAnalysis: true,
        enableYouTubeDownload: true, // Assumed true, VPP handles based on source type
        enableSegmentation: (config.segmentDuration || 0) > 0,
        segmentDuration: config.segmentDuration,
        // aiProcessingFocus: 'all', // Optional: Add if you want to specify focus
      };

      // The source object is passed directly.
      // If it's a YouTube URL, VPP handles download.
      // If it's a file upload, VPP handles upload.
      const returnedJob = await VideoProcessingPipeline.processVideoComplete(source, pipelineConfig);
      
      toast.success(`Job "${returnedJob.video_title || 'Video'}" submitted successfully!`);
      setJobs(prevJobs => [returnedJob, ...prevJobs]);
      return returnedJob;

    } catch (error: any) {
      toast.error(`Failed to submit job: ${error.message}`);
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
