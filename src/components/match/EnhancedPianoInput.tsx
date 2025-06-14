
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
    const buttonClasses = isPrimary
      ? "min-h-[90px] md:min-h-[100px] text-sm sm:text-base from-blue-50/80 to-indigo-100/80 border-blue-200/80 hover:border-blue-400"
      : "min-h-[70px] md:min-h-[80px] text-xs sm:text-sm from-slate-50/80 to-slate-100/80 border-slate-200/80 hover:border-slate-400";
    
    const iconSize = isPrimary ? "lg" : "sm";

    return (
      <button
        key={eventType}
        onClick={() => handleEventRecord(eventType)}
        className={`flex flex-col items-center justify-center p-2 rounded-2xl border bg-gradient-to-br bg-white/60 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-70 ${buttonClasses}`}
      >
        <EnhancedEventTypeIcon
          eventType={eventType}
          size={iconSize}
        />
        <span className="font-semibold text-slate-700 mt-2 text-center leading-tight">
          {eventType.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white/60 backdrop-blur-xl border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden transition-all">
        <CardHeader className="pb-4 border-b border-slate-200/80 bg-slate-50/30">
          <CardTitle className="text-xl font-bold text-slate-800">Event Piano</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">Primary Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {primaryEvents.map(et => renderEventButton(et, true))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">Secondary Actions</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
              {secondaryEvents.map(et => renderEventButton(et, false))}
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
