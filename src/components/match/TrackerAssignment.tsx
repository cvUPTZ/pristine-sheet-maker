
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
  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrackers();
    if (matchId) {
      fetchExistingAssignments();
    }
  }, [matchId]);

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

  const fetchExistingAssignments = async () => {
    if (!matchId) return;

    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      setExistingAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
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

  const getPlayerTeam = (playerId: string) => {
    const homePlayer = homeTeam.players.find(p => p.id.toString() === playerId);
    if (homePlayer) return 'home';
    return 'away';
  };

  const assignTracker = async () => {
    if (!selectedTracker || !matchId) {
      toast.error('Please select a tracker and ensure match is saved');
      return;
    }

    if (selectedEventTypes.length === 0 && selectedPlayers.length === 0) {
      toast.error('Please select at least one event type or player');
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
          toast.error(`Failed to assign ${eventType} events`);
        }
      }

      // Save player assignments
      for (const playerId of selectedPlayers) {
        const playerTeam = getPlayerTeam(playerId);
        
        const { error: playerError } = await supabase
          .from('match_tracker_assignments')
          .upsert({
            match_id: matchId,
            tracker_user_id: selectedTracker,
            player_id: parseInt(playerId),
            player_team_id: playerTeam
          });

        if (playerError) {
          console.error('Error saving player assignment:', playerError);
          toast.error(`Failed to assign player ${playerId}`);
        }
      }

      toast.success('Tracker assigned successfully!');
      
      // Reset form and refresh assignments
      setSelectedTracker('');
      setSelectedEventTypes([]);
      setSelectedPlayers([]);
      fetchExistingAssignments();
    } catch (error) {
      console.error('Error assigning tracker:', error);
      toast.error('Failed to assign tracker');
    } finally {
      setLoading(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error removing assignment:', error);
        toast.error('Failed to remove assignment');
        return;
      }

      toast.success('Assignment removed successfully');
      fetchExistingAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const allPlayers = [...homeTeam.players, ...awayTeam.players];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Tracker</CardTitle>
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
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-2">
              <div className="text-xs font-medium text-gray-500 mb-2">Home Team: {homeTeam.name}</div>
              {homeTeam.players.map((player) => (
                <div key={`home-${player.id}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`home-${player.id}`}
                    checked={selectedPlayers.includes(player.id.toString())}
                    onCheckedChange={(checked) => 
                      handlePlayerChange(player.id.toString(), checked as boolean)
                    }
                  />
                  <Label htmlFor={`home-${player.id}`} className="text-sm">
                    #{player.number} {player.name}
                  </Label>
                </div>
              ))}
              
              <div className="text-xs font-medium text-gray-500 mb-2 mt-4">Away Team: {awayTeam.name}</div>
              {awayTeam.players.map((player) => (
                <div key={`away-${player.id}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`away-${player.id}`}
                    checked={selectedPlayers.includes(player.id.toString())}
                    onCheckedChange={(checked) => 
                      handlePlayerChange(player.id.toString(), checked as boolean)
                    }
                  />
                  <Label htmlFor={`away-${player.id}`} className="text-sm">
                    #{player.number} {player.name}
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

      {existingAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingAssignments.map((assignment) => {
                const tracker = trackers.find(t => t.id === assignment.tracker_user_id);
                const player = allPlayers.find(p => p.id === assignment.player_id);
                
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="text-sm">
                      <span className="font-medium">{tracker?.full_name || 'Unknown Tracker'}</span>
                      {player && (
                        <span className="text-gray-600 ml-2">
                          → #{player.number} {player.name} ({assignment.player_team_id})
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => removeAssignment(assignment.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackerAssignment;
