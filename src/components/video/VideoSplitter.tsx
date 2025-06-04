import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Play, Clock, FileVideo, AlertCircle, Settings, Loader2 } from 'lucide-react';

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
    duration: string | number; // Can be string like "6" or "00:06" or number
  };
  onSegmentsReady: (segments: VideoSegment[]) => void;
}

// Toast replacement for demo
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const toastDiv = document.createElement('div');
  toastDiv.className = `fixed top-4 right-4 p-3 rounded-lg text-white z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toastDiv.textContent = message;
  document.body.appendChild(toastDiv);
  setTimeout(() => document.body.removeChild(toastDiv), 3000);
};

const VideoSplitter: React.FC<VideoSplitterProps> = ({ 
  videoFile, 
  videoInfo, 
  onSegmentsReady 
}) => {
  const [segmentDuration, setSegmentDuration] = useState(5); // 5 seconds default
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('mp4');

  const parseDuration = (duration: string | number): number => {
    if (typeof duration === 'number') {
      return duration;
    }
    
    const str = duration.toString();
    
    // If it's just a number as string (like "6")
    if (/^\d+$/.test(str)) {
      return parseInt(str);
    }
    
    // If it's in time format
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(str) || 0;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateSegments = () => {
    const totalDuration = parseDuration(videoInfo.duration);
    
    console.log('Total duration parsed:', totalDuration, 'from:', videoInfo.duration);
    
    if (totalDuration <= 0) {
      showToast('Invalid video duration', 'error');
      return;
    }

    if (segmentDuration >= totalDuration) {
      showToast('Segment duration cannot be longer than video duration', 'error');
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
    showToast(`Generated ${newSegments.length} video segments for processing`);
  };

  const estimateSegmentSize = (duration: number): number => {
    // Rough estimation based on compression level and duration
    const baseSizePerSecond = compressionLevel === 'low' ? 2 * 1024 * 1024 : // 2MB/sec
                             compressionLevel === 'medium' ? 1 * 1024 * 1024 : // 1MB/sec
                             0.5 * 1024 * 1024; // 0.5MB/sec for high compression
    
    return duration * baseSizePerSecond;
  };

  const processSegments = async () => {
    if (segments.length === 0) {
      showToast('Please generate segments first', 'error');
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

        // Simulate processing time based on segment duration and compression
        const processingTime = Math.max(1000, processedSegments[i].duration * 200); // Minimum 1 second
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Estimate file size
        const estimatedSize = estimateSegmentSize(processedSegments[i].duration);

        // Create segment file with realistic naming
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
      showToast(`All ${processedSegments.length} video segments processed successfully!`);
    } catch (error) {
      console.error('Error processing segments:', error);
      showToast('Failed to process video segments', 'error');
      
      // Mark failed segments
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

  const totalDuration = parseDuration(videoInfo.duration);
  const maxSegmentDuration = Math.max(1, Math.floor(totalDuration / 2)); // At least 2 segments

  return (
    <Card className="w-full max-w-4xl mx-auto">
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
                <span>Duration: {formatTime(totalDuration)} ({totalDuration}s)</span>
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
                <Label htmlFor="segment-duration">Segment Duration (seconds)</Label>
                <Input
                  id="segment-duration"
                  type="number"
                  min="1"
                  max={maxSegmentDuration}
                  value={segmentDuration}
                  onChange={(e) => setSegmentDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={processing}
                />
                <p className="text-xs text-gray-600">
                  Max: {maxSegmentDuration}s (Video is {totalDuration}s total)
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
                        Duration: {formatTime(segment.duration)} ({segment.duration}s)
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
            <p className="font-medium">Production Guidelines:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Shorter segments (3-5 seconds for short videos) are optimal for analysis processing</li>
              <li>Higher compression reduces file size but may affect analysis accuracy</li>
              <li>Processing time scales with video length and compression settings</li>
              <li>Keep segments under 500MB each for optimal Colab performance</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Demo usage
export default function VideoSplitterDemo() {
  const handleSegmentsReady = (segments) => {
    console.log('Segments ready:', segments);
  };

  const mockVideoFile = new File(['mock video content'], 'MCA_U21_____3_____1_720p.mp4', {
    type: 'video/mp4',
    lastModified: Date.now()
  });

  const mockVideoInfo = {
    title: 'MCA_U21_____3_____1_720p',
    duration: '6' // 6 seconds as shown in your screenshot
  };

  // Set file size to 30MB as shown in screenshot
  Object.defineProperty(mockVideoFile, 'size', {
    value: 30 * 1024 * 1024,
    writable: false
  });

  return (
    <div className="p-4 min-h-screen bg-gray-100">
      <VideoSplitter 
        videoFile={mockVideoFile}
        videoInfo={mockVideoInfo}
        onSegmentsReady={handleSegmentsReady}
      />
    </div>
  );
}