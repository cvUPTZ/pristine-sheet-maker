
// src/pages/DirectVideoAnalyzer.tsx
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DirectAnalysisInterface } from '@/components/video/DirectAnalysisInterface';
import { VideoJobService } from '@/services/videoJobService';
import { Upload, Link, X } from 'lucide-react';
import { toast } from 'sonner';

const DirectVideoAnalyzer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');
  const [submittedUrl, setSubmittedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError('Please enter a video URL.');
      return;
    }
    try {
      new URL(videoUrl);
      setError('');
      setSubmittedUrl(videoUrl);
      toast.success('Video URL loaded successfully');
    } catch (_) {
      setError('Invalid URL format. Please enter a valid video URL.');
      setSubmittedUrl('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const videoPath = await VideoJobService.uploadVideo(file);
      const signedUrl = await VideoJobService.getVideoDownloadUrl(videoPath);
      setUploadedVideoUrl(signedUrl);
      setSubmittedUrl(signedUrl);
      toast.success('Video uploaded successfully');
    } catch (e: any) {
      setError('Failed to upload video: ' + e.message);
      toast.error('Failed to upload video: ' + e.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleReset = () => {
    setVideoUrl('');
    setUploadedVideoUrl('');
    setSubmittedUrl('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Direct Video Analyzer</CardTitle>
          {!submittedUrl && (
            <CardDescription>
              Upload a video file or enter a video URL to start analyzing directly. No jobs, no fuss.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!submittedUrl ? (
            <div className="space-y-6">
              {/* URL Input Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Video URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUrlSubmit} className="space-y-4">
                    <Input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="e.g., https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                      className="w-full"
                    />
                    <Button type="submit" disabled={!videoUrl.trim()}>
                      Load Video
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="text-center text-gray-500 font-medium">OR</div>

              {/* File Upload Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Video File
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="w-full"
                    />
                    {isUploading && (
                      <div className="text-center text-blue-600">
                        Uploading video...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="truncate mr-2">
                  <p className="text-sm font-medium">Loaded Video:</p>
                  <p className="text-sm text-blue-600 truncate">
                    {uploadedVideoUrl ? 'Uploaded video file' : submittedUrl}
                  </p>
                </div>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Load Different Video
                </Button>
              </div>
              <DirectAnalysisInterface videoUrl={submittedUrl} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectVideoAnalyzer;
