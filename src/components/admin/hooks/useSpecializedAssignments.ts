
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrackerUser, Assignment } from '../types/TrackerAssignmentTypes';

export const useSpecializedAssignments = (matchId: string) => {
  const [trackerUsers, setTrackerUsers] = useState<TrackerUser[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrackerUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker')
        .order('full_name');

      if (error) throw error;

      const typedUsers: TrackerUser[] = (data || [])
        .filter(user => user.id)
        .map(user => ({
          id: user.id!,
          email: user.email || 'No email',
          full_name: user.full_name || 'No name',
        }));

      setTrackerUsers(typedUsers);
    } catch (error: any) {
      console.error('Error fetching tracker users:', error);
      toast.error('Failed to fetch tracker users');
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments')
        .select(`
          id,
          tracker_user_id,
          player_id,
          player_team_id,
          assigned_event_types,
          profiles!tracker_user_id (
            full_name,
            email
          )
        `)
        .eq('match_id', matchId)
        .not('player_id', 'is', null);

      if (error) throw error;

      const transformedAssignments: Assignment[] = (data || [])
        .filter(item => item.id && item.tracker_user_id && item.player_id)
        .map(item => ({
          id: item.id!,
          tracker_user_id: item.tracker_user_id!,
          player_id: item.player_id!,
          player_team_id: (item.player_team_id as 'home' | 'away') || 'home',
          assigned_event_types: item.assigned_event_types || [],
          tracker_name: (item.profiles as any)?.full_name || undefined,
          tracker_email: (item.profiles as any)?.email || undefined,
        }));

      setAssignments(transformedAssignments);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    }
  };

  const createAssignment = async (
    trackerId: string,
    playerId: number,
    teamId: 'home' | 'away',
    eventType: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .insert([{
          match_id: matchId,
          tracker_user_id: trackerId,
          player_id: playerId,
          player_team_id: teamId,
          assigned_event_types: [eventType]
        }]);

      if (error) throw error;

      toast.success('Specialized assignment created successfully');
      await fetchAssignments();
      return true;
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Assignment deleted successfully');
      await fetchAssignments();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  useEffect(() => {
    fetchTrackerUsers();
    fetchAssignments();
  }, [matchId]);

  return {
    trackerUsers,
    assignments,
    loading,
    createAssignment,
    deleteAssignment,
    refetch: fetchAssignments
  };
};
