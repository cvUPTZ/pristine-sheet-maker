
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, Calendar, UserCheck, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'user' | 'tracker';
  created_at: string;
  updated_at: string;
}

interface Match {
  id: string;
  name: string;
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string;
  created_at: string;
}

interface EventAssignment {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eventAssignments, setEventAssignments] = useState<EventAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // State for Create User Dialog
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'teacher' | 'user' | 'tracker'>('user');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use the edge function to fetch users
        const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', { method: 'GET' });

        if (usersError) {
          console.error('Error fetching users:', usersError);
          toast.error('Failed to fetch users');
        } else if (usersData) {
          // Ensure proper typing for users
          const typedUsers: User[] = usersData.map((user: any) => ({
            id: user.id,
            email: user.email || user.full_name || 'No email',
            full_name: user.full_name || '',
            role: (user.role as 'admin' | 'teacher' | 'user' | 'tracker') || 'user',
            created_at: user.created_at,
            updated_at: user.updated_at,
          }));
          setUsers(typedUsers);
        }

        // Fetch matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('id, name, home_team_name, away_team_name, status, match_date, created_at')
          .order('created_at', { ascending: false });

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
          toast.error('Failed to fetch matches');
        } else {
          setMatches(matchesData || []);
        }

        // Fetch event assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('user_event_assignments')
          .select(`
            id,
            user_id,
            event_type,
            created_at
          `);

        if (assignmentsError) {
          console.error('Error fetching event assignments:', assignmentsError);
          toast.error('Failed to fetch event assignments');
        } else {
          // Ensure proper typing for event assignments
          const typedAssignments: EventAssignment[] = (assignmentsData || []).map((assignment: any) => ({
            id: assignment.id.toString(),
            user_id: assignment.user_id,
            event_type: assignment.event_type,
            created_at: assignment.created_at,
          }));
          setEventAssignments(typedAssignments);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Please fill in all required fields: Full Name, Email, and Password.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      if (error) {
        console.error('Error creating user:', error);
        toast.error(`Failed to create user: ${error.message}`);
      } else if (data.error) {
        console.error('Error creating user (from function data):', data.error);
        toast.error(`Failed to create user: ${data.error}`);
      } else {
        toast.success('User created successfully!');
        // Re-fetch users list
        const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', { method: 'GET' });
        if (usersData && !usersError) {
          const typedUsers: User[] = usersData.map((user: any) => ({
            id: user.id,
            email: user.email || user.full_name || 'No email',
            full_name: user.full_name || '',
            role: (user.role as 'admin' | 'teacher' | 'user' | 'tracker') || 'user',
            created_at: user.created_at,
            updated_at: user.updated_at,
          }));
          setUsers(typedUsers);
        }
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
        setIsCreateUserDialogOpen(false);
      }
    } catch (invokeError) {
      console.error('Error invoking create-user function:', invokeError);
      toast.error('An unexpected error occurred while creating the user.');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'teacher' | 'user' | 'tracker') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole });

      if (error) {
        console.error('Failed to update role:', error);
        toast.error('Failed to update user role');
      } else {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ));
        toast.success('User role updated successfully');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('Failed to delete user:', error);
          toast.error('Failed to delete user');
        } else {
          setUsers(users.filter(user => user.id !== userId));
          toast.success('User deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (confirm('Are you sure you want to delete this match?')) {
      try {
        const { error } = await supabase
          .from('matches')
          .delete()
          .eq('id', matchId);

        if (error) {
          console.error('Failed to delete match:', error);
          toast.error('Failed to delete match');
        } else {
          setMatches(matches.filter(match => match.id !== matchId));
          toast.success('Match deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting match:', error);
        toast.error('Failed to delete match');
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading admin data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Matches
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <Button onClick={() => setIsCreateUserDialogOpen(true)}>Create New User</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of registered users.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id.slice(0, 8)}...</TableCell>
                      <TableCell>{user.full_name || 'No name'}</TableCell>
                      <TableCell>
                        <Select onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'teacher' | 'user' | 'tracker')}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={user.role} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="tracker">Tracker</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Match Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of matches.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.name || 'Unnamed Match'}</TableCell>
                      <TableCell>{match.home_team_name} vs {match.away_team_name}</TableCell>
                      <TableCell>
                        <Badge variant={match.status === 'live' ? 'default' : 'secondary'}>
                          {match.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{match.match_date ? new Date(match.match_date).toLocaleDateString() : 'No date'}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteMatch(match.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Type Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>User event type assignments.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>{assignment.event_type}</TableCell>
                      <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm">
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Audit functionality coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input id="app-name" defaultValue="Match Analytics" />
                </div>
                <div>
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new user account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Full Name
              </Label>
              <Input id="name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input id="password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as 'admin' | 'teacher' | 'user' | 'tracker')}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="tracker">Tracker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
