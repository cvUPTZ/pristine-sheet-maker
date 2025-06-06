
import { useState, useEffect, useCallback } from 'react';
import { VideoJobService, VideoJob } from '@/services/videoJobService';
import { toast } from 'sonner';

export const useVideoJobs = () => {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all user jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userJobs = await VideoJobService.getUserJobs();
      setJobs(userJobs);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit new job
  const submitJob = useCallback(async (
    file: File, 
    videoInfo?: { title?: string; duration?: number }
  ): Promise<VideoJob | null> => {
    setSubmitting(true);
    
    try {
      const job = await VideoJobService.submitVideoForProcessing(file, videoInfo);
      toast.success('Video submitted for processing!');
      
      // Add to jobs list
      setJobs(prev => [job, ...prev]);
      
      return job;
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to submit video: ${err.message}`);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Update specific job in the list
  const updateJob = useCallback((updatedJob: VideoJob) => {
    setJobs(prev => prev.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ));
  }, []);

  // Delete job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await VideoJobService.deleteJob(jobId);
      setJobs(prev => prev.filter(job => job.id !== jobId));
      toast.success('Job deleted successfully');
    } catch (err: any) {
      toast.error(`Failed to delete job: ${err.message}`);
    }
  }, []);

  // Get job by ID
  const getJob = useCallback((jobId: string): VideoJob | undefined => {
    return jobs.find(job => job.id === jobId);
  }, [jobs]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    submitting,
    error,
    submitJob,
    updateJob,
    deleteJob,
    getJob,
    refetch: fetchJobs
  };
};
