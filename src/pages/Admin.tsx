
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
import { Player } from '@/types'; // Import Player type

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
  name?: string; // Keep as optional as per existing definition
  home_team_name: string;
  away_team_name: string;
  status: string;
  match_date: string;
  created_at: string;
  home_team_players?: Player[]; // Added
  away_team_players?: Player[]; // Added
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

interface UIDisplayedPlayerTrackerAssignment {
  id: string; // Assignment ID from the assignment table
  matchId: string;
  matchName: string;
  playerId: number;
  playerName: string;
  playerTeamId: 'home' | 'away';
  playerTeamName: string;
  trackerUser_id: string;
  trackerName: string;
  created_at?: string;
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eventAssignments, setEventAssignments] = useState<EventAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // State for Player-Tracker Assignments
  const [playerTrackerAssignments, setPlayerTrackerAssignments] = useState<UIDisplayedPlayerTrackerAssignment[]>([]);
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false);
  const [selectedMatchIdForAssignment, setSelectedMatchIdForAssignment] = useState<string | null>(null);
  const [selectedPlayerForAssignment, setSelectedPlayerForAssignment] = useState<{ playerId: number; playerTeamId: 'home' | 'away'; } | null>(null);
  const [selectedTrackerIdForAssignment, setSelectedTrackerIdForAssignment] = useState<string | null>(null);

  // State for Create User Dialog
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'teacher' | 'user' | 'tracker'>('user');


  const handleCreatePlayerAssignment = async () => {
    if (!selectedMatchIdForAssignment || !selectedPlayerForAssignment || !selectedTrackerIdForAssignment) {
      toast.error('Please select a match, player, and tracker.');
      return;
    }

    try {
      const { data: newAssignmentData, error } = await supabase
        .from('match_tracker_assignments')
        .insert({
          match_id: selectedMatchIdForAssignment,
          tracker_user_id: selectedTrackerIdForAssignment,
          player_id: selectedPlayerForAssignment.playerId,
          player_team_id: selectedPlayerForAssignment.playerTeamId,
        })
        .select('id, match_id, tracker_user_id, player_id, player_team_id, created_at')
        .single();

      if (error || !newAssignmentData) {
        console.error('Error creating player assignment:', error);
        toast.error(`Failed to create assignment: ${error?.message || 'No data returned'}`);
        return;
      }

      // Augment the new assignment data for UI display
      const match = matches.find(m => m.id === newAssignmentData.match_id);
      const tracker = users.find(u => u.id === newAssignmentData.tracker_user_id);
      let playerName = 'Unknown Player';
      let playerTeamName = 'Unknown Team';

      if (match) {
        const playerList = newAssignmentData.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
        const player = Array.isArray(playerList) ? playerList.find(p => p.id === newAssignmentData.player_id) : undefined;
        if (player) {
          playerName = player.name;
        }
        playerTeamName = newAssignmentData.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
      }

      const newlyConstructedAssignment: UIDisplayedPlayerTrackerAssignment = {
        id: newAssignmentData.id.toString(),
        matchId: newAssignmentData.match_id,
        matchName: match?.name || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
        playerId: newAssignmentData.player_id,
        playerName: playerName,
        playerTeamId: newAssignmentData.player_team_id as 'home' | 'away',
        playerTeamName: playerTeamName,
        trackerUser_id: newAssignmentData.tracker_user_id,
        trackerName: tracker?.full_name || tracker?.email || 'Unknown Tracker',
        created_at: newAssignmentData.created_at,
      };

      setPlayerTrackerAssignments(prev => [newlyConstructedAssignment, ...prev]);
      toast.success('Player-tracker assignment created successfully.');
      setSelectedMatchIdForAssignment(null);
      setSelectedPlayerForAssignment(null);
      setSelectedTrackerIdForAssignment(null);
      setIsCreateAssignmentDialogOpen(false);

    } catch (e) {
      console.error('Exception while creating player assignment:', e);
      toast.error('An unexpected error occurred while creating the assignment.');
    }
  };

  const handleDeletePlayerAssignment = async (assignmentId: string) => {
    if (confirm('Are you sure you want to delete this player-tracker assignment?')) {
      try {
        const { error } = await supabase
          .from('match_tracker_assignments')
          .delete()
          .eq('id', assignmentId);

        if (error) {
          console.error('Error deleting player assignment:', error);
          toast.error(`Failed to delete assignment: ${error.message}`);
        } else {
          setPlayerTrackerAssignments(prev => prev.filter(a => a.id !== assignmentId));
          toast.success('Player-tracker assignment deleted successfully.');
        }
      } catch (e) {
        console.error('Exception while deleting player assignment:', e);
        toast.error('An unexpected error occurred while deleting the assignment.');
      }
    }
  };

  const fetchData = async () => {
    setLoading(true); // Set loading to true when fetching starts
    try {
      // Use the edge function to fetch users
        const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', { method: 'GET' });

        if (usersError) {
          console.error('Error fetching users:', usersError);
          toast.error(`Failed to fetch users: ${usersError.message || 'Unknown error'}`);
          setUsers([]); // Ensure users is an empty array on error
        } else if (Array.isArray(usersData)) {
          // Ensure proper typing for users
          const typedUsers: User[] = usersData.map((user: any) => ({
            id: user.id,
            // The get-users function seems to put full_name in the email field, this is likely a bug in the function itself.
            // For now, reflect what the function likely returns or use a placeholder if email is truly missing.
            email: user.email || user.full_name || 'No email provided',
            full_name: user.full_name || '',
            role: (user.role as 'admin' | 'teacher' | 'user' | 'tracker') || 'user',
            created_at: user.created_at,
            updated_at: user.updated_at,
          }));
          setUsers(typedUsers);
        } else {
          // Handle cases where usersData is not an array (e.g., null, or an error object from the function not caught by usersError)
          console.error('Received unexpected data structure for users:', usersData);
          toast.error('Failed to process user data: unexpected format.');
          setUsers([]);
        }

        // Fetch matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('id, name, home_team_name, away_team_name, status, match_date, created_at, home_team_players, away_team_players') // Updated select
          .order('created_at', { ascending: false });

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
          toast.error('Failed to fetch matches');
          setMatches([]); // Ensure matches is an empty array on error
        } else {
          setMatches(matchesData || []);
        }
        
        // Fetch conceptual user_event_assignments (this part of the code was from the problem description for EventAssignment, not PlayerTrackerAssignment)
        // Keeping it as is, as the task is to add new logic for PlayerTrackerAssignment
        const { data: eventAssignmentsData, error: eventAssignmentsError } = await supabase
          .from('user_event_assignments') // This remains for the existing EventAssignment type
          .select(`
            id,
            user_id,
            event_type,
            created_at
          `);

        if (eventAssignmentsError) {
          console.error('Error fetching event assignments:', eventAssignmentsError);
          toast.error('Failed to fetch event assignments');
        } else {
          // Ensure proper typing for event assignments
          const typedEventAssignments: EventAssignment[] = (eventAssignmentsData || []).map((assignment: any) => ({
            id: assignment.id.toString(),
            user_id: assignment.user_id,
            event_type: assignment.event_type,
            created_at: assignment.created_at,
          }));
          setEventAssignments(typedEventAssignments);
        }

        // Fetch Player-Tracker Assignments (Part 2)
        const { data: rawAssignments, error: playerTrackerAssignmentsError } = await supabase
          .from('match_tracker_assignments')
          .select('id, match_id, tracker_user_id, player_id, player_team_id, created_at');

        if (playerTrackerAssignmentsError) {
          console.error('Error fetching player-tracker assignments:', playerTrackerAssignmentsError);
          toast.error('Failed to fetch player-tracker assignments');
          setPlayerTrackerAssignments([]);
        } else if (rawAssignments) {
          // Process and Augment Assignments (Part 3)
          // Need to ensure matches and users are populated before this step.
          // The current structure of fetchData fetches users and matches before this.
          const processedAssignments = rawAssignments.map(assignment => {
            const match = (matchesData || []).find(m => m.id === assignment.match_id); // Use matchesData directly as setMatches is async
            const tracker = (usersData || []).find(u => u.id === assignment.tracker_user_id); // Use usersData directly
            
            let playerName = 'Unknown Player';
            let playerTeamName = 'Unknown Team';

            if (match) {
              const playerList = assignment.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
              const player = Array.isArray(playerList) ? playerList.find(p => p.id === assignment.player_id) : null;
              if (player) {
                playerName = player.name;
              }
              playerTeamName = assignment.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
            }

            return {
              id: assignment.id.toString(),
              matchId: assignment.match_id,
              matchName: match?.name || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
              playerId: assignment.player_id,
              playerName: playerName,
              playerTeamId: assignment.player_team_id as 'home' | 'away',
              playerTeamName: playerTeamName,
              trackerUser_id: assignment.tracker_user_id,
              trackerName: tracker?.full_name || tracker?.email || 'Unknown Tracker',
              created_at: assignment.created_at,
            };
          }).filter(Boolean); 
          setPlayerTrackerAssignments(processedAssignments as UIDisplayedPlayerTrackerAssignment[]);
        } else {
          setPlayerTrackerAssignments([]); // No error, but no assignments found
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch admin data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

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
      }
      
      else {
        toast.success('User created successfully!');
        await fetchData(); // Re-fetch users list
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
        <TabsList className="grid w-full grid-cols-6"> {/* Adjusted to grid-cols-6 */}
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
            Event Assignments {/* Renamed for clarity */}
          </TabsTrigger>
          <TabsTrigger value="player-assignments" className="flex items-center gap-2"> {/* New Tab */}
            <UserCheck className="h-4 w-4" /> {/* Reusing UserCheck, or use UsersRound/ClipboardUser if imported */}
            Player Assignments
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
              <CardTitle>User Event Type Assignments</CardTitle> {/* Clarified Title */}
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>User assignments for specific event types (e.g., tracking all shots for a team).</TableCaption> {/* Clarified Caption */}
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

        <TabsContent value="player-assignments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Player-Tracker Assignments</CardTitle>
              <Button onClick={() => setIsCreateAssignmentDialogOpen(true)}>Create New Assignment</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>
                  {playerTrackerAssignments.length === 0 
                    ? "No player-tracker assignments found." 
                    : "A list of players assigned to specific trackers for matches."}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Player's Team</TableHead>
                    <TableHead>Tracker</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerTrackerAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.matchName}</TableCell>
                      <TableCell>{assignment.playerName}</TableCell>
                      <TableCell>{assignment.playerTeamName}</TableCell>
                      <TableCell>{assignment.trackerName}</TableCell>
                      <TableCell>
                        {assignment.created_at ? new Date(assignment.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeletePlayerAssignment(assignment.id)}
                        >
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
        <DialogContent className="sm:max-w-[425px]">
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

      {/* Create Player-Tracker Assignment Dialog */}
      <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Player-Tracker Assignment</DialogTitle>
            <DialogDescription>
              Assign a player from a specific match to a tracker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="assign-match">Select Match</Label>
              <Select
                value={selectedMatchIdForAssignment || ''}
                onValueChange={(value) => { setSelectedMatchIdForAssignment(value); setSelectedPlayerForAssignment(null); }}
              >
                <SelectTrigger id="assign-match">
                  <SelectValue placeholder="Select a match" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assign-player">Select Player</Label>
              <Select
                value={selectedPlayerForAssignment ? `${selectedPlayerForAssignment.playerId}:${selectedPlayerForAssignment.playerTeamId}` : ''}
                onValueChange={(value) => {
                  if (value) {
                    const [playerIdStr, playerTeamId] = value.split(':');
                    setSelectedPlayerForAssignment({ playerId: parseInt(playerIdStr), playerTeamId: playerTeamId as 'home' | 'away' });
                  } else {
                    setSelectedPlayerForAssignment(null);
                  }
                }}
                disabled={!selectedMatchIdForAssignment}
              >
                <SelectTrigger id="assign-player">
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {selectedMatchIdForAssignment && (() => {
                    const currentSelectedMatch = matches.find(m => m.id === selectedMatchIdForAssignment);
                    if (!currentSelectedMatch) return null;
                    const players: React.ReactNode[] = [];
                    if (Array.isArray(currentSelectedMatch.home_team_players)) {
                      currentSelectedMatch.home_team_players.forEach(player => {
                        players.push(
                          <SelectItem key={`home-${player.id}`} value={`${player.id}:home`}>
                            {player.name} ({currentSelectedMatch.home_team_name} - Home)
                          </SelectItem>
                        );
                      });
                    }
                    if (Array.isArray(currentSelectedMatch.away_team_players)) {
                      currentSelectedMatch.away_team_players.forEach(player => {
                        players.push(
                          <SelectItem key={`away-${player.id}`} value={`${player.id}:away`}>
                            {player.name} ({currentSelectedMatch.away_team_name} - Away)
                          </SelectItem>
                        );
                      });
                    }
                    return players.length > 0 ? players : <SelectItem value="" disabled>No players found for this match</SelectItem>;
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assign-tracker">Select Tracker</Label>
              <Select
                value={selectedTrackerIdForAssignment || ''}
                onValueChange={(value) => setSelectedTrackerIdForAssignment(value)}
              >
                <SelectTrigger id="assign-tracker">
                  <SelectValue placeholder="Select a tracker" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(user => user.role === 'tracker').map((tracker) => (
                    <SelectItem key={tracker.id} value={tracker.id}>
                      {tracker.full_name || tracker.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAssignmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePlayerAssignment}>Create Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
