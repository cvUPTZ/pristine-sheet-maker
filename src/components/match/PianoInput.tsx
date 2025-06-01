import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { EventType } from '@/types';

interface PianoInputProps {
  onEventRecord: (eventType: EventType) => void;
}

const PianoInput: React.FC<PianoInputProps> = ({
  onEventRecord
}) => {
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEventTypeSelect = (eventType: EventType) => {
    setSelectedEventType(eventType);
  };

  const handleRecordEvent = () => {
    if (!selectedEventType) {
      toast({
        title: "No Event Selected",
        description: "Please select an event type to record.",
        variant: "destructive",
      });
      return;
    }

    onEventRecord(selectedEventType);
    setSelectedEventType(null); // Clear selection after recording
  };

  const renderEventButton = (eventType: EventType) => {
    const isSelected = selectedEventType === eventType;
    return (
      <button
        key={eventType}
        onClick={() => handleEventTypeSelect(eventType)}
        className={`
          flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          }
        `}
      >
        <EnhancedEventTypeIcon
          eventType={eventType}
          size="md"
        />
        <span className="text-xs font-medium mt-1 text-center">
          {eventType.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Piano Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {['pass', 'shot', 'foul', 'goal', 'assist'].map((eventType) => (
            renderEventButton(eventType as EventType)
          ))}
        </div>
        <Button onClick={handleRecordEvent} disabled={!selectedEventType}>
          Record Event
        </Button>
        {selectedEventType && (
          <div>
            Selected Event: {selectedEventType}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PianoInput;
