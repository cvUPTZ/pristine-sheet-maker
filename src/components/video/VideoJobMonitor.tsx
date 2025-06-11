// src/components/VideoJobMonitor.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Loader2, Trash2, Eye } from 'lucide-react'; // Base icons

import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { EventType, TaggedEvent } from '@/types/events';
import { Playlist, PlaylistItem } from '@/types/playlists';
import { CanvasPath, ReactSketchCanvasRef } from 'react-sketch-canvas';

// Import Sub-Components
import { AnalysisStats } from './analysis/AnalysisStats';
import { VideoPlayerControls } from './analysis/VideoPlayerControls';
import { AnnotationToolbox } from './analysis/AnnotationToolbox';
import { EventTaggingSection } from './analysis/EventTaggingSection';
import { PlaylistPanel } from './analysis/PlaylistPanel';

// Utility function (consider moving to a shared utils file)
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
}

export const VideoJobMonitor: React.FC<VideoJobMonitorProps> = ({ job, onJobUpdate, onJobDelete }) => {
  // Core UI State
  const [showAnalysisUI, setShowAnalysisUI] = useState(false);

  // Refs - owned by VideoJobMonitor and passed down
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  // User and Dimensions State - owned by VideoJobMonitor and passed down
  const [currentUser, setCurrentUser] = useState<any>(null); // Supabase User type ideally
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Data State - owned by VideoJobMonitor, modified by callbacks, passed to children
  const [availableEventTypes, setAvailableEventTypes] = useState<EventType[]>([]);
  const [taggedEvents, setTaggedEvents] = useState<TaggedEvent[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<(Playlist & { items?: PlaylistItem[] }) | null>(null);
  
  // Shared Interaction State
  const [activeTaggedEventId, setActiveTaggedEventId] = useState<string | null>(null); // For annotation selection
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false); // Affects multiple components

  // Loading/Error states for data fetched directly by VideoJobMonitor
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  const [eventTypesError, setEventTypesError] = useState<string | null>(null);
  const [taggedEventsLoading, setTaggedEventsLoading] = useState(false);
  const [taggedEventsError, setTaggedEventsError] = useState<string | null>(null);

  // Fetch initial user data
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Poll job status
  useEffect(() => {
    let stopPolling: (() => void) | null = null;
    if (job.status === 'pending' || job.status === 'processing') {
      VideoJobService.pollJobStatus(job.id, onJobUpdate).then(stopFn => { stopPolling = stopFn; });
    }
    return () => { if (stopPolling) stopPolling(); };
  }, [job.id, job.status, onJobUpdate]);
  
  // Initial data fetching when analysis UI is shown
  useEffect(() => {
    if (showAnalysisUI && currentUser && job.id) {
      fetchEventTypes();
      fetchTaggedEvents(job.id);
      // Playlists are fetched by PlaylistPanel itself using props.
    } else {
      // Clear states when UI is hidden or dependencies missing
      setAvailableEventTypes([]);
      setTaggedEvents([]);
      setActiveTaggedEventId(null);
      setPlaylists([]); // PlaylistPanel will also clear its own when disabled or job changes
      setCurrentPlaylist(null);
      setIsPlayingPlaylist(false);
    }
  }, [showAnalysisUI, currentUser, job.id]);


  // --- Data Fetching Functions (owned by VideoJobMonitor) ---
  const fetchEventTypes = async () => {
    if (!currentUser) return;
    setEventTypesLoading(true);
    setEventTypesError(null);
    try {
      const { data, error } = await supabase.from('event_types').select('*').eq('user_id', currentUser.id).order('created_at');
      if (error) throw error;
      setAvailableEventTypes(data || []);
    } catch (e: any) { setEventTypesError(e.message); toast.error("Failed to load event types."); }
    finally { setEventTypesLoading(false); }
  };

  const fetchTaggedEvents = async (currentJobId: string) => {
    if (!currentJobId) return;
    setTaggedEventsLoading(true);
    setTaggedEventsError(null);
    try {
      const { data, error } = await supabase.from('tagged_events').select('*, event_types(id, name, color)').eq('video_job_id', currentJobId).order('timestamp');
      if (error) throw error;
      setTaggedEvents(data || []);
    } catch (e: any) { setTaggedEventsError(e.message); toast.error("Failed to load tagged events."); }
    finally { setTaggedEventsLoading(false); }
  };

  // --- Callbacks for Sub-Components ---

  // For EventTaggingSection
  const handleCreateEventTypeInDb = async (name: string): Promise<EventType | null> => {
    if (!currentUser) { toast.error('Login required to create event types.'); return null; }
    try {
      const { data: existing } = await supabase.from('event_types').select('id').eq('user_id', currentUser.id).eq('name', name).maybeSingle();
      if (existing) { toast.error(`Event type "${name}" already exists.`); return null; }
      
      const { data, error } = await supabase.from('event_types').insert({ user_id: currentUser.id, name: name }).select().single();
      if (error) throw error;
      if (data) {
        setAvailableEventTypes(prev => [...prev, data]);
        toast.success(`Event type "${name}" created.`);
        return data;
      }
    } catch (e: any) { toast.error(`Failed to create event type: ${e.message}`); }
    return null;
  };

  const handleTagEventInDb = async (eventTypeId: string, timestamp: number, videoJobId: string): Promise<TaggedEvent | null> => {
    if (!currentUser) { toast.error('Login required to tag events.'); return null; }
    try {
      const { data, error } = await supabase
        .from('tagged_events')
        .insert({ video_job_id: videoJobId, event_type_id: eventTypeId, timestamp: timestamp })
        .select('*, event_types(id, name, color)') // Ensure correct FK name for join if needed
        .single();
      if (error) throw error;
      if (data) {
        setTaggedEvents(prev => [...prev, data as TaggedEvent]);
        toast.success(`Event "${data.event_types?.name || 'Selected Type'}" tagged at ${formatTime(timestamp)}.`);
        return data as TaggedEvent;
      }
    } catch (e: any) { toast.error(`Failed to tag event: ${e.message}`); }
    return null;
  };

  const handleDeleteTaggedEventInDb = async (taggedEventId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('tagged_events').delete().eq('id', taggedEventId);
      if (error) throw error;
      setTaggedEvents(prev => prev.filter(e => e.id !== taggedEventId));
      if (activeTaggedEventId === taggedEventId) setActiveTaggedEventId(null); // Deselect if deleted
      toast.success('Tagged event deleted.');
      return true;
    } catch (e: any) { toast.error(`Failed to delete tagged event: ${e.message}`); }
    return false;
  };
  
  const handleAddTaggedEventToCurrentPlaylist = async (taggedEventId: string) => {
    if (!currentPlaylist || !currentPlaylist.id) { toast.info("Please select a playlist first."); return; }
    if (!currentUser) { toast.error("User context is missing."); return; }

    const currentItemCount = currentPlaylist.items?.length || 0;
    const newItemOrder = currentItemCount;

    try {
      const existingItem = currentPlaylist.items?.find(item => item.tagged_event_id === taggedEventId);
      if (existingItem) { toast.info("Event already in this playlist."); return; }

      const { data: newItem, error } = await supabase
        .from('playlist_items')
        .insert({ playlist_id: currentPlaylist.id, tagged_event_id: taggedEventId, item_order: newItemOrder })
        .select('*, tagged_events:tagged_event_id(*, event_types:event_type_id(id, name, color))')
        .single();
      
      if (error) throw error;

      if (newItem) {
        setCurrentPlaylist(prev => {
          if (!prev) return null;
          const updatedItems = [...(prev.items || []), newItem as PlaylistItem].sort((a,b) => a.item_order - b.item_order);
          return { ...prev, items: updatedItems };
        });
        toast.success("Event added to playlist.");
      }
    } catch (e: any) {
      if (e.message?.includes('playlist_tagged_event_unique')) { toast.info("Event already in playlist (DB)."); }
      else if (e.message?.includes('playlist_item_order_unique')) { toast.error("Order conflict. Try refreshing."); }
      else { toast.error("Failed to add event to playlist: " + e.message); }
    }
  };

  // For AnnotationToolbox
  const handleSaveAnnotationsForActiveEvent = async (): Promise<void> => {
    if (!activeTaggedEventId || !canvasRef.current) {
      toast.info("No active event selected or canvas not ready to save annotations.");
      return;
    }
    try {
      const paths = await canvasRef.current.exportPaths();
      const { error } = await supabase.from('tagged_events').update({ annotations: paths }).eq('id', activeTaggedEventId);
      if (error) throw error;
      setTaggedEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === activeTaggedEventId ? { ...event, annotations: paths as CanvasPath[] } : event
        )
      );
      toast.success("Annotations saved!");
    } catch (error: any) {
      toast.error("Failed to save annotations: " + error.message);
    }
  };

  // For PlaylistPanel (to clear active event for annotation when playlist starts)
  const clearActiveTaggedEventForAnnotation = () => {
    setActiveTaggedEventId(null);
  };
  
  const activeEventForAnnotation = taggedEvents.find(event => event.id === activeTaggedEventId);

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
          {job.status === 'completed' && (
            <Button size="sm" onClick={() => setShowAnalysisUI(!showAnalysisUI)}>
              <Eye className="h-3 w-3 mr-1" />{showAnalysisUI ? 'Hide Analysis' : 'Show Analysis'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onJobDelete(job.id)}><Trash2 className="h-3 w-3 mr-1 text-red-600" />Delete</Button>
        </div>

        {job.status === 'completed' && showAnalysisUI && (
          <div className="pt-4 mt-4 border-t">
            <h3 className="text-lg font-semibold mb-3">Video Analysis</h3>

            <div className="mb-4 bg-black rounded-md relative">
              <video
                ref={videoPlayerRef}
                src={job.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                controls
                width="100%"
                className="rounded-md"
                onLoadedMetadata={() => {
                  if (videoPlayerRef.current) {
                    setVideoDimensions({ width: videoPlayerRef.current.offsetWidth, height: videoPlayerRef.current.offsetHeight });
                  }
                }}
                onPlay={() => { 
                   if (videoPlayerRef.current) {
                     setVideoDimensions({ width: videoPlayerRef.current.offsetWidth, height: videoPlayerRef.current.offsetHeight });
                   }
                }}
              >
                Your browser does not support the video tag.
              </video>
              <AnnotationToolbox
                canvasRef={canvasRef}
                videoDimensions={videoDimensions}
                activeTaggedEvent={activeEventForAnnotation}
                onSaveAnnotations={handleSaveAnnotationsForActiveEvent}
                disabled={isPlayingPlaylist}
                activeTaggedEventId={activeTaggedEventId}
              />
            </div>
            
            <VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={isPlayingPlaylist} />

            <EventTaggingSection
              currentUser={currentUser}
              jobId={job.id}
              videoPlayerRef={videoPlayerRef}
              taggedEvents={taggedEvents}
              availableEventTypes={availableEventTypes}
              activeTaggedEventId={activeTaggedEventId}
              onSetActiveTaggedEventId={setActiveTaggedEventId}
              onCreateEventTypeInDb={handleCreateEventTypeInDb}
              onTagEventInDb={handleTagEventInDb}
              onDeleteTaggedEventInDb={handleDeleteTaggedEventInDb}
              currentPlaylist={currentPlaylist}
              onAddTaggedEventToPlaylist={handleAddTaggedEventToCurrentPlaylist}
              disabled={isPlayingPlaylist}
              eventTypesLoading={eventTypesLoading}
              eventTypesError={eventTypesError}
              taggedEventsLoading={taggedEventsLoading}
              taggedEventsError={taggedEventsError}
            />
            
            <PlaylistPanel
              currentUser={currentUser}
              jobId={job.id}
              videoJobDuration={job.video_duration}
              videoPlayerRef={videoPlayerRef}
              canvasRef={canvasRef}
              playlists={playlists}
              setPlaylists={setPlaylists} // PlaylistPanel manages its own list fetching based on job.id/user
              currentPlaylist={currentPlaylist}
              setCurrentPlaylist={setCurrentPlaylist}
              onClearActiveTaggedEventForAnnotation={clearActiveTaggedEventForAnnotation}
              // Control overall panel disabled state if needed, e.g. if another modal takes precedence
              // For now, internal controls are managed by isPlayingPlaylist
              disabled={false} 
              // Pass down isPlayingPlaylist and its setter for PlaylistPanel to control and reflect playback state
              isPlayingPlaylist={isPlayingPlaylist} 
              setIsPlayingPlaylist={setIsPlayingPlaylist} 
            />
            
            <AnalysisStats taggedEvents={taggedEvents} videoDuration={job.video_duration} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};