
// src/services/videoJobService.ts
import { supabase } from '@/integrations/supabase/client';

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
}
