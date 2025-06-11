
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { EnhancedEventTypeIcon } from '@/components/match/EnhancedEventTypeIcon';
import { EventType } from '@/types';
import CancelActionIndicator from './CancelActionIndicator';
import { supabase } from '@/integrations/supabase/client';

interface RecordedEvent {
  id: string;
  eventType: EventType;
  timestamp: number;
  dbEventId?: string;
  isSubmitted: boolean;
}

interface EnhancedPianoInputProps {
  onEventRecord: (eventType: EventType) => void;
  matchId: string;
}

const EnhancedPianoInput: React.FC<EnhancedPianoInputProps> = ({
  onEventRecord,
  matchId
}) => {
  const [recentEvents, setRecentEvents] = useState<RecordedEvent[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEventRecord = useCallback(async (eventType: EventType) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    // Create local event first (not submitted to DB yet)
    const eventId = `temp_${Date.now()}_${Math.random()}`;
    const newEvent: RecordedEvent = {
      id: eventId,
      eventType,
      timestamp: Date.now(),
      isSubmitted: false
    };
    
    setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    
    onEventRecord(eventType);
    
    toast({
      title: "Event Recorded",
      description: `${eventType} event recorded. You have 10 seconds to cancel.`,
    });

    // Schedule submission to Supabase after 10 seconds
    setTimeout(async () => {
      setRecentEvents(prev => {
        const event = prev.find(e => e.id === eventId);
        if (!event) return prev; // Event was already cancelled

        // Submit to Supabase
        submitEventToSupabase(event, eventType);
        
        // Remove from recent events (timer expired)
        return prev.filter(e => e.id !== eventId);
      });
    }, 10000);

  }, [onEventRecord, toast, matchId, user?.id]);

  const submitEventToSupabase = async (event: RecordedEvent, eventType: EventType) => {
    try {
      const eventToInsert = {
        match_id: matchId,
        event_type: eventType,
        created_by: user!.id,
        timestamp: Math.floor(event.timestamp / 1000),
      };

      const { data, error } = await supabase
        .from('match_events')
        .insert(eventToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error submitting event to Supabase:', error);
        toast({
          title: "Error",
          description: "Failed to submit event to database",
          variant: "destructive"
        });
        return;
      }

      // Update local state to mark as submitted
      setRecentEvents(prev => 
        prev.map(e => 
          e.id === event.id 
            ? { ...e, dbEventId: data.id, isSubmitted: true }
            : e
        )
      );

      console.log('Event successfully submitted to Supabase:', data.id);
    } catch (error) {
      console.error('Error submitting event:', error);
    }
  };

  const handleCancelEvent = useCallback(async (eventId: string, eventType: EventType) => {
    try {
      const eventToCancel = recentEvents.find(event => event.id === eventId);
      if (!eventToCancel) {
        console.error('Event not found');
        return;
      }

      // If event was already submitted to DB, delete it
      if (eventToCancel.isSubmitted && eventToCancel.dbEventId) {
        const { error } = await supabase
          .from('match_events')
          .delete()
          .eq('id', eventToCancel.dbEventId);

        if (error) {
          console.error('Error cancelling event from database:', error);
          toast({
            title: "Error",
            description: "Failed to cancel event from database",
            variant: "destructive"
          });
          return;
        }
      }

      // Remove from local state
      setRecentEvents(prev => prev.filter(event => event.id !== eventId));
      
      toast({
        title: "Event Cancelled",
        description: `${eventType} event has been cancelled and removed.`,
      });
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast({
        title: "Error",
        description: "Failed to cancel event",
        variant: "destructive"
      });
    }
  }, [toast, recentEvents]);

  const handleEventExpire = useCallback((eventId: string) => {
    setRecentEvents(prev => prev.filter(event => event.id !== eventId));
    toast({
      title: "Cancellation Expired",
      description: "Event is now permanent and cannot be cancelled.",
    });
  }, [toast]);

  const eventTypes: EventType[] = ['pass', 'shot', 'foul', 'goal', 'assist', 'tackle', 'save', 'corner', 'freeKick'];

  const renderEventButton = (eventType: EventType) => {
    return (
      <button
        key={eventType}
        onClick={() => handleEventRecord(eventType)}
        className="flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 aspect-square text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
      >
        <EnhancedEventTypeIcon
          eventType={eventType}
          size="sm"
        />
        <span className="text-xs font-medium mt-1 text-center leading-tight">
          {eventType.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Event Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
            {eventTypes.map(renderEventButton)}
          </div>
        </CardContent>
      </Card>

      {recentEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Events (Click to Cancel)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 justify-start max-w-full overflow-x-auto">
              {recentEvents.map((event) => (
                <CancelActionIndicator
                  key={event.id}
                  eventType={event.eventType}
                  onCancel={() => handleCancelEvent(event.id, event.eventType)}
                  onExpire={() => handleEventExpire(event.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedPianoInput;
