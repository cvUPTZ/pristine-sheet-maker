import React, { useState, useEffect, useCallback } from 'react';
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
import { Player, EventType } from '@/types'; // Import Player & EventType type
import CreateMatchForm from '@/components/admin/CreateMatchForm'; // Import CreateMatchForm

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
  name?: string;
  description?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string; // Added for edit form
  away_team_formation?: string; // Added for edit form
  status: string;
  match_date: string;
  created_at: string;
  home_team_players?: Player[];
  away_team_players?: Player[];
}

interface UIDisplayedEventAssignment {
  id: string;
  user_id: string;
  userNameToDisplay: string;
  event_type: string;
  created_at: string;
}

interface UIDisplayedPlayerTrackerAssignment {
  id: string;
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

const availableEventTypes: EventType[] = [
  'pass', 'shot', 'tackle', 'foul', 'corner', 'offside', 'goal',
  'assist', 'yellowCard', 'redCard', 'substitution', 'card',
  'penalty', 'free-kick', 'goal-kick', 'throw-in', 'interception'
];

// Helper function to filter items with invalid IDs
const filterValidItems = <T extends { id: string }>(items: T[], itemName: string): T[] => {
  return items.filter(item => {
    if (!item.id || item.id === "") {
      console.warn(`Filtered out ${itemName} with invalid ID:`, item);
      return false;
    }
    return true;
  });
};


const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [eventAssignments, setEventAssignments] = useState<UIDisplayedEventAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  const [playerTrackerAssignments, setPlayerTrackerAssignments] = useState<UIDisplayedPlayerTrackerAssignment[]>([]);
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false);
  const [selectedMatchIdForAssignment, setSelectedMatchIdForAssignment] = useState<string | null>(null);
  const [selectedPlayerForAssignment, setSelectedPlayerForAssignment] = useState<{ playerId: number; playerTeamId: 'home' | 'away'; } | null>(null);
  const [selectedTrackerIdForAssignment, setSelectedTrackerIdForAssignment] = useState<string | null>(null);

  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'teacher' | 'user' | 'tracker'>('user');

  const [isCreateMatchDialogOpen, setIsCreateMatchDialogOpen] = useState(false);
  
  const [isEditMatchDialogOpen, setIsEditMatchDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const [isCreateEventAssignmentDialogOpen, setIsCreateEventAssignmentDialogOpen] = useState(false);
  const [selectedUserIdForEventAssignment, setSelectedUserIdForEventAssignment] = useState<string | null>(null);
  const [selectedEventTypeForAssignment, setSelectedEventTypeForAssignment] = useState<EventType | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let fetchedUsers: User[] = [];
    let fetchedMatches: Match[] = [];

    try {
      const { data: usersData, error: usersError } = await supabase.functions.invoke('get-users', { method: 'GET' });
      if (usersError) throw usersError;
      if (Array.isArray(usersData)) {
        fetchedUsers = usersData.map((user: any) => ({
          id: user.id,
          email: user.email || user.full_name || 'No email provided',
          full_name: user.full_name || '',
          role: (user.role as 'admin' | 'teacher' | 'user' | 'tracker') || 'user',
          created_at: user.created_at,
          updated_at: user.updated_at,
        }));
        setUsers(fetchedUsers);
      } else {
        console.error('Received unexpected data structure for users:', usersData);
        toast.error('Failed to process user data: unexpected format.');
        setUsers([]);
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('id, name, description, home_team_name, away_team_name, status, match_date, created_at, home_team_players, away_team_players')
        .order('created_at', { ascending: false });
      if (matchesError) throw matchesError;
      fetchedMatches = matchesData || [];
      setMatches(fetchedMatches);
      
      const { data: eventAssignmentsData, error: eventAssignmentsError } = await supabase
        .from('user_event_assignments')
        .select(`id, user_id, event_type, created_at`);
      if (eventAssignmentsError) throw eventAssignmentsError;
      if (eventAssignmentsData) {
        const augmentedEventAssignments = eventAssignmentsData.map((assignment: any) => {
          const user = fetchedUsers.find(u => u.id === assignment.user_id);
          return {
            id: assignment.id.toString(),
            user_id: assignment.user_id,
            userNameToDisplay: user?.full_name || user?.email || assignment.user_id,
            event_type: assignment.event_type,
            created_at: assignment.created_at,
          };
        });
        setEventAssignments(augmentedEventAssignments as UIDisplayedEventAssignment[]);
      } else {
        setEventAssignments([]);
      }

      const { data: rawAssignments, error: playerTrackerAssignmentsError } = await supabase
        .from('match_tracker_assignments')
        .select('id, match_id, tracker_user_id, player_id, player_team_id, created_at');
      if (playerTrackerAssignmentsError) throw playerTrackerAssignmentsError;
      if (rawAssignments) {
        const processedAssignments = rawAssignments.map(assignment => {
          const match = fetchedMatches.find(m => m.id === assignment.match_id);
          const tracker = fetchedUsers.find(u => u.id === assignment.tracker_user_id);
          let playerName = 'Unknown Player';
          let playerTeamName = 'Unknown Team';
          if (match) {
            const playerList = assignment.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
            const player = Array.isArray(playerList) ? playerList.find(p => p.id === assignment.player_id) : null;
            if (player) playerName = player.name;
            playerTeamName = assignment.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
          }
          return {
            id: assignment.id.toString(),
            matchId: assignment.match_id,
            matchName: match?.description || match?.name || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
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
        setPlayerTrackerAssignments([]);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to fetch admin data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []); 

  const resetCreateEventAssignmentForm = () => {
    setSelectedUserIdForEventAssignment(null);
    setSelectedEventTypeForAssignment(null);
  };

  const handleCreateEventAssignment = async () => {
    if (!selectedUserIdForEventAssignment || !selectedEventTypeForAssignment) {
      toast.error('Please select a user and an event type.');
      return;
    }
    try {
      const { data: existingAssignment, error: checkError } = await supabase
        .from('user_event_assignments')
        .select('id')
        .eq('user_id', selectedUserIdForEventAssignment)
        .eq('event_type', selectedEventTypeForAssignment)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existingAssignment) {
        toast.error('This user is already assigned this event type.');
        return;
      }
      const { data: newAssignmentData, error: insertError } = await supabase
        .from('user_event_assignments')
        .insert({ user_id: selectedUserIdForEventAssignment, event_type: selectedEventTypeForAssignment })
        .select('id, user_id, event_type, created_at')
        .single();
      if (insertError || !newAssignmentData) throw insertError || new Error("No data returned from assignment creation");
      const user = users.find(u => u.id === newAssignmentData.user_id);
      const augmentedNewAssignment: UIDisplayedEventAssignment = {
        id: newAssignmentData.id.toString(),
        user_id: newAssignmentData.user_id,
        userNameToDisplay: user?.full_name || user?.email || newAssignmentData.user_id,
        event_type: newAssignmentData.event_type,
        created_at: newAssignmentData.created_at,
      };
      setEventAssignments(prev => [augmentedNewAssignment, ...prev]);
      resetCreateEventAssignmentForm();
      setIsCreateEventAssignmentDialogOpen(false);
      toast.success('Event assignment created successfully.');
    } catch (e: any) {
      console.error('Error creating event assignment:', e);
      toast.error(`Failed to create assignment: ${e.message}`);
    }
  };

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
      if (error || !newAssignmentData) throw error || new Error("No data returned from player assignment creation");
      const match = matches.find(m => m.id === newAssignmentData.match_id);
      const tracker = users.find(u => u.id === newAssignmentData.tracker_user_id);
      let playerName = 'Unknown Player';
      let playerTeamName = 'Unknown Team';
      if (match) {
        const playerList = newAssignmentData.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
        const player = Array.isArray(playerList) ? playerList.find(p => p.id === newAssignmentData.player_id) : undefined;
        if (player) playerName = player.name;
        playerTeamName = newAssignmentData.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
      }
      const newlyConstructedAssignment: UIDisplayedPlayerTrackerAssignment = {
        id: newAssignmentData.id.toString(),
        matchId: newAssignmentData.match_id,
        matchName: match?.description || match?.name || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
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
    } catch (e: any) {
      console.error('Error creating player assignment:', e);
      toast.error(`Failed to create assignment: ${e.message}`);
    }
  };

  const handleRemoveEventAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this event assignment?')) return;
    try {
      const { error } = await supabase.from('user_event_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      setEventAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
      toast.success('Event assignment removed successfully.');
    } catch (e: any) {
      console.error('Error removing event assignment:', e);
      toast.error(`Failed to remove assignment: ${e.message}`);
    }
  };

  // MODIFIED: handleUpdateMatch focuses on the update and error handling for the update itself.
  // It will re-throw the error so CreateMatchForm knows if it failed.
  const handleUpdateMatch = async (values: any, matchId?: string) => {
    if (!matchId) {
      const errorMsg = "Match ID is missing. Cannot update.";
      toast.error(errorMsg);
      throw new Error(errorMsg); // Throw error to prevent onSuccess in form
    }
    const updatePayload = {
      home_team_name: values.homeTeam,
      away_team_name: values.awayTeam,
      home_team_formation: values.homeFormation, // Added from form values
      away_team_formation: values.awayFormation, // Added from form values
      home_team_players: values.home_team_players, // Added from form values (passed through by CreateMatchForm)
      away_team_players: values.away_team_players, // Added from form values (passed through by CreateMatchForm)
      match_date: values.matchDate || null,
      status: values.status,
      description: values.description,
    };
    try {
      const { error } = await supabase.from('matches').update(updatePayload).eq('id', matchId);
      if (error) throw error; // This error will be caught by the catch block below
      toast.success('Match updated successfully!');
      // DO NOT call fetchData() or setIsEditMatchDialogOpen(false) or setEditingMatch(null) here.
      // This will be handled by handleEditMatchSuccess, called by CreateMatchForm's onSuccess.
    } catch (e: any) {
      console.error('Error updating match:', e);
      toast.error(`Failed to update match: ${e.message}`);
      throw e; // IMPORTANT: Re-throw the error so CreateMatchForm knows the submission failed
               // and can avoid calling its own onSuccess prop.
    }
  };

  const handleDeletePlayerAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this player-tracker assignment?')) return;
    try {
      const { error } = await supabase.from('match_tracker_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      setPlayerTrackerAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Player-tracker assignment deleted successfully.');
    } catch (e: any) {
      console.error('Error deleting player assignment:', e);
      toast.error(`Failed to delete assignment: ${e.message}`);
    }
  };

  const handleCreateMatchSuccess = useCallback(() => {
    setIsCreateMatchDialogOpen(false);
    // Attempt to call fetchData and log success or failure of the call itself
    try {
      console.log('Attempting to call fetchData from handleCreateMatchSuccess...');
      fetchData();
      console.log('fetchData called successfully from handleCreateMatchSuccess.');
    } catch (e) {
      console.error('Error calling fetchData within handleCreateMatchSuccess:', e);
    }
  }, [fetchData, setIsCreateMatchDialogOpen]);

  // NO CHANGE NEEDED HERE (from the problem description): handleEditMatchSuccess already does what's needed after a successful update.
  const handleEditMatchSuccess = useCallback(() => {
    setIsEditMatchDialogOpen(false);
    setEditingMatch(null);
    try {
      console.log('Attempting to call fetchData from handleEditMatchSuccess...');
      fetchData();
      console.log('fetchData called successfully from handleEditMatchSuccess.');
    } catch (e) {
      console.error('Error calling fetchData within handleEditMatchSuccess:', e);
    }
  }, [fetchData, setIsEditMatchDialogOpen, setEditingMatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Please fill in all required fields: Full Name, Email, and Password.');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        method: 'POST', body: JSON.stringify({ fullName: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole }),
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success('User created successfully!');
      await fetchData();
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole('user');
      setIsCreateUserDialogOpen(false);
    } catch (e: any) {
      console.error('Error creating user:', e);
      toast.error(`Failed to create user: ${e.message}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'teacher' | 'user' | 'tracker') => {
    try {
      const { error } = await supabase
        .from('profiles') 
        .update({ role: newRole })
        .eq('id', userId); 
  
      if (error) {
        const { error: roleTableError } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: newRole }, { onConflict: 'user_id' }); 

        if (roleTableError) {
            console.error('Failed to update role in both profiles and user_roles:', error, roleTableError);
            toast.error('Failed to update user role: ' + roleTableError.message);
            return;
        }
      }
      
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      toast.success('User role updated successfully. Refresh if change not visible.');
    } catch (e: any) {
      console.error('Error updating role:', e);
      toast.error('Failed to update user role: ' + e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This might be irreversible.')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(users.filter(user => user.id !== userId));
      toast.success('User deleted successfully from profiles. Auth user may still exist.');
    } catch (e: any) {
      console.error('Error deleting user:', e);
      toast.error('Failed to delete user: ' + e.message);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    try {
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;
      setMatches(matches.filter(match => match.id !== matchId));
      toast.success('Match deleted successfully');
    } catch (e: any) {
      console.error('Error deleting match:', e);
      toast.error('Failed to delete match: ' + e.message);
    }
  };

  const validMatchesForSelection = React.useMemo(() => filterValidItems(matches, 'match'), [matches]);
  const validUsersForSelection = React.useMemo(() => filterValidItems(users, 'user'), [users]);
  const validTrackersForSelection = React.useMemo(() => filterValidItems(users.filter(u => u.role === 'tracker'), 'tracker'), [users]);


  if (loading) {
    return <div className="container mx-auto p-6 flex items-center justify-center h-64 text-lg">Loading admin data...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Matches</TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Event Assignments</TabsTrigger>
          <TabsTrigger value="player-assignments" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Player Assignments</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Audit</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />Settings</TabsTrigger>
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
                <TableHeader><TableRow>
                    <TableHead className="w-[100px]">ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {users.map((user) => ( 
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id ? user.id.slice(0, 8) : 'N/A'}...</TableCell>
                      <TableCell>{user.full_name || 'No name'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select value={user.role || ''} onValueChange={(value) => handleRoleChange(user.id, value as any)}>
                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem><SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="user">User</SelectItem><SelectItem value="tracker">Tracker</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>Delete</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Match Management</CardTitle>
              <Button onClick={() => setIsCreateMatchDialogOpen(true)}>Create New Match</Button>
            </CardHeader>
            <CardContent><Table>
                <TableCaption>A list of matches.</TableCaption>
                <TableHeader><TableRow>
                    <TableHead>Name / Description</TableHead><TableHead>Teams</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.description || match.name || 'Unnamed Match'}</TableCell>
                      <TableCell>{match.home_team_name} vs {match.away_team_name}</TableCell>
                      <TableCell><Badge variant={match.status === 'live' ? 'default' : 'secondary'}>{match.status}</Badge></TableCell>
                      <TableCell>{match.match_date ? new Date(match.match_date).toLocaleDateString() : 'No date'}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingMatch(match); setIsEditMatchDialogOpen(true); }}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteMatch(match.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Event Type Assignments</CardTitle>
              <Button onClick={() => { setIsCreateEventAssignmentDialogOpen(true); resetCreateEventAssignmentForm(); }}>Assign Event Type to User</Button>
            </CardHeader>
            <CardContent><Table>
                <TableCaption>User assignments for specific event types.</TableCaption>
                <TableHeader><TableRow>
                    <TableHead>User</TableHead><TableHead>Event Type</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {eventAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.userNameToDisplay}</TableCell><TableCell>{assignment.event_type}</TableCell>
                      <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Button variant="destructive" size="sm" onClick={() => handleRemoveEventAssignment(assignment.id)}>Remove</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="player-assignments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Player-Tracker Assignments</CardTitle>
              <Button onClick={() => setIsCreateAssignmentDialogOpen(true)}>Create New Assignment</Button>
            </CardHeader>
            <CardContent><Table>
                <TableCaption>{playerTrackerAssignments.length === 0 ? "No player-tracker assignments found." : "A list of players assigned to specific trackers for matches."}</TableCaption>
                <TableHeader><TableRow>
                    <TableHead>Match</TableHead><TableHead>Player</TableHead><TableHead>Player's Team</TableHead><TableHead>Tracker</TableHead><TableHead>Assigned At</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {playerTrackerAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.matchName}</TableCell><TableCell>{assignment.playerName}</TableCell>
                      <TableCell>{assignment.playerTeamName}</TableCell><TableCell>{assignment.trackerName}</TableCell>
                      <TableCell>{assignment.created_at ? new Date(assignment.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell><Button variant="destructive" size="sm" onClick={() => handleDeletePlayerAssignment(assignment.id)}>Delete</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table></CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audit" className="mt-6"> {/* Audit Tab */} </TabsContent>
        <TabsContent value="settings" className="mt-6"> {/* Settings Tab */} </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Create New User</DialogTitle><DialogDescription>Fill in the details.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Full Name</Label><Input id="name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="password" className="text-right">Password</Label><Input id="password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="role" className="text-right">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as any)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="user">User</SelectItem><SelectItem value="tracker">Tracker</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleCreateUser}>Create User</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Player-Tracker Assignment Dialog */}
      <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Create Player-Tracker Assignment</DialogTitle><DialogDescription>Assign a player to a tracker.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label htmlFor="assign-match">Select Match</Label>
              <Select value={selectedMatchIdForAssignment || ''} onValueChange={(value) => { setSelectedMatchIdForAssignment(value); setSelectedPlayerForAssignment(null); }}>
                <SelectTrigger id="assign-match"><SelectValue placeholder="Select a match" /></SelectTrigger>
                <SelectContent>
                  {validMatchesForSelection.length > 0 ? validMatchesForSelection.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.description || match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                    </SelectItem>
                  )) : <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">No valid matches available.</div>}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="assign-player">Select Player</Label>
              <Select value={selectedPlayerForAssignment ? `${selectedPlayerForAssignment.playerId}:${selectedPlayerForAssignment.playerTeamId}` : ''}
                onValueChange={(value) => { if (value) { const [id, team] = value.split(':'); setSelectedPlayerForAssignment({ playerId: parseInt(id), playerTeamId: team as any }); } else { setSelectedPlayerForAssignment(null); }}}
                disabled={!selectedMatchIdForAssignment}>
                <SelectTrigger id="assign-player"><SelectValue placeholder="Select a player" /></SelectTrigger>
                <SelectContent>
                  {selectedMatchIdForAssignment && (() => {
                    const currentMatch = matches.find(m => m.id === selectedMatchIdForAssignment);
                    if (!currentMatch) return <div className="px-2 py-1.5 text-sm text-muted-foreground">Match not found.</div>;
                    const players: React.ReactNode[] = [];
                    (Array.isArray(currentMatch.home_team_players) ? currentMatch.home_team_players : []).forEach(p => {
                      if (p && p.id !== undefined && p.id !== null && p.name) players.push(<SelectItem key={`home-${p.id}`} value={`${p.id}:home`}>{p.name} ({currentMatch.home_team_name} - Home)</SelectItem>);
                    });
                    (Array.isArray(currentMatch.away_team_players) ? currentMatch.away_team_players : []).forEach(p => {
                      if (p && p.id !== undefined && p.id !== null && p.name) players.push(<SelectItem key={`away-${p.id}`} value={`${p.id}:away`}>{p.name} ({currentMatch.away_team_name} - Away)</SelectItem>);
                    });
                    return players.length ? players : <div className="px-2 py-1.5 text-sm text-muted-foreground">No players in this match.</div>;
                  })()}
                  {!selectedMatchIdForAssignment && <div className="px-2 py-1.5 text-sm text-muted-foreground">Select a match first.</div>}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="assign-tracker">Select Tracker</Label>
              <Select value={selectedTrackerIdForAssignment || ''} onValueChange={setSelectedTrackerIdForAssignment}>
                <SelectTrigger id="assign-tracker"><SelectValue placeholder="Select a tracker" /></SelectTrigger>
                <SelectContent>
                  {validTrackersForSelection.length > 0 ? validTrackersForSelection.map((tracker) => (
                    <SelectItem key={tracker.id} value={tracker.id}>{tracker.full_name || tracker.email}</SelectItem>
                  )) : <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">No valid trackers available.</div>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateAssignmentDialogOpen(false)}>Cancel</Button><Button onClick={handleCreatePlayerAssignment}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Match Dialog */}
      <Dialog open={isCreateMatchDialogOpen} onOpenChange={setIsCreateMatchDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create New Match</DialogTitle><DialogDescription>Fill details.</DialogDescription></DialogHeader>
          <CreateMatchForm onSuccess={handleCreateMatchSuccess} />
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={isEditMatchDialogOpen} onOpenChange={setIsEditMatchDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit Match</DialogTitle><DialogDescription>Update details.</DialogDescription></DialogHeader>
          {editingMatch && <CreateMatchForm 
                            isEditMode 
                            initialData={{
                              id: editingMatch.id, 
                              homeTeam: editingMatch.home_team_name, 
                              awayTeam: editingMatch.away_team_name,
                              home_team_formation: editingMatch.home_team_formation,
                              away_team_formation: editingMatch.away_team_formation,
                              home_team_players: editingMatch.home_team_players,
                              away_team_players: editingMatch.away_team_players,
                              matchDate: editingMatch.match_date || '', 
                              status: editingMatch.status as any, 
                              description: editingMatch.description || editingMatch.name || ''
                            }} 
                            onSubmitOverride={handleUpdateMatch} 
                            onSuccess={handleEditMatchSuccess} 
                          />}
        </DialogContent>
      </Dialog>

      {/* Create User Event Type Assignment Dialog */}
      <Dialog open={isCreateEventAssignmentDialogOpen} onOpenChange={setIsCreateEventAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Assign Event Type to User</DialogTitle><DialogDescription>Select user and event type.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label htmlFor="assign-user-event">Select User</Label>
              <Select value={selectedUserIdForEventAssignment || ''} onValueChange={setSelectedUserIdForEventAssignment}>
                <SelectTrigger id="assign-user-event"><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>
                  {validUsersForSelection.length > 0 ? validUsersForSelection.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name || user.email} ({user.role})</SelectItem>
                  )) : <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">No valid users available.</div>}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="assign-event-type">Select Event Type</Label>
              <Select value={selectedEventTypeForAssignment || ''} onValueChange={(v) => setSelectedEventTypeForAssignment(v as EventType)}>
                <SelectTrigger id="assign-event-type"><SelectValue placeholder="Select an event type" /></SelectTrigger>
                <SelectContent>
                  {availableEventTypes.map((type) => (<SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateEventAssignmentDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateEventAssignment}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
