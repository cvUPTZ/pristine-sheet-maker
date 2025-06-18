
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export interface PropertyDefinition {
  id: string;
  name: string;
  dataType: 'text' | 'number' | 'boolean' | 'select';
  defaultValue?: string | number | boolean;
  selectOptions?: string[];
}

export interface LocalEventType {
  id: string;
  name: string;
  color?: string;
  properties: PropertyDefinition[];
}

interface EventTypeManagerProps {
  eventTypes: LocalEventType[];
  onAddEventType: (eventTypeData: { name: string; color?: string }) => void;
  onDeleteEventType: (eventTypeId: string) => void;
  onUpdateEventType: (updatedEventType: LocalEventType) => void;
  onClose: () => void;
}

export const EventTypeManager: React.FC<EventTypeManagerProps> = ({
  eventTypes,
  onAddEventType,
  onDeleteEventType,
  onUpdateEventType,
  onClose,
}) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3B82F6');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeColor, setEditingTypeColor] = useState('');

  const handleAddEventType = () => {
    if (!newTypeName.trim()) {
      toast.error('Event type name is required.');
      return;
    }
    onAddEventType({ name: newTypeName.trim(), color: newTypeColor });
    setNewTypeName('');
    setNewTypeColor('#3B82F6');
  };

  const handleStartEdit = (eventType: LocalEventType) => {
    setEditingTypeId(eventType.id);
    setEditingTypeName(eventType.name);
    setEditingTypeColor(eventType.color || '#3B82F6');
  };

  const handleSaveEdit = () => {
    if (!editingTypeName.trim()) {
      toast.error('Event type name is required.');
      return;
    }
    const eventType = eventTypes.find(et => et.id === editingTypeId);
    if (eventType) {
      onUpdateEventType({
        ...eventType,
        name: editingTypeName.trim(),
        color: editingTypeColor,
      });
    }
    setEditingTypeId(null);
    setEditingTypeName('');
    setEditingTypeColor('');
  };

  const handleCancelEdit = () => {
    setEditingTypeId(null);
    setEditingTypeName('');
    setEditingTypeColor('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Event Type Manager</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Event Type */}
        <div className="p-3 border rounded-lg bg-gray-50">
          <h4 className="font-medium text-sm mb-3">Create New Event Type</h4>
          <div className="flex gap-2">
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Event type name"
              className="flex-grow"
            />
            <input
              type="color"
              value={newTypeColor}
              onChange={(e) => setNewTypeColor(e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
              title="Choose color"
            />
            <Button size="sm" onClick={handleAddEventType}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Existing Event Types */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Existing Event Types ({eventTypes.length})</h4>
          {eventTypes.length === 0 && (
            <p className="text-sm text-gray-500">No event types defined yet. Create your first one above.</p>
          )}
          {eventTypes.map(eventType => (
            <div key={eventType.id} className="p-3 border rounded-lg bg-white">
              {editingTypeId === eventType.id ? (
                <div className="flex gap-2 items-center">
                  <Input
                    value={editingTypeName}
                    onChange={(e) => setEditingTypeName(e.target.value)}
                    className="flex-grow"
                  />
                  <input
                    type="color"
                    value={editingTypeColor}
                    onChange={(e) => setEditingTypeColor(e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: eventType.color || '#3B82F6' }}
                    />
                    <span className="font-medium">{eventType.name}</span>
                    <span className="text-xs text-gray-500">
                      ({eventType.properties.length} {eventType.properties.length === 1 ? 'property' : 'properties'})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleStartEdit(eventType)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeleteEventType(eventType.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventTypeManager;
