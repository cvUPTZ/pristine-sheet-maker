
// src/services/videoJobService.ts
import { supabase } from '@/integrations/supabase/client';

export interface VideoJob {
  id: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed' | 'pending';
  progress?: number;
  fileName?: string;
  createdAt?: string;
  created_at: string;
  updated_at: string;
  segmentId?: string;
  results?: any;
  result_data?: any;
  error?: string;
  error_message?: string;
  colabLogUrl?: string;
  input_video_path: string;
  video_title?: string;
  video_duration?: number;
  user_id: string;
  job_config?: {
    source_type: 'youtube' | 'upload';
    enableAIAnalysis: boolean;
    enableSegmentation: boolean;
    segmentDuration?: number;
  };
}

/**
 * Simplified Video Service for direct video processing without job queues.
 * Focuses on basic video upload and URL handling.
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

  static async getVideoDownloadUrl(videoPath: string): Promise<string> {
    const { data, error } = await supabase.storage.from('videos').createSignedUrl(videoPath, 3600);
    if (error) throw new Error(`Failed to get download URL: ${error.message}`);
    return data.signedUrl;
  }

  static async deleteVideoFile(videoPath: string): Promise<void> {
    // Only delete from storage if it's not a YouTube URL
    if (videoPath && !videoPath.includes('youtube.com') && !videoPath.includes('youtu.be')) {
      await supabase.storage.from('videos').remove([videoPath]);
    }
  }

  static async pollJobStatus(jobId: string, callback: (job: VideoJob | null) => void, intervalMs: number = 5000): Promise<() => void> {
    console.warn(`VideoJobService.pollJobStatus is a stub and does not perform real polling for job ID: ${jobId}. Interval: ${intervalMs}ms`);
    // Immediately call back with a placeholder or null, then do nothing.
    // callback(null); // Or a mock job
    // Return a no-op stop function
    return () => {
      console.warn(`Polling stopped for job ID: ${jobId} (stub)`);
    };
  }

  static async getUserJobs(userId?: string): Promise<VideoJob[]> {
    console.warn(`VideoJobService.getUserJobs is a stub and will return an empty array for user ID: ${userId || 'undefined'}`);
    return [];
  }

  static async deleteJob(jobId: string): Promise<void> {
    console.warn(`VideoJobService.deleteJob is a stub and does not delete job ID: ${jobId}`);
    return Promise.resolve();
  }
}
