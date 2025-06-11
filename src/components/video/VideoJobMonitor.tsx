// src/components/VideoJobMonitor.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Loader2, Trash2, Download, Eye, Tag, ListVideo, PlusCircle } from 'lucide-react';
import { VideoJob, VideoJobService } from '@/services/videoJobService';
import { toast } from 'sonner';
import { EventType, TaggedEvent } from '@/types/events'; // Assuming events.ts is in src/types
import { supabase } from '@/integrations/supabase/client'; // ENSURE THIS IS PRESENT AND CORRECT
import { ReactSketchCanvas, ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas'; // ENSURE THESE ARE PRESENT
import { Eraser, RotateCcw, RotateCw, Trash, Palette, Minus, Plus, Save, ListPlus, PlusSquare, ArrowUpCircle, ArrowDownCircle, XCircle as DeleteIcon, Play, StopCircle } from 'lucide-react'; // Added Play, StopCircle
import { Playlist, PlaylistItem } from '@/types/playlists'; // Import playlist types

// You will need a formatter utility
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
  // onViewResults can be repurposed or augmented to show analysis UI
  // For now, let's assume clicking "View Results" or a similar button toggles the analysis section
}

export const VideoJobMonitor: React.FC<VideoJobMonitorProps> = ({ job, onJobUpdate, onJobDelete }) => {
  const [showAnalysisUI, setShowAnalysisUI] = useState(false);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null);
  const [taggedEvents, setTaggedEvents] = useState<TaggedEvent[]>([]);
  const [availableEventTypes, setAvailableEventTypes] = useState<EventType[]>([
    // Mock data for now, ideally fetched or managed via props/context
    { id: 'evt-001', name: 'Goal' },
    { id: 'evt-002', name: 'Foul' },
    { id: 'evt-003', name: 'Corner' },
  ]);
  const [newEventTypeName, setNewEventTypeName] = useState('');

  // Consolidated state declarations:
  const videoPlayerRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<ReactSketchCanvasRef>(null);
  const [currentUser, setCurrentUser] = useState<any>(null); // Adjust 'any' to User type from Supabase

  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [strokeColor, setStrokeColor] = useState('#FF0000'); // Default to red
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [activeTaggedEventId, setActiveTaggedEventId] = useState<string | null>(null);

  // State for data loading and errors
  const [eventTypesLoading, setEventTypesLoading] = useState(false);
  const [eventTypesError, setEventTypesError] = useState<string | null>(null);
  const [taggedEventsLoading, setTaggedEventsLoading] = useState(false);
  const [taggedEventsError, setTaggedEventsError] = useState<string | null>(null);

  // Playlist State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist & { items?: PlaylistItem[] } | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);

  // Playlist Playback State
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false);
  const [currentPlaylistItemIndex, setCurrentPlaylistItemIndex] = useState(0);
  const playlistSegmentTimeoutId = React.useRef<NodeJS.Timeout | null>(null);


  // useEffect for fetching user immediately (this was correctly placed)
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
      console.error('Error fetching event types:', error);
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
        .select(`
          *,
          event_types (id, name, color)
        `)
        .eq('video_job_id', jobId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setTaggedEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching tagged events:', error);
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
      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select(`
          *,
          tagged_events:tagged_event_id (
            *,
            event_types:event_type_id (id, name, color)
          )
        `)
        .eq('playlist_id', playlistId)
        .order('item_order', { ascending: true });

      if (itemsError) throw itemsError;

      setCurrentPlaylist(prev => prev ? { ...prev, items: itemsData as PlaylistItem[] } : null);

    } catch (error: any) {
      toast.error("Failed to fetch playlist items: " + error.message);
      // Consider clearing items or setting an error state for items specifically
    } finally {
      setPlaylistItemsLoading(false);
    }
  };

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
    // No explicit else to clear items here, as currentPlaylist being set to null
    // in the main data fetching useEffect will trigger its items to be implicitly empty.
  }, [currentPlaylist?.id]);


  // Cleanup timeout on unmount or when analysis UI is hidden
  useEffect(() => {
    return () => {
      if (playlistSegmentTimeoutId.current) {
        clearTimeout(playlistSegmentTimeoutId.current);
      }
    };
  }, []);

  // Effect for loading annotations onto canvas when activeTaggedEventId changes
  // This should NOT run if isPlayingPlaylist is true, as playback handles canvas.
  useEffect(() => {
    if (isPlayingPlaylist) return; // Annotation loading for active selected event is paused during playlist playback

    if (!canvasRef.current) return;

    if (activeTaggedEventId) {
      const activeEvent = taggedEvents.find(event => event.id === activeTaggedEventId);
      if (activeEvent && activeEvent.annotations && Array.isArray(activeEvent.annotations)) {
        canvasRef.current.loadPaths(activeEvent.annotations as CanvasPath[]);
      } else {
        canvasRef.current.resetCanvas();
      }
    } else {
      canvasRef.current.resetCanvas();
    }
  }, [activeTaggedEventId, taggedEvents, isPlayingPlaylist]);


  const getStatusIcon = () => { /* ... same as your code ... */ }; // This function is not in the provided snippet, assuming it exists elsewhere or is not critical for this change
  const getStatusColor = () => { /* ... same as your code ... */ }; // Same as above

  const playSpecificPlaylistItem = (index: number) => {
    if (!isPlayingPlaylist || !currentPlaylist || !currentPlaylist.items || !videoPlayerRef.current || !canvasRef.current) {
      // If called when not supposed to, or refs not ready, stop.
      setIsPlayingPlaylist(false); // Ensure playback stops
      return;
    }

    if (index >= currentPlaylist.items.length) { // Playlist finished
      setIsPlayingPlaylist(false);
      setCurrentPlaylistItemIndex(0);
      videoPlayerRef.current.pause();
      canvasRef.current.resetCanvas(); // Clear canvas after playlist finishes
      toast.success("Playlist finished.");
      return;
    }

    setCurrentPlaylistItemIndex(index); // For UI highlighting
    const playlistItem = currentPlaylist.items[index];
    const taggedEvent = playlistItem.tagged_event;

    if (!taggedEvent) { // Should not happen if data is clean
      playSpecificPlaylistItem(index + 1); // Skip to next
      return;
    }

    const segmentStartOffset = 3; // seconds before event timestamp
    const segmentEndOffset = 3;   // seconds after event timestamp
    const minSegmentDuration = 1; // minimum duration for a segment

    const startTime = Math.max(0, taggedEvent.timestamp - segmentStartOffset);
    let endTime = taggedEvent.timestamp + segmentEndOffset;
    if (endTime <= startTime) endTime = startTime + minSegmentDuration; // Ensure endtime is after starttime

    // Ensure endTime does not exceed video duration, if known
    if (job.video_duration && endTime > job.video_duration) {
      endTime = job.video_duration;
    }

    const segmentDuration = (endTime - startTime) * 1000; // in milliseconds

    videoPlayerRef.current.currentTime = startTime;
    videoPlayerRef.current.play().catch(e => console.error("Error playing video:", e));

    canvasRef.current.resetCanvas();
    if (taggedEvent.annotations && Array.isArray(taggedEvent.annotations)) {
      canvasRef.current.loadPaths(taggedEvent.annotations as CanvasPath[]);
    }

    if (playlistSegmentTimeoutId.current) {
      clearTimeout(playlistSegmentTimeoutId.current);
    }

    if (segmentDuration <=0) { // If segment is instant or invalid, move to next
       playSpecificPlaylistItem(index + 1);
       return;
    }

    playlistSegmentTimeoutId.current = setTimeout(() => {
      if (videoPlayerRef.current) videoPlayerRef.current.pause(); // Pause at end of segment
      if (isPlayingPlaylist) { // Check if still in playback mode
         playSpecificPlaylistItem(index + 1); // Play next item
      }
    }, segmentDuration);
  };

  const handleTogglePlaylistPlayback = () => {
    if (isPlayingPlaylist) { // Stopping playback
      setIsPlayingPlaylist(false);
      if (playlistSegmentTimeoutId.current) {
        clearTimeout(playlistSegmentTimeoutId.current);
        playlistSegmentTimeoutId.current = null;
      }
      if (videoPlayerRef.current) {
        videoPlayerRef.current.pause();
      }
      // Reset canvas or load annotations for activeTaggedEventId if one is selected
      if (activeTaggedEventId && canvasRef.current) {
        const activeEvent = taggedEvents.find(event => event.id === activeTaggedEventId);
        if (activeEvent?.annotations) canvasRef.current.loadPaths(activeEvent.annotations as CanvasPath[]); else canvasRef.current.resetCanvas();
      } else if (canvasRef.current) {
         canvasRef.current.resetCanvas();
      }
      setCurrentPlaylistItemIndex(0); // Reset index
    } else { // Starting playback
      if (!currentPlaylist || !currentPlaylist.items || currentPlaylist.items.length === 0) {
        toast.info("No items in the current playlist to play.");
        return;
      }
      setIsPlayingPlaylist(true);
      setActiveTaggedEventId(null); // Deselect any manually selected event
      // currentPlaylistItemIndex is already 0 or will be set by playSpecificPlaylistItem
      playSpecificPlaylistItem(0);
    }
  };


  const handleDeletePlaylist = async (playlistId: string) => {
    if (!playlistId) return;
    // Optional: Add a confirmation dialog here
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

  const handleRemoveItemFromPlaylist = async (playlistItemId: string) => {
    if (!currentPlaylist || !playlistItemId) return;
    try {
      const { error } = await supabase.from('playlist_items').delete().eq('id', playlistItemId);
      if (error) throw error;

      // Update local state
      setCurrentPlaylist(prev => {
        if (!prev) return null;
        const updatedItems = (prev.items || []).filter(item => item.id !== playlistItemId);
        // Optional: Re-normalize item_order locally if desired, or rely on next fetch/reorder
        return { ...prev, items: updatedItems };
      });
      toast.success("Item removed from playlist.");
      // No need to re-fetch usually, unless order normalization is strictly server-side
    } catch (error: any) {
      toast.error("Failed to remove item: " + error.message);
    }
  };

  const handleMoveItemInPlaylist = async (playlistItemId: string, direction: 'up' | 'down') => {
    if (!currentPlaylist || !currentPlaylist.items) return;

    const items = [...currentPlaylist.items].sort((a, b) => a.item_order - b.item_order);
    const itemIndex = items.findIndex(item => item.id === playlistItemId);

    if (itemIndex === -1) return;

    const targetItem = items[itemIndex];
    let swapWithItem: PlaylistItem | undefined;

    if (direction === 'up' && itemIndex > 0) {
      swapWithItem = items[itemIndex - 1];
    } else if (direction === 'down' && itemIndex < items.length - 1) {
      swapWithItem = items[itemIndex + 1];
    }

    if (!swapWithItem) return; // Already at top/bottom or invalid move

    // Optimistic local update
    const newLocalItems = items.map(item => {
      if (item.id === targetItem.id) return { ...item, item_order: swapWithItem!.item_order };
      if (item.id === swapWithItem.id) return { ...item, item_order: targetItem.item_order };
      return item;
    }).sort((a,b) => a.item_order - b.item_order);

    setCurrentPlaylist(prev => prev ? { ...prev, items: newLocalItems } : null);

    try {
      // Supabase updates: Swap item_order values
      // This can be done with two separate updates. A transaction would be safer for atomicity.
      // Supabase client library doesn't directly support multi-statement transactions easily without Edge Functions.
      const { error: error1 } = await supabase
        .from('playlist_items')
        .update({ item_order: swapWithItem.item_order })
        .eq('id', targetItem.id);
      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('playlist_items')
        .update({ item_order: targetItem.item_order })
        .eq('id', swapWithItem.id);
      if (error2) throw error2;

      // toast.success("Item moved."); // Toast can be annoying on quick moves
      // Optionally re-fetch to confirm server state, though optimistic update is usually good.
      // await fetchPlaylistItems(currentPlaylist.id); // Uncomment if strict consistency is needed post-move
    } catch (error: any) {
      toast.error("Failed to move item: " + error.message);
      // Revert optimistic update by re-fetching
      await fetchPlaylistItems(currentPlaylist.id);
    }
  };


  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error("Playlist name cannot be empty.");
      return;
    }
    if (!currentUser || !job.id) {
      toast.error("User or video job context is missing.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: newPlaylistName.trim(),
          user_id: currentUser.id,
          video_job_id: job.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newPlaylistWithEmptyItems = { ...data, items: [] }; // Initialize with empty items
        setPlaylists(prev => [...prev, newPlaylistWithEmptyItems]);
        setNewPlaylistName('');
        setCurrentPlaylist(newPlaylistWithEmptyItems);
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

  const handleAddTaggedEventToPlaylist = async (taggedEventId: string) => {
    if (!currentPlaylist || !currentPlaylist.id) {
      toast.info("Please select a playlist first.");
      return;
    }
    if (!currentUser) {
      toast.error("User context is missing.");
      return;
    }

    const currentItemCount = currentPlaylist.items?.length || 0;
    const newItemOrder = currentItemCount;

    try {
      const existingItem = currentPlaylist.items?.find(item => item.tagged_event_id === taggedEventId);
      if (existingItem) {
        toast.info("This event is already in the current playlist.");
        return;
      }

      const { data: newItem, error } = await supabase
        .from('playlist_items')
        .insert({
          playlist_id: currentPlaylist.id,
          tagged_event_id: taggedEventId,
          item_order: newItemOrder,
        })
        .select(`
          *,
          tagged_events:tagged_event_id (
            *,
            event_types:event_type_id (id, name, color)
          )
        `)
        .single();

      if (error) throw error;

      if (newItem) {
        setCurrentPlaylist(prev => {
          if (!prev) return null;
          // Ensure items array exists before spreading
          const updatedItems = [...(prev.items || []), newItem as PlaylistItem];
          return { ...prev, items: updatedItems.sort((a,b) => a.item_order - b.item_order) };
        });
        toast.success("Event added to playlist.");
      }
    } catch (error: any)
      if (error.message?.includes('playlist_tagged_event_unique')) {
         toast.info("This event is already in the current playlist (database check).");
      } else if (error.message?.includes('playlist_item_order_unique')) {
         toast.error("Error adding event: Order conflict. Refreshing items might solve this. Consider implementing re-ordering.");
         // Potentially re-fetch items here if order conflict is common
         fetchPlaylistItems(currentPlaylist.id);
      } else {
        toast.error("Failed to add event to playlist: " + error.message);
        console.error("Error adding to playlist:", error);
      }
    }
  };

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
      // Check for duplicate name for the same user
      const { data: existing, error: existingError } = await supabase
        .from('event_types')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('name', newEventTypeName.trim())
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        toast.error(`Event type "${newEventTypeName.trim()}" already exists.`);
        return;
      }

      const newEventTypePartial = {
        user_id: currentUser.id,
        name: newEventTypeName.trim(),
        // color: can be added here if a color picker is implemented
      };

      const { data, error } = await supabase
        .from('event_types')
        .insert(newEventTypePartial)
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
      console.error('Error creating event type:', error);
      toast.error(error.message || 'Failed to create event type.');
    }
  };

  // Removed duplicate handleTagEvent here. The correct one is assumed to be below or needs to be re-inserted cleanly.
  // For now, ensuring only one remains or the correct one is used.
  // The diff tool works on first match, so this should remove one instance.

  const handleTagEvent = async () => { // This is the one intended to be kept or is the second instance
    if (!selectedEventTypeId) { // Original check from one of the versions
      toast.error('Please select an event type.');
      return;
    }
    // Consolidating the currentTime logic and other checks
    let currentTime = 0;
    if (videoPlayerRef.current) {
      currentTime = videoPlayerRef.current.currentTime;
    } else {
      toast.warn('Video player not ready. Using 0s as timestamp.');
    }

    if (!currentUser) {
      toast.error('You must be logged in to tag events.');
      return;
    }
    // No need to re-check selectedEventTypeId if already checked above.
    if (!job || !job.id) {
      toast.error('Video job information is missing.');
      return;
    }

    const newTaggedEventPartial = {
      video_job_id: job.id,
      event_type_id: selectedEventTypeId,
      timestamp: currentTime,
      // notes: can be added if a notes field is implemented
    };

    try {
      const { data, error } = await supabase
        .from('tagged_events')
        .insert(newTaggedEventPartial)
        .select(`
          *,
          event_types ( id, name, color )
        `) // Fetch related event_type details
        .single();

      if (error) throw error;

      if (data) {
        // The 'data' object now contains the created tagged_event and the nested event_type details.
        // We need to ensure our local state `taggedEvents` can handle this structure,
        // or we adjust it. The TaggedEvent type in events.ts has `event_types?: EventType | null;`
        setTaggedEvents([...taggedEvents, data as TaggedEvent]);
        toast.success(`Event "${data.event_types?.name}" tagged at ${formatTime(currentTime)}`);
      }
    } catch (error: any) {
      console.error('Error tagging event:', error);
      toast.error(error.message || 'Failed to tag event.');
    }
  };

  const handleDeleteTaggedEvent = async (taggedEventId: string) => {
    if (!taggedEventId) {
      toast.error('Invalid event ID for deletion.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tagged_events')
        .delete()
        .eq('id', taggedEventId);

      if (error) throw error;

      setTaggedEvents(taggedEvents.filter(event => event.id !== taggedEventId));
      toast.success('Tagged event deleted successfully.');
    } catch (error: any) {
      console.error('Error deleting tagged event:', error);
      toast.error(error.message || 'Failed to delete tagged event.');
    }
  };


  return (
     <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{job.video_title || 'Video Analysis Job'}</CardTitle>
          <Badge className={job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : job.status === 'processing' ? 'bg-blue-100 text-blue-800' : job.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {/* Status Icon and Text */}
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

        {/* Analysis UI Section - Shown when job is completed and "Show Analysis" is clicked */}
        {job.status === 'completed' && showAnalysisUI && (
          <div className="pt-4 mt-4 border-t">
            <h3 className="text-lg font-semibold mb-3">Video Analysis</h3>

            {/* 1. Video Player */}
            <div className="mb-4 bg-black rounded-md">
              <video
                ref={videoPlayerRef}
                src={job.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                controls
                width="100%"
                className="rounded-md"
                onLoadedMetadata={() => {
                  if (videoPlayerRef.current) {
                    setVideoDimensions({
                      width: videoPlayerRef.current.offsetWidth, // Use offsetWidth for rendered width
                      height: videoPlayerRef.current.offsetHeight, // Use offsetHeight for rendered height
                    });
                    if (!job.video_duration) {
                      // Optional: Update job duration if not already set
                      // onJobUpdate?.({...job, video_duration: videoPlayerRef.current.duration });
                    }
                  }
                }}
                 onPlay={() => { // Also update dimensions on play, as controls might change size
                   if (videoPlayerRef.current) {
                     setVideoDimensions({
                       width: videoPlayerRef.current.offsetWidth,
                       height: videoPlayerRef.current.offsetHeight,
                     });
                   }
                 }}
              >
                Your browser does not support the video tag.
              </video>
              {videoDimensions.width > 0 && videoDimensions.height > 0 && (
                <ReactSketchCanvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10,
                    // border: '1px dashed #CCC', // For debugging position
                  }}
                  width={videoDimensions.width}
                  height={videoDimensions.height}
                  strokeWidth={strokeWidth}
                  strokeColor={strokeColor}
                  canvasColor="transparent" // Make canvas background transparent
                  eraserWidth={15}
                />
              )}
            </div>

            {/* Canvas Controls */}
            {/* Canvas Controls */}
            <div className="my-3 p-3 border rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm flex items-center"><Palette className="h-4 w-4 mr-2" />Drawing Tools</h4>
                <Button
                  size="sm"
                  onClick={async () => { // handleSaveAnnotations
                    if (!activeTaggedEventId || !canvasRef.current) {
                      toast.info("No active event selected to save annotations for, or canvas not ready.");
                      return;
                    }
                    try {
                      const paths = await canvasRef.current.exportPaths();
                      const { data, error } = await supabase
                        .from('tagged_events')
                        .update({ annotations: paths })
                        .eq('id', activeTaggedEventId)
                        .select() // To get the updated row back
                        .single();

                      if (error) throw error;

                      // Update local state
                      setTaggedEvents(prevEvents =>
                        prevEvents.map(event =>
                          event.id === activeTaggedEventId ? { ...event, annotations: paths as CanvasPath[] } : event
                        )
                      );
                      toast.success("Annotations saved!");
                    } catch (error: any) {
                      console.error("Error saving annotations:", error);
                      toast.error("Failed to save annotations: " + error.message);
                    }
                  }}
                  disabled={!activeTaggedEventId}
                  title="Save current drawing to the selected tagged event"
                >
                  <Save className="h-4 w-4 mr-1" /> Save Annotations
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button variant="outline" size="sm" onClick={() => {
                  if (canvasRef.current) {
                    const newEraseMode = !isEraser;
                    canvasRef.current.eraseMode(newEraseMode);
                    setIsEraser(newEraseMode);
                  }
                }} title={isEraser ? "Switch to Pen" : "Switch to Eraser"}>
                  <Eraser className="h-4 w-4 mr-1" /> {isEraser ? 'Pen' : 'Eraser'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.resetCanvas()} title="Clear Canvas & Reset"> {/* Changed to resetCanvas */}
                  <Trash className="h-4 w-4 mr-1" /> Clear
                </Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.undo()} title="Undo">
                  <RotateCcw className="h-4 w-4 mr-1" /> Undo
                </Button>
                <Button variant="outline" size="sm" onClick={() => canvasRef.current?.redo()} title="Redo">
                  <RotateCw className="h-4 w-4 mr-1" /> Redo
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <label htmlFor="strokeWidth" className="text-sm">Width:</label>
                <input
                  type="number"
                  id="strokeWidth"
                  min="1"
                  max="50"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="p-1 border rounded-md w-16 text-sm"
                />
                 <label className="text-sm">Color:</label>
                {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#000000'].map(color => (
                  <Button
                    key={color}
                    variant="outline"
                    size="icon"
                    onClick={() => setStrokeColor(color)}
                    className={`w-6 h-6 ${strokeColor === color ? 'ring-2 ring-offset-1 ring-black' : ''}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>


            {/* 2. UI for selecting/creating event types */}
            <div className="mb-4 space-y-3 p-3 border rounded-md">
              <h4 className="font-medium text-sm flex items-center"><Tag className="h-4 w-4 mr-2" />Event Configuration</h4>
              {eventTypesLoading && <p className="text-sm text-gray-500">Loading event types...</p>}
              {eventTypesError && <p className="text-sm text-red-500">{eventTypesError}</p>}
              {!eventTypesLoading && !eventTypesError && (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedEventTypeId || ''}
                      onChange={(e) => setSelectedEventTypeId(e.target.value)}
                      className="flex-grow p-2 border rounded-md text-sm"
                      disabled={availableEventTypes.length === 0 && !selectedEventTypeId}
                    >
                      <option value="" disabled>
                        {availableEventTypes.length === 0 ? "No event types available. Create one!" : "Select Event Type"}
                      </option>
                      {availableEventTypes.map(et => (
                        <option key={et.id} value={et.id} style={et.color ? { color: et.color } : {}}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newEventTypeName}
                      onChange={(e) => setNewEventTypeName(e.target.value)}
                      placeholder="New event type name"
                      className="flex-grow p-2 border rounded-md text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleCreateEventType} title="Create New Event Type">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* 3. Button to tag an event at the current video timestamp */}
            <div className="mb-4">
              <Button onClick={handleTagEvent} disabled={!selectedEventTypeId || !currentUser || !job.id} className="w-full">
                <Tag className="h-4 w-4 mr-2" /> Tag Event at Current Timestamp
              </Button>
            </div>

            {/* 4. Section to display existing tagged events for the video */}
            {/* 4. Section to display existing tagged events for the video */}
            <div className="space-y-3 p-3 border rounded-md mt-4">
              <h4 className="font-medium text-sm flex items-center"><ListVideo className="h-4 w-4 mr-2" />Tagged Events</h4>
              {taggedEventsLoading && <p className="text-sm text-gray-500">Loading tagged events...</p>}
              {taggedEventsError && <p className="text-sm text-red-500">{taggedEventsError}</p>}
              {!taggedEventsLoading && !taggedEventsError && taggedEvents.length === 0 && (
                <p className="text-sm text-gray-500">No events tagged for this video yet.</p>
              )}
              {!taggedEventsLoading && !taggedEventsError && taggedEvents.length > 0 && (
                <ul className="space-y-2">
                  {taggedEvents.map(te => {
                    const eventTypeName = te.event_types?.name || 'Unknown Event Type';
                    const eventTypeColor = te.event_types?.color;
                    const isActive = te.id === activeTaggedEventId;
                    return (
                      <li
                        key={te.id}
                        className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors
                                    ${isActive ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                        onClick={() => setActiveTaggedEventId(te.id === activeTaggedEventId ? null : te.id)} // Toggle selection
                        title={isActive ? "Deselect to clear annotations" : "Click to load/edit annotations"}
                      >
                        <div className="flex-grow">
                          <span className="font-semibold" style={eventTypeColor ? { color: eventTypeColor } : {}}>
                            {eventTypeName}
                          </span>
                          <span className="text-gray-600 ml-2">@ {formatTime(te.timestamp)}</span>
                          {te.annotations && te.annotations.length > 0 && <span className="text-xs text-blue-500 ml-2">(A)</span>}
                          {te.notes && <p className="text-xs text-gray-500 mt-1 italic">{te.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                           <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleAddTaggedEventToPlaylist(te.id);}}
                            disabled={!currentPlaylist || !!currentPlaylist.items?.find(item => item.tagged_event_id === te.id)}
                            title={!currentPlaylist ? "Select a playlist to enable" : (currentPlaylist.items?.find(item => item.tagged_event_id === te.id) ? "Event already in playlist" : `Add to: ${currentPlaylist.name}`)}
                          >
                            {currentPlaylist?.items?.find(item => item.tagged_event_id === te.id) ? <CheckCircle className="h-4 w-4 text-green-500" /> : <ListPlus className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTaggedEvent(te.id); }}
                            title="Delete Tagged Event"
                          >
                            <Trash2 className="h-3 w-3 text-red-500 hover:text-red-700" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Playlists Section */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">Playlists</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Create Playlist & Playlist List */}
                <div className="space-y-3 p-3 border rounded-md">
                  <h4 className="font-medium text-sm">Manage Playlists</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="New playlist name"
                      className="flex-grow p-2 border rounded-md text-sm"
                    />
                    <Button size="sm" onClick={handleCreatePlaylist} title="Create New Playlist" disabled={!newPlaylistName.trim()}>
                      <PlusSquare className="h-4 w-4" />
                    </Button>
                  </div>
                  {playlistLoading && <p className="text-sm text-gray-500">Loading playlists...</p>}
                  {playlistError && <p className="text-sm text-red-500">Playlist Error: {playlistError}</p>}
                  {!playlistLoading && !playlistError && (
                    <ul className="space-y-1 max-h-60 overflow-y-auto">
                      {playlists.map(pl => (
                        <li
                          key={pl.id}
                          className={`p-2 rounded-md text-sm cursor-pointer transition-colors flex justify-between items-center ${currentPlaylist?.id === pl.id ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                          onClick={() => setCurrentPlaylist(currentPlaylist?.id === pl.id ? null : { ...pl, items: currentPlaylist?.id === pl.id && currentPlaylist.items ? currentPlaylist.items : [] })}
                        >
                          <span>{pl.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(pl.id);}}
                            title="Delete Playlist"
                          >
                            <DeleteIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
                          </Button>
                        </li>
                      ))}
                      {playlists.length === 0 && <p className="text-sm text-gray-500">No playlists for this video yet.</p>}
                    </ul>
                  )}
                </div>

                {/* Right Column: Current Playlist Items */}
                <div className="space-y-3 p-3 border rounded-md min-h-[200px]">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">
                      {currentPlaylist ? `Events in: ${currentPlaylist.name}` : "Select a playlist"}
                    </h4>
                    {currentPlaylist && (currentPlaylist.items?.length || 0) > 0 && (
                      <Button
                        size="sm"
                        onClick={handleTogglePlaylistPlayback}
                        disabled={!currentPlaylist || !currentPlaylist.items || currentPlaylist.items.length === 0}
                        variant={isPlayingPlaylist ? "destructive" : "default"}
                      >
                        {isPlayingPlaylist ? <StopCircle className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                        {isPlayingPlaylist ? "Stop Playlist" : "Play Playlist"}
                      </Button>
                    )}
                  </div>
                  {playlistItemsLoading && currentPlaylist && <p className="text-sm text-gray-500">Loading items...</p>}
                  {!playlistItemsLoading && currentPlaylist && (!currentPlaylist.items || currentPlaylist.items.length === 0) && (
                    <p className="text-sm text-gray-500">No events added to this playlist yet.</p>
                  )}
                  {!playlistItemsLoading && currentPlaylist && (currentPlaylist.items?.length || 0) > 0 && (
                     <ul className="space-y-1 max-h-72 overflow-y-auto">
                      {(currentPlaylist.items || []).sort((a, b) => a.item_order - b.item_order).map((item, index, arr) => (
                        <li
                          key={item.id}
                          className={`p-2 rounded-md text-sm flex justify-between items-center group transition-colors
                                      ${isPlayingPlaylist && currentPlaylistItemIndex === index ? 'bg-green-100' : 'bg-gray-100'}`}
                        >
                          <div className="flex-grow">
                            <span className="font-semibold mr-2 text-xs text-gray-500">#{item.item_order + 1}</span>
                            <span style={item.tagged_event?.event_types?.color ? {color: item.tagged_event.event_types.color} : {}}>
                              {item.tagged_event?.event_types?.name || 'Event Type N/A'}
                            </span>
                            <span className="text-gray-600 ml-1">
                              @ {formatTime(item.tagged_event?.timestamp || 0)}
                            </span>
                            {item.tagged_event?.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{item.tagged_event.notes}</p>}
                          </div>
                          <div className={`flex items-center transition-opacity ${isPlayingPlaylist ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItemInPlaylist(item.id, 'up')} disabled={index === 0 || isPlayingPlaylist} title="Move Up">
                              <ArrowUpCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItemInPlaylist(item.id, 'down')} disabled={index === arr.length - 1 || isPlayingPlaylist} title="Move Down">
                              <ArrowDownCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItemFromPlaylist(item.id)} disabled={isPlayingPlaylist} title="Remove from Playlist">
                              <DeleteIcon className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};