
// YouTube service for video information extraction
export class YouTubeService {
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  static async getVideoInfo(url: string): Promise<{
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    duration: string;
  }> {
    const videoId = this.extractVideoId(url);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // For now, return basic info. In a real app, you'd use YouTube API
    return {
      id: videoId,
      title: `YouTube Video ${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 'Unknown'
    };
  }

  static getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  }
}
