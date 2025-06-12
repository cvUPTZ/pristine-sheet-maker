

// src/services/videoJobService.ts
import { supabase } from '@/integrations/supabase/client';

export interface VideoJob {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_video_path: string;
  video_title?: string;
  video_duration?: number;
  result_data?: any;
  error_message?: string;
  progress: number;
  user_id: string | null; // Changed to match database schema
  job_config?: any;
}

/**
 * This service is now a pure Data Access Layer.
 * It only contains simple, direct interactions with the Supabase API.
 * All orchestration logic is moved to the useVideoJobs hook.
 */
export class VideoJobService {
  static async uploadVideo(file: File): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `public/${fileName}`;

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(`Failed to upload video: ${error.message}`);
    return data.path;
  }

  static async getJob(jobId: string): Promise<VideoJob | null> {
    // First try to get the job with job_config column
    let { data, error } = await supabase
      .from('video_jobs')
      .select('*, job_config')
      .eq('id', jobId)
      .single();
    
    // If job_config column doesn't exist, fall back to basic query
    if (error && error.message?.includes('job_config')) {
      const fallbackResult = await supabase
        .from('video_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (fallbackResult.error && fallbackResult.error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch job: ${fallbackResult.error.message}`);
      }
      
      if (!fallbackResult.data) return null;
      
      // Properly handle the fallback data
      const fallbackData = fallbackResult.data;
      return {
        id: fallbackData.id,
        created_at: fallbackData.created_at,
        updated_at: fallbackData.updated_at,
        status: fallbackData.status,
        input_video_path: fallbackData.input_video_path,
        progress: fallbackData.progress,
        user_id: fallbackData.user_id,
        video_title: fallbackData.video_title || undefined,
        video_duration: fallbackData.video_duration || undefined,
        error_message: fallbackData.error_message || undefined,
        result_data: fallbackData.result_data,
        job_config: {} // Default empty object since column doesn't exist
      } as VideoJob;
    }
    
    if (error && error.code !== 'PGRST116') throw new Error(`Failed to fetch job: ${error.message}`);
    
    if (!data) return null;
    
    // Convert database types to interface types for successful query
    return {
      id: data.id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      status: data.status,
      input_video_path: data.input_video_path,
      progress: data.progress,
      user_id: data.user_id,
      video_title: data.video_title || undefined,
      video_duration: data.video_duration || undefined,
      error_message: data.error_message || undefined,
      result_data: data.result_data,
      job_config: data.job_config || {} // Use actual job_config or default to empty object
    } as VideoJob;
  }

  static async getUserJobs(): Promise<VideoJob[]> {
    // First try to get jobs with job_config column
    let { data, error } = await supabase
      .from('video_jobs')
      .select('*, job_config')
      .order('created_at', { ascending: false });
    
    // If job_config column doesn't exist, fall back to basic query
    if (error && error.message?.includes('job_config')) {
      const fallbackResult = await supabase
        .from('video_jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fallbackResult.error) {
        throw new Error(`Failed to fetch jobs: ${fallbackResult.error.message}`);
      }
      
      if (!fallbackResult.data) return [];
      
      // Properly handle the fallback data array
      return fallbackResult.data.map(job => ({
        id: job.id,
        created_at: job.created_at,
        updated_at: job.updated_at,
        status: job.status,
        input_video_path: job.input_video_path,
        progress: job.progress,
        user_id: job.user_id,
        video_title: job.video_title || undefined,
        video_duration: job.video_duration || undefined,
        error_message: job.error_message || undefined,
        result_data: job.result_data,
        job_config: {} // Default empty object since column doesn't exist
      })) as VideoJob[];
    }
    
    if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
    
    if (!data) return [];
    
    // Convert database types to interface types for successful query
    return data.map(job => ({
      id: job.id,
      created_at: job.created_at,
      updated_at: job.updated_at,
      status: job.status,
      input_video_path: job.input_video_path,
      progress: job.progress,
      user_id: job.user_id,
      video_title: job.video_title || undefined,
      video_duration: job.video_duration || undefined,
      error_message: job.error_message || undefined,
      result_data: job.result_data,
      job_config: job.job_config || {} // Use actual job_config or default to empty object
    })) as VideoJob[];
  }

  static async pollJobStatus(jobId: string, onUpdate: (job: VideoJob) => void, intervalMs = 3000): Promise<() => void> {
    let isPolling = true;
    const poll = async () => {
      if (!isPolling) return;
      try {
        const job = await this.getJob(jobId);
        if (job) {
          onUpdate(job);
          if (job.status === 'completed' || job.status === 'failed') isPolling = false;
        }
      } catch (error) { console.error('Polling error:', error); }
      if (isPolling) setTimeout(poll, intervalMs);
    };
    setTimeout(poll, intervalMs);
    return () => { isPolling = false; };
  }

  static async getVideoDownloadUrl(videoPath: string): Promise<string> {
    const { data, error } = await supabase.storage.from('videos').createSignedUrl(videoPath, 3600);
    if (error) throw new Error(`Failed to get download URL: ${error.message}`);
    return data.signedUrl;
  }

  static async deleteJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    // Only delete from storage if it was an upload (check if it's not a YouTube URL)
    if (job.input_video_path && !job.input_video_path.includes('youtube.com') && !job.input_video_path.includes('youtu.be')) {
      await supabase.storage.from('videos').remove([job.input_video_path]);
    }
    const { error } = await supabase.from('video_jobs').delete().eq('id', jobId);
    if (error) throw new Error(`Failed to delete job: ${error.message}`);
  }
}

