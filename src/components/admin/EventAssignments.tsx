import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EventType = 'pass' | 'shot' | 'tackle' | 'foul' | 'corner' | 'offside' | 'goal' | 'assist' | 'yellowCard' | 'redCard' | 'substitution';

interface UserEventAssignment {
  id: string;
  user_id: string;
  event_type: EventType;
  created_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

const EventAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<UserEventAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<EventType>('pass');

  const eventTypes: EventType[] = [
    'pass', 'shot', 'tackle', 'foul', 'corner', 'offside', 
    'goal', 'assist', 'yellowCard', 'redCard', 'substitution'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch assignments with user data
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_event_assignments')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch users for the dropdown
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .in('role', ['tracker', 'admin']);

      if (usersError) throw usersError;

      setAssignments(assignmentsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch event assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedUser || !selectedEventType) {
      toast.error('Please select both user and event type');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_event_assignments')
        .insert([{
          user_id: selectedUser,
          event_type: selectedEventType
        }]);

      if (error) throw error;

      toast.success('Event assignment created successfully');
      setSelectedUser('');
      setSelectedEventType('pass');
      await fetchData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create event assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase
        .from('user_event_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Event assignment deleted successfully');
      await fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete event assignment');
    }
  };

  const getEventTypeColor = (eventType: EventType) => {
    const colors: Record<EventType, string> = {
      pass: 'bg-blue-100 text-blue-800',
      shot: 'bg-orange-100 text-orange-800',
      tackle: 'bg-purple-100 text-purple-800',
      foul: 'bg-red-100 text-red-800',
      corner: 'bg-green-100 text-green-800',
      offside: 'bg-yellow-100 text-yellow-800',
      goal: 'bg-emerald-100 text-emerald-800',
      assist: 'bg-cyan-100 text-cyan-800',
      yellowCard: 'bg-amber-100 text-amber-800',
      redCard: 'bg-red-200 text-red-900',
      substitution: 'bg-indigo-100 text-indigo-800'
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-4">Loading event assignments...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          Event Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
        {/* Create New Assignment */}
        <Card>
          <CardHeader className="p-4">
            <h3 className="text-md font-semibold">Create New Assignment</h3>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">User</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Event Type</label>
                <Select value={selectedEventType} onValueChange={(value: EventType) => setSelectedEventType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(eventType => (
                      <SelectItem key={eventType} value={eventType}>
                        {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleCreateAssignment} className="w-full">
                  Create Assignment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Assignments */}
        <div>
          <h3 className="text-md font-semibold mb-4">Current Assignments</h3>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No event assignments found</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium">
                          {assignment.profiles?.full_name || assignment.profiles?.email || 'Unknown User'}
                        </span>
                        <Badge className={getEventTypeColor(assignment.event_type)}>
                          {assignment.event_type.charAt(0).toUpperCase() + assignment.event_type.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Assigned: {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventAssignments;
