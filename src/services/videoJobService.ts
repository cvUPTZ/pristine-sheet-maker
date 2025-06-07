import { supabase } from '@/integrations/supabase/client';
import { VideoInfo } from '@/types';

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
  user_id: string;
}

export class VideoJobService {
  // Ensure videos bucket exists
  static async ensureVideosBucketExists(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.warn('Could not list buckets:', listError.message);
        return;
      }

      const videosBucket = buckets?.find(bucket => bucket.name === 'videos');
      
      if (!videosBucket) {
        const { error: createError } = await supabase.storage.createBucket('videos', {
          public: true,
          allowedMimeTypes: ['video/*'],
          fileSizeLimit: 1024 * 1024 * 1024 // 1GB limit
        });
        
        if (createError) {
          console.warn('Could not create videos bucket:', createError.message);
        }
      }
    } catch (error) {
      console.warn('Error ensuring videos bucket exists:', error);
    }
  }

  // Upload video to Supabase Storage
  static async uploadVideo(file: File): Promise<string> {
    // Ensure bucket exists first
    await this.ensureVideosBucketExists();

    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `public/${fileName}`;

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    return data.path;
  }

  // Create a new video processing job
  static async createJob(
    videoPath: string, 
    videoInfo?: { title?: string; duration?: number }
  ): Promise<VideoJob> {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error('User must be authenticated to create jobs');
    }

    const { data, error } = await supabase
      .from('video_jobs')
      .insert({
        input_video_path: videoPath,
        video_title: videoInfo?.title,
        video_duration: videoInfo?.duration,
        user_id: user.user.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    return data as VideoJob;
  }

  // Submit video file for processing (upload + create job)
  static async submitVideoForProcessing(
    file: File, 
    videoInfo?: { title?: string; duration?: number }
  ): Promise<VideoJob> {
    try {
      // Upload video to storage
      const videoPath = await this.uploadVideo(file);
      
      // Create job record
      const job = await this.createJob(videoPath, videoInfo);
      
      return job;
    } catch (error) {
      throw error;
    }
  }

  // Get job by ID
  static async getJob(jobId: string): Promise<VideoJob | null> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Row not found
        return null;
      }
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

    return data as VideoJob;
  }

  // Get all jobs for current user
  static async getUserJobs(): Promise<VideoJob[]> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    return data as VideoJob[];
  }

  // Poll for job status updates
  static async pollJobStatus(
    jobId: string, 
    onUpdate: (job: VideoJob) => void,
    intervalMs: number = 3000
  ): Promise<() => void> {
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const job = await this.getJob(jobId);
        if (job) {
          onUpdate(job);
          
          // Stop polling if job is completed or failed
          if (job.status === 'completed' || job.status === 'failed') {
            isPolling = false;
            return;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (isPolling) {
        setTimeout(poll, intervalMs);
      }
    };

    // Start polling
    setTimeout(poll, intervalMs);

    // Return stop function
    return () => {
      isPolling = false;
    };
  }

  // Get download URL for video
  static async getVideoDownloadUrl(videoPath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(videoPath, 3600); // 1 hour expiry

    if (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  // Delete job and associated video file
  static async deleteJob(jobId: string): Promise<void> {
    // First get the job to find the video path
    const job = await this.getJob(jobId);
    if (!job) return;

    // Delete video from storage
    if (job.input_video_path) {
      await supabase.storage
        .from('videos')
        .remove([job.input_video_path]);
    }

    // Delete job record
    const { error } = await supabase
      .from('video_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }
}
