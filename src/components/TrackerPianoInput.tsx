
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useRealtimeEventSync } from '@/hooks/useRealtimeEventSync';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrackerPianoInputProps {
  matchId: string;
}

const eventTypes = [
  { key: 'pass', label: 'Pass', color: 'bg-blue-500' },
  { key: 'shot', label: 'Shot', color: 'bg-red-500' },
  { key: 'goal', label: 'Goal', color: 'bg-green-500' },
  { key: 'foul', label: 'Foul', color: 'bg-yellow-500' },
  { key: 'card', label: 'Card', color: 'bg-orange-500' },
  { key: 'corner', label: 'Corner', color: 'bg-purple-500' },
  { key: 'offside', label: 'Offside', color: 'bg-pink-500' },
  { key: 'save', label: 'Save', color: 'bg-cyan-500' }
];

const TrackerPianoInput: React.FC<TrackerPianoInputProps> = ({ matchId }) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<any[]>([]);
  const isMobile = useIsMobile();

  // Real-time event synchronization
  const { 
    isConnected, 
    connectedTrackers, 
    broadcastTrackerActivity, 
    updateTrackerStatus 
  } = useRealtimeEventSync({
    matchId,
    onEventReceived: (event) => {
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      if (event.created_by !== user?.id) {
        toast.info(`Event recorded by another tracker: ${event.event_type}`);
      }
    }
  });

  useEffect(() => {
    fetchTrackerAssignments();
    fetchRecentEvents();
  }, [matchId, user?.id]);

  useEffect(() => {
    // Update status when component mounts
    if (isConnected) {
      updateTrackerStatus('online');
    }

    return () => {
      // Update status when component unmounts
      if (isConnected) {
        updateTrackerStatus('offline');
      }
    };
  }, [isConnected, updateTrackerStatus]);

  const fetchTrackerAssignments = async () => {
    if (!user?.id || !matchId) return;

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId)
        .eq('tracker_user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const eventTypes = Array.from(new Set(data.flatMap(assignment => assignment.assigned_event_types || [])));
        setAssignedEventTypes(eventTypes);
        
        const players = data.map(assignment => ({
          id: assignment.player_id,
          team: assignment.player_team_id
        }));
        setAssignedPlayers(players);
      }
    } catch (error) {
      console.error('Error fetching tracker assignments:', error);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentEvents(data || []);
    } catch (error) {
      console.error('Error fetching recent events:', error);
    }
  };

  const handleEventRecord = async (eventType: string) => {
    if (!user?.id || !matchId) {
      toast.error('User not authenticated or match ID missing');
      return;
    }

    // Update tracker status to tracking
    updateTrackerStatus('tracking');
    broadcastTrackerActivity(eventType);

    try {
      const timestampInSeconds = Math.floor(Date.now() / 1000);

      const eventData = {
        match_id: matchId,
        event_type: eventType,
        timestamp: timestampInSeconds,
        player_id: null,
        team: null,
        coordinates: null,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('match_events')
        .insert([eventData])
        .select();

      if (error) throw error;

      toast.success(`${eventType} recorded successfully`);
      
      // Return to online status after a short delay
      setTimeout(() => {
        updateTrackerStatus('online');
      }, 2000);

    } catch (error: any) {
      console.error('Error recording event:', error);
      toast.error(`Failed to record event: ${error.message}`);
      updateTrackerStatus('online');
    }
  };

  const getEventColor = (eventType: string) => {
    const event = eventTypes.find(e => e.key === eventType);
    return event?.color || 'bg-gray-500';
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Connection Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {connectedTrackers.length} tracker{connectedTrackers.length !== 1 ? 's' : ''} online
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Event Recording Buttons */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base">Quick Event Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className={`grid gap-2 ${
            isMobile 
              ? 'grid-cols-2' 
              : 'grid-cols-3 sm:grid-cols-4'
          }`}>
            {eventTypes.map((event) => {
              const isAssigned = assignedEventTypes.length === 0 || assignedEventTypes.includes(event.key);
              
              return (
                <Button
                  key={event.key}
                  onClick={() => handleEventRecord(event.key)}
                  disabled={!isAssigned || !isConnected}
                  className={`${event.color} hover:opacity-80 text-white ${
                    isMobile ? 'text-xs py-2 px-2' : 'text-sm py-2 px-3'
                  } ${!isAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
                  size={isMobile ? "sm" : "default"}
                >
                  {event.label}
                </Button>
              );
            })}
          </div>

          {assignedEventTypes.length > 0 && (
            <div className="text-xs text-gray-600">
              Assigned events: {assignedEventTypes.join(', ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">
                No events recorded yet
              </p>
            ) : (
              recentEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${getEventColor(event.event_type)}`} />
                    <div>
                      <div className="font-medium text-xs sm:text-sm capitalize">
                        {event.event_type}
                      </div>
                      <div className="text-xs text-gray-600">
                        {event.created_by === user?.id ? 'You' : 'Other tracker'} • {
                          new Date(event.created_at).toLocaleTimeString()
                        }
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={event.created_by === user?.id ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {event.created_by === user?.id ? 'Mine' : 'Other'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerPianoInput;
