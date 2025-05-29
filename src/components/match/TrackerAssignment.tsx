
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { TrackerUser } from '@/types/matchForm';

interface TrackerAssignmentProps {
  matchId?: string;
  homeTeam: Team;
  awayTeam: Team;
  isEditMode?: boolean;
}

const EVENT_TYPES = [
  'pass', 'shot', 'foul', 'goal', 'save', 'offside', 'corner', 'substitution'
];

const TrackerAssignment: React.FC<TrackerAssignmentProps> = ({
  matchId,
  homeTeam,
  awayTeam,
  isEditMode = false
}) => {
  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrackers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-tracker-users');
      
      if (error) {
        console.error('Error fetching trackers:', error);
        toast.error('Failed to load trackers');
        return;
      }

      setTrackers(data || []);
    } catch (error) {
      console.error('Error fetching trackers:', error);
      toast.error('Failed to load trackers');
    }
  };

  const handleEventTypeChange = (eventType: string, checked: boolean) => {
    setSelectedEventTypes(prev => 
      checked 
        ? [...prev, eventType]
        : prev.filter(type => type !== eventType)
    );
  };

  const handlePlayerChange = (playerId: string, checked: boolean) => {
    setSelectedPlayers(prev => 
      checked 
        ? [...prev, playerId]
        : prev.filter(id => id !== playerId)
    );
  };

  const assignTracker = async () => {
    if (!selectedTracker || !matchId) {
      toast.error('Please select a tracker and ensure match is saved');
      return;
    }

    setLoading(true);
    try {
      // Save event type assignments
      for (const eventType of selectedEventTypes) {
        const { error: eventError } = await supabase
          .from('user_event_assignments')
          .upsert({
            user_id: selectedTracker,
            event_type: eventType
          });

        if (eventError) {
          console.error('Error saving event assignment:', eventError);
        }
      }

      // Save player assignments
      for (const playerId of selectedPlayers) {
        const { error: playerError } = await supabase
          .from('match_tracker_assignments')
          .upsert({
            match_id: matchId,
            tracker_user_id: selectedTracker,
            player_id: parseInt(playerId)
          });

        if (playerError) {
          console.error('Error saving player assignment:', playerError);
        }
      }

      toast.success('Tracker assigned successfully!');
      
      // Reset form
      setSelectedTracker('');
      setSelectedEventTypes([]);
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Error assigning tracker:', error);
      toast.error('Failed to assign tracker');
    } finally {
      setLoading(false);
    }
  };

  const allPlayers = [...homeTeam.players, ...awayTeam.players];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracker Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Select Tracker</Label>
          <Select value={selectedTracker} onValueChange={setSelectedTracker}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a tracker" />
            </SelectTrigger>
            <SelectContent>
              {trackers.map((tracker) => (
                <SelectItem key={tracker.id} value={tracker.id}>
                  {tracker.full_name} ({tracker.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Event Types</Label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((eventType) => (
              <div key={eventType} className="flex items-center space-x-2">
                <Checkbox
                  id={eventType}
                  checked={selectedEventTypes.includes(eventType)}
                  onCheckedChange={(checked) => 
                    handleEventTypeChange(eventType, checked as boolean)
                  }
                />
                <Label htmlFor={eventType} className="text-sm capitalize">
                  {eventType}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Assign Players</Label>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {allPlayers.map((player) => (
              <div key={player.id} className="flex items-center space-x-2">
                <Checkbox
                  id={player.id.toString()}
                  checked={selectedPlayers.includes(player.id.toString())}
                  onCheckedChange={(checked) => 
                    handlePlayerChange(player.id.toString(), checked as boolean)
                  }
                />
                <Label htmlFor={player.id.toString()} className="text-sm">
                  #{player.number} {player.name} ({player.id.toString().includes('home') ? homeTeam.name : awayTeam.name})
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={assignTracker} 
          disabled={loading || !selectedTracker || !matchId}
          className="w-full"
        >
          {loading ? 'Assigning...' : 'Assign Tracker'}
        </Button>

        {!matchId && (
          <p className="text-sm text-amber-600">
            Save the match first to enable tracker assignments
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerAssignment;
