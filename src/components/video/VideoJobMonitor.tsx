// src/components/VideoJobMonitor.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Loader2, Trash2, Download, Eye } from 'lucide-react';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';

// You will need a formatter utility
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
  job: VideoJob;
  onJobUpdate: (job: VideoJob) => void;
  onJobDelete: (jobId: string) => void;
  onViewResults?: (job: VideoJob) => void;
}

export const VideoJobMonitor: React.FC<VideoJobMonitorProps> = ({ job, onJobUpdate, onJobDelete, onViewResults }) => {
  useEffect(() => {
    let stopPolling: (() => void) | null = null;
    if (job.status === 'pending' || job.status === 'processing') {
      VideoJobService.pollJobStatus(job.id, onJobUpdate).then(stopFn => { stopPolling = stopFn; });
    }
    return () => { if (stopPolling) stopPolling(); };
  }, [job.id, job.status, onJobUpdate]);

  const getStatusIcon = () => { /* ... same as your code ... */ };
  const getStatusColor = () => { /* ... same as your code ... */ };

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
        {(job.status === 'processing' && job.progress > 0) && (
          <Progress value={job.progress} className="w-full" />
        )}
        {job.status === 'failed' && job.error_message && (
          <div className="p-3 bg-red-50 border rounded text-sm text-red-700">{job.error_message}</div>
        )}
        <div className="flex gap-2 pt-2">
          {job.status === 'completed' && onViewResults && <Button size="sm" onClick={() => onViewResults(job)}><Eye className="h-3 w-3 mr-1" />View Results</Button>}
          <Button size="sm" variant="outline" onClick={() => onJobDelete(job.id)}><Trash2 className="h-3 w-3 mr-1 text-red-600" />Delete</Button>
        </div>
      </CardContent>
    </Card>
  );
};