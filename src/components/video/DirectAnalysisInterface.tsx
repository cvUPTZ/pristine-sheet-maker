// src/components/video/DirectAnalysisInterface.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';
import { VideoPlayerControls } from './analysis/VideoPlayerControls'; // Import
import { AnnotationToolbox } from './analysis/AnnotationToolbox'; // Import
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react'; // Import Download icon


// Types for local state
export interface LocalTaggedEvent { // Ensure this is exported
  id: string;
  timestamp: number;
  type: string;
  notes?: string;
  annotationPaths?: CanvasPath[] | null; // Store annotation paths directly with the event
}

// This specific interface for generic annotations might not be needed if all annotations link to events
// interface LocalAnnotation {
//   id: string;
//   timestamp: number;
//   paths: CanvasPath[];
//   comment?: string;
// }

interface DirectAnalysisInterfaceProps {
  videoUrl: string;
}

export const DirectAnalysisInterface: React.FC<DirectAnalysisInterfaceProps> = ({ videoUrl }) => {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [taggedEvents, setTaggedEvents] = useState<LocalTaggedEvent[]>([]);
  // const [annotations, setAnnotations] = useState<LocalAnnotation[]>([]); // May not be needed if annotations are part of events

  const [selectedEventForAnnotation, setSelectedEventForAnnotation] = useState<LocalTaggedEvent | null>(null);


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


  useEffect(() => {
    setTaggedEvents([]);
    setSelectedEventForAnnotation(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0); // Reset duration when video URL changes
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = 0;
      videoPlayerRef.current.pause();
      // Attempt to load the new video source
      videoPlayerRef.current.src = videoUrl; // Set src directly
      videoPlayerRef.current.load(); // Important to call load() after changing src
    }
     if (canvasRef.current) {
      canvasRef.current.resetCanvas();
    }
  }, [videoUrl]);

  const handleVideoLoadedMetadata = () => {
    if (videoPlayerRef.current) {
      setDuration(videoPlayerRef.current.duration);
      setVideoDimensions({
        width: videoPlayerRef.current.offsetWidth,
        height: videoPlayerRef.current.offsetHeight,
      });
    }
  };

  const handlePlayPause = () => {
    if (videoPlayerRef.current) {
      if (isPlaying) videoPlayerRef.current.pause();
      else videoPlayerRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoPlayerRef.current) setCurrentTime(videoPlayerRef.current.currentTime);
  };

  const handleSaveAnnotationToEvent = useCallback(async (paths: CanvasPath[]) => {
    if (selectedEventForAnnotation) {
      setTaggedEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === selectedEventForAnnotation.id
            ? { ...event, annotationPaths: paths }
            : event
        )
      );
      setSelectedEventForAnnotation(prev => prev ? {...prev, annotationPaths: paths} : null);
      toast.success(`Annotations saved for event "${selectedEventForAnnotation.type}" at ${formatTime(selectedEventForAnnotation.timestamp)}`);
    } else {
      // This case should ideally be handled by disabling save if no event is selected,
      // or by creating a generic annotation if that's desired.
      // For now, we only save if an event is selected.
      toast.info("No event selected to save annotations to. Click an event to select it for annotation.");
    }
  }, [selectedEventForAnnotation]);

  // Simplified event tagging for now
  const handleAddTaggedEvent = (type: string = "General") => {
    if (!videoPlayerRef.current) return;
    const timestamp = videoPlayerRef.current.currentTime;
    const newEvent: LocalTaggedEvent = {
      id: crypto.randomUUID(),
      timestamp,
      type,
      notes: '', // Add notes later if needed
      annotationPaths: null,
    };
    setTaggedEvents(prev => [...prev, newEvent].sort((a,b) => a.timestamp - b.timestamp));
    setSelectedEventForAnnotation(newEvent); // Auto-select new event for annotation
    toast.success(`Event "${type}" tagged at ${formatTime(timestamp)}. Selected for annotation.`);
  };

  const handleSelectEventForAnnotation = (event: LocalTaggedEvent) => {
    if (selectedEventForAnnotation?.id === event.id) {
      // Deselect if clicking the same event
      setSelectedEventForAnnotation(null);
      if(canvasRef.current) canvasRef.current.resetCanvas();
    } else {
      setSelectedEventForAnnotation(event);
      // Loading paths is handled by AnnotationToolbox's useEffect via initialPaths prop
    }
  };

  const handleDeleteTaggedEvent = (eventId: string) => {
    setTaggedEvents(prev => prev.filter(e => e.id !== eventId));
    if (selectedEventForAnnotation?.id === eventId) {
      setSelectedEventForAnnotation(null);
      if (canvasRef.current) canvasRef.current.resetCanvas();
    }
    toast.success("Event deleted.");
  };

  const handleExportData = () => {
    if (taggedEvents.length === 0) {
      toast.info("No analysis data to export.");
      return;
    }

    const dataToExport = {
      videoUrl,
      analysisDate: new Date().toISOString(),
      taggedEvents,
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    // Try to create a somewhat meaningful filename
    let filename = "video_analysis_data.json";
    try {
      const videoFileName = videoUrl.substring(videoUrl.lastIndexOf('/') + 1).split('.')[0];
      if (videoFileName) {
        filename = `${videoFileName}_analysis.json`;
      }
    } catch (e) { /* ignore error, use default */ }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Analysis data exported successfully.");
  };


  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Analysis Workspace</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportData}
          disabled={duration === 0 || taggedEvents.length === 0}
          title="Export analysis data as JSON"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 bg-black rounded-md relative">
          <video
            ref={videoPlayerRef}
            // src={videoUrl} // Src is set in useEffect now
            controls={false}
            width="100%"
            className="rounded-md"
            onLoadedMetadata={handleVideoLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleTimeUpdate}
          >
            Your browser does not support the video tag.
          </video>
          <AnnotationToolbox
            canvasRef={canvasRef}
            videoDimensions={videoDimensions}
            initialPaths={selectedEventForAnnotation?.annotationPaths || null}
            onSaveAnnotations={handleSaveAnnotationToEvent}
            canSave={!!selectedEventForAnnotation && videoDimensions.width > 0} // Enable save only if an event is selected
            disabled={videoDimensions.width === 0} // Disable if video not loaded
          />
        </div>

        <VideoPlayerControls
          videoPlayerRef={videoPlayerRef}
          isPlayingPlaylist={false} // No playlist concept here
        />

        {/* Simplified Event Tagging Section */}
        <div className="my-3 p-3 border rounded-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm">Events</h4>
            <Button size="sm" onClick={() => handleAddTaggedEvent("New Event")} disabled={duration === 0}>
              Tag New Event at {formatTime(currentTime)}
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {taggedEvents.length === 0 && <p className="text-xs text-gray-500">No events tagged yet.</p>}
            {taggedEvents.map(event => (
              <div
                key={event.id}
                onClick={() => handleSelectEventForAnnotation(event)}
                className={`p-2 text-xs rounded border cursor-pointer flex justify-between items-center
                            ${selectedEventForAnnotation?.id === event.id ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}
              >
                <div>
                  <span className="font-semibold">{event.type}</span> @ {formatTime(event.timestamp)}
                  {event.annotationPaths && event.annotationPaths.length > 0 && <span className="ml-1 text-blue-500">(A)</span>}
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => { e.stopPropagation(); handleDeleteTaggedEvent(event.id);}}
                  title="Delete Event"
                >
                  X
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder for Stats and Playlist (if adapted) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
           <Card>
              <CardHeader className="pb-2 pt-3"><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p>Total Events: {taggedEvents.length}</p>
                <p>Events with Annotations: {taggedEvents.filter(e => e.annotationPaths && e.annotationPaths.length > 0).length}</p>
              </CardContent>
            </Card>
          {/* Future PlaylistPanel placeholder */}
        </div>

      </CardContent>
    </Card>
  );
};
