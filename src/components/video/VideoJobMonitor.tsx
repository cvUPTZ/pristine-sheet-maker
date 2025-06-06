
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Trash2, 
  Download,
  Eye 
} from 'lucide-react';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { formatTime } from '@/utils/formatters';
import { toast } from 'sonner';

interface VideoJobMonitorProps {
  job: VideoJob;
  onJobUpdate: (job: VideoJob) => void;
  onJobDelete: (jobId: string) => void;
  onViewResults?: (job: VideoJob) => void;
}

export const VideoJobMonitor: React.FC<VideoJobMonitorProps> = ({
  job,
  onJobUpdate,
  onJobDelete,
  onViewResults
}) => {
  const [isPolling, setIsPolling] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Start polling when job is pending or processing
  useEffect(() => {
    if (job.status === 'pending' || job.status === 'processing') {
      setIsPolling(true);
      
      const stopPolling = VideoJobService.pollJobStatus(
        job.id,
        (updatedJob) => {
          onJobUpdate(updatedJob);
          
          if (updatedJob.status === 'completed') {
            toast.success(`Video analysis completed for "${updatedJob.video_title || 'video'}"`);
          } else if (updatedJob.status === 'failed') {
            toast.error(`Video analysis failed for "${updatedJob.video_title || 'video'}"`);
          }
        },
        3000 // Poll every 3 seconds
      );

      return () => {
        stopPolling();
        setIsPolling(false);
      };
    }
  }, [job.id, job.status, onJobUpdate]);

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusMessage = () => {
    switch (job.status) {
      case 'pending':
        return 'Waiting for worker...';
      case 'processing':
        return 'Video is being analyzed...';
      case 'completed':
        return 'Analysis completed successfully';
      case 'failed':
        return job.error_message || 'Analysis failed';
    }
  };

  const handleDownloadVideo = async () => {
    try {
      if (!downloadUrl) {
        const url = await VideoJobService.getVideoDownloadUrl(job.input_video_path);
        setDownloadUrl(url);
        window.open(url, '_blank');
      } else {
        window.open(downloadUrl, '_blank');
      }
    } catch (error: any) {
      toast.error(`Failed to download video: ${error.message}`);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this job? This will also delete the uploaded video.')) {
      onJobDelete(job.id);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {job.video_title || 'Video Analysis Job'}
          </CardTitle>
          <Badge className={getStatusColor()}>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {job.status}
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <div>Submitted: {new Date(job.created_at).toLocaleString()}</div>
          {job.video_duration && (
            <div>Duration: {formatTime(job.video_duration)}</div>
          )}
          <div>Status: {getStatusMessage()}</div>
        </div>

        {(job.status === 'processing' && job.progress > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="w-full" />
          </div>
        )}

        {job.status === 'failed' && job.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {job.error_message}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {job.status === 'completed' && job.result_data && onViewResults && (
            <Button
              size="sm"
              onClick={() => onViewResults(job)}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              View Results
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadVideo}
            className="flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            Download Video
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
