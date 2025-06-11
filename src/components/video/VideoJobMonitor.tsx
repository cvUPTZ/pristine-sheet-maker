// src/components/VideoJobMonitor.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Loader2, Trash2, Eye, Tag, ListVideo, PlusCircle, Eraser, RotateCcw, RotateCw, Trash, Palette, Save, ListPlus, PlusSquare, ArrowUpCircle, ArrowDownCircle, Play, StopCircle, XCircle as DeleteIcon } from 'lucide-react';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';
import { EventType, TaggedEvent } from '@/types/events';
import { supabase } from '@/integrations/supabase/client';
import { ReactSketchCanvas, ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';
import { Playlist, PlaylistItem } from '@/types/playlists';
import { User } from '@supabase/supabase-js';

// Utility function to format time
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
  // --- STATE MANAGEMENT ---
  const [showAnalysisUI, setShowAnalysisUI] = useState(false);
  const [availableEventTypes, setAvailableEventTypes] = useState<EventType[]>([]);
  const [taggedEvents, setTaggedEvents] = useState<TaggedEvent[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<(Playlist & { items?: PlaylistItem[] }) | null>(null);
  
  // Input states
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null);
  const [newEventTypeName, setNewEventTypeName] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // UI interaction states
  const [activeTaggedEventId, setActiveTaggedEventId] = useState<string | null>(null);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const [currentPlaylistItemIndex, setCurrentPlaylistItemIndex] = useState(0);

  // Canvas states
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  
  // Loading and error states
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  const [eventTypesError, setEventTypesError] = useState<string | null>(null);
  const [taggedEventsLoading, setTaggedEventsLoading] = useState(false);
  const [taggedEventsError, setTaggedEventsError] = useState<string | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);

  // --- REFS ---
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const playlistSegmentTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- EFFECTS ---

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let stopPolling: (() => void) | null = null;
    if (job.status === 'pending' || job.status === 'processing') {
      setShowAnalysisUI(false);
      setTaggedEvents([]);
      VideoJobService.pollJobStatus(job.id, onJobUpdate).then(stopFn => { stopPolling = stopFn; });
    }
    return () => { if (stopPolling) stopPolling(); };
  }, [job.id, job.status, onJobUpdate]);
  
  useEffect(() => {
    if (showAnalysisUI && currentUser && job.id) {
      fetchEventTypes();
      fetchTaggedEvents(job.id);
      fetchPlaylists(job.id);
    } else {
      setTaggedEvents([]);
      setActiveTaggedEventId(null);
      setPlaylists([]);
      setCurrentPlaylist(null);
    }
  }, [showAnalysisUI, currentUser, job.id]);

  useEffect(() => {
    if (currentPlaylist?.id) {
      fetchPlaylistItems(currentPlaylist.id);
    }
  }, [currentPlaylist?.id]);
  
  useEffect(() => {
    if (isPlayingPlaylist || !canvasRef.current) return;

    if (activeTaggedEventId) {
      const activeEvent = taggedEvents.find(event => event.id === activeTaggedEventId);
      if (activeEvent?.annotations) {
        canvasRef.current.loadPaths(activeEvent.annotations as CanvasPath[]);
      } else {
        canvasRef.current.resetCanvas();
      }
    } else {
      canvasRef.current.resetCanvas();
    }
  }, [activeTaggedEventId, taggedEvents, isPlayingPlaylist]);

  useEffect(() => {
    return () => {
      if (playlistSegmentTimeoutId.current) {
        clearTimeout(playlistSegmentTimeoutId.current);
      }
    };
  }, []);

  // --- DATA FETCHING FUNCTIONS ---
  
  const fetchEventTypes = async () => {
    if (!currentUser) return;
    setEventTypesLoading(true);
    setEventTypesError(null);
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAvailableEventTypes(data || []);
    } catch (error: any) {
      setEventTypesError(error.message || 'Failed to fetch event types.');
      toast.error('Failed to load event types.');
    } finally {
      setEventTypesLoading(false);
    }
  };

  const fetchTaggedEvents = async (jobId: string) => {
    if (!jobId) return;
    setTaggedEventsLoading(true);
    setTaggedEventsError(null);
    try {
      const { data, error } = await supabase
        .from('tagged_events')
        .select(`*, event_types (id, name, color)`)
        .eq('video_job_id', jobId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setTaggedEvents(data || []);
    } catch (error: any) {
      setTaggedEventsError(error.message || 'Failed to fetch tagged events.');
      toast.error('Failed to load tagged events.');
    } finally {
      setTaggedEventsLoading(false);
    }
  };

  const fetchPlaylists = async (videoId: string) => {
    if (!currentUser) return;
    setPlaylistLoading(true);
    setPlaylistError(null);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('video_job_id', videoId)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPlaylists(data || []);
    } catch (error: any) {
      setPlaylistError(error.message);
      toast.error("Failed to fetch playlists: " + error.message);
    } finally {
      setPlaylistLoading(false);
    }
  };

  const fetchPlaylistItems = async (playlistId: string) => {
    if (!playlistId) return;
    setPlaylistItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from('playlist_items')
        .select(`*, tagged_events:tagged_event_id (*, event_types:event_type_id (id, name, color))`)
        .eq('playlist_id', playlistId)
        .order('item_order', { ascending: true });

      if (error) throw error;

      setCurrentPlaylist(prev => prev ? { ...prev, items: data as PlaylistItem[] } : null);

    } catch (error: any) {
      toast.error("Failed to fetch playlist items: " + error.message);
    } finally {
      setPlaylistItemsLoading(false);
    }
  };
  
  // --- HANDLER FUNCTIONS ---

  const handleCreateEventType = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to create event types.');
      return;
    }
    if (newEventTypeName.trim() === '') {
      toast.error('Event type name cannot be empty.');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('event_types')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('name', newEventTypeName.trim())
        .maybeSingle();

      if (existing) {
        toast.error(`Event type "${newEventTypeName.trim()}" already exists.`);
        return;
      }

      const { data, error } = await supabase
        .from('event_types')
        .insert({ user_id: currentUser.id, name: newEventTypeName.trim() })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setAvailableEventTypes([...availableEventTypes, data]);
        setSelectedEventTypeId(data.id);
        setNewEventTypeName('');
        toast.success(`Event type "${data.name}" created.`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event type.');
    }
  };

  const handleTagEvent = async () => {
    if (!selectedEventTypeId) {
      toast.error('Please select an event type.');
      return;
    }
    if (!currentUser || !job.id) {
      toast.error('Cannot tag event: User or Job context is missing.');
      return;
    }
    const currentTime = videoPlayerRef.current?.currentTime ?? 0;

    try {
      const { data, error } = await supabase
        .from('tagged_events')
        .insert({ video_job_id: job.id, event_type_id: selectedEventTypeId, timestamp: currentTime })
        .select(`*, event_types ( id, name, color )`)
        .single();

      if (error) throw error;
      if (data) {
        setTaggedEvents(prev => [...prev, data as TaggedEvent].sort((a, b) => a.timestamp - b.timestamp));
        toast.success(`Event "${data.event_types?.name}" tagged at ${formatTime(currentTime)}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to tag event.');
    }
  };

  const handleDeleteTaggedEvent = async (taggedEventId: string) => {
    try {
      const { error } = await supabase.from('tagged_events').delete().eq('id', taggedEventId);
      if (error) throw error;

      setTaggedEvents(taggedEvents.filter(event => event.id !== taggedEventId));
      toast.success('Tagged event deleted successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tagged event.');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !currentUser || !job.id) {
      toast.error("Playlist name is required and you must be logged in.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ name: newPlaylistName.trim(), user_id: currentUser.id, video_job_id: job.id })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newPlaylistWithEmptyItems = { ...data, items: [] };
        setPlaylists(prev => [...prev, newPlaylistWithEmptyItems]);
        setCurrentPlaylist(newPlaylistWithEmptyItems);
        setNewPlaylistName('');
        toast.success(`Playlist "${data.name}" created.`);
      }
    } catch (error: any) {
      if (error.message?.includes('user_video_playlist_name_unique')) {
        toast.error(`Playlist with name "${newPlaylistName.trim()}" already exists for this video.`);
      } else {
        toast.error("Failed to create playlist: " + error.message);
      }
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      if (error) throw error;

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      if (currentPlaylist?.id === playlistId) {
        setCurrentPlaylist(null);
      }
      toast.success("Playlist deleted.");
    } catch (error: any) {
      toast.error("Failed to delete playlist: " + error.message);
    }
  };
  
  const handleAddTaggedEventToPlaylist = async (taggedEventId: string) => {
    if (!currentPlaylist || !currentUser) {
      toast.info("Please select a playlist first.");
      return;
    }

    if (currentPlaylist.items?.some(item => item.tagged_event_id === taggedEventId)) {
        toast.info("This event is already in the current playlist.");
        return;
    }

    const newItemOrder = currentPlaylist.items?.length || 0;

    try {
      const { data: newItem, error } = await supabase
        .from('playlist_items')
        .insert({ playlist_id: currentPlaylist.id, tagged_event_id: taggedEventId, item_order: newItemOrder })
        .select(`*, tagged_events:tagged_event_id (*, event_types:event_type_id (id, name, color))`)
        .single();

      if (error) throw error;

      if (newItem) {
        setCurrentPlaylist(prev => {
          if (!prev) return null;
          const updatedItems = [...(prev.items || []), newItem as PlaylistItem];
          return { ...prev, items: updatedItems };
        });
        toast.success("Event added to playlist.");
      }
    } catch (error: any) {
      if (error.message?.includes('playlist_tagged_event_unique')) {
         toast.info("This event is already in the playlist (database check).");
      } else if (error.message?.includes('playlist_item_order_unique')) {
         toast.error("Order conflict detected. Refreshing items.");
         if(currentPlaylist.id) fetchPlaylistItems(currentPlaylist.id);
      } else {
        toast.error("Failed to add event to playlist: " + error.message);
      }
    }
  };
  
  const handleRemoveItemFromPlaylist = async (playlistItemId: string) => {
    if (!currentPlaylist) return;
    try {
      const { error } = await supabase.from('playlist_items').delete().eq('id', playlistItemId);
      if (error) throw error;

      setCurrentPlaylist(prev => {
        if (!prev) return null;
        const updatedItems = (prev.items || []).filter(item => item.id !== playlistItemId);
        return { ...prev, items: updatedItems };
      });
      toast.success("Item removed from playlist.");
    } catch (error: any) {
      toast.error("Failed to remove item: " + error.message);
    }
  };

  const handleMoveItemInPlaylist = async (playlistItemId: string, direction: 'up' | 'down') => {
    if (!currentPlaylist?.id || !currentPlaylist.items) return;

    const items = [...currentPlaylist.items].sort((a, b) => a.item_order - b.item_order);
    const itemIndex = items.findIndex(item => item.id === playlistItemId);
    
    if (itemIndex === -1) return;

    const swapIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const itemA = items[itemIndex];
    const itemB = items[swapIndex];

    const newLocalItems = items.map(item => {
      if (item.id === itemA.id) return { ...item, item_order: itemB.item_order };
      if (item.id === itemB.id) return { ...item, item_order: itemA.item_order };
      return item;
    }).sort((a,b) => a.item_order - b.item_order);

    setCurrentPlaylist(prev => prev ? { ...prev, items: newLocalItems } : null);

    try {
      // NOTE: These two updates are NOT atomic. A failure in one could lead to inconsistent data.
      // A robust solution uses a Supabase RPC (database function) to perform the swap atomically.
      await Promise.all([
        supabase.from('playlist_items').update({ item_order: itemB.item_order }).eq('id', itemA.id),
        supabase.from('playlist_items').update({ item_order: itemA.item_order }).eq('id', itemB.id)
      ]);
    } catch (error: any) {
      toast.error("Failed to move item: " + error.message);
      await fetchPlaylistItems(currentPlaylist.id); // Revert UI on failure
    }
  };

  // --- PLAYBACK LOGIC ---

  const playSpecificPlaylistItem = (index: number) => {
    if (!isPlayingPlaylist || !currentPlaylist?.items || !videoPlayerRef.current || !canvasRef.current) {
      setIsPlayingPlaylist(false);
      return;
    }

    if (index >= currentPlaylist.items.length) {
      setIsPlayingPlaylist(false);
      setCurrentPlaylistItemIndex(0);
      videoPlayerRef.current.pause();
      canvasRef.current.resetCanvas();
      toast.success("Playlist finished.");
      return;
    }

    setCurrentPlaylistItemIndex(index);
    const item = currentPlaylist.items[index];
    const taggedEvent = item.tagged_event;

    if (!taggedEvent) {
      playSpecificPlaylistItem(index + 1);
      return;
    }

    const startTime = Math.max(0, taggedEvent.timestamp - 3);
    let endTime = taggedEvent.timestamp + 3;
    if (job.video_duration && endTime > job.video_duration) {
      endTime = job.video_duration;
    }
    const segmentDuration = Math.max(1, (endTime - startTime)) * 1000;

    videoPlayerRef.current.currentTime = startTime;
    videoPlayerRef.current.play().catch(e => console.error("Error playing video:", e));

    canvasRef.current.resetCanvas();
    if (taggedEvent.annotations) {
      canvasRef.current.loadPaths(taggedEvent.annotations as CanvasPath[]);
    }

    if (playlistSegmentTimeoutId.current) clearTimeout(playlistSegmentTimeoutId.current);
    
    playlistSegmentTimeoutId.current = setTimeout(() => {
      videoPlayerRef.current?.pause();
      if (isPlayingPlaylist) {
         playSpecificPlaylistItem(index + 1);
      }
    }, segmentDuration);
  };

  const handleTogglePlaylistPlayback = () => {
    if (isPlayingPlaylist) {
      setIsPlayingPlaylist(false);
      if (playlistSegmentTimeoutId.current) clearTimeout(playlistSegmentTimeoutId.current);
      videoPlayerRef.current?.pause();
      if (activeTaggedEventId && canvasRef.current) {
        const activeEvent = taggedEvents.find(event => event.id === activeTaggedEventId);
        if (activeEvent?.annotations) canvasRef.current.loadPaths(activeEvent.annotations as CanvasPath[]);
      } else {
         canvasRef.current?.resetCanvas();
      }
      setCurrentPlaylistItemIndex(0);
    } else {
      if (!currentPlaylist?.items?.length) {
        toast.info("No items in the playlist to play.");
        return;
      }
      setIsPlayingPlaylist(true);
      setActiveTaggedEventId(null);
      playSpecificPlaylistItem(0);
    }
  };


  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{job.video_title || 'Video Analysis Job'}</CardTitle>
          <Badge className={job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : job.status === 'processing' ? 'bg-blue-100 text-blue-800' : job.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            <div className="flex items-center gap-1">
              {job.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {job.status === 'completed' && <CheckCircle className="h-4 w-4" />}
              {job.status === 'failed' && <XCircle className="h-4 w-4" />}
              {(job.status === 'pending' || job.status === 'queued' || !job.status) && <Clock className="h-4 w-4" />}
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
                onLoadedMetadata={() => { if (videoPlayerRef.current) setVideoDimensions({ width: videoPlayerRef.current.offsetWidth, height: videoPlayerRef.current.offsetHeight }); }}
                onPlay={() => { if (videoPlayerRef.current) setVideoDimensions({ width: videoPlayerRef.current.offsetWidth, height: videoPlayerRef.current.offsetHeight }); }}
              />
              {videoDimensions.width > 0 && (
                <ReactSketchCanvas
                  ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
                  width={videoDimensions.width}
                  height={videoDimensions.height}
                  strokeWidth={strokeWidth}
                  strokeColor={strokeColor}
                  canvasColor="transparent"
                  eraserWidth={15}
                />
              )}
            </div>

            <div className="my-3 p-3 border rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm flex items-center"><Palette className="h-4 w-4 mr-2" />Drawing Tools</h4>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!activeTaggedEventId || !canvasRef.current) {
                      toast.info("No active event selected to save annotations for.");
                      return;
                    }
                    try {
                      const paths = await canvasRef.current.exportPaths();
                      await supabase.from('tagged_events').update({ annotations: paths }).eq('id', activeTaggedEventId);
                      setTaggedEvents(prev => prev.map(e => e.id === activeTaggedEventId ? { ...e, annotations: paths as CanvasPath[] } : e));
                      toast.success("Annotations saved!");
                    } catch (error: any) {
                      toast.error("Failed to save annotations: " + error.message);
                    }
                  }}
                  disabled={!activeTaggedEventId}
                >
                  <Save className="h-4 w-4 mr-1" /> Save Annotations
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="outline" size="sm" onClick={() => { if (canvasRef.current) { const newMode = !isEraser; canvasRef.current.eraseMode(newMode); setIsEraser(newMode); } }} title={isEraser ? "Pen" : "Eraser"}>
                  <Eraser className="h-4 w-4 mr-1" /> {isEraser ? 'Pen' : 'Eraser'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.resetCanvas()} title="Clear Canvas">
                  <Trash className="h-4 w-4 mr-1" /> Clear
                </Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.undo()} title="Undo"><RotateCcw className="h-4 w-4 mr-1" /> Undo</Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.redo()} title="Redo"><RotateCw className="h-4 w-4 mr-1" /> Redo</Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <label htmlFor="strokeWidth" className="text-sm">Width:</label>
                <input type="number" id="strokeWidth" min="1" max="50" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="p-1 border rounded-md w-16 text-sm" />
                <label className="text-sm">Color:</label>
                {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#000000'].map(color => (
                  <Button key={color} variant="outline" size="icon" onClick={() => setStrokeColor(color)} className={`w-6 h-6 ${strokeColor === color ? 'ring-2 ring-offset-1 ring-black' : ''}`} style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
            </div>

            <div className="mb-4 space-y-3 p-3 border rounded-md">
              <h4 className="font-medium text-sm flex items-center"><Tag className="h-4 w-4 mr-2" />Event Configuration</h4>
              {eventTypesLoading && <p className="text-sm text-gray-500">Loading...</p>}
              {eventTypesError && <p className="text-sm text-red-500">{eventTypesError}</p>}
              {!eventTypesLoading && !eventTypesError && (
                <>
                  <div className="flex items-center gap-2">
                    <select value={selectedEventTypeId || ''} onChange={(e) => setSelectedEventTypeId(e.target.value)} className="flex-grow p-2 border rounded-md text-sm">
                      <option value="" disabled>Select Event Type</option>
                      {availableEventTypes.map(et => (<option key={et.id} value={et.id} style={et.color ? { color: et.color } : {}}>{et.name}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={newEventTypeName} onChange={(e) => setNewEventTypeName(e.target.value)} placeholder="New event type name" className="flex-grow p-2 border rounded-md text-sm" />
                    <Button size="sm" variant="outline" onClick={handleCreateEventType} title="Create New Event Type"><PlusCircle className="h-4 w-4" /></Button>
                  </div>
                </>
              )}
            </div>

            <div className="mb-4">
              <Button onClick={handleTagEvent} disabled={!selectedEventTypeId} className="w-full">
                <Tag className="h-4 w-4 mr-2" /> Tag Event at Current Timestamp
              </Button>
            </div>

            <div className="space-y-3 p-3 border rounded-md mt-4">
              <h4 className="font-medium text-sm flex items-center"><ListVideo className="h-4 w-4 mr-2" />Tagged Events</h4>
              {taggedEventsLoading && <p className="text-sm text-gray-500">Loading...</p>}
              {taggedEventsError && <p className="text-sm text-red-500">{taggedEventsError}</p>}
              {taggedEvents.length === 0 && !taggedEventsLoading && <p className="text-sm text-gray-500">No events tagged yet.</p>}
              <ul className="space-y-2">
                {taggedEvents.map(te => (
                  <li key={te.id}
                      className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer ${te.id === activeTaggedEventId ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => setActiveTaggedEventId(te.id === activeTaggedEventId ? null : te.id)}>
                    <div className="flex-grow">
                      <span className="font-semibold" style={{ color: te.event_types?.color || 'inherit' }}>{te.event_types?.name || 'Unknown'}</span>
                      <span className="text-gray-600 ml-2">@ {formatTime(te.timestamp)}</span>
                      {te.annotations?.length && <span className="text-xs text-blue-500 ml-2">(A)</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleAddTaggedEventToPlaylist(te.id);}} disabled={!currentPlaylist || !!currentPlaylist.items?.find(item => item.tagged_event_id === te.id)} title="Add to Playlist">
                        {currentPlaylist?.items?.find(item => item.tagged_event_id === te.id) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <ListPlus className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteTaggedEvent(te.id); }} title="Delete Event">
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">Playlists</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 p-3 border rounded-md">
                  <h4 className="font-medium text-sm">Manage Playlists</h4>
                  <div className="flex items-center gap-2">
                    <input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="New playlist name" className="flex-grow p-2 border rounded-md text-sm" />
                    <Button size="sm" onClick={handleCreatePlaylist} title="Create" disabled={!newPlaylistName.trim()}><PlusSquare className="h-4 w-4" /></Button>
                  </div>
                  {playlistLoading && <p>Loading...</p>}
                  <ul className="space-y-1 max-h-60 overflow-y-auto">
                    {playlists.map(pl => (
                      <li key={pl.id} className={`p-2 rounded-md text-sm cursor-pointer flex justify-between items-center ${currentPlaylist?.id === pl.id ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={() => setCurrentPlaylist(currentPlaylist?.id === pl.id ? null : pl)}>
                        <span>{pl.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl.id);}} title="Delete Playlist"><DeleteIcon className="h-4 w-4 text-red-500" /></Button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 p-3 border rounded-md min-h-[200px]">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">{currentPlaylist ? `Events in: ${currentPlaylist.name}` : "Select a playlist"}</h4>
                    {currentPlaylist && (
                      <Button size="sm" onClick={handleTogglePlaylistPlayback} disabled={!currentPlaylist.items?.length} variant={isPlayingPlaylist ? "destructive" : "default"}>
                        {isPlayingPlaylist ? <StopCircle className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                        {isPlayingPlaylist ? "Stop" : "Play"}
                      </Button>
                    )}
                  </div>
                  {playlistItemsLoading && <p>Loading items...</p>}
                  {!playlistItemsLoading && currentPlaylist && (!currentPlaylist.items || currentPlaylist.items.length === 0) && <p className="text-sm text-gray-500">No events in this playlist.</p>}
                  <ul className="space-y-1 max-h-72 overflow-y-auto">
                    {(currentPlaylist?.items || []).map((item, index, arr) => (
                      <li key={item.id} className={`p-2 rounded-md text-sm flex justify-between items-center group ${isPlayingPlaylist && currentPlaylistItemIndex === index ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <div className="flex-grow">
                          <span className="font-semibold" style={{color: item.tagged_event?.event_types?.color || 'inherit'}}>{item.tagged_event?.event_types?.name || 'N/A'}</span>
                          <span className="text-gray-600 ml-1">@ {formatTime(item.tagged_event?.timestamp)}</span>
                        </div>
                        <div className={`flex items-center transition-opacity ${isPlayingPlaylist ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItemInPlaylist(item.id, 'up')} disabled={index === 0}><ArrowUpCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItemInPlaylist(item.id, 'down')} disabled={index === arr.length - 1}><ArrowDownCircle className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItemFromPlaylist(item.id)}><DeleteIcon className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};