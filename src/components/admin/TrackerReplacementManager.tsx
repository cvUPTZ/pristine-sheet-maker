
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, UserCheck, RefreshCw, Bell } from 'lucide-react';

interface TrackerReplacementManagerProps {
  matchId: string;
  onReplacementUpdate?: () => void;
}

interface TrackerAssignment {
  id: string;
  tracker_user_id: string;
  tracker_email: string | null;
  player_id: number | null;
  assigned_event_types: string[] | null;
  replacement_tracker_id?: string | null;
  replacement_tracker_email?: string | null;
}

interface TrackerProfile {
  id: string;
  full_name: string;
  email: string;
}

const TrackerReplacementManager: React.FC<TrackerReplacementManagerProps> = ({
  matchId,
  onReplacementUpdate
}) => {
  const [assignments, setAssignments] = useState<TrackerAssignment[]>([]);
  const [availableTrackers, setAvailableTrackers] = useState<TrackerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignments();
    fetchAvailableTrackers();
  }, [matchId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: TrackerAssignment[] = (data || [])
        .filter(item => item.id && item.tracker_user_id)
        .map(item => ({
          id: item.id!,
          tracker_user_id: item.tracker_user_id!,
          tracker_email: item.tracker_email,
          player_id: item.player_id,
          assigned_event_types: item.assigned_event_types,
          replacement_tracker_id: item.replacement_tracker_id,
          replacement_tracker_email: item.replacement_tracker_email
        }));
      
      setAssignments(transformedData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch tracker assignments');
    }
  };

  const fetchAvailableTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'tracker');

      if (error) throw error;
      
      // Transform the data to handle nullable fields
      const transformedData: TrackerProfile[] = (data || [])
        .filter(tracker => tracker.full_name && tracker.email)
        .map(tracker => ({
          id: tracker.id,
          full_name: tracker.full_name!,
          email: tracker.email!
        }));
      
      setAvailableTrackers(transformedData);
    } catch (error) {
      console.error('Error fetching trackers:', error);
    }
  };

  const assignReplacement = async (assignmentId: string, replacementId: string) => {
    setLoading(true);
    try {
      // Use raw SQL to update the replacement tracker due to type constraints
      const { error } = await supabase.rpc('assign_replacement_tracker', {
        assignment_id: assignmentId,
        replacement_id: replacementId
      });

      if (error) throw error;

      // Get the assignment details for notifications
      const assignment = assignments.find(a => a.id === assignmentId);
      const replacement = availableTrackers.find(t => t.id === replacementId);

      if (assignment && replacement) {
        // Notify primary tracker
        await supabase.from('notifications').insert({
          user_id: assignment.tracker_user_id,
          match_id: matchId,
          type: 'replacement_assigned',
          title: 'Backup Tracker Assigned',
          message: `${replacement.full_name} has been assigned as your backup tracker for this match.`,
          notification_data: {
            replacement_tracker_id: replacementId,
            replacement_tracker_name: replacement.full_name
          }
        });

        // Notify replacement tracker
        await supabase.from('notifications').insert({
          user_id: replacementId,
          match_id: matchId,
          type: 'backup_assignment',
          title: 'Backup Tracker Assignment',
          message: `You have been assigned as a backup tracker for match ${matchId}. You may be called upon if the primary tracker becomes unavailable.`,
          notification_data: {
            primary_tracker_id: assignment.tracker_user_id,
            primary_tracker_email: assignment.tracker_email,
            event_types: assignment.assigned_event_types
          }
        });
      }

      toast.success('Replacement tracker assigned and notified');
      await fetchAssignments();
      onReplacementUpdate?.();
    } catch (error) {
      console.error('Error assigning replacement:', error);
      toast.error('Failed to assign replacement tracker');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableReplacements = (currentTrackerId: string) => {
    const assignedTrackerIds = new Set(assignments.map(a => a.tracker_user_id));
    return availableTrackers.filter(tracker => 
      tracker.id !== currentTrackerId && 
      !assignedTrackerIds.has(tracker.id)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Tracker Replacement Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.map((assignment) => {
          const availableReplacements = getAvailableReplacements(assignment.tracker_user_id);
          const hasReplacement = assignment.replacement_tracker_id;

          return (
            <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{assignment.tracker_email || 'Unknown Email'}</div>
                  <div className="text-sm text-gray-600">
                    Player #{assignment.player_id || 'N/A'} | Events: {assignment.assigned_event_types?.join(', ') || 'None'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasReplacement ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <UserCheck className="h-4 w-4" />
                      <span className="text-sm">Has backup</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">No backup</span>
                    </div>
                  )}
                </div>
              </div>

              {hasReplacement && (
                <div className="bg-green-50 p-2 rounded border-l-4 border-green-500">
                  <div className="text-sm font-medium text-green-800">
                    Backup: {assignment.replacement_tracker_email || 'Unknown'}
                  </div>
                </div>
              )}

              {!hasReplacement && (
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => assignReplacement(assignment.id, value)}
                    disabled={loading || availableReplacements.length === 0}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select backup tracker" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableReplacements.map((tracker) => (
                        <SelectItem key={tracker.id} value={tracker.id}>
                          {tracker.full_name} ({tracker.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {availableReplacements.length === 0 && !hasReplacement && (
                <div className="text-sm text-gray-500 italic">
                  No available trackers for backup assignment
                </div>
              )}
            </div>
          );
        })}

        {assignments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tracker assignments found</p>
            <p className="text-sm">Assign trackers to players first</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerReplacementManager;
