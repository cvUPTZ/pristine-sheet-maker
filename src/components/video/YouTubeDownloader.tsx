
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Youtube, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  formats: VideoFormat[];
}

interface VideoFormat {
  quality: string;
  format: string;
  size: string;
}

interface YouTubeDownloaderProps {
  onVideoDownloaded: (videoFile: File, videoInfo: VideoInfo) => void;
}

const YouTubeDownloader: React.FC<YouTubeDownloaderProps> = ({ onVideoDownloaded }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedVideo, setDownloadedVideo] = useState<File | null>(null);

  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const extractVideoInfo = async () => {
    if (!validateYouTubeUrl(youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    try {
      // Mock video info extraction - in real implementation, this would call YouTube API
      const mockVideoInfo: VideoInfo = {
        title: 'Soccer Match - Team A vs Team B',
        duration: '01:45:30',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        formats: [
          { quality: '480p', format: 'mp4', size: '850 MB' },
          { quality: '720p', format: 'mp4', size: '1.2 GB' },
          { quality: '1080p', format: 'mp4', size: '2.1 GB' }
        ]
      };

      setVideoInfo(mockVideoInfo);
      toast.success('Video information loaded successfully');
    } catch (error) {
      console.error('Error extracting video info:', error);
      toast.error('Failed to extract video information');
    }
  };

  const downloadVideo = async () => {
    if (!videoInfo) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      // Simulate download completion after 5 seconds
      setTimeout(() => {
        clearInterval(progressInterval);
        setDownloadProgress(100);
        
        // Create a mock video file
        const mockVideoFile = new File(['mock video content'], `${videoInfo.title}.mp4`, {
          type: 'video/mp4'
        });
        
        setDownloadedVideo(mockVideoFile);
        onVideoDownloaded(mockVideoFile, videoInfo);
        toast.success('Video downloaded successfully');
        setDownloading(false);
      }, 5000);

    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video');
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          YouTube Video Downloader
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="youtube-url">YouTube Video URL</Label>
          <div className="flex gap-2">
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={extractVideoInfo}
              disabled={!youtubeUrl || downloading}
              variant="outline"
            >
              Load Info
            </Button>
          </div>
        </div>

        {videoInfo && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4">
              <img 
                src={videoInfo.thumbnail} 
                alt={videoInfo.title}
                className="w-32 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-medium text-sm">{videoInfo.title}</h3>
                <p className="text-xs text-gray-600 mt-1">Duration: {videoInfo.duration}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Video Quality</Label>
              <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {videoInfo.formats.map((format) => (
                    <SelectItem key={format.quality} value={format.quality}>
                      {format.quality} ({format.format}) - {format.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {downloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <Progress value={downloadProgress} className="w-full" />
              </div>
            )}

            {downloadedVideo ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">
                  Video downloaded successfully: {downloadedVideo.name}
                </span>
              </div>
            ) : (
              <Button 
                onClick={downloadVideo}
                disabled={downloading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Downloading...' : `Download ${selectedQuality}`}
              </Button>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-medium">Note:</p>
            <p>This is a demo implementation. In production, you would need to implement proper YouTube video downloading using appropriate APIs and handle copyright compliance.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YouTubeDownloader;
