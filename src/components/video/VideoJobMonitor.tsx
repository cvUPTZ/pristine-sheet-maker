
// src/components/VideoJobMonitor.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Loader2, Trash2, Eye } from 'lucide-react';

import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';

// Utility function (consider moving to a shared utils file)
const formatTime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface VideoJobMonitorProps {
  job: VideoJob & { videoUrl?: string }; // Include videoUrl from PageVideoJob
  onJobUpdate: (job: VideoJob) => void;
  onJobDelete: (jobId: string) => void;
}

export const VideoJobMonitor: React.FC<VideoJobMonitorProps> = ({ job, onJobUpdate, onJobDelete }) => {
  // Core UI State
  const [showAnalysisUI, setShowAnalysisUI] = useState(false);

  // Poll job status
  useEffect(() => {
    let stopPolling: (() => void) | null = null;
    if (job.status === 'pending' || job.status === 'processing') {
      VideoJobService.pollJobStatus(job.id, (updatedJob: VideoJob | null) => {
        if (updatedJob) {
          onJobUpdate(updatedJob);
        }
      }).then((stopFn: () => void) => { stopPolling = stopFn; });
    }
    return () => { if (stopPolling) stopPolling(); };
  }, [job.id, job.status, onJobUpdate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{job.video_title || 'Video Analysis Job'}</CardTitle>
          <Badge className={job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : job.status === 'processing' ? 'bg-blue-100 text-blue-800' : job.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            <div className="flex items-center gap-1">
              {job.status === 'processing' ? <Loader2 className="h-4 w-4 animate-spin"/> : job.status === 'completed' ? <CheckCircle className="h-4 w-4"/> : job.status === 'failed' ? <XCircle className="h-4 w-4"/> : <Clock className="h-4 w-4"/>}
              {job.status}
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <div>Submitted: {new Date(job.created_at).toLocaleString()}</div>
          {job.video_duration && <div>Duration: {formatTime(job.video_duration)}</div>}
        </div>
        {(job.status === 'processing' && (job.progress || 0) > 0) && (
          <Progress value={job.progress || 0} className="w-full" />
        )}
        {job.status === 'failed' && job.error_message && (
          <div className="p-3 bg-red-50 border rounded text-sm text-red-700">{job.error_message}</div>
        )}
        <div className="flex gap-2 pt-2">
          {job.status === 'completed' && (
            <Button size="sm" onClick={() => setShowAnalysisUI(!showAnalysisUI)}>
              <Eye className="h-3 w-3 mr-1" />{showAnalysisUI ? 'Hide Analysis' : 'Show Analysis'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onJobDelete(job.id)}><Trash2 className="h-3 w-3 mr-1 text-red-600" />Delete</Button>
        </div>

        {job.status === 'completed' && showAnalysisUI && (
          <div className="pt-4 mt-4 border-t">
            <h3 className="text-lg font-semibold mb-3">Video Analysis</h3>

            <div className="mb-4 bg-black rounded-md relative">
              <video
                src={job.videoUrl || job.input_video_path || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                controls
                width="100%"
                className="rounded-md"
                onError={(e) => {
                  console.error('Video loading failed:', e);
                  toast.error('Failed to load video. The video may not be accessible.');
                }}
                onLoadStart={() => {
                  console.log('Video loading started:', job.videoUrl || job.input_video_path);
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="text-center py-8">
              <p className="text-gray-600">Video analysis features will be available soon.</p>
              <p className="text-sm text-gray-500">Advanced analytics and tagging functionality coming in future updates.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
