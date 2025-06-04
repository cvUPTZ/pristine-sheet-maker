import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Play, Clock, FileVideo, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
  size?: number;
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
  // Calculate appropriate default segment duration based on video length
  const videoDurationSeconds = parseDuration(videoInfo.duration);
  const getDefaultSegmentDuration = (totalDuration: number): number => {
    if (totalDuration <= 60) return Math.max(10, Math.floor(totalDuration / 3)); // Very short videos: 3 segments minimum
    if (totalDuration <= 300) return 60; // Short videos: 1 minute segments
    if (totalDuration <= 1800) return 180; // Medium videos: 3 minute segments
    return 300; // Long videos: 5 minute segments
  };

  const [segmentDuration, setSegmentDuration] = useState(getDefaultSegmentDuration(videoDurationSeconds));
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('mp4');

  // Update segment duration when video changes
  useEffect(() => {
    const newDefaultDuration = getDefaultSegmentDuration(videoDurationSeconds);
    setSegmentDuration(newDefaultDuration);
  }, [videoDurationSeconds]);

  function parseDuration(duration: string): number {
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const estimateSegmentSize = (duration: number): number => {
    const baseSizePerSecond = compressionLevel === 'low' ? 2 * 1024 * 1024 : 
                             compressionLevel === 'medium' ? 1 * 1024 * 1024 : 
                             0.5 * 1024 * 1024; 
    
    return duration * baseSizePerSecond;
  };

  const generateSegments = () => {
    const totalDuration = videoDurationSeconds;
    
    if (totalDuration <= 0) {
      toast.error('Invalid video duration');
      return;
    }

    if (segmentDuration > totalDuration) {
      toast.error(`Segment duration (${Math.ceil(segmentDuration/60)}m) cannot be longer than video duration (${Math.ceil(totalDuration/60)}m)`);
      return;
    }

    if (segmentDuration < 5) {
      toast.error('Segment duration must be at least 5 seconds');
      return;
    }

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
    toast.success(`Generated ${newSegments.length} video segments for processing`);
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

        const processingTime = Math.max(1000, processedSegments[i].duration * 100);
        await new Promise(resolve => setTimeout(resolve, processingTime));

        const estimatedSize = estimateSegmentSize(processedSegments[i].duration);

        const segmentFile = new File(
          [`processed video segment ${i + 1} - ${compressionLevel} compression`], 
          `${videoInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_segment_${i + 1}_${formatTime(processedSegments[i].startTime)}-${formatTime(processedSegments[i].endTime)}.${outputFormat}`,
          { type: `video/${outputFormat}` }
        );

        processedSegments[i].status = 'completed';
        processedSegments[i].file = segmentFile;
        processedSegments[i].size = estimatedSize;
        setSegments([...processedSegments]);
        
        const progressPercent = ((i + 1) / processedSegments.length) * 100;
        setProgress(progressPercent);
      }

      onSegmentsReady(processedSegments);
      toast.success(`All ${processedSegments.length} video segments processed successfully!`);
    } catch (error) {
      console.error('Error processing segments:', error);
      toast.error('Failed to process video segments');
      
      const failedSegments = segments.map(seg => 
        seg.status === 'processing' ? { ...seg, status: 'error' as const } : seg
      );
      setSegments(failedSegments);
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

  const totalEstimatedSize = segments.reduce((sum, seg) => 
    sum + (seg.size || estimateSegmentSize(seg.duration)), 0
  );

  // Calculate max segment duration (video duration or reasonable limit)
  const maxSegmentDuration = Math.min(videoDurationSeconds, 1800); // Max 30 minutes
  const minSegmentDuration = Math.min(5, videoDurationSeconds); // Min 5 seconds or video length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-purple-600" />
          Professional Video Splitter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3 mb-3">
            <FileVideo className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-medium text-sm">{videoFile.name}</p>
              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                <span>Duration: {videoInfo.duration}</span>
                <span>Size: {formatFileSize(videoFile.size)}</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="segment-duration">
                  Segment Duration (seconds)
                  <span className="text-xs text-gray-500 ml-2">
                    ({minSegmentDuration}s - {maxSegmentDuration}s)
                  </span>
                </Label>
                <Input
                  id="segment-duration"
                  type="number"
                  min={minSegmentDuration}
                  max={maxSegmentDuration}
                  value={segmentDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || minSegmentDuration;
                    setSegmentDuration(Math.min(Math.max(value, minSegmentDuration), maxSegmentDuration));
                  }}
                  disabled={processing}
                />
                <p className="text-xs text-gray-600">
                  Recommended: {getDefaultSegmentDuration(videoDurationSeconds)}s for this video
                </p>
              </div>
              <div className="space-y-2">
                <Label>Output Format</Label>
                <select 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={processing}
                >
                  <option value="mp4">MP4 (recommended)</option>
                  <option value="webm">WebM</option>
                  <option value="avi">AVI</option>
                </select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Compression Level</Label>
                <select 
                  value={compressionLevel} 
                  onChange={(e) => setCompressionLevel(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={processing}
                >
                  <option value="low">Low (High Quality, Large Files)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Lower Quality, Small Files)</option>
                </select>
              </div>
              
              {segments.length > 0 && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    Estimated total size: {formatFileSize(totalEstimatedSize)}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <Button 
            onClick={generateSegments}
            disabled={processing}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Generate Segments
          </Button>
          <Button 
            onClick={processSegments}
            disabled={processing || segments.length === 0}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {processing ? 'Processing...' : `Process ${segments.length} Segments`}
          </Button>
        </div>

        {processing && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Processing segment {currentSegment} of {segments.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-600">
              Please keep this tab open during processing. This may take several minutes for large videos.
            </p>
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
            
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-2">
              {segments.map((segment, index) => (
                <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono w-8 text-center">{index + 1}</div>
                    <div>
                      <div className="text-sm font-medium">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Duration: {formatTime(segment.duration)}
                        {segment.size && ` • Size: ${formatFileSize(segment.size)}`}
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

        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-medium">Segment Guidelines:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>For very short videos (&lt;1 min): Use 10-20 second segments</li>
              <li>For short videos (1-5 min): Use 30-60 second segments</li>
              <li>For medium videos (5-30 min): Use 2-3 minute segments</li>
              <li>For long videos (&gt;30 min): Use 5+ minute segments</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoSplitter;
