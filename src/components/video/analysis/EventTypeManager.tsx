// src/components/video/analysis/EventTypeManager.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Trash2, Palette, Edit3, ArrowLeft } from 'lucide-react'; // Added Edit3, ArrowLeft
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For dataType

// Data Structures (as defined previously)
export interface PropertyDefinition {
  id: string;
  name: string;
  dataType: 'text' | 'number' | 'select' | 'boolean';
  selectOptions?: string[];
  defaultValue?: string | number | boolean;
}

export interface LocalEventType {
  id: string;
  name: string;
  color?: string;
  properties: PropertyDefinition[];
}

interface EventTypeManagerProps {
  eventTypes: LocalEventType[];
  onAddEventType: (newTypeData: { name: string; color?: string }) => void;
  onUpdateEventType: (updatedType: LocalEventType) => void;
  onDeleteEventType: (typeId: string) => void;
}

export const EventTypeManager: React.FC<EventTypeManagerProps> = ({
  eventTypes,
  onAddEventType,
  onUpdateEventType,
  onDeleteEventType,
}) => {
  const [newEventTypeName, setNewEventTypeName] = useState('');
  const [newEventTypeColor, setNewEventTypeColor] = useState('#FFFFFF');

  const [selectedEventType, setSelectedEventType] = useState<LocalEventType | null>(null);
  // State for new property form
  const [newPropName, setNewPropName] = useState('');
  const [newPropDataType, setNewPropDataType] = useState<'text' | 'number' | 'select' | 'boolean'>('text');
  const [newPropSelectOptions, setNewPropSelectOptions] = useState('');

  useEffect(() => {
    // If the selected event type is updated externally (e.g. deleted), deselect it.
    if (selectedEventType && !eventTypes.find(et => et.id === selectedEventType.id)) {
        setSelectedEventType(null);
    }
  }, [eventTypes, selectedEventType]);


  const handleAddEventType = () => {
    if (!newEventTypeName.trim()) {
      alert('Event type name cannot be empty.'); // Replace with toast later
      return;
    }
    onAddEventType({ name: newEventTypeName.trim(), color: newEventTypeColor });
    setNewEventTypeName('');
    setNewEventTypeColor('#FFFFFF'); // Reset to default
   };

  const handleSelectEventTypeForEditing = (eventType: LocalEventType) => {
    setSelectedEventType(eventType);
    // Reset property form fields when selecting a new type
    setNewPropName('');
    setNewPropDataType('text');
    setNewPropSelectOptions('');
  };

  const handleAddPropertyToSelectedType = () => {
    if (!selectedEventType || !newPropName.trim()) {
      alert('Property name cannot be empty.'); // Use toast later
      return;
    }
    const newProperty: PropertyDefinition = {
      id: crypto.randomUUID(),
      name: newPropName.trim(),
      dataType: newPropDataType,
      selectOptions: newPropDataType === 'select' ? newPropSelectOptions.split(',').map(opt => opt.trim()).filter(opt => opt) : undefined,
    };
    const updatedEventType = {
      ...selectedEventType,
      properties: [...selectedEventType.properties, newProperty],
    };
    onUpdateEventType(updatedEventType);
    setSelectedEventType(updatedEventType); // Update local selected state as well
    // Reset form
    setNewPropName('');
    setNewPropDataType('text');
    setNewPropSelectOptions('');
  };

  const handleDeletePropertyFromSelectedType = (propIdToDelete: string) => {
    if (!selectedEventType) return;
    const updatedProperties = selectedEventType.properties.filter(p => p.id !== propIdToDelete);
    const updatedEventType = { ...selectedEventType, properties: updatedProperties };
    onUpdateEventType(updatedEventType);
    setSelectedEventType(updatedEventType); // Update local selected state
  };

  const colorPalette = [
    '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF',
    '#A0C4FF', '#BDB2FF', '#FFC6FF', '#E0E0E0', '#FFFFFF', '#000000'
  ];

  // Main return content
  if (selectedEventType) {
    // Property Management View for a selected Event Type
    return (
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEventType(null)} className="text-sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Event Types
            </Button>
            <CardTitle className="text-lg">Properties for: {selectedEventType.name}</CardTitle>
          </div>
          <CardDescription>Define custom fields for the "{selectedEventType.name}" event type.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 border rounded-md bg-slate-50">
            <h4 className="text-md font-semibold mb-2">Add New Property</h4>
            <div className="space-y-2">
              <Input placeholder="Property Name (e.g., Player, Outcome)" value={newPropName} onChange={e => setNewPropName(e.target.value)} />
              <Select value={newPropDataType} onValueChange={(value: any) => setNewPropDataType(value)}>
                <SelectTrigger><SelectValue placeholder="Select Data Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Select (Dropdown)</SelectItem>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                </SelectContent>
              </Select>
              {newPropDataType === 'select' && (
                <Input placeholder="Comma-separated options (e.g., Opt1,Opt2)" value={newPropSelectOptions} onChange={e => setNewPropSelectOptions(e.target.value)} />
              )}
              <Button onClick={handleAddPropertyToSelectedType} size="sm"><PlusCircle className="h-4 w-4 mr-1"/> Add Property</Button>
            </div>
          </div>

          <h4 className="text-md font-semibold mb-2">Defined Properties ({selectedEventType.properties.length})</h4>
          {selectedEventType.properties.length === 0 ? <p className="text-xs text-gray-500">No properties defined yet.</p> : (
            <ScrollArea className="h-40">
              <ul className="space-y-1">
                {selectedEventType.properties.map(prop => (
                  <li key={prop.id} className="flex items-center justify-between p-2 text-xs border rounded-md bg-white">
                    <div>
                        <span className="font-medium">{prop.name}</span> <span className="text-gray-500">({prop.dataType})</span>
                        {prop.dataType === 'select' && prop.selectOptions && <span className="text-gray-500 text-xs block">Options: {prop.selectOptions.join(', ')}</span>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePropertyFromSelectedType(prop.id)} title={`Delete ${prop.name}`}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    );
  }

  // Event Type List and Creation View (default view)
  return (
    <Card>
       <CardHeader>
        <CardTitle>Event Type Manager</CardTitle>
        <CardDescription>Define and manage your custom event types. Click an event type to manage its properties.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Create New Event Type</h3>
           <div className="space-y-3">
            <div>
              <label htmlFor="eventTypeName" className="block text-sm font-medium mb-1">Name</label>
              <Input id="eventTypeName" value={newEventTypeName} onChange={(e) => setNewEventTypeName(e.target.value)} placeholder="e.g., Shot, Pass, Foul" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex flex-wrap gap-2 items-center">
                {colorPalette.map(color => (
                  <Button key={color} variant="outline" size="icon" onClick={() => setNewEventTypeColor(color)} className={`w-8 h-8 rounded-full ${newEventTypeColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'ring-1 ring-gray-300'}`} style={{ backgroundColor: color }} title={color} />
                ))}
                <Input type="text" value={newEventTypeColor} onChange={(e) => setNewEventTypeColor(e.target.value)} placeholder="#RRGGBB" className="w-24 h-8 text-xs" maxLength={7} />
              </div>
            </div>
            <Button onClick={handleAddEventType} size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Event Type</Button>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-3">Existing Event Types ({eventTypes.length})</h3>
        {eventTypes.length === 0 ? (
          <p className="text-sm text-gray-500">No event types defined yet.</p>
        ) : (
          <ScrollArea className="h-60">
            <ul className="space-y-2">
              {eventTypes.map(et => (
                <li key={et.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border hover:bg-gray-100">
                  <div className="flex items-center flex-grow cursor-pointer" onClick={() => handleSelectEventTypeForEditing(et)}>
                    <span className="w-5 h-5 rounded-full mr-3 border" style={{ backgroundColor: et.color || '#CCCCCC' }} title={et.color || 'Default Color'} />
                    <span className="font-medium">{et.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({et.properties.length} properties)</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleSelectEventTypeForEditing(et)}
                    className="mr-2 py-1 px-2 h-auto text-xs"
                    title="Edit Properties"
                  >
                     <Edit3 className="h-3 w-3 mr-1" /> Properties
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteEventType(et.id)} title={`Delete ${et.name}`}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
