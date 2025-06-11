import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Playlist, PlaylistItem } from '@/types/playlists';
import { TaggedEvent } from '@/types/events'; // For type reference, though full objects may not be passed
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, StopCircle, PlusSquare, ArrowUpCircle, ArrowDownCircle, XCircle as DeleteIcon, ListVideo } from 'lucide-react';
import { ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';


// Utility function (can be moved to a utils file if shared)
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

interface PlaylistPanelProps {
  currentUser: any; // Supabase User type
  jobId: string;
  videoJobDuration: number | null | undefined;
  videoPlayerRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<ReactSketchCanvasRef>;

  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  currentPlaylist: (Playlist & { items?: PlaylistItem[] }) | null;
  setCurrentPlaylist: React.Dispatch<React.SetStateAction<(Playlist & { items?: PlaylistItem[] }) | null>>;

  // To deselect event from annotation when playlist starts
  onClearActiveTaggedEventForAnnotation: () => void;
  disabled?: boolean; // Overall panel disabled state
  isPlayingPlaylist: boolean; // Prop from parent
  setIsPlayingPlaylist: React.Dispatch<React.SetStateAction<boolean>>; // Prop from parent
}

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  currentUser,
  jobId,
  videoJobDuration,
  videoPlayerRef,
  canvasRef,
  playlists,
  setPlaylists,
  currentPlaylist,
  setCurrentPlaylist,
  onClearActiveTaggedEventForAnnotation,
  disabled = false,
  isPlayingPlaylist, // Use prop
  setIsPlayingPlaylist, // Use prop
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false); // For playlist list
  const [playlistError, setPlaylistError] = useState<string | null>(null); // For playlist list
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false); // For items of currentPlaylist

  // Playback State
  // const [isPlayingPlaylist, setIsPlayingPlaylist] = useState(false); // MOVED to props
  const [currentPlaylistItemIndex, setCurrentPlaylistItemIndex] = useState(0); // Stays local for UI highlighting within panel
  const playlistSegmentTimeoutId = useRef<NodeJS.Timeout | null>(null);

  // Fetch Playlists (moved from parent)
  useEffect(() => {
    if (!currentUser || !jobId || disabled) { // if panel is disabled, don't fetch
        setPlaylists([]); // Clear playlists if user/jobId changes or panel disabled
        return;
    }
    const fetchPlaylistsInternal = async () => {
        setPlaylistLoading(true);
        setPlaylistError(null);
        try {
            const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('video_job_id', jobId)
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
    fetchPlaylistsInternal();
  }, [currentUser, jobId, setPlaylists, disabled]);


  // Fetch Playlist Items when currentPlaylist ID changes (moved from parent)
   useEffect(() => {
    if (currentPlaylist?.id && !disabled) {
      const fetchItems = async () => {
        setPlaylistItemsLoading(true);
        try {
          const { data: itemsData, error: itemsError } = await supabase
            .from('playlist_items')
            .select(`*, tagged_events:tagged_event_id (*, event_types:event_type_id (id, name, color))`)
            .eq('playlist_id', currentPlaylist.id)
            .order('item_order', { ascending: true });
          if (itemsError) throw itemsError;
          setCurrentPlaylist(prev => prev ? { ...prev, items: itemsData as PlaylistItem[] } : null);
        } catch (error: any) {
          toast.error("Failed to fetch playlist items: " + error.message);
        } finally {
          setPlaylistItemsLoading(false);
        }
      };
      fetchItems();
    } else if (!currentPlaylist?.id) { // Clear items if playlist deselected or has no ID
        setCurrentPlaylist(prev => prev ? { ...prev, items: []} : null);
    }
  }, [currentPlaylist?.id, setCurrentPlaylist, disabled]);

  // Cleanup timeout (moved from parent)
  useEffect(() => {
    return () => {
      if (playlistSegmentTimeoutId.current) {
        clearTimeout(playlistSegmentTimeoutId.current);
      }
    };
  }, []);


  // All handlers (createPlaylist, deletePlaylist, removeItem, moveItem, playSpecific, togglePlayback)
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) { /* ... */ return; }
    if (!currentUser || !jobId) { /* ... */ return; }
    setPlaylistLoading(true); // Indicate activity
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ name: newPlaylistName.trim(), user_id: currentUser.id, video_job_id: jobId })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const newPl = { ...data, items: [] };
        setPlaylists(prev => [...prev, newPl]);
        setNewPlaylistName('');
        setCurrentPlaylist(newPl);
        toast.success(`Playlist "${data.name}" created.`);
      }
    } catch (error: any) { /* ... */
        if (error.message?.includes('user_video_playlist_name_unique')) {
             toast.error(`Playlist with name "${newPlaylistName.trim()}" already exists for this video.`);
        } else {
            toast.error("Failed to create playlist: " + error.message);
        }
    } finally {
        setPlaylistLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    // ... (logic from VideoJobMonitor)
    if (!playlistId) return;
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      if (error) throw error;
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      if (currentPlaylist?.id === playlistId) setCurrentPlaylist(null);
      toast.success("Playlist deleted.");
    } catch (error: any) { toast.error("Failed to delete playlist: " + error.message); }
  };

  const handleRemoveItemFromPlaylist = async (playlistItemId: string) => {
    // ... (logic from VideoJobMonitor)
    if (!currentPlaylist || !playlistItemId) return;
    try {
      const { error } = await supabase.from('playlist_items').delete().eq('id', playlistItemId);
      if (error) throw error;
      setCurrentPlaylist(prev => {
        if (!prev) return null;
        const updatedItems = (prev.items || []).filter(item => item.id !== playlistItemId);
        return { ...prev, items: updatedItems };
      });
      toast.success("Item removed from playlist.");
    } catch (error: any) { toast.error("Failed to remove item: " + error.message); }
  };

  const handleMoveItemInPlaylist = async (playlistItemId: string, direction: 'up' | 'down') => {
    // ... (logic from VideoJobMonitor)
    if (!currentPlaylist || !currentPlaylist.items) return;
    const items = [...currentPlaylist.items].sort((a, b) => a.item_order - b.item_order);
    const itemIndex = items.findIndex(item => item.id === playlistItemId);
    if (itemIndex === -1) return;
    const targetItem = items[itemIndex];
    let swapWithItem: PlaylistItem | undefined;
    if (direction === 'up' && itemIndex > 0) swapWithItem = items[itemIndex - 1];
    else if (direction === 'down' && itemIndex < items.length - 1) swapWithItem = items[itemIndex + 1];
    if (!swapWithItem) return;

    const newLocalItems = items.map(item => {
      if (item.id === targetItem.id) return { ...item, item_order: swapWithItem!.item_order };
      if (item.id === swapWithItem.id) return { ...item, item_order: targetItem.item_order };
      return item;
    }).sort((a,b) => a.item_order - b.item_order);
    setCurrentPlaylist(prev => prev ? { ...prev, items: newLocalItems } : null);

    try {
      const { error: error1 } = await supabase.from('playlist_items').update({ item_order: swapWithItem.item_order }).eq('id', targetItem.id);
      if (error1) throw error1;
      const { error: error2 } = await supabase.from('playlist_items').update({ item_order: targetItem.item_order }).eq('id', swapWithItem.id);
      if (error2) throw error2;
    } catch (error: any) {
      toast.error("Failed to move item: " + error.message);
      // Revert by re-fetching
      if(currentPlaylist?.id) fetchPlaylistItems(currentPlaylist.id);
    }
  };

  const playSpecificPlaylistItem = (index: number) => {
    // ... (logic from VideoJobMonitor, ensure canvasRef and videoPlayerRef are used via props)
    if (!isPlayingPlaylist || !currentPlaylist || !currentPlaylist.items || !videoPlayerRef.current || !canvasRef.current) {
      setIsPlayingPlaylist(false); return;
    }
    if (index >= currentPlaylist.items.length) {
      setIsPlayingPlaylist(false); setCurrentPlaylistItemIndex(0); videoPlayerRef.current.pause(); canvasRef.current.resetCanvas(); toast.success("Playlist finished."); return;
    }
    setCurrentPlaylistItemIndex(index);
    const playlistItem = currentPlaylist.items[index];
    const taggedEvent = playlistItem.tagged_event;
    if (!taggedEvent) { playSpecificPlaylistItem(index + 1); return; }

    const segmentStartOffset = 3, segmentEndOffset = 3, minSegmentDuration = 1;
    const startTime = Math.max(0, taggedEvent.timestamp - segmentStartOffset);
    let endTime = taggedEvent.timestamp + segmentEndOffset;
    if (endTime <= startTime) endTime = startTime + minSegmentDuration;
    if (videoJobDuration && endTime > videoJobDuration) endTime = videoJobDuration;
    const segmentDurationMs = (endTime - startTime) * 1000;

    videoPlayerRef.current.currentTime = startTime;
    videoPlayerRef.current.play().catch(e => console.error("Error playing video:", e));
    canvasRef.current.resetCanvas();
    if (taggedEvent.annotations && Array.isArray(taggedEvent.annotations)) {
      canvasRef.current.loadPaths(taggedEvent.annotations as CanvasPath[]);
    }
    if (playlistSegmentTimeoutId.current) clearTimeout(playlistSegmentTimeoutId.current);
    if (segmentDurationMs <=0) { playSpecificPlaylistItem(index + 1); return; }
    playlistSegmentTimeoutId.current = setTimeout(() => {
      if (videoPlayerRef.current) videoPlayerRef.current.pause();
      if (isPlayingPlaylist) playSpecificPlaylistItem(index + 1);
    }, segmentDurationMs);
  };

  const handleTogglePlaylistPlayback = () => {
    // ... (logic from VideoJobMonitor, use onClearActiveTaggedEventForAnnotation)
    if (isPlayingPlaylist) {
      setIsPlayingPlaylist(false);
      if (playlistSegmentTimeoutId.current) { clearTimeout(playlistSegmentTimeoutId.current); playlistSegmentTimeoutId.current = null; }
      if (videoPlayerRef.current) videoPlayerRef.current.pause();
      onClearActiveTaggedEventForAnnotation(); // To re-enable general annotation if needed
      setCurrentPlaylistItemIndex(0);
    } else {
      if (!currentPlaylist || !currentPlaylist.items || currentPlaylist.items.length === 0) { toast.info("No items to play."); return; }
      setIsPlayingPlaylist(true);
      onClearActiveTaggedEventForAnnotation(); // Ensure no single event is "active" for annotation
      playSpecificPlaylistItem(0);
    }
  };

  const effectiveDisabled = disabled || isPlayingPlaylist; // Most controls disabled during playback or if panel is disabled

  return (
    <div className={`mt-6 pt-4 border-t ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
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
              disabled={effectiveDisabled}
            />
            <Button size="sm" onClick={handleCreatePlaylist} title="Create New Playlist" disabled={effectiveDisabled || !newPlaylistName.trim()}>
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
                  className={`p-2 rounded-md text-sm cursor-pointer transition-colors flex justify-between items-center
                              ${currentPlaylist?.id === pl.id ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'}
                              ${effectiveDisabled ? 'cursor-not-allowed' : ''}`}
                  onClick={() => !effectiveDisabled && setCurrentPlaylist(currentPlaylist?.id === pl.id ? null : { ...pl, items: currentPlaylist?.id === pl.id && currentPlaylist.items ? currentPlaylist.items : [] })}
                >
                  <span>{pl.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); if(!effectiveDisabled) handleDeletePlaylist(pl.id);}} disabled={effectiveDisabled} title="Delete Playlist">
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
              <Button size="sm" onClick={handleTogglePlaylistPlayback} disabled={disabled} /* Play button itself is not disabled by isPlayingPlaylist directly, its state changes */ variant={isPlayingPlaylist ? "destructive" : "default"}>
                {isPlayingPlaylist ? <StopCircle className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {isPlayingPlaylist ? "Stop" : "Play"}
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
                <li key={item.id} className={`p-2 rounded-md text-sm flex justify-between items-center group transition-colors ${isPlayingPlaylist && currentPlaylistItemIndex === index ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex-grow">
                    <span className="font-semibold mr-2 text-xs text-gray-500">#{item.item_order + 1}</span>
                    <span style={item.tagged_event?.event_types?.color ? {color: item.tagged_event.event_types.color} : {}}>{item.tagged_event?.event_types?.name || 'N/A'}</span>
                    <span className="text-gray-600 ml-1">@ {formatTime(item.tagged_event?.timestamp || 0)}</span>
                    {item.tagged_event?.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{item.tagged_event.notes}</p>}
                  </div>
                  <div className={`flex items-center transition-opacity ${isPlayingPlaylist ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItemInPlaylist(item.id, 'up')} disabled={index === 0} title="Move Up"><ArrowUpCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveItemInPlaylist(item.id, 'down')} disabled={index === arr.length - 1} title="Move Down"><ArrowDownCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItemFromPlaylist(item.id)} title="Remove"><DeleteIcon className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
