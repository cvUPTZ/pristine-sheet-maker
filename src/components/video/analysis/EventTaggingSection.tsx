import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EventType, TaggedEvent } from '@/types/events';
import { Tag, ListVideo, PlusCircle, Trash2 as DeleteIcon, ListPlus, CheckCircle } from 'lucide-react'; // Assuming Trash2 is used as DeleteIcon
import { toast } from 'sonner';

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


interface EventTaggingSectionProps {
  currentUser: any; // Consider using Supabase User type
  jobId: string;
  videoPlayerRef: React.RefObject<HTMLVideoElement>;

  taggedEvents: TaggedEvent[];
  availableEventTypes: EventType[];

  activeTaggedEventId: string | null;
  onSetActiveTaggedEventId: (id: string | null) => void;

  // Callbacks to interact with parent/Supabase
  onCreateEventTypeInDb: (name: string) => Promise<EventType | null>; // Returns new type or null on failure
  onTagEventInDb: (eventTypeId: string, timestamp: number, videoJobId: string) => Promise<TaggedEvent | null>;
  onDeleteTaggedEventInDb: (taggedEventId: string) => Promise<boolean>; // Returns true on success

  // For playlist interaction (passed through)
  currentPlaylist: Playlist | null; // Using Playlist from global scope for now
  onAddTaggedEventToPlaylist: (taggedEventId: string) => void;

  disabled?: boolean; // To disable controls, e.g. during playlist playback
  eventTypesLoading: boolean;
  eventTypesError: string | null;
  taggedEventsLoading: boolean;
  taggedEventsError: string | null;
}

// Forward declaration for Playlist type if not imported directly
// This is a common workaround if Playlist type is complex or comes from another new file not yet processed.
// However, it's better to import if possible. For this step, assume Playlist type will be available.
type Playlist = any;


export const EventTaggingSection: React.FC<EventTaggingSectionProps> = ({
  currentUser,
  jobId,
  videoPlayerRef,
  taggedEvents,
  availableEventTypes,
  activeTaggedEventId,
  onSetActiveTaggedEventId,
  onCreateEventTypeInDb,
  onTagEventInDb,
  onDeleteTaggedEventInDb,
  currentPlaylist,
  onAddTaggedEventToPlaylist,
  disabled = false,
  eventTypesLoading,
  eventTypesError,
  taggedEventsLoading,
  taggedEventsError,
}) => {
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null);
  const [newEventTypeName, setNewEventTypeName] = useState('');

  const internalHandleCreateEventType = async () => {
    if (!newEventTypeName.trim()) {
      toast.error('Event type name cannot be empty.');
      return;
    }
    const newType = await onCreateEventTypeInDb(newEventTypeName.trim());
    if (newType) {
      setSelectedEventTypeId(newType.id); // Select the new type
      setNewEventTypeName(''); // Clear input
    }
  };

  const internalHandleTagEvent = async () => {
    if (!selectedEventTypeId) {
      toast.error('Please select an event type.');
      return;
    }
    if (!videoPlayerRef.current) {
      toast.error('Video player is not available.');
      return;
    }
    const currentTime = videoPlayerRef.current.currentTime;
    await onTagEventInDb(selectedEventTypeId, currentTime, jobId);
    // Parent will update taggedEvents list
  };

  const internalHandleDeleteTaggedEvent = async (taggedEventId: string) => {
    if (activeTaggedEventId === taggedEventId) {
      onSetActiveTaggedEventId(null); // Deselect if it's deleted
    }
    await onDeleteTaggedEventInDb(taggedEventId);
    // Parent will update taggedEvents list
  };

  return (
    <>
      {/* UI for selecting/creating event types */}
      <div className={`mb-4 space-y-3 p-3 border rounded-md ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
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
                disabled={disabled || (availableEventTypes.length === 0 && !selectedEventTypeId)}
              >
                <option value="" disabled>
                  {availableEventTypes.length === 0 ? "No event types. Create one!" : "Select Event Type"}
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
                disabled={disabled}
              />
              <Button size="sm" variant="outline" onClick={internalHandleCreateEventType} disabled={disabled || !newEventTypeName.trim()} title="Create New Event Type">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Button to tag an event at the current video timestamp */}
      <div className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Button onClick={internalHandleTagEvent} disabled={disabled || !selectedEventTypeId || !currentUser || !jobId} className="w-full">
          <Tag className="h-4 w-4 mr-2" /> Tag Event at Current Timestamp
        </Button>
      </div>

      {/* Section to display existing tagged events for the video */}
      <div className={`space-y-3 p-3 border rounded-md mt-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="font-medium text-sm flex items-center"><ListVideo className="h-4 w-4 mr-2" />Tagged Events</h4>
        {taggedEventsLoading && <p className="text-sm text-gray-500">Loading tagged events...</p>}
        {taggedEventsError && <p className="text-sm text-red-500">{taggedEventsError}</p>}
        {!taggedEventsLoading && !taggedEventsError && taggedEvents.length === 0 && (
          <p className="text-sm text-gray-500">No events tagged for this video yet.</p>
        )}
        {!taggedEventsLoading && !taggedEventsError && taggedEvents.length > 0 && (
          <ul className="space-y-2 max-h-96 overflow-y-auto"> {/* Added max-h and overflow */}
            {taggedEvents.map(te => {
              const eventTypeName = te.event_types?.name || 'Unknown Event Type';
              const eventTypeColor = te.event_types?.color;
              const isActive = te.id === activeTaggedEventId;
              const isInCurrentPlaylist = !!currentPlaylist?.items?.find(item => item.tagged_event_id === te.id);

              return (
                <li
                  key={te.id}
                  className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors
                              ${isActive ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                  onClick={() => disabled ? null : onSetActiveTaggedEventId(te.id === activeTaggedEventId ? null : te.id)}
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
                      size="sm" // Make consistent with delete button
                      onClick={(e) => { e.stopPropagation(); if(!disabled) onAddTaggedEventToPlaylist(te.id);}}
                      disabled={disabled || !currentPlaylist || isInCurrentPlaylist}
                      title={!currentPlaylist ? "Select a playlist to enable" : (isInCurrentPlaylist ? "Event already in playlist" : `Add to: ${currentPlaylist.name}`)}
                    >
                      {isInCurrentPlaylist ? <CheckCircle className="h-4 w-4 text-green-500" /> : <ListPlus className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); if(!disabled) internalHandleDeleteTaggedEvent(te.id); }}
                      disabled={disabled}
                      title="Delete Tagged Event"
                    >
                      <DeleteIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
};
