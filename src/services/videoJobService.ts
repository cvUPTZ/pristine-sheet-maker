
// src/services/videoJobService.ts
import { supabase } from '@/integrations/supabase/client';

export interface VideoJob {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_video_path: string;
  video_title?: string | null; // Match database schema
  video_duration?: number | null; // Match database schema
  result_data?: any;
  error_message?: string | null; // Match database schema
  progress: number;
  user_id: string;
  job_config?: any; // Make optional to handle missing cases
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
    // First try with job_config, fallback without it if column doesn't exist
    let { data, error } = await supabase
      .from('video_jobs').select('*, job_config').eq('id', jobId).single();
    
    if (error && error.message.includes('job_config')) {
      // Fallback: select without job_config if column doesn't exist
      const fallback = await supabase
        .from('video_jobs').select('*').eq('id', jobId).single();
      data = fallback.data;
      error = fallback.error;
    }
    
    if (error && error.code !== 'PGRST116') throw new Error(`Failed to fetch job: ${error.message}`);
    return data as VideoJob | null;
  }

  static async getUserJobs(): Promise<VideoJob[]> {
    // First try with job_config, fallback without it if column doesn't exist
    let { data, error } = await supabase
      .from('video_jobs').select('*, job_config').order('created_at', { ascending: false });
    
    if (error && error.message.includes('job_config')) {
      // Fallback: select without job_config if column doesn't exist
      const fallback = await supabase
        .from('video_jobs').select('*').order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }
    
    if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
    return (data || []).map(job => ({
      ...job,
      job_config: job.job_config || {} // Ensure job_config exists
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

    // Only delete from storage if it was an upload
    if (job.job_config?.source_type === 'upload' && job.input_video_path) {
      await supabase.storage.from('videos').remove([job.input_video_path]);
    }
    const { error } = await supabase.from('video_jobs').delete().eq('id', jobId);
    if (error) throw new Error(`Failed to delete job: ${error.message}`);
  }
}
