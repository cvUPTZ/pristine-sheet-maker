
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Users, Plus, Edit, Trash2, Key, Target } from 'lucide-react';
import CreateMatchForm from '@/components/admin/CreateMatchForm';

interface User {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
}

interface EventType {
  id: number;
  event_type: string;
  user_id: string | null;
}

const Admin: React.FC = () => {
  const { user, userRole, refreshUserSession } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user', fullName: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchEventTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('user_event_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching event types:', error);
      toast.error('Failed to load event types');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEventTypes();
    fetchMatches();
  }, []);

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        app_metadata: { role: newUser.role },
        user_metadata: { full_name: newUser.fullName }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role: newUser.role,
            full_name: newUser.fullName || null
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      toast.success('User created successfully');
      setNewUser({ email: '', password: '', role: 'user', fullName: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
  };

  const cancelEditUser = () => {
    setEditingUser(null);
  };

  const updateUser = async () => {
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: editingUser.role,
          full_name: editingUser.full_name
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        editingUser.id,
        { app_metadata: { role: editingUser.role } }
      );

      if (metadataError) throw metadataError;

      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
      
      if (user?.id === editingUser.id) {
        await refreshUserSession();
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Failed to update user: ${error.message}`);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  const assignEventType = async (userId: string, eventType: string) => {
    try {
      const { data: existingAssignment, error: checkError } = await supabase
        .from('user_event_assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', eventType)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingAssignment) {
        toast.info('This event type is already assigned to the user');
        return;
      }

      const { error } = await supabase
        .from('user_event_assignments')
        .insert({ user_id: userId, event_type: eventType });

      if (error) throw error;

      toast.success('Event type assigned successfully');
      fetchEventTypes();
    } catch (error: any) {
      console.error('Error assigning event type:', error);
      toast.error(`Failed to assign event type: ${error.message}`);
    }
  };

  const removeEventType = async (assignmentId: number) => {
    try {
      const { error } = await supabase
        .from('user_event_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Event type assignment removed');
      fetchEventTypes();
    } catch (error: any) {
      console.error('Error removing event type:', error);
      toast.error(`Failed to remove event type: ${error.message}`);
    }
  };

  if (!user || userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="matches">Match Management</TabsTrigger>
          <TabsTrigger value="assignments">Event Assignments</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="tracker">Tracker</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="mt-4" 
                  onClick={createUser} 
                  disabled={isCreatingUser}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 border rounded-lg">
                      {editingUser && editingUser.id === user.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`edit-fullName-${user.id}`}>Full Name</Label>
                              <Input
                                id={`edit-fullName-${user.id}`}
                                value={editingUser.full_name || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-role-${user.id}`}>Role</Label>
                              <Select
                                value={editingUser.role}
                                onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                              >
                                <SelectTrigger id={`edit-role-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="tracker">Tracker</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button onClick={updateUser} disabled={isUpdatingUser}>
                              {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button variant="outline" onClick={cancelEditUser}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.full_name || 'No name'}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="mt-1">
                              <Badge variant={
                                user.role === 'admin' ? 'destructive' : 
                                user.role === 'tracker' ? 'secondary' : 'outline'
                              }>
                                {user.role}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => startEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteUser(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matches">
          <div className="space-y-6">
            <CreateMatchForm onMatchCreated={fetchMatches} />
            
            <Card>
              <CardHeader>
                <CardTitle>Existing Matches</CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    No matches created yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <div key={match.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{match.name || 'Unnamed Match'}</h3>
                            <p className="text-sm text-muted-foreground">
                              {match.home_team_name} vs {match.away_team_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={match.status === 'published' ? 'secondary' : 'outline'}>
                                {match.status}
                              </Badge>
                              {match.match_date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(match.match_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Event Type Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {users
                  .filter(user => user.role === 'tracker')
                  .map(tracker => (
                    <div key={tracker.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">{tracker.full_name || 'No name'}</h3>
                          <p className="text-sm text-muted-foreground">{tracker.email}</p>
                        </div>
                        <Badge variant="secondary">Tracker</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Assigned Event Types</Label>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {eventTypes
                            .filter(et => et.user_id === tracker.id)
                            .map(assignment => (
                              <Badge key={assignment.id} className="flex items-center gap-1 px-3 py-1">
                                {assignment.event_type}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={() => removeEventType(assignment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          {eventTypes.filter(et => et.user_id === tracker.id).length === 0 && (
                            <span className="text-sm text-muted-foreground">No event types assigned</span>
                          )}
                        </div>
                        
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label htmlFor={`new-event-type-${tracker.id}`}>Add Event Type</Label>
                            <Select
                              onValueChange={(value) => assignEventType(tracker.id, value)}
                            >
                              <SelectTrigger id={`new-event-type-${tracker.id}`}>
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pass">Pass</SelectItem>
                                <SelectItem value="shot">Shot</SelectItem>
                                <SelectItem value="goal">Goal</SelectItem>
                                <SelectItem value="foul">Foul</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="corner">Corner</SelectItem>
                                <SelectItem value="offside">Offside</SelectItem>
                                <SelectItem value="tackle">Tackle</SelectItem>
                                <SelectItem value="interception">Interception</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {users.filter(user => user.role === 'tracker').length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trackers found</p>
                    <p className="text-sm">Create users with the tracker role to assign event types</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{users.length}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">
                    {users.filter(u => u.role === 'tracker').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Trackers</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{matches.length}</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={refreshUserSession}>
                    <Key className="h-4 w-4 mr-2" />
                    Refresh Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
