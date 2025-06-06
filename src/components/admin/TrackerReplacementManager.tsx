
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackerAssignment {
  id: string;
  tracker_user_id: string;
  assigned_player_id: number | null;
  assigned_event_types: string[] | null;
  tracker_name?: string;
  tracker_email?: string;
  player_name?: string;
}

interface TrackerReplacementManagerProps {
  matchId: string;
  onReplacementUpdate?: () => Promise<void>;
}

const TrackerReplacementManager: React.FC<TrackerReplacementManagerProps> = ({ 
  matchId, 
  onReplacementUpdate 
}) => {
  const [assignments, setAssignments] = useState<TrackerAssignment[]>([]);
  const [availableReplacements, setAvailableReplacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (matchId) {
      fetchAssignments();
      fetchAvailableReplacements();
    }
  }, [matchId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select(`
          id,
          tracker_user_id,
          assigned_player_id,
          assigned_event_types
        `)
        .eq('match_id', matchId);

      if (error) {
        console.error('Error fetching assignments:', error);
        toast.error('Failed to load assignments');
        return;
      }

      // Get tracker details
      const trackerIds = data?.map(assignment => assignment.tracker_user_id) || [];
      
      if (trackerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', trackerIds);

        if (profilesError) {
          console.error('Error fetching tracker profiles:', profilesError);
        }

        // For now, we'll skip player details since the players table doesn't exist
        // This would be where you'd fetch player information if the table existed
        const assignmentsWithDetails = data?.map(assignment => ({
          ...assignment,
          tracker_name: profiles?.find(p => p.id === assignment.tracker_user_id)?.full_name || 'Unknown',
          tracker_email: profiles?.find(p => p.id === assignment.tracker_user_id)?.email || 'Unknown',
          player_name: assignment.assigned_player_id 
            ? `Player ID: ${assignment.assigned_player_id}`
            : 'No player assigned'
        })) || [];

        setAssignments(assignmentsWithDetails);
      } else {
        setAssignments(data || []);
      }
    } catch (error) {
      console.error('Error in fetchAssignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableReplacements = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'tracker');

      if (error) {
        console.error('Error fetching available replacements:', error);
        return;
      }

      setAvailableReplacements(data || []);
    } catch (error) {
      console.error('Error in fetchAvailableReplacements:', error);
    }
  };

  const handleAssignReplacement = async (assignmentId: string, replacementTrackerId: string) => {
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .update({
          tracker_user_id: replacementTrackerId
        })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error assigning replacement:', error);
        toast.error('Failed to assign replacement tracker');
        return;
      }

      toast.success('Replacement tracker assigned successfully');
      setSelectedReplacement(prev => {
        const updated = { ...prev };
        delete updated[assignmentId];
        return updated;
      });
      fetchAssignments();
      
      // Call the callback if provided
      if (onReplacementUpdate) {
        await onReplacementUpdate();
      }
    } catch (error) {
      console.error('Error in handleAssignReplacement:', error);
      toast.error('Failed to assign replacement tracker');
    }
  };

  const handleRemoveReplacement = async (assignmentId: string) => {
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
      fetchAssignments();
      
      // Call the callback if provided
      if (onReplacementUpdate) {
        await onReplacementUpdate();
      }
    } catch (error) {
      console.error('Error in handleRemoveReplacement:', error);
      toast.error('Failed to remove assignment');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-orange-600" />
          Tracker Replacement Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No tracker assignments found
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{assignment.tracker_name}</h4>
                    <p className="text-sm text-gray-600">{assignment.tracker_email}</p>
                    {assignment.player_name && (
                      <p className="text-sm text-blue-600">Tracking: {assignment.player_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveReplacement(assignment.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {assignment.assigned_event_types && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {assignment.assigned_event_types.map((eventType) => (
                      <Badge key={eventType} variant="secondary">
                        {eventType.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedReplacement[assignment.id] || ''}
                    onValueChange={(value) => 
                      setSelectedReplacement(prev => ({ ...prev, [assignment.id]: value }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select replacement tracker" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableReplacements
                        .filter(tracker => tracker.id !== assignment.tracker_user_id)
                        .map((tracker) => (
                          <SelectItem key={tracker.id} value={tracker.id}>
                            {tracker.full_name} ({tracker.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleAssignReplacement(assignment.id, selectedReplacement[assignment.id])}
                    disabled={!selectedReplacement[assignment.id]}
                    size="sm"
                  >
                    Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerReplacementManager;
