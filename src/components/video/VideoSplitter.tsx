// src/components/VideoSplitter.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Scissors, Play, Clock, FileVideo, AlertCircle, Loader2 } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';
import { VideoSegment } from '@/types'; // Assuming VideoSegment type is defined in types.ts
import { formatTime, formatFileSize } from '@/utils/formatters';

interface VideoInfo {
  title: string;
  duration: string; // Duration as a string, e.g., "09:12" or "552"
}

interface VideoSplitterProps {
  videoFile: File | null;
  videoInfo: VideoInfo | null;
  onSegmentsReady: (segments: VideoSegment[]) => void;
}

// Enhanced helper function to parse duration with better format detection
const parseDuration = (durationStr: string | undefined): number | null => {
  if (!durationStr || durationStr.trim() === '') return null;
  
  const trimmed = String(durationStr).trim();
  console.log('Parsing duration:', trimmed);
  
  // If it contains colons, it's in time format (MM:SS or HH:MM:SS)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(Number);
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      // HH:MM:SS format
      const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      console.log('Parsed as HH:MM:SS:', totalSeconds, 'seconds');
      return totalSeconds;
    }
    if (parts.length === 2 && parts.every(p => !isNaN(p))) {
      // MM:SS format
      const totalSeconds = parts[0] * 60 + parts[1];
      console.log('Parsed as MM:SS:', totalSeconds, 'seconds');
      return totalSeconds;
    }
  }
  
  // Try to parse as a plain number (seconds)
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num > 0) {
    const seconds = Math.floor(num);
    console.log('Parsed as number:', seconds, 'seconds');
    return seconds;
  }
  
  console.warn('Could not parse duration:', trimmed);
  return null;
};

export const VideoSplitter: React.FC<VideoSplitterProps> = ({
  videoFile,
  videoInfo,
  onSegmentsReady
}) => {
  const [segmentDuration, setSegmentDuration] = useState(60); // Default to 60 seconds
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  // Effect to load FFmpeg
  useEffect(() => {
    const loadFfmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on('log', ({ message }) => {
        // You can comment this out in production to avoid spamming the console
        console.log('[FFMPEG]:', message);
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      toast.info('Loading video processing library...');

      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegLoaded(true);
        toast.success('Video processing library loaded.');
      } catch (error) {
        toast.error('Failed to load video processing library. Please refresh.');
        console.error("FFMPEG load error:", error);
      }
    };
    loadFfmpeg();
  }, []);

  // Effect to handle video file loading and duration parsing
  useEffect(() => {
    if (videoFile) {
      console.log('Processing video file:', videoFile.name);
      // Use video element to get accurate duration from the file itself
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        const fileDuration = Math.floor(videoElement.duration);
        console.log('Duration from video file:', fileDuration, 'seconds');
        setVideoDuration(fileDuration);
        URL.revokeObjectURL(videoElement.src);
      };
      videoElement.onerror = () => {
        console.warn('Could not read video file directly, trying provided info...');
        // If file fails, try to use provided info as fallback
        const parsedDur = parseDuration(videoInfo?.duration);
        if (parsedDur) {
            console.log('Using duration from videoInfo:', parsedDur, 'seconds');
            setVideoDuration(parsedDur);
            toast.warning("Could not read video file directly, using provided duration.");
        } else {
            console.error('Could not determine video duration');
            toast.error("Could not determine video duration from file or info.");
        }
      };
      videoElement.src = URL.createObjectURL(videoFile);
    } else if (videoInfo?.duration) {
      console.log('No file, using videoInfo duration:', videoInfo.duration);
      // If no file, rely on videoInfo
      const parsedDur = parseDuration(videoInfo.duration);
      if (parsedDur) {
        console.log('Parsed duration from videoInfo:', parsedDur, 'seconds');
        setVideoDuration(parsedDur);
      } else {
        console.error('Invalid duration format in videoInfo:', videoInfo.duration);
        toast.error("Invalid duration format provided in video info.");
      }
    } else {
      setVideoDuration(null);
    }
    // Reset segments when a new video is loaded
    setSegments([]);

  }, [videoFile, videoInfo]);

  const generateSegments = () => {
    if (videoDuration === null || videoDuration <= 0) {
      toast.error('Video duration not available. Cannot generate segments.');
      return;
    }
    if (segmentDuration <= 0) {
      toast.error('Segment duration must be greater than 0.');
      return;
    }

    console.log('Generating segments for video duration:', videoDuration, 'with segment length:', segmentDuration);

    const newSegments: VideoSegment[] = [];
    for (let start = 0; start < videoDuration; start += segmentDuration) {
      const end = Math.min(start + segmentDuration, videoDuration);
      const title = videoInfo?.title || videoFile?.name || "video_segment";
      const cleanTitle = title.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');

      newSegments.push({
        id: `segment-${newSegments.length + 1}`,
        startTime: start,
        endTime: end,
        duration: end - start,
        status: 'pending',
        fileName: `${cleanTitle}_${formatTime(start)}-${formatTime(end)}.mp4`
      });
    }
    setSegments(newSegments);
    console.log('Generated', newSegments.length, 'segments');
    toast.success(`Generated ${newSegments.length} segments. Ready to process.`);
  };

  const processSegments = async () => {
    if (!ffmpegLoaded) {
      toast.error('Video processing library is still loading. Please wait.');
      return;
    }
    if (!videoFile) {
      toast.error('No video file has been loaded for splitting.');
      return;
    }
    if (segments.length === 0) {
      toast.error('Please generate segments first.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;
    
    // Write the main video file to FFmpeg's virtual memory
    toast.info("Preparing video for splitting... This may take a moment.");
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    toast.info("Video prepared. Starting to split segments.");

    const processedSegments = [...segments];

    for (let i = 0; i < processedSegments.length; i++) {
      const segment = processedSegments[i];
      processedSegments[i].status = 'processing';
      setSegments([...processedSegments]);

      const outputFilename = segment.fileName!;
      
      try {
        await ffmpeg.exec([
            '-i', 'input.mp4',
            '-ss', String(segment.startTime),
            '-t', String(segment.duration),
            '-c:v', 'copy', // Use stream copy for video
            '-c:a', 'copy', // Use stream copy for audio
            outputFilename
        ]);
        
        const data = await ffmpeg.readFile(outputFilename);
        const videoBlob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
        const segmentFile = new File([videoBlob], outputFilename, { type: 'video/mp4' });

        processedSegments[i] = {
            ...segment,
            status: 'completed',
            file: segmentFile,
            size: segmentFile.size,
        };
        
        await ffmpeg.deleteFile(outputFilename);
        
      } catch(e) {
        console.error("FFmpeg error on segment", i + 1, e);
        processedSegments[i].status = 'error';
        toast.error(`Failed to split segment ${i + 1}.`);
      }

      setSegments([...processedSegments]);
      setProgress(((i + 1) / processedSegments.length) * 100);
    }
    
    await ffmpeg.deleteFile('input.mp4');
    
    setProcessing(false);
    const successfullyProcessed = processedSegments.filter(s => s.status === 'completed');
    onSegmentsReady(successfullyProcessed);
    toast.success(`Video splitting complete! ${successfullyProcessed.length} segments are ready for AI analysis.`);
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

  if (!videoFile) {
    return (
        <Card className="text-center py-12">
          <CardContent>
            <FileVideo className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Please download a video in the previous step to enable splitting.</p>
          </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-purple-600" />
          Split Video into Segments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-lg border">
          <p className="font-medium text-sm">{videoInfo?.title || videoFile.name}</p>
          <div className="flex gap-4 text-xs text-gray-600 mt-1">
            {videoDuration !== null ? (
              <>
                <span>Duration: {formatTime(videoDuration)}</span>
                <span>Size: {formatFileSize(videoFile.size)}</span>
              </>
            ) : (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading metadata...</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="segment-duration">Segment Duration (seconds)</Label>
            <Input
              id="segment-duration"
              type="number"
              min="10"
              max={videoDuration || 3600}
              value={segmentDuration}
              onChange={(e) => setSegmentDuration(Number(e.target.value) || 60)}
              disabled={processing || !ffmpegLoaded}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={generateSegments}
            disabled={processing || !ffmpegLoaded || videoDuration === null}
            variant="outline"
            className="flex-1"
          >
            Generate Segments Plan
          </Button>
          <Button
            onClick={processSegments}
            disabled={processing || !ffmpegLoaded || segments.length === 0 || segments.some(s => s.status === 'completed')}
            className="flex-1"
          >
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {processing ? 'Splitting...' : `Split into ${segments.length} Segments`}
          </Button>
        </div>

        {processing && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {segments.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-medium">Segments ({segments.length})</h4>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-2 bg-gray-50">
              {segments.map((segment, index) => (
                <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div>
                    <div className="text-sm font-medium">
                      {segment.fileName || `Segment ${index + 1}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      Time: {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      {segment.size && ` • Size: ${formatFileSize(segment.size)}`}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(segment.status)}`}>
                    {segment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
