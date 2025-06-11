// src/pages/DirectVideoAnalyzer.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DirectAnalysisInterface } from '@/components/video/DirectAnalysisInterface'; // Import the new component

const DirectVideoAnalyzer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [submittedUrl, setSubmittedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError('Please enter a video URL.');
      return;
    }
    try {
      new URL(videoUrl); 
      setError('');
      setSubmittedUrl(videoUrl);
    } catch (_) {
      setError('Invalid URL format. Please enter a valid video URL.');
      setSubmittedUrl('');
    }
  };

  const handleReset = () => {
    setVideoUrl('');
    setSubmittedUrl('');
    setError('');
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto"> {/* Increased max-width for better layout */}
        <CardHeader>
          <CardTitle>Direct Video Analyzer</CardTitle>
          {!submittedUrl && (
            <CardDescription>
              Enter a video URL to start analyzing directly. No jobs, no fuss.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!submittedUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="videoUrlInput" className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL
                </label>
                <Input
                  id="videoUrlInput"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="e.g., https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  className="w-full"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <Button type="submit" className="w-full">
                Load Video & Analyze
              </Button>
            </form>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="truncate mr-2">
                  <p className="text-sm font-medium">Loaded Video:</p>
                  <a href={submittedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {submittedUrl}
                  </a>
                </div>
                <Button onClick={handleReset} variant="outline" size="sm">
                  Load Another Video
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
