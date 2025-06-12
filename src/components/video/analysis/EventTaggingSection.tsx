
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag, ListVideo, PlusCircle, Trash2 as DeleteIcon, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Local types for the direct analyzer (not using Supabase tables)
interface LocalEventType {
  id: string;
  name: string;
  color?: string;
}

interface LocalTaggedEvent {
  id: string;
  timestamp: number;
  typeId: string;
  typeName: string;
  notes?: string;
  annotations?: any[];
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

interface EventTaggingSectionProps {
  videoPlayerRef: React.RefObject<HTMLVideoElement>;
  taggedEvents: LocalTaggedEvent[];
  availableEventTypes: LocalEventType[];
  activeTaggedEventId: string | null;
  onSetActiveTaggedEventId: (id: string | null) => void;
  onCreateEventType: (name: string) => void;
  onTagEvent: (eventTypeId: string, timestamp: number) => void;
  onDeleteTaggedEvent: (taggedEventId: string) => void;
  disabled?: boolean;
}

export const EventTaggingSection: React.FC<EventTaggingSectionProps> = ({
  videoPlayerRef,
  taggedEvents,
  availableEventTypes,
  activeTaggedEventId,
  onSetActiveTaggedEventId,
  onCreateEventType,
  onTagEvent,
  onDeleteTaggedEvent,
  disabled = false,
}) => {
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>('');
  const [newEventTypeName, setNewEventTypeName] = useState('');

  const handleCreateEventType = () => {
    if (!newEventTypeName.trim()) {
      toast.error('Event type name cannot be empty.');
      return;
    }
    onCreateEventType(newEventTypeName.trim());
    setNewEventTypeName('');
  };

  const handleTagEvent = () => {
    if (!selectedEventTypeId) {
      toast.error('Please select an event type.');
      return;
    }
    if (!videoPlayerRef.current) {
      toast.error('Video player is not available.');
      return;
    }
    const currentTime = videoPlayerRef.current.currentTime;
    onTagEvent(selectedEventTypeId, currentTime);
  };

  return (
    <>
      {/* UI for selecting/creating event types */}
      <div className={`mb-4 space-y-3 p-3 border rounded-md ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="font-medium text-sm flex items-center"><Tag className="h-4 w-4 mr-2" />Event Configuration</h4>
        
        <div className="flex items-center gap-2">
          <Select value={selectedEventTypeId} onValueChange={setSelectedEventTypeId} disabled={disabled}>
            <SelectTrigger className="flex-grow">
              <SelectValue placeholder={availableEventTypes.length === 0 ? "No event types. Create one!" : "Select Event Type"} />
            </SelectTrigger>
            <SelectContent>
              {availableEventTypes.map(et => (
                <SelectItem key={et.id} value={et.id} style={et.color ? { color: et.color } : {}}>
                  {et.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newEventTypeName}
            onChange={(e) => setNewEventTypeName(e.target.value)}
            placeholder="New event type name"
            className="flex-grow"
            disabled={disabled}
          />
          <Button size="sm" variant="outline" onClick={handleCreateEventType} disabled={disabled || !newEventTypeName.trim()} title="Create New Event Type">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Button to tag an event at the current video timestamp */}
      <div className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Button onClick={handleTagEvent} disabled={disabled || !selectedEventTypeId} className="w-full">
          <Tag className="h-4 w-4 mr-2" /> Tag Event at Current Timestamp
        </Button>
      </div>

      {/* Section to display existing tagged events for the video */}
      <div className={`space-y-3 p-3 border rounded-md mt-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="font-medium text-sm flex items-center"><ListVideo className="h-4 w-4 mr-2" />Tagged Events</h4>
        
        {taggedEvents.length === 0 && (
          <p className="text-sm text-gray-500">No events tagged for this video yet.</p>
        )}
        
        {taggedEvents.length > 0 && (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {taggedEvents.map(te => {
              const eventType = availableEventTypes.find(et => et.id === te.typeId);
              const eventTypeName = eventType?.name || 'Unknown Event Type';
              const eventTypeColor = eventType?.color;
              const isActive = te.id === activeTaggedEventId;

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
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); if(!disabled) onDeleteTaggedEvent(te.id); }}
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

export default EventTaggingSection;
