import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Play, Clock, FileVideo, AlertCircle, Settings, Loader2, Upload } from 'lucide-react';

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
  size?: number;
  fileName?: string;
}

interface VideoInfo {
  title: string;
  duration: string; // Duration as a string, e.g., "09:12" or "552"
}

interface VideoSplitterProps {
  videoFile?: File | null;
  videoInfo?: VideoInfo; // Optional: To provide metadata directly
  onSegmentsReady: (segments: VideoSegment[]) => void;
}

// Toast replacement for demo
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`Toast (${type}): ${message}`);
  if (typeof document !== 'undefined') {
    const toastDiv = document.createElement('div');
    toastDiv.className = `fixed top-4 right-4 p-3 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toastDiv.textContent = message;
    document.body.appendChild(toastDiv);
    setTimeout(() => {
      if (document.body.contains(toastDiv)) {
        document.body.removeChild(toastDiv);
      }
    }, 3000);
  }
};

const VideoSplitter: React.FC<VideoSplitterProps> = ({
  videoFile,
  videoInfo,
  onSegmentsReady
}) => {
  const [segmentDuration, setSegmentDuration] = useState(30);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoDuration, setVideoDuration] = useState<number | null>(null); // Duration in seconds
  const [videoTitle, setVideoTitle] = useState('');
  const [loadingDuration, setLoadingDuration] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // FIXED: Parse duration from videoInfo if available
  const parseDurationFromInfo = (durationStr: string): number | null => {
    try {
      if (!durationStr || durationStr.trim() === '') return null;

      // Clean the string and handle edge cases
      const cleanDuration = durationStr.trim();

      if (cleanDuration.includes(':')) {
        const parts = cleanDuration.split(':').map(part => {
          const num = parseInt(part, 10);
          return isNaN(num) ? 0 : num; // Convert NaN to 0 for safety
        });

        if (parts.length === 2) { // MM:SS format
          const [minutes, seconds] = parts;
          return minutes * 60 + seconds;
        } else if (parts.length === 3) { // HH:MM:SS format
          const [hours, minutes, seconds] = parts;
          return hours * 3600 + minutes * 60 + seconds;
        }
      }

      // Try to parse as a number (seconds)
      const num = parseFloat(cleanDuration);
      if (!isNaN(num) && num >= 0) {
        return Math.floor(num); // Return whole seconds
      }

      return null;
    } catch (error) {
      console.error('Error parsing duration:', error);
      return null;
    }
  };

  // Effect for loading video metadata
  useEffect(() => {
    // Reset state if no video source
    if (!videoFile && !videoInfo) {
      setVideoDuration(null);
      setLoadingDuration(false);
      setDurationError(null);
      setVideoTitle('');
      setSegments([]);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      return;
    }

    setLoadingDuration(true);
    setDurationError(null);
    setSegments([]); // Reset segments when video source changes

    let resolvedTitle = '';
    let resolvedDuration: number | null = null;

    // Priority 1: Use videoInfo if provided and valid
    if (videoInfo) {
      resolvedTitle = videoInfo.title || '';
      const durationFromInfo = parseDurationFromInfo(videoInfo.duration);
      if (durationFromInfo !== null && durationFromInfo > 0) {
        resolvedDuration = durationFromInfo;
        console.log('Video duration from info:', resolvedDuration, 'seconds (formatted:', videoInfo.duration, ')');
      } else {
        // videoInfo.duration was invalid, will fallback to videoFile if available
        console.warn('Invalid or empty duration format in videoInfo.duration:', videoInfo.duration);
      }
    }

    setVideoTitle(resolvedTitle || (videoFile?.name.replace(/\.[^/.]+$/, "") || ''));

    if (resolvedDuration !== null) {
      setVideoDuration(resolvedDuration);
      showToast(`Video loaded: ${resolvedTitle || 'Video'} (${formatTime(resolvedDuration)})`);
      setLoadingDuration(false);
      return; // Duration resolved from videoInfo, no need to load from file
    }

    // Priority 2: Fall back to videoFile metadata loading if no valid duration from videoInfo
    if (!videoFile) {
      setLoadingDuration(false);
      if (!videoInfo) { // Only error if no videoInfo was even attempted
         setDurationError("No video file or valid video info provided.");
      } else if (resolvedDuration === null) {
         setDurationError("Duration from video info was invalid, and no video file to fallback.");
      }
      if (!videoTitle) setVideoTitle('Unknown Video'); // Set a default title if none resolved
      return;
    }

    // If title wasn't set by videoInfo, use file name
    if (!resolvedTitle) {
        setVideoTitle(videoFile.name.replace(/\.[^/.]+$/, ""));
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
      setLoadingDuration(false);
      setDurationError("Video player element not ready.");
      showToast("Video player element not ready.", "error");
      return;
    }

    const objectURL = URL.createObjectURL(videoFile);

    const handleLoadedMetadata = () => {
      if (videoElement) {
        console.log('Video metadata loaded from file. Duration:', videoElement.duration);
        setVideoDuration(Math.floor(videoElement.duration)); // Ensure whole seconds
        showToast(`Video loaded: ${videoFile.name} (${formatTime(videoElement.duration)})`);
        setDurationError(null); // Clear previous error if any
      }
      setLoadingDuration(false);
    };

    const handleError = (e: Event) => {
      console.error('Error loading video metadata from file:', e);
      setDurationError('Failed to load video metadata from file. Ensure it is a valid video file.');
      setLoadingDuration(false);
      showToast('Failed to load video metadata from file.', 'error');
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);
    videoElement.src = objectURL;
    videoElement.load();

    return () => {
      console.log('Cleaning up video effect');
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        videoElement.pause();
        videoElement.src = '';
      }
      URL.revokeObjectURL(objectURL);
    };

  }, [videoFile, videoInfo]); // Rerun when videoFile or videoInfo changes

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '00:00';

    const totalSeconds = Math.floor(seconds); // Ensure we work with whole seconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateSegments = () => {
    if (videoDuration === null || videoDuration === undefined) { // Check for null or undefined
      showToast('Video duration not available. Please wait for the video to load.', 'error');
      return;
    }
    if (segmentDuration <= 0) {
        showToast('Segment duration must be greater than 0.', 'error');
        return;
    }
    if (segmentDuration >= videoDuration) {
      showToast('Segment duration should be less than video duration to split. Full video will be one segment.', 'error');
       const singleSegment: VideoSegment[] = [{
        id: `segment-1`,
        startTime: 0,
        endTime: videoDuration,
        duration: videoDuration,
        status: 'pending'
      }];
      setSegments(singleSegment);
      showToast(`Generated 1 segment (full video).`);
      return;
    }

    const newSegments: VideoSegment[] = [];
    for (let start = 0; start < videoDuration; start += segmentDuration) {
      const end = Math.min(start + segmentDuration, videoDuration);
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
    const baseSizePerSecond = compressionLevel === 'low' ? 2 * 1024 * 1024 :
                             compressionLevel === 'medium' ? 1 * 1024 * 1024 :
                             0.5 * 1024 * 1024;
    return duration * baseSizePerSecond;
  };

  const processSegments = async () => {
    if (segments.length === 0) {
      showToast('Please generate segments first', 'error');
      return;
    }
    if (!videoFile && !videoInfo) { // Should check if videoDuration is available too
      showToast('No video file loaded or video info available for processing.', 'error');
      return;
    }
    if (videoDuration === null) {
        showToast('Video duration not determined. Cannot process segments.', 'error');
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

        const processingTime = Math.max(1000, processedSegments[i].duration * 50); // Simulation
        await new Promise(resolve => setTimeout(resolve, processingTime));

        const estimatedSize = estimateSegmentSize(processedSegments[i].duration);
        // Use a more specific title if available, otherwise a generic one
        const baseFileName = (videoTitle || (videoFile?.name.replace(/\.[^/.]+$/, "")) || "video").replace(/[^a-zA-Z0-9]/g, '_');
        const segmentFile = new File(
          [`processed video segment ${i + 1}`],
          `${baseFileName}_segment_${i + 1}_${formatTime(processedSegments[i].startTime)}-${formatTime(processedSegments[i].endTime)}.${outputFormat}`,
          { type: `video/${outputFormat}` }
        );

        processedSegments[i].status = 'completed';
        processedSegments[i].file = segmentFile;
        processedSegments[i].size = estimatedSize;
        processedSegments[i].fileName = segmentFile.name;
        setSegments([...processedSegments]);

        const progressPercent = ((i + 1) / processedSegments.length) * 100;
        setProgress(progressPercent);
      }

      onSegmentsReady(processedSegments);
      showToast(`All ${processedSegments.length} video segments processed successfully!`);
    } catch (error) {
      console.error('Error processing segments:', error);
      showToast('Failed to process video segments', 'error');
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

  const maxSegmentDuration = videoDuration ? Math.max(1, Math.floor(videoDuration -1 )) : 60;

  if (!videoFile && !videoInfo) {
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Video Splitter</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please select a video file or ensure video info is provided to begin.</p>
            </CardContent>
        </Card>
    );
  }

  const displayName = videoTitle || 'Unknown Video';
  const displaySize = videoFile?.size;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-purple-600" />
          Professional Video Splitter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden video element for metadata loading and potential processing */}
        <video ref={videoRef} style={{ display: 'none' }} preload="metadata" crossOrigin="anonymous" />

        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3 mb-3">
            <FileVideo className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-medium text-sm">{displayName}</p>
              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                {loadingDuration ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading video metadata...
                  </span>
                ) : durationError ? (
                  <span className="text-red-600">{durationError}</span>
                ) : videoDuration !== null ? (
                  <>
                    <span>Duration: {formatTime(videoDuration)}</span>
                    {displaySize !== undefined && <span>Size: {formatFileSize(displaySize)}</span>}
                  </>
                ) : (
                  <span>Video metadata not available.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!loadingDuration && !durationError && videoDuration !== null && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="segment-duration">Segment Duration (seconds)</Label>
                  <Input
                    id="segment-duration"
                    type="number"
                    min="1"
                    max={maxSegmentDuration > 0 ? maxSegmentDuration : undefined}
                    value={segmentDuration}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (videoDuration && val >= videoDuration) {
                            setSegmentDuration(Math.max(1, videoDuration -1));
                        } else {
                            setSegmentDuration(Math.max(1, val || 1));
                        }
                    }}
                    disabled={processing}
                  />
                  {videoDuration !== null && (
                    <p className="text-xs text-gray-600">
                      Min: 1s. Max: {formatTime(maxSegmentDuration > 0 ? maxSegmentDuration : videoDuration)} (Video: {formatTime(videoDuration)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="output-format">Output Format</Label>
                  <select
                    id="output-format"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700"
                    disabled={processing}
                  >
                    <option value="mp4">MP4 (recommended)</option>
                    <option value="webm">WebM</option>
                    <option value="avi">AVI</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="compression-level">Compression Level</Label>
                  <select
                    id="compression-level"
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(e.target.value)}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700"
                    disabled={processing}
                  >
                    <option value="low">Low (High Quality, Large Files)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Lower Quality, Small Files)</option>
                  </select>
                </div>

                {segments.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900 dark:border-blue-700">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Estimated total size: {formatFileSize(totalEstimatedSize)}
                    </p>
                  </div>
                )}
            </TabsContent>
          </Tabs>
        )}

        {!loadingDuration && !durationError && videoDuration !== null && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={generateSegments}
              disabled={processing || videoDuration === null}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Generate Segments
            </Button>
            <Button
              onClick={processSegments}
              disabled={processing || segments.length === 0 || videoDuration === null}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {processing ? 'Processing...' : `Process ${segments.length > 0 ? segments.length : ''} Segments`}
            </Button>
          </div>
        )}

        {processing && (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-sm">
              <span>Processing segment {currentSegment} of {segments.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This is a simulation. Actual video processing would take longer.
            </p>
          </div>
        )}

        {segments.length > 0 && !processing && videoDuration !== null && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Video Segments ({segments.length})</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Duration: {formatTime(segments.reduce((sum, seg) => sum + seg.duration, 0))}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              {segments.map((segment, index) => (
                <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono w-8 text-center">{index + 1}</div>
                    <div>
                      <div className="text-sm font-medium">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Duration: {formatTime(segment.duration)}
                        {segment.size && ` • Est. Size: ${formatFileSize(segment.size)}`}
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(segment.status)} px-2 py-1 text-xs`}>
                    {segment.status.charAt(0).toUpperCase() + segment.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-200 dark:bg-yellow-900 dark:border-yellow-700">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-800 dark:text-yellow-200">
            <p className="font-medium">Production Guidelines:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Video duration is automatically detected. Ensure valid video files.</li>
              <li>For optimal analysis, consider 30-60 second segments.</li>
              <li>Higher compression reduces file size but may impact quality.</li>
              <li>Segment processing is simulated; real processing time varies.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Demo component to test the fix
export default function VideoSplitterDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testScenario, setTestScenario] = useState<'correct' | 'broken' | 'file-only'>('correct');

  const handleSegmentsReady = (segments: VideoSegment[]) => {
    console.log('Segments ready for further processing/download:', segments);
    showToast(`${segments.length} video segments are ready!`);
  };

  // Simulate different scenarios to test the fix
  const getVideoInfo = () => {
    switch (testScenario) {
      case 'correct':
        return { title: "Sample Video", duration: "09:12" }; // This should show 09:12 correctly
      case 'broken':
        return { title: "Sample Video", duration: "" }; // This would cause fallback to file
      case 'file-only':
        return undefined; // No video info, use file only
      default:
        return undefined;
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gray-100 dark:bg-gray-900 space-y-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>VideoSplitter Fix Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Test Scenario:</Label>
              <select 
                value={testScenario} 
                onChange={(e) => setTestScenario(e.target.value as any)}
                className="w-full p-2 border rounded mt-2"
              >
                <option value="correct">✅ Correct: videoInfo.duration = "09:12"</option>
                <option value="broken">❌ Broken: videoInfo.duration = "" (empty)</option>
                <option value="file-only">📄 File Only: No videoInfo provided</option>
              </select>
            </div>
            
            <div>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <VideoSplitter
          videoFile={selectedFile}
          videoInfo={getVideoInfo()}
          onSegmentsReady={handleSegmentsReady}
        />
      )}
    </div>
  );
}