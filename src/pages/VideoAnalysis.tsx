// src/pages/VideoAnalysis.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { VideoJobMonitor } from '@/components/video/VideoJobMonitor';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Define a local VideoJob type for the page that includes videoUrl for VideoJobMonitor
interface PageVideoJob extends VideoJob {
  videoUrl?: string; 
}

const VideoAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<PageVideoJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedJobs = await VideoJobService.getUserJobs();
      
      // Map fetched jobs to PageVideoJob, preparing videoUrl
      const processedJobs = await Promise.all(fetchedJobs.map(async (job) => {
        let videoUrl = job.input_video_path; // Default for YouTube URLs
        
        // Check if it's an uploaded file (not a YouTube URL)
        if (job.input_video_path && !job.input_video_path.includes('youtube.com') && !job.input_video_path.includes('youtu.be')) {
          try {
            videoUrl = await VideoJobService.getVideoDownloadUrl(job.input_video_path);
          } catch (e) {
            console.error(`Failed to get signed URL for ${job.input_video_path}`, e);
            // Keep original path, VideoJobMonitor might have a fallback or show error
          }
        }
        
        return { 
          ...job, 
          videoUrl: videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 
        }; // Fallback if undefined
      }));
      setJobs(processedJobs || []);
    } catch (e: any) {
      setError('Failed to fetch video jobs: ' + e.message);
      toast.error('Failed to fetch video jobs: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreateNewJob = async () => {
    if (!user) {
      toast.error("You must be logged in to create a job.");
      return;
    }
    
    const videoUrlPrompt = prompt("Enter video URL (e.g., YouTube link):");
    if (!videoUrlPrompt) return;

    const jobTitle = prompt("Enter a title for this analysis job:", "New Video Analysis");
    if (!jobTitle) return;

    setIsLoading(true);
    try {
      // Directly insert the job using Supabase client
      const newJobData = {
        user_id: user.id,
        status: 'pending' as const,
        input_video_path: videoUrlPrompt,
        video_title: jobTitle,
        progress: 0,
      };

      const insertResult = await supabase
        .from('video_jobs')
        .insert(newJobData)
        .select('*')
        .single();

      if (insertResult.error) throw insertResult.error;

      if (insertResult.data) {
        // Convert the database response to VideoJob format
        const newJob: VideoJob = {
          ...insertResult.data,
          video_title: insertResult.data.video_title || undefined,
          video_duration: insertResult.data.video_duration || undefined,
          error_message: insertResult.data.error_message || undefined,
          job_config: { source_type: 'youtube', original_url: videoUrlPrompt }
        };

        toast.success(`Job created successfully for ${newJob.video_title || 'Unknown Title'}`);
        
        // Add to list and poll for status
        const processedNewJob: PageVideoJob = { 
          ...newJob, 
          videoUrl: newJob.input_video_path
        };
        setJobs(prevJobs => [processedNewJob, ...prevJobs]);
        
        // Start polling for this new job
        VideoJobService.pollJobStatus(newJob.id, handleJobUpdate);
      } else {
        toast.error("Failed to create job: No job data returned from insert.");
      }
    } catch (e: any) {
      toast.error('Failed to create new video job: ' + e.message);
      setError('Failed to create new video job: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobUpdate = useCallback((updatedJob: VideoJob) => {
    setJobs(prevJobs =>
      prevJobs.map(job => (job.id === updatedJob.id ? { ...job, ...updatedJob, videoUrl: job.videoUrl || updatedJob.input_video_path } : job))
    );
  }, []);

  const handleJobDelete = async (jobId: string) => {
    setIsLoading(true);
    try {
      await VideoJobService.deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      toast.success('Job deleted successfully.');
    } catch (e: any) {
      toast.error('Failed to delete job: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Video Analysis Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={fetchJobs} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Jobs
          </Button>
          <Button onClick={handleCreateNewJob} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Analysis Job
          </Button>
        </div>
      </div>

      {isLoading && jobs.length === 0 && (
        <div className="text-center py-10">
          <RefreshCw className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
          <p className="mt-2 text-sm text-gray-500">Loading video jobs...</p>
        </div>
      )}
      
      {error && (
        <div className="text-center text-red-500 bg-red-100 p-4 rounded-md my-4">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <Button onClick={fetchJobs} variant="outline" className="mt-3">
            Retry Fetching Jobs
          </Button>
        </div>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No video analysis jobs</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new analysis job.</p>
          <div className="mt-6">
            <Button onClick={handleCreateNewJob} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Analysis Job
            </Button>
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-6">
          {jobs.map(job => (
            <VideoJobMonitor
              key={job.id}
              job={job}
              onJobUpdate={handleJobUpdate}
              onJobDelete={() => handleJobDelete(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoAnalysis;
