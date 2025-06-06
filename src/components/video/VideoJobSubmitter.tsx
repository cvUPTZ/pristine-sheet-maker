
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2 } from 'lucide-react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { toast } from 'sonner';

interface VideoJobSubmitterProps {
  onJobSubmitted?: (jobId: string) => void;
}

export const VideoJobSubmitter: React.FC<VideoJobSubmitterProps> = ({
  onJobSubmitted
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const { submitJob, submitting } = useVideoJobs();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-populate title from filename
      if (!videoTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setVideoTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    // Get video duration (optional)
    const getVideoDuration = (): Promise<number | undefined> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(Math.floor(video.duration));
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(undefined);
        video.src = URL.createObjectURL(selectedFile);
      });
    };

    try {
      const duration = await getVideoDuration();
      
      const job = await submitJob(selectedFile, {
        title: videoTitle || selectedFile.name,
        duration
      });

      if (job) {
        // Reset form
        setSelectedFile(null);
        setVideoTitle('');
        const fileInput = document.getElementById('video-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        onJobSubmitted?.(job.id);
      }
    } catch (error) {
      console.error('Error submitting job:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Submit Video for AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="video-file">Video File</Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={submitting}
              className="mt-1"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="video-title">Video Title (Optional)</Label>
            <Input
              id="video-title"
              type="text"
              placeholder="Enter a descriptive title..."
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={!selectedFile || submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading and Creating Job...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit for Analysis
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
