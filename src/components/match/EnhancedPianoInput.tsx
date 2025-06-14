
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    try {
      // Record the event
      const eventId = `temp_${Date.now()}_${Math.random()}`;
      const newEvent: RecordedEvent = {
        id: eventId,
        eventType,
        timestamp: Date.now()
      };
      
      setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)]);
      onEventRecord(eventType);
      
      toast({
        title: "Event Recorded",
        description: `${eventType} event recorded. You have 10 seconds to cancel.`,
      });
    } catch (error) {
      console.error('Error recording event:', error);
      toast({
        title: "Error",
        description: "Failed to record event",
        variant: "destructive"
      });
    }
  }, [onEventRecord, toast]);

  const handleCancelEvent = useCallback(async (eventId: string, eventType: EventType) => {
    try {
      // Remove from recent events
      setRecentEvents(prev => prev.filter(event => event.id !== eventId));
      
      // TODO: Add actual database cancellation logic here
      // This would involve deleting the most recent event of this type from match_events
      
      toast({
        title: "Event Cancelled",
        description: `${eventType} event has been cancelled.`,
      });
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast({
        title: "Error",
        description: "Failed to cancel event",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleEventExpire = useCallback((eventId: string) => {
    setRecentEvents(prev => prev.filter(event => event.id !== eventId));
  }, []);

  const primaryEvents: EventType[] = ['goal', 'shot', 'pass', 'tackle'];
  const secondaryEvents: EventType[] = ['foul', 'assist', 'save', 'corner', 'freeKick'];

  const renderEventButton = (eventType: EventType, isPrimary: boolean) => {
    const buttonSizeClasses = isPrimary
      ? "w-[80px] h-[80px] md:w-[90px] md:h-[90px]"
      : "w-[65px] h-[65px] md:w-[70px] md:h-[70px]";
    
    const iconSize = isPrimary ? "lg" : "md";

    return (
      <div key={eventType} className="flex flex-col items-center justify-start gap-2">
        <button
          onClick={() => handleEventRecord(eventType)}
          aria-label={`Record ${eventType} event`}
          className={`flex items-center justify-center rounded-full border bg-gradient-to-br from-white/70 to-slate-100/70 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-70 ${buttonSizeClasses} ${isPrimary ? 'border-blue-200/80 hover:border-blue-400' : 'border-slate-200/80 hover:border-slate-400'}`}
        >
          <EnhancedEventTypeIcon
            eventType={eventType}
            size={iconSize}
          />
        </button>
        <span className="font-semibold text-slate-700 text-center leading-tight text-xs sm:text-sm max-w-[90px] break-words">
          {eventType.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white/60 backdrop-blur-xl border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden transition-all">
        <CardHeader className="pb-4 border-b border-slate-200/80 bg-slate-50/30">
          <CardTitle className="text-xl font-bold text-slate-800 text-center">Event Piano</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-8">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider">Primary Actions</h3>
            <div className="flex justify-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
                {primaryEvents.map(et => renderEventButton(et, true))}
              </div>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wider">Secondary Actions</h3>
            <div className="flex justify-center">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-5">
                {secondaryEvents.map(et => renderEventButton(et, false))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {recentEvents.length > 0 && (
        <Card className="bg-white/60 backdrop-blur-xl border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden transition-all animate-fade-in">
          <CardHeader className="pb-3 border-b border-slate-200/80 bg-slate-50/30">
            <CardTitle className="text-lg text-slate-800">Recent Events (Click to Cancel)</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 justify-start">
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
