
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FootballPitch from '@/components/FootballPitch';
import MatchEventsTimeline from '@/components/match/MatchEventsTimeline';
import { PianoInput } from '@/components/match/PianoInput';
import { EventType } from '@/types/matchForm';
import { PlayerForPianoInput, AssignedPlayers } from '@/components/match/types';
import { MatchEvent } from '@/types/index';

interface MainTabContentV2Props {
  homeTeam: { name: string; formation: string; players: any[] };
  awayTeam: { name: string; formation: string; players: any[] };
  onEventRecord: (eventType: EventType, player?: PlayerForPianoInput, details?: Record<string, any>) => void;
  assignedEventTypes: EventType[] | null;
  assignedPlayers: AssignedPlayers | null;
  fullMatchRoster: AssignedPlayers | null;
}

const MainTabContentV2: React.FC<MainTabContentV2Props> = ({ 
  homeTeam,
  awayTeam,
  onEventRecord,
  assignedEventTypes,
  assignedPlayers,
  fullMatchRoster,
}) => {
  const { matchId } = useParams<{ matchId: string }>();
  const { toast } = useToast();
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!matchId) {
      console.warn("Match ID is missing.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error("Error fetching match events:", error);
        toast({
          title: "Error",
          description: "Failed to load match events.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const matchEvents = convertToMatchEvents(data);
        setEvents(matchEvents);
      }
    } catch (error: any) {
      console.error("Unexpected error fetching match events:", error);
      toast({
        title: "Unexpected Error",
        description: "Failed to load match events due to an unexpected error.",
        variant: "destructive",
      });
    }
  }, [matchId, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Convert database events to MatchEvent format
  const convertToMatchEvents = (dbEvents: any[]): MatchEvent[] => {
    return dbEvents.map(event => ({
      id: event.id,
      matchId: event.match_id,
      type: event.event_type,
      timestamp: event.timestamp,
      playerId: event.player_id ? String(event.player_id) : '',
      teamId: (event.team as 'home' | 'away') || 'home',
      coordinates: event.coordinates
    }));
  };

  const handleEventSelect = (event: MatchEvent) => {
    setSelectedEvent(event);
  };

  const handleEventUpdate = async (updatedEvent: MatchEvent) => {
    try {
      const { error } = await supabase
        .from('match_events')
        .update({
          event_type: updatedEvent.type,
          timestamp: updatedEvent.timestamp,
          player_id: updatedEvent.playerId,
          team: updatedEvent.teamId,
          coordinates: updatedEvent.coordinates,
        })
        .eq('id', updatedEvent.id);

      if (error) {
        console.error("Error updating match event:", error);
        toast({
          title: "Error",
          description: "Failed to update match event.",
          variant: "destructive",
        });
        return;
      }

      // Optimistically update the state
      setEvents(prevEvents =>
        prevEvents.map(event => (event.id === updatedEvent.id ? updatedEvent : event))
      );
      setSelectedEvent(updatedEvent);

      toast({
        title: "Success",
        description: "Match event updated successfully.",
      });
    } catch (error: any) {
      console.error("Unexpected error updating match event:", error);
      toast({
        title: "Unexpected Error",
        description: "Failed to update match event due to an unexpected error.",
        variant: "destructive",
      });
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('match_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error("Error deleting match event:", error);
        toast({
          title: "Error",
          description: "Failed to delete match event.",
          variant: "destructive",
        });
        return;
      }

      // Optimistically update the state
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      setSelectedEvent(null);

      toast({
        title: "Success",
        description: "Match event deleted successfully.",
      });
    } catch (error: any) {
      console.error("Unexpected error deleting match event:", error);
      toast({
        title: "Unexpected Error",
        description: "Failed to delete match event due to an unexpected error.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <PianoInput
              fullMatchRoster={fullMatchRoster}
              assignedEventTypes={assignedEventTypes}
              assignedPlayers={assignedPlayers}
              onEventRecord={onEventRecord}
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Match Details</h3>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600">Home Team:</div>
              <div className="font-medium">{homeTeam.name}</div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600">Away Team:</div>
              <div className="font-medium">{awayTeam.name}</div>
            </div>
            <Separator />
            <div className="mt-4">
              <Badge variant="outline">
                Events Recorded: {events.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <FootballPitch
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              ballTrackingPoints={[]}
              onPitchClick={() => { }}
              selectedPlayer={null}
              selectedTeam="home"
              onPlayerSelect={() => { }}
              events={events}
            />
          </CardContent>
        </Card>
        
        <MatchEventsTimeline 
          events={events}
          onEventSelect={handleEventSelect}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
        />
      </div>
    </div>
  );
};

export default MainTabContentV2;
