import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface UserEventAssignment {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const EventAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<UserEventAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState<{ userId: string; eventType: string }>({
    userId: '',
    eventType: ''
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const [assignmentsResponse, usersResponse] = await Promise.all([
        supabase
          .from('user_event_assignments')
          .select(`
            id,
            user_id,
            event_type,
            created_at,
            profiles:user_id (
              email,
              full_name
            )
          `),
        supabase
          .from('profiles')
          .select('id, email, full_name, role')
      ]);

      if (assignmentsResponse.error) throw assignmentsResponse.error;
      if (usersResponse.error) throw usersResponse.error;

      // Transform assignments data
      const transformedAssignments = (assignmentsResponse.data || []).map(assignment => ({
        id: String(assignment.id),
        user_id: assignment.user_id || '',
        event_type: assignment.event_type,
        created_at: assignment.created_at || new Date().toISOString(),
        profiles: assignment.profiles
      }));

      // Transform users data
      const transformedUsers = (usersResponse.data || [])
        .filter(user => user.email && user.full_name)
        .map(user => ({
          id: user.id,
          email: user.email!,
          full_name: user.full_name!,
          role: user.role
        }));

      setAssignments(transformedAssignments);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newEvent.userId || !newEvent.eventType) {
      toast.error('Please select a user and event type');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_event_assignments')
        .insert([{
          user_id: newEvent.userId,
          event_type: newEvent.eventType
        }]);

      if (error) throw error;

      await fetchAssignments();
      setShowCreateDialog(false);
      setNewEvent({ userId: '', eventType: '' });
      toast.success('Assignment created successfully');
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('user_event_assignments')
        .delete()
        .eq('id', parseInt(assignmentId));

      if (error) throw error;

      await fetchAssignments();
      toast.success('Assignment deleted successfully');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  if (loading) {
    return <div className="p-4">Loading assignments...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg sm:text-xl">Event Assignments</CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="user">User</Label>
                  <Select onValueChange={(value) => setNewEvent(prev => ({ ...prev, userId: value }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Input
                    id="eventType"
                    placeholder="Enter event type"
                    value={newEvent.eventType}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, eventType: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleCreateAssignment}>Create Assignment</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No event assignments found</p>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {assignment.event_type}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      {assignment.profiles?.full_name || 'Unknown User'} - {assignment.profiles?.email || 'No email'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created at: {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventAssignments;
