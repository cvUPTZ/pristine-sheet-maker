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
}

interface VideoSplitterProps {
  videoFile: File | null; // Allow null for when no file is selected or cleared
  onSegmentsReady: (segments: VideoSegment[]) => void;
}

// Toast replacement for demo
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Simple console log for environments without DOM, or use a proper toast library
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
  onSegmentsReady 
}) => {
  const [segmentDuration, setSegmentDuration] = useState(30);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium');
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [loadingDuration, setLoadingDuration] = useState(false); // Start false, true when file is present
  const [durationError, setDurationError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Effect for loading video metadata
  useEffect(() => {
    if (!videoFile) {
      setVideoDuration(null);
      setLoadingDuration(false);
      setDurationError(null);
      setVideoTitle('');
      setSegments([]); // Clear segments if file is removed
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      return;
    }

    // A videoFile is present, start loading metadata
    setLoadingDuration(true);
    setDurationError(null);
    setVideoTitle(videoFile.name.replace(/\.[^/.]+$/, ""));
    setSegments([]); // Clear previous segments when a new file is loaded

    const videoElement = videoRef.current;
    if (!videoElement) {
      setLoadingDuration(false);
      setDurationError("Video player element not ready.");
      showToast("Video player element not ready.", "error");
      return;
    }

    const objectURL = URL.createObjectURL(videoFile);

    const handleLoadedMetadata = () => {
      if (videoElement) { // Ensure videoElement is still valid
        console.log('Video metadata loaded. Duration:', videoElement.duration);
        setVideoDuration(videoElement.duration);
        showToast(`Video loaded: ${videoFile.name} (${formatTime(videoElement.duration)})`);
      }
      setLoadingDuration(false);
    };

    const handleError = (e: Event) => {
      console.error('Error loading video metadata:', e);
      setDurationError('Failed to load video metadata. Ensure it is a valid video file.');
      setLoadingDuration(false);
      showToast('Failed to load video metadata.', 'error');
    };

    // Add event listeners
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);

    // Set source and load
    videoElement.src = objectURL;
    videoElement.load(); // Important: tells the browser to load the new source

    // Cleanup function for this effect
    return () => {
      console.log('Cleaning up video effect for:', videoFile.name);
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        videoElement.pause(); // Pause video
        videoElement.src = '';   // Clear src to release resources
        // videoElement.load(); // Optionally call load() after clearing src
      }
      URL.revokeObjectURL(objectURL); // Revoke the object URL
      console.log('Revoked URL:', objectURL);
    };

  }, [videoFile]); // Rerun effect if videoFile changes

  const formatTime = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | undefined): string => {
    if (bytes === undefined || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateSegments = () => {
    if (!videoDuration) {
      showToast('Video duration not available. Please wait for the video to load.', 'error');
      return;
    }
    if (segmentDuration <= 0) {
        showToast('Segment duration must be greater than 0.', 'error');
        return;
    }
    if (segmentDuration >= videoDuration) {
      showToast('Segment duration should be less than video duration to split.', 'error');
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
    if (!videoFile) {
      showToast('No video file loaded for processing.', 'error');
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
        setSegments([...processedSegments]); // Update UI with processing status

        const processingTime = Math.max(1000, processedSegments[i].duration * 50); // Simulate processing
        await new Promise(resolve => setTimeout(resolve, processingTime));

        const estimatedSize = estimateSegmentSize(processedSegments[i].duration);
        const segmentFile = new File(
          [`processed video segment ${i + 1}`], 
          `${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}_segment_${i + 1}_${formatTime(processedSegments[i].startTime)}-${formatTime(processedSegments[i].endTime)}.${outputFormat}`,
          { type: `video/${outputFormat}` }
        );

        processedSegments[i].status = 'completed';
        processedSegments[i].file = segmentFile;
        processedSegments[i].size = estimatedSize;
        setSegments([...processedSegments]); // Update UI with completed status
        
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

  // Ensure maxSegmentDuration is sensible, even if videoDuration is briefly null
  const maxSegmentDuration = videoDuration ? Math.max(1, Math.floor(videoDuration -1)) : 60;


  if (!videoFile) {
    // This part can be customized, e.g., show a message or integrate FileUploader here
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Video Splitter</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please select a video file to begin.</p>
            </CardContent>
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
      <CardContent className="space-y-4">
        <video ref={videoRef} style={{ display: 'none' }} preload="metadata" />
        
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3 mb-3">
            <FileVideo className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-medium text-sm">{videoFile.name}</p>
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
                    <span>Size: {formatFileSize(videoFile.size)}</span>
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
                    max={maxSegmentDuration > 0 ? maxSegmentDuration : undefined} // max only if positive
                    value={segmentDuration}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (videoDuration && val >= videoDuration) {
                            setSegmentDuration(Math.max(1, videoDuration -1 ));
                        } else {
                            setSegmentDuration(Math.max(1, val || 1));
                        }
                    }}
                    disabled={processing}
                  />
                  {videoDuration && (
                    <p className="text-xs text-gray-600">
                      Min: 1s. Max: {formatTime(maxSegmentDuration)} (Video: {formatTime(videoDuration)})
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
              {processing ? 'Processing...' : `Process ${segments.length} Segments`}
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

        {segments.length > 0 && (
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

// File upload component for demo (unchanged, assuming it's working)
const FileUploader = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      } else {
        showToast('Please select a valid video file', 'error');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      } else {
        showToast('Please select a valid video file', 'error');
      }
      e.target.value = ''; // Allow selecting the same file again
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="pt-6">
        <form
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-gray-800' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onSubmit={(e) => e.preventDefault()} // Prevent form submission
        >
          <input
            ref={inputRef}
            type="file"
            id="file-upload-input" // Add id for label association
            multiple={false}
            accept="video/*"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <label htmlFor="file-upload-input" className="cursor-pointer"> {/* Make the whole area clickable */}
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Drop your video file here, or click to browse
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Supports MP4, WebM, AVI, MOV, and other common video formats.
            </p>
          </label>
        </form>
      </CardContent>
    </Card>
  );
};

// Demo usage
export default function VideoSplitterDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSegmentsReady = (segments: VideoSegment[]) => {
    console.log('Segments ready for further processing/download:', segments);
    showToast(`${segments.length} video segments are (simulated) ready!`);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    showToast(`Selected video: ${file.name}`);
  };

  return (
    <div className="p-4 min-h-screen bg-gray-100 dark:bg-gray-900 space-y-6">
      {!selectedFile ? (
        <FileUploader onFileSelect={handleFileSelect} />
      ) : (
        <div className="space-y-4">
          <Button 
            onClick={() => setSelectedFile(null)} 
            variant="outline" 
            size="sm"
            className="mb-2"
          >
            ← Change Video File
          </Button>
          <VideoSplitter 
            videoFile={selectedFile}
            onSegmentsReady={handleSegmentsReady}
          />
        </div>
      )}
    </div>
  );
}