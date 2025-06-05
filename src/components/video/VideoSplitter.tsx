import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming these are ShadCN UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Play, Clock, FileVideo, AlertCircle, Settings, Loader2, Upload } from 'lucide-react';

// Toast replacement for demo purposes
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`Toast (${type}): ${message}`);
  // Basic toast implementation for browsers
  if (typeof document !== 'undefined') {
    const toastId = `toast-${Date.now()}`;
    const toastDiv = document.createElement('div');
    toastDiv.id = toastId;
    toastDiv.style.position = 'fixed';
    toastDiv.style.top = '20px';
    toastDiv.style.right = '20px';
    toastDiv.style.padding = '10px 20px';
    toastDiv.style.borderRadius = '5px';
    toastDiv.style.color = 'white';
    toastDiv.style.zIndex = '10000';
    toastDiv.style.backgroundColor = type === 'success' ? 'green' : 'red';
    toastDiv.textContent = message;
    document.body.appendChild(toastDiv);
    setTimeout(() => {
      const el = document.getElementById(toastId);
      if (el) document.body.removeChild(el);
    }, 3000);
  }
};

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File; // This would be a real segment file in a non-simulated scenario
  size?: number;
  fileName?: string;
}

interface VideoInfo {
  title: string;
  duration: string; // Expected format: "MM:SS" or "HH:MM:SS" or number of seconds as string
}

interface VideoSplitterProps {
  videoFile: File | null; // Changed to non-optional, as it's core for real data
  videoInfo?: VideoInfo | null; // Optional: To provide metadata, overrides file metadata if valid
  onSegmentsReady: (segments: VideoSegment[]) => void;
}

const VideoSplitter: React.FC<VideoSplitterProps> = ({
  videoFile,
  videoInfo,
  onSegmentsReady
}) => {
  const [segmentDuration, setSegmentDuration] = useState(30);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('mp4');

  const [actualVideoDuration, setActualVideoDuration] = useState<number | null>(null); // Duration in seconds
  const [displayVideoTitle, setDisplayVideoTitle] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const parseDurationString = (durationStr: string | undefined): number | null => {
    if (!durationStr) return null;
    try {
      if (durationStr.includes(':')) {
        const parts = durationStr.split(':').map(Number);
        if (parts.some(isNaN)) return null;
        if (parts.length === 2) return parts[0] * 60 + parts[1]; // MM:SS
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
      const num = parseFloat(durationStr);
      return !isNaN(num) && num >= 0 ? num : null;
    } catch (error) {
      console.error('Error parsing duration string:', durationStr, error);
      return null;
    }
  };

  useEffect(() => {
    if (!videoFile) {
      setActualVideoDuration(null);
      setDisplayVideoTitle('');
      setIsLoadingMetadata(false);
      setMetadataError('No video file provided.');
      setSegments([]);
      if (videoRef.current) {
        videoRef.current.src = '';
      }
      return;
    }

    setIsLoadingMetadata(true);
    setMetadataError(null);
    setActualVideoDuration(null); // Reset while loading new file
    setSegments([]); // Clear old segments

    let titleSource = videoFile.name.replace(/\.[^/.]+$/, "");
    let durationSource: number | null = null;
    let usedInfoProp = false;

    // Attempt to use videoInfo prop first
    if (videoInfo) {
      if (videoInfo.title) {
        titleSource = videoInfo.title;
      }
      const parsedInfoDuration = parseDurationString(videoInfo.duration);
      if (parsedInfoDuration !== null) {
        durationSource = parsedInfoDuration;
        usedInfoProp = true;
        console.log(`Using duration from videoInfo prop: ${durationSource}s`);
      } else {
        console.warn("videoInfo.duration is invalid, will attempt to load from file metadata.");
      }
    }
    setDisplayVideoTitle(titleSource);

    if (durationSource !== null) {
      setActualVideoDuration(durationSource);
      setIsLoadingMetadata(false);
      showToast(`Video metadata ready (from prop): ${titleSource} (${formatTime(durationSource)})`);
      return; // Duration resolved from videoInfo, skip file loading for duration
    }

    // Fallback to loading metadata from the videoFile
    const videoElement = videoRef.current;
    if (!videoElement) {
      setIsLoadingMetadata(false);
      setMetadataError("Video player element not ready for metadata loading.");
      return;
    }

    console.log("Attempting to load metadata from video file:", videoFile.name);
    const objectURL = URL.createObjectURL(videoFile);

    const handleLoadedMetadata = () => {
      if (videoElement.duration === Infinity || isNaN(videoElement.duration)) {
          console.error('Video duration is Infinity or NaN. File might be corrupt or format not fully supported by browser.');
          setMetadataError('Could not determine video duration. File might be corrupt or format not fully supported.');
          setActualVideoDuration(null);
      } else {
          setActualVideoDuration(videoElement.duration);
          console.log(`Metadata loaded from file: Duration ${videoElement.duration}s`);
          showToast(`Video metadata loaded (from file): ${displayVideoTitle || videoFile.name} (${formatTime(videoElement.duration)})`);
      }
      setIsLoadingMetadata(false);
      URL.revokeObjectURL(objectURL); // Revoke immediately after use
    };

    const handleError = (e: Event) => {
      console.error('Error loading video metadata from file:', e);
      setMetadataError('Failed to load video metadata. Ensure it is a valid and supported video file.');
      setIsLoadingMetadata(false);
      URL.revokeObjectURL(objectURL); // Revoke on error too
    };

    videoElement.src = objectURL;
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    videoElement.addEventListener('error', handleError, { once: true });
    videoElement.load(); // Start loading the video

    return () => {
      // Cleanup: remove event listeners and revoke Object URL if not already done
      // The {once: true} option handles listener removal for these specific events.
      // If the component unmounts before events fire, revokeObjectURL might be missed here,
      // so it's good to have it in the event handlers too.
      if (videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoElement.src);
      }
      videoElement.src = ''; // Clear src
    };
  }, [videoFile, videoInfo]); // videoInfo is included in dependencies

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleGenerateSegments = () => {
    if (actualVideoDuration === null || actualVideoDuration <= 0) {
      showToast('Video duration not available or invalid.', 'error');
      return;
    }
    if (segmentDuration <= 0) {
      showToast('Segment duration must be greater than 0.', 'error');
      return;
    }

    const newSegments: VideoSegment[] = [];
    if (segmentDuration >= actualVideoDuration) {
      // Create one segment for the whole video
      newSegments.push({
        id: `segment-1`,
        startTime: 0,
        endTime: actualVideoDuration,
        duration: actualVideoDuration,
        status: 'pending',
      });
      showToast(`Generated 1 segment (full video). Segment duration was >= video duration.`);
    } else {
      for (let start = 0; start < actualVideoDuration; start += segmentDuration) {
        const end = Math.min(start + segmentDuration, actualVideoDuration);
        newSegments.push({
          id: `segment-${newSegments.length + 1}`,
          startTime: start,
          endTime: end,
          duration: end - start,
          status: 'pending',
        });
      }
      showToast(`Generated ${newSegments.length} segments.`);
    }
    setSegments(newSegments);
  };

  const processSingleSegment = async (segment: VideoSegment, index: number): Promise<VideoSegment> => {
    // SIMULATION of real processing (e.g., using ffmpeg.wasm or a backend)
    // In a real scenario, you'd slice videoFile from segment.startTime to segment.endTime
    console.log(`Simulating processing for segment ${index + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`);
    
    // Simulate processing time based on duration
    const simulatedProcessingTime = segment.duration * 100 + 500; // e.g., 100ms per second + 0.5s overhead
    await new Promise(resolve => setTimeout(resolve, simulatedProcessingTime));

    // Simulate output file
    // In a real app, this would be the actual sliced video segment File object
    const mockSegmentBlob = new Blob([`Mock content for segment ${index + 1}`], { type: `video/${outputFormat}` });
    const estimatedSize = (videoFile?.size || 0) * (segment.duration / (actualVideoDuration || 1)); // Rough estimate

    return {
      ...segment,
      status: 'completed',
      // file: new File([mockSegmentBlob], `segment_${index + 1}.${outputFormat}`, { type: `video/${outputFormat}` }), // Placeholder for real file
      fileName: `${displayVideoTitle.replace(/[^a-zA-Z0-9]/g, '_')}_seg${index+1}_${formatTime(segment.startTime)}.${outputFormat}`,
      size: estimatedSize > 0 ? estimatedSize : undefined,
    };
  };


  const handleProcessSegments = async () => {
    if (!segments.length) {
      showToast('No segments generated.', 'error');
      return;
    }
    if (!videoFile || actualVideoDuration === null) {
      showToast('Video file or duration not available for processing.', 'error');
      return;
    }

    setProcessing(true);
    setOverallProgress(0);
    const processedSegments: VideoSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      setCurrentSegmentIdx(i);
      const currentSegmentsCopy = [...segments];
      currentSegmentsCopy[i] = { ...currentSegmentsCopy[i], status: 'processing' };
      setSegments(currentSegmentsCopy);

      try {
        const result = await processSingleSegment(segments[i], i);
        processedSegments.push(result);
        const finalSegmentsCopy = [...currentSegmentsCopy]; // Get the latest state
        finalSegmentsCopy[i] = result;
        setSegments(finalSegmentsCopy);

      } catch (error) {
        console.error(`Error processing segment ${i + 1}:`, error);
        const errorSegmentsCopy = [...segments];
        errorSegmentsCopy[i] = { ...errorSegmentsCopy[i], status: 'error' };
        setSegments(errorSegmentsCopy);
        // Optionally, stop processing or allow user to retry
      }
      setOverallProgress(((i + 1) / segments.length) * 100);
    }

    onSegmentsReady(processedSegments.filter(s => s.status === 'completed'));
    showToast(`Processing complete for ${processedSegments.filter(s => s.status === 'completed').length} segments!`);
    setProcessing(false);
    setCurrentSegmentIdx(0);
  };

  const maxSegmentDurationInput = actualVideoDuration ? Math.max(1, Math.floor(actualVideoDuration - 0.1)) : 3600; // Default to 1hr if no duration

  if (!videoFile && !isLoadingMetadata) { // Show message if no file and not loading
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader><CardTitle>Video Splitter</CardTitle></CardHeader>
            <CardContent><p>Please select a video file using the uploader above to begin.</p></CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-purple-600" />
          Professional Video Splitter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden video element for metadata loading */}
        <video ref={videoRef} style={{ display: 'none' }} preload="metadata" />

        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            <FileVideo className="h-6 w-6 text-gray-600" />
            <div className="flex-1">
              <p className="font-medium text-lg">{displayVideoTitle || (videoFile ? videoFile.name : "Loading...")}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                {isLoadingMetadata ? (
                  <span className="flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Loading metadata...</span>
                ) : metadataError ? (
                  <span className="text-red-600">{metadataError}</span>
                ) : actualVideoDuration !== null ? (
                  <>
                    <span>Duration: {formatTime(actualVideoDuration)}</span>
                    {videoFile?.size && <span>Size: {formatFileSize(videoFile.size)}</span>}
                  </>
                ) : (
                  <span>Metadata not available.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isLoadingMetadata && !metadataError && actualVideoDuration !== null && (
          <>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Options (Simulated)</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="segment-duration">Segment Duration (seconds)</Label>
                    <Input
                      id="segment-duration" type="number" min="1"
                      max={maxSegmentDurationInput}
                      value={segmentDuration}
                      onChange={(e) => setSegmentDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      disabled={processing}
                    />
                     <p className="text-xs text-gray-500 mt-1">
                        Max: {formatTime(maxSegmentDurationInput)}. Video: {formatTime(actualVideoDuration)}.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="output-format">Output Format (Simulated)</Label>
                     <select /* Using native select for simplicity here */
                        id="output-format" value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                        disabled={processing}
                        className="w-full p-2 border rounded bg-background"
                    >
                        <option value="mp4">MP4</option><option value="webm">WebM</option>
                    </select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="advanced" className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="compression-level">Compression Level (Simulated)</Label>
                  <select
                    id="compression-level" value={compressionLevel}
                    onChange={(e) => setCompressionLevel(e.target.value)}
                    disabled={processing}
                    className="w-full p-2 border rounded bg-background"
                  >
                    <option value="low">Low (Best Quality)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Smallest Size)</option>
                  </select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleGenerateSegments} disabled={processing || actualVideoDuration === null} variant="outline">
                <Settings className="h-4 w-4 mr-2" /> Generate Segments
              </Button>
              <Button onClick={handleProcessSegments} disabled={processing || !segments.length || actualVideoDuration === null}>
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {processing ? `Processing ${currentSegmentIdx + 1}/${segments.length}...` : `Process ${segments.length || ''} Segments`}
              </Button>
            </div>
          </>
        )}

        {processing && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span>Processing Segment: {currentSegmentIdx + 1} of {segments.length}</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>
        )}

        {segments.length > 0 && (
          <div className="space-y-3 pt-4">
            <h4 className="font-medium text-lg">Video Segments ({segments.length})</h4>
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded p-2 bg-muted/30">
              {segments.map((segment, index) => (
                <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono w-8 text-center text-muted-foreground">{index + 1}</div>
                    <div>
                      <p className="text-sm font-semibold">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {formatTime(segment.duration)}
                        {segment.size && ` • Est. Size: ${formatFileSize(segment.size)}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    segment.status === 'completed' ? 'default' :
                    segment.status === 'processing' ? 'secondary' :
                    segment.status === 'error' ? 'destructive' : 'outline'
                  } className="capitalize">
                    {segment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700/50">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Production Notes:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Actual segment processing (splitting) is simulated. Real processing would use tools like FFmpeg and take more time.</li>
              <li>Ensure video files are from trusted sources.</li>
              <li>Browser capabilities for video format support may vary.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Demo Usage with File Uploader ---
const FileUploader: React.FC<{ onFileSelect: (file: File) => void, currentFile: File | null }> = ({ onFileSelect, currentFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      onFileSelect(selectedFile);
    } else if (selectedFile) {
      showToast('Invalid file type. Please select a video.', 'error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader><CardTitle>Upload Video File</CardTitle></CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => e.preventDefault()}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <input
            ref={inputRef} type="file" accept="video/*"
            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="video-file-input"
          />
          <label htmlFor="video-file-input" className="cursor-pointer flex flex-col items-center justify-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-lg font-medium mb-1">
              {currentFile ? "Change video" : "Drop your video here, or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground">MP4, WebM, MOV, etc.</p>
          </label>
        </form>
        {currentFile && (
          <div className="mt-4 p-3 bg-muted/50 rounded text-sm">
            Selected: <strong>{currentFile.name}</strong> ({formatFileSize(currentFile.size)})
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function VideoSplitterPageWithRealFile() {
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  // Example: If you had metadata from a previous step (like your YouTubeDownloader)
  // You could store it and pass it to VideoSplitter as the `videoInfo` prop.
  // const [downloadedVideoInfo, setDownloadedVideoInfo] = useState<VideoInfo | null>(null);

  const handleSegmentsProcessed = (segments: VideoSegment[]) => {
    console.log('All segments processed (simulated):', segments);
    // Here you would typically do something with the segments,
    // like offer them for download or pass them to an analysis step.
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-background text-foreground space-y-6">
      <h1 className="text-3xl font-bold text-center">Advanced Video Splitter</h1>
      <FileUploader onFileSelect={setSelectedVideoFile} currentFile={selectedVideoFile} />

      {selectedVideoFile && (
        <VideoSplitter
          videoFile={selectedVideoFile}
          // videoInfo={downloadedVideoInfo} // Pass this if you have it and want to use its title/duration
          onSegmentsReady={handleSegmentsProcessed}
        />
      )}
    </div>
  );
}