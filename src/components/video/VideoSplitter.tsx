
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Scissors, Play, Clock, FileVideo, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
}

interface VideoSplitterProps {
  videoFile: File;
  videoInfo: {
    title: string;
    duration: string;
  };
  onSegmentsReady: (segments: VideoSegment[]) => void;
}

const VideoSplitter: React.FC<VideoSplitterProps> = ({ 
  videoFile, 
  videoInfo, 
  onSegmentsReady 
}) => {
  const [segmentDuration, setSegmentDuration] = useState(300); // 5 minutes in seconds
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);

  const parseDuration = (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateSegments = () => {
    const totalDuration = parseDuration(videoInfo.duration);
    const newSegments: VideoSegment[] = [];
    
    for (let start = 0; start < totalDuration; start += segmentDuration) {
      const end = Math.min(start + segmentDuration, totalDuration);
      newSegments.push({
        id: `segment-${newSegments.length + 1}`,
        startTime: start,
        endTime: end,
        duration: end - start,
        status: 'pending'
      });
    }
    
    setSegments(newSegments);
    toast.success(`Generated ${newSegments.length} video segments`);
  };

  const processSegments = async () => {
    if (segments.length === 0) {
      toast.error('Please generate segments first');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentSegment(0);

    try {
      const processedSegments = [...segments];
      
      for (let i = 0; i < processedSegments.length; i++) {
        setCurrentSegment(i + 1);
        processedSegments[i].status = 'processing';
        setSegments([...processedSegments]);

        // Simulate processing time (2-3 seconds per segment)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

        // Create mock segment file
        const segmentFile = new File(
          [`mock video segment ${i + 1}`], 
          `${videoInfo.title}_segment_${i + 1}.mp4`,
          { type: 'video/mp4' }
        );

        processedSegments[i].status = 'completed';
        processedSegments[i].file = segmentFile;
        setSegments([...processedSegments]);
        
        const progressPercent = ((i + 1) / processedSegments.length) * 100;
        setProgress(progressPercent);
      }

      onSegmentsReady(processedSegments);
      toast.success('All video segments processed successfully');
    } catch (error) {
      console.error('Error processing segments:', error);
      toast.error('Failed to process video segments');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: VideoSegment['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-purple-600" />
          Video Splitter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <FileVideo className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-sm">{videoFile.name}</p>
              <p className="text-xs text-gray-600">Duration: {videoInfo.duration}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="segment-duration">Segment Duration (minutes)</Label>
          <Input
            id="segment-duration"
            type="number"
            min="1"
            max="30"
            value={segmentDuration / 60}
            onChange={(e) => setSegmentDuration(parseInt(e.target.value) * 60)}
            className="w-32"
          />
          <p className="text-xs text-gray-600">
            Each segment will be approximately {segmentDuration / 60} minutes long
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={generateSegments}
            disabled={processing}
            variant="outline"
          >
            Generate Segments
          </Button>
          <Button 
            onClick={processSegments}
            disabled={processing || segments.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            {processing ? 'Processing...' : 'Process Segments'}
          </Button>
        </div>

        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing segment {currentSegment} of {segments.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {segments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Video Segments ({segments.length})</h4>
              <div className="text-xs text-gray-600">
                Total: {formatTime(segments.reduce((sum, seg) => sum + seg.duration, 0))}
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {segments.map((segment, index) => (
                <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono">{index + 1}</div>
                    <div>
                      <div className="text-sm">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Duration: {formatTime(segment.duration)}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(segment.status)}>
                    {segment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-medium">Processing Note:</p>
            <p>This demo uses simulated video processing. In production, you would use FFmpeg.wasm or similar libraries for actual video splitting.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoSplitter;
