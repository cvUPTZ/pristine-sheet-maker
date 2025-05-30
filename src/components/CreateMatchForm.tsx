import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2 } from 'lucide-react';
import { Player } from '@/types';

// ... keep existing code (interfaces and event types constants)

interface TrackerUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'tracker' | 'teacher';
}

interface TrackerAssignment {
  tracker_user_id: string;
  assigned_event_types: string[];
  player_ids: number[];
}

const CreateMatchForm: React.FC<CreateMatchFormProps> = ({ onMatchCreated }) => {
  // ... keep existing code (state variables)

  const [trackers, setTrackers] = useState<TrackerUser[]>([]);
  const [trackerAssignments, setTrackerAssignments] = useState<TrackerAssignment[]>([]);

  // ... keep existing code (other useEffect and functions until fetchTrackers)

  const fetchTrackers = async () => {
    try {
      // Use user_profiles_with_role view to get tracker users
      const { data, error } = await supabase
        .from('user_profiles_with_role')
        .select('id, email, full_name, role')
        .eq('role', 'tracker')
        .order('full_name');

      if (error) throw error;
      
      const validTrackers = (data || [])
        .filter(tracker => tracker.id && tracker.email && tracker.full_name)
        .map(tracker => ({
          id: tracker.id!,
          email: tracker.email!,
          full_name: tracker.full_name!,
          role: tracker.role as 'admin' | 'user' | 'tracker' | 'teacher'
        }));
      
      setTrackers(validTrackers);
    } catch (error: any) {
      console.error('Error fetching trackers:', error);
      toast({
        title: "Error",
        description: "Failed to load trackers",
        variant: "destructive",
      });
    }
  };

  // ... keep existing code (other functions until handleSubmit)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const matchData = {
        name: formData.name || `${formData.homeTeamName} vs ${formData.awayTeamName}`,
        description: formData.description,
        home_team_name: formData.homeTeamName,
        away_team_name: formData.awayTeamName,
        home_team_players: homeTeamPlayers,
        away_team_players: awayTeamPlayers,
        home_team_formation: formData.homeTeamFormation,
        away_team_formation: formData.awayTeamFormation,
        match_date: formData.matchDate,
        location: formData.location,
        venue: formData.venue,
        competition: formData.competition,
        match_type: formData.matchType,
        notes: formData.notes,
        status: 'draft'
      };

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (matchError) throw matchError;

      // Create tracker assignments if any
      if (trackerAssignments.length > 0) {
        const assignments = trackerAssignments.map(assignment => ({
          match_id: match.id,
          tracker_user_id: assignment.tracker_user_id,
          player_id: assignment.player_ids.length > 0 ? assignment.player_ids[0] : null,
          player_team_id: assignment.player_ids.length > 0 ? 
            (assignment.player_ids[0] <= homeTeamPlayers.length ? 'home' : 'away') : 'home',
          assigned_event_types: assignment.assigned_event_types
        }));

        const { error: assignmentError } = await supabase
          .from('match_tracker_assignments')
          .insert(assignments);

        if (assignmentError) throw assignmentError;

        // Send notifications to assigned trackers
        const { error: notificationError } = await supabase
          .rpc('notify_assigned_trackers', {
            p_match_id: match.id,
            p_tracker_assignments: trackerAssignments.map(assignment => ({
              tracker_user_id: assignment.tracker_user_id,
              assigned_event_types: assignment.assigned_event_types,
              player_ids: assignment.player_ids
            }))
          });

        if (notificationError) {
          console.error('Error sending notifications:', notificationError);
          // Don't fail the whole operation for notification errors
        }
      }

      toast({
        title: "Success",
        description: "Match created successfully!",
      });

      onMatchCreated(match);
    } catch (error: any) {
      console.error('Error creating match:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create match",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTrackerAssignment = () => {
    setTrackerAssignments([...trackerAssignments, {
      tracker_user_id: '',
      assigned_event_types: [],
      player_ids: []
    }]);
  };

  const removeTrackerAssignment = (index: number) => {
    setTrackerAssignments(trackerAssignments.filter((_, i) => i !== index));
  };

  const updateTrackerAssignment = (index: number, field: keyof TrackerAssignment, value: any) => {
    const updated = [...trackerAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setTrackerAssignments(updated);
  };

  // ... keep existing code (render method with all existing tabs)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ... keep existing code (header and tabs) */}
      
      <Tabs defaultValue="basic" className="w-full">
        {/* ... keep existing code (TabsList and basic/teams tabs) */}
        
        <TabsContent value="trackers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracker Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trackerAssignments.map((assignment, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Assignment {index + 1}</h4>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTrackerAssignment(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`tracker-${index}`}>Tracker</Label>
                      <Select
                        value={assignment.tracker_user_id}
                        onValueChange={(value) => updateTrackerAssignment(index, 'tracker_user_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tracker" />
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
                      <Label>Event Types</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {EVENT_TYPES.map((eventType) => (
                          <div key={eventType.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`event-${index}-${eventType.key}`}
                              checked={assignment.assigned_event_types.includes(eventType.key)}
                              onCheckedChange={(checked) => {
                                const newEventTypes = checked
                                  ? [...assignment.assigned_event_types, eventType.key]
                                  : assignment.assigned_event_types.filter(et => et !== eventType.key);
                                updateTrackerAssignment(index, 'assigned_event_types', newEventTypes);
                              }}
                            />
                            <Label htmlFor={`event-${index}-${eventType.key}`} className="text-sm">
                              {eventType.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Assigned Players</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="text-sm text-muted-foreground">Home Team</Label>
                        <div className="space-y-1">
                          {homeTeamPlayers.map((player, playerIndex) => (
                            <div key={player.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`home-player-${index}-${player.id}`}
                                checked={assignment.player_ids.includes(player.id)}
                                onCheckedChange={(checked) => {
                                  const newPlayerIds = checked
                                    ? [...assignment.player_ids, player.id]
                                    : assignment.player_ids.filter(id => id !== player.id);
                                  updateTrackerAssignment(index, 'player_ids', newPlayerIds);
                                }}
                              />
                              <Label htmlFor={`home-player-${index}-${player.id}`} className="text-sm">
                                #{player.number} {player.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">Away Team</Label>
                        <div className="space-y-1">
                          {awayTeamPlayers.map((player, playerIndex) => (
                            <div key={player.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`away-player-${index}-${player.id}`}
                                checked={assignment.player_ids.includes(player.id)}
                                onCheckedChange={(checked) => {
                                  const newPlayerIds = checked
                                    ? [...assignment.player_ids, player.id]
                                    : assignment.player_ids.filter(id => id !== player.id);
                                  updateTrackerAssignment(index, 'player_ids', newPlayerIds);
                                }}
                              />
                              <Label htmlFor={`away-player-${index}-${player.id}`} className="text-sm">
                                #{player.number} {player.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button type="button" onClick={addTrackerAssignment} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Tracker Assignment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ... keep existing code (form actions) */}
      </Tabs>
    </div>
  );
};

export default CreateMatchForm;
