import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SpecializedTrackerAssignment from '@/components/admin/SpecializedTrackerAssignment';

interface TrackerUser {
  id: string;
  email: string;
  full_name: string;
}

interface Assignment {
  id: string;
  tracker_user_id: string;
  match_id: string;
  player_team_id?: 'home' | 'away';
  player_id?: number;
  assigned_event_types?: string[];
  tracker_name?: string;
  tracker_email?: string;
}

interface TrackerAssignmentProps {
  matchId: string;
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
}

const TrackerAssignment: React.FC<TrackerAssignmentProps> = ({
  matchId,
  homeTeamPlayers,
  awayTeamPlayers
}) => {
  const [trackerUsers, setTrackerUsers] = useState<TrackerUser[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrackerUsers();
    fetchAssignments();
  }, [matchId]);

  const fetchTrackerUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker')
        .order('full_name');

      if (error) throw error;

      setTrackerUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching tracker users:', error);
      toast.error('Failed to fetch tracker users');
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId)
        .is('player_id', null);

      if (error) throw error;

      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedTracker) {
      toast.error('Please select a tracker to assign');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .insert([{
          match_id: matchId,
          tracker_user_id: selectedTracker,
        }]);

      if (error) throw error;

      toast.success('Tracker assigned successfully');
      setSelectedTracker('');
      await fetchAssignments();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Assignment</TabsTrigger>
          <TabsTrigger value="specialized">Specialized Assignment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                General Tracker Assignment
              </CardTitle>
              <p className="text-sm text-gray-600">
                Assign trackers to cover multiple event types for teams or players
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tracker</label>
                  <Select value={selectedTracker} onValueChange={setSelectedTracker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tracker" />
                    </SelectTrigger>
                    <SelectContent>
                      {trackerUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateAssignment} disabled={loading || !selectedTracker} className="w-full">
                    Assign
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {assignments.map((assignment: any) => (
                  <div key={assignment.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{assignment.tracker_name || 'Unknown Tracker'}</p>
                      <p className="text-xs text-gray-500">{assignment.tracker_email}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteAssignment(assignment.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="specialized" className="mt-6">
          <SpecializedTrackerAssignment
            matchId={matchId}
            homeTeamPlayers={homeTeamPlayers}
            awayTeamPlayers={awayTeamPlayers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrackerAssignment;
