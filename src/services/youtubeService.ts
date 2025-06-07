
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  duration: string; // ISO 8601 format (PT1M35S)
  thumbnail: string;
  url: string;
  formats: Array<{
    quality: string;
    format: string;
    size: string;
  }>;
}

export class YouTubeService {
  // Get YouTube API key from Supabase secrets
  private static async getApiKey(): Promise<string> {
    const { data } = await supabase.functions.invoke('get-youtube-api-key');
    if (!data?.apiKey) {
      throw new Error('YouTube API key not configured');
    }
    return data.apiKey;
  }

  // Extract video ID from YouTube URL
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Get video information from YouTube API
  static async getVideoInfo(videoUrl: string): Promise<YouTubeVideoInfo> {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const apiKey = await this.getApiKey();
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    return {
      id: videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      duration: video.contentDetails.duration,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      url: videoUrl,
      formats: [
        { quality: '720p', format: 'mp4', size: 'Unknown' },
        { quality: '480p', format: 'mp4', size: 'Unknown' },
        { quality: '360p', format: 'mp4', size: 'Unknown' }
      ]
    };
  }

  // Request video download (calls edge function)
  static async downloadVideo(videoUrl: string, quality: string = '720p'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('download-youtube-video', {
      body: { videoUrl, quality }
    });

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data.filePath; // Path in Supabase Storage
  }
}
