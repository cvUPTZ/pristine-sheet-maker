import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Play, Trash2, List } from 'lucide-react';
import { toast } from 'sonner';

// Local playlist interfaces for direct analyzer (not using Supabase)
interface LocalPlaylist {
  id: string;
  name: string;
  items: LocalPlaylistItem[];
  createdAt: string;
}

interface LocalPlaylistItem {
  id: string;
  taggedEventId: string;
  eventName: string;
  timestamp: number;
  order: number;
}

interface LocalTaggedEvent {
  id: string;
  timestamp: number;
  typeId: string;
  typeName: string;
  notes?: string;
  annotations?: any[];
}

interface PlaylistPanelProps {
  taggedEvents: LocalTaggedEvent[];
  disabled?: boolean;
}

// Utility function
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

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  taggedEvents,
  disabled = false,
}) => {
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<LocalPlaylist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name.');
      return;
    }

    const newPlaylist: LocalPlaylist = {
      id: crypto.randomUUID(),
      name: newPlaylistName.trim(),
      items: [],
      createdAt: new Date().toISOString(),
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    setSelectedPlaylist(newPlaylist);
    setNewPlaylistName('');
    setShowCreateForm(false);
    toast.success(`Playlist "${newPlaylist.name}" created!`);
  };

  const handleAddToPlaylist = (taggedEvent: LocalTaggedEvent) => {
    if (!selectedPlaylist) {
      toast.error('Please select a playlist first.');
      return;
    }

    const isAlreadyInPlaylist = selectedPlaylist.items.some(
      item => item.taggedEventId === taggedEvent.id
    );

    if (isAlreadyInPlaylist) {
      toast.info('This event is already in the playlist.');
      return;
    }

    const newItem: LocalPlaylistItem = {
      id: crypto.randomUUID(),
      taggedEventId: taggedEvent.id,
      eventName: taggedEvent.typeName,
      timestamp: taggedEvent.timestamp,
      order: selectedPlaylist.items.length,
    };

    const updatedPlaylist = {
      ...selectedPlaylist,
      items: [...selectedPlaylist.items, newItem].sort((a, b) => a.timestamp - b.timestamp),
    };

    setPlaylists(prev =>
      prev.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p)
    );
    setSelectedPlaylist(updatedPlaylist);
    toast.success(`Added "${taggedEvent.typeName}" to playlist.`);
  };

  const handleRemoveFromPlaylist = (itemId: string) => {
    if (!selectedPlaylist) return;

    const updatedPlaylist = {
      ...selectedPlaylist,
      items: selectedPlaylist.items.filter(item => item.id !== itemId),
    };

    setPlaylists(prev =>
      prev.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p)
    );
    setSelectedPlaylist(updatedPlaylist);
    toast.success('Removed from playlist.');
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (window.confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
      toast.success('Playlist deleted.');
    }
  };

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create New Playlist */}
          <div className="space-y-2">
            {!showCreateForm ? (
              <Button size="sm" onClick={() => setShowCreateForm(true)} disabled={disabled}>
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="flex-grow"
                  disabled={disabled}
                />
                <Button size="sm" onClick={handleCreatePlaylist} disabled={disabled}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  setNewPlaylistName('');
                }} disabled={disabled}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Existing Playlists */}
          {playlists.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Your Playlists</h4>
              {playlists.map(playlist => (
                <div
                  key={playlist.id}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedPlaylist?.id === playlist.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPlaylist(playlist)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{playlist.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({playlist.items.length} items)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id);
                      }}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Playlist Details */}
          {selectedPlaylist && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">
                Playlist: {selectedPlaylist.name}
              </h4>
              {selectedPlaylist.items.length === 0 ? (
                <p className="text-sm text-gray-500">No items in this playlist yet.</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedPlaylist.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm p-1 hover:bg-gray-50 rounded">
                      <span>{item.eventName} @ {formatTime(item.timestamp)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromPlaylist(item.id)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tagged Events - Add to Playlist */}
      {taggedEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add to Playlist</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPlaylist ? (
              <p className="text-sm text-gray-500">Select a playlist to add events to it.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {taggedEvents.map(event => {
                  const isInPlaylist = selectedPlaylist.items.some(
                    item => item.taggedEventId === event.id
                  );
                  return (
                    <div key={event.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                      <span>{event.typeName} @ {formatTime(event.timestamp)}</span>
                      <Button
                        size="sm"
                        variant={isInPlaylist ? "outline" : "default"}
                        onClick={() => handleAddToPlaylist(event)}
                        disabled={disabled || isInPlaylist}
                      >
                        {isInPlaylist ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlaylistPanel;
