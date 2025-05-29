import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Users, Calendar, UserCheck, Settings, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EventType, Player, Match, UserRoleType } from '@/types';
import CreateMatchForm, { MatchFormData } from '@/components/CreateMatchForm';
import AccessManagementComponent from '@/components/admin/AccessManagement';

interface User {
  id: string;
  email?: string;
  full_name: string;
  role: 'admin' | 'tracker' | 'user' | 'viewer';
  created_at: string;
  updated_at?: string;
}

type UserRole = User['role'];

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
  assigned_event_types?: string[] | null;
}

const availableEventTypes: EventType[] = [
  'pass', 'shot', 'tackle', 'foul', 'corner', 'offside', 'goal',
  'assist', 'yellowCard', 'redCard', 'substitution', 'card',
  'penalty', 'free-kick', 'goal-kick', 'throw-in', 'interception'
];

const filterValidItems = <T extends { id: string }>(items: T[] | undefined, itemName: string): T[] => {
  if (!items) return [];
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
  const [assignAllEventTypes, setAssignAllEventTypes] = useState(true);
  const [selectedEventTypesForCreate, setSelectedEventTypesForCreate] = useState<string[]>([]);

  const [isEditPlayerAssignmentDialogOpen, setIsEditPlayerAssignmentDialogOpen] = useState(false);
  const [editingPlayerAssignment, setEditingPlayerAssignment] = useState<UIDisplayedPlayerTrackerAssignment | null>(null);
  const [editSelectedPlayerIdAndTeam, setEditSelectedPlayerIdAndTeam] = useState<string>('');
  const [editSelectedTrackerId, setEditSelectedTrackerId] = useState<string>('');
  const [editAssignAllEventTypes, setEditAssignAllEventTypes] = useState<boolean>(true);
  const [editSelectedEventTypes, setEditSelectedEventTypes] = useState<string[]>([]);

  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');

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
      const { data: usersFunctionResponse, error: usersError } = await supabase.functions.invoke('get-all-users', { method: 'GET' });
      
      if (usersError) {
        let errorMessage = usersError.message;
        if (usersError.context && typeof usersError.context.error === 'string') {
            errorMessage = usersError.context.error;
        } else if (usersError.data && typeof usersError.data.error === 'string') { 
            errorMessage = usersError.data.error;
        }
        console.error('Error invoking get-all-users function:', usersError);
        toast.error(`Failed to fetch users: ${errorMessage}`);
        setUsers([]);
      } else if (usersFunctionResponse && Array.isArray(usersFunctionResponse)) {
        fetchedUsers = usersFunctionResponse.map((user: any) => ({
          id: user.id,
          email: user.email || undefined,
          full_name: user.full_name || user.raw_user_meta_data?.full_name || '',
          role: user.role as UserRole, 
          created_at: user.created_at,
          updated_at: user.updated_at || undefined,
        }));
        setUsers(fetchedUsers);
      } else {
        console.error('Received unexpected data structure for users:', usersFunctionResponse);
        toast.error('Failed to process user data: unexpected format from function.');
        setUsers([]);
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('id, name, match_type, description, home_team_name, away_team_name, status, match_date, created_at, home_team_players, away_team_players, home_team_formation, away_team_formation')
        .order('created_at', { ascending: false });
      if (matchesError) throw matchesError;
      
      fetchedMatches = (matchesData || []).map(match => {
        let homePlayers: Player[] = [];
        let awayPlayers: Player[] = [];
        try {
          if (match.home_team_players) {
            homePlayers = typeof match.home_team_players === 'string' ? 
              JSON.parse(match.home_team_players) : match.home_team_players;
          }
        } catch (e) {
          console.warn(`Failed to parse home_team_players for match ${match.id}:`, e);
        }
        try {
          if (match.away_team_players) {
            awayPlayers = typeof match.away_team_players === 'string' ? 
              JSON.parse(match.away_team_players) : match.away_team_players;
          }
        } catch (e) {
          console.warn(`Failed to parse away_team_players for match ${match.id}:`, e);
        }
        return {
          ...match,
          name: match.name || undefined,
          description: match.description || undefined,
          match_type: match.match_type || undefined,
          match_date: match.match_date || undefined,
          home_team_formation: match.home_team_formation || undefined,
          away_team_formation: match.away_team_formation || undefined,
          home_team_players: homePlayers,
          away_team_players: awayPlayers
        };
      });
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
        .select('id, match_id, tracker_user_id, player_id, player_team_id, created_at, assigned_event_types');
      if (playerTrackerAssignmentsError) throw playerTrackerAssignmentsError;

      if (rawAssignments) {
        const processedAssignments = rawAssignments.map(assignment => {
          const match = fetchedMatches.find(m => m.id === assignment.match_id);
          const tracker = fetchedUsers.find(u => u.id === assignment.tracker_user_id);
          
          let playerName = 'Unknown Player';
          let playerTeamName = 'Unknown Team';
          let processedPlayerId = 0;
          let playerTeamContext: 'home' | 'away' = 'home';

          if (assignment.player_id !== null && assignment.player_id !== undefined) {
            processedPlayerId = Number(assignment.player_id);
            playerTeamContext = (assignment.player_team_id as 'home' | 'away') || 'home';

            if (match && playerTeamContext) {
              const playerList = playerTeamContext === 'home' ? match.home_team_players : match.away_team_players;
              const player = Array.isArray(playerList) ? playerList.find(p => p.id === processedPlayerId) : null;
              if (player) {
                playerName = player.name;
              } else {
                playerName = `Player ID ${processedPlayerId} not found in roster`;
              }
              playerTeamName = playerTeamContext === 'home' ? match.home_team_name : match.away_team_name;
            } else if (match) {
              playerName = `Player ID ${processedPlayerId}`;
              playerTeamName = "Team context error or match not fully loaded";
            }
          } else if (match) {
            playerName = "N/A (Match Assignment)";
            playerTeamName = "N/A";
            playerTeamContext = (assignment.player_team_id as 'home' | 'away') || 'home';
          } else {
            playerName = "N/A (Match data missing)";
            playerTeamName = "N/A";
          }

          return {
            id: assignment.id.toString(),
            matchId: assignment.match_id,
            matchName: match?.name || match?.description || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
            playerId: processedPlayerId,
            playerName: playerName,
            playerTeamId: playerTeamContext,
            playerTeamName: playerTeamName,
            trackerUser_id: assignment.tracker_user_id,
            trackerName: tracker?.full_name || tracker?.email || tracker?.id || 'Unknown Tracker',
            created_at: assignment.created_at,
            assigned_event_types: assignment.assigned_event_types,
          };
        });
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

  const resetCreatePlayerAssignmentForm = () => {
    setSelectedMatchIdForAssignment(null);
    setSelectedPlayerForAssignment(null);
    setSelectedTrackerIdForAssignment(null);
    setAssignAllEventTypes(true);
    setSelectedEventTypesForCreate([]);
  };

  const resetEditPlayerAssignmentForm = () => {
    setEditingPlayerAssignment(null);
    setEditSelectedPlayerIdAndTeam('');
    setEditSelectedTrackerId('');
    setEditAssignAllEventTypes(true);
    setEditSelectedEventTypes([]);
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
      setEventAssignments(prev => [augmentedNewAssignment, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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

    let assigned_event_types_payload: string[] | null = null;
    if (!assignAllEventTypes) {
      assigned_event_types_payload = selectedEventTypesForCreate;
    }

    try {
      const { data: newAssignmentData, error } = await supabase
        .from('match_tracker_assignments')
        .insert({
          match_id: selectedMatchIdForAssignment,
          tracker_user_id: selectedTrackerIdForAssignment,
          player_id: selectedPlayerForAssignment.playerId,
          player_team_id: selectedPlayerForAssignment.playerTeamId,
          assigned_event_types: assigned_event_types_payload,
        })
        .select('id, match_id, tracker_user_id, player_id, player_team_id, created_at, assigned_event_types')
        .single();
      if (error || !newAssignmentData) throw error || new Error("No data returned from player assignment creation");
      const match = matches.find(m => m.id === newAssignmentData.match_id);
      const tracker = users.find(u => u.id === newAssignmentData.tracker_user_id);
      let playerName = 'Unknown Player';
      let playerTeamName = 'Unknown Team';
      if (match) {
        const playerList = newAssignmentData.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
        const player = Array.isArray(playerList) ? playerList.find(p => p.id === Number(newAssignmentData.player_id)) : undefined;
        if (player) playerName = player.name;
        playerTeamName = newAssignmentData.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
      }
      const newlyConstructedAssignment: UIDisplayedPlayerTrackerAssignment = {
        id: newAssignmentData.id.toString(),
        matchId: newAssignmentData.match_id,
        matchName: match?.name || match?.description || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
        playerId: Number(newAssignmentData.player_id),
        playerName: playerName,
        playerTeamId: newAssignmentData.player_team_id as 'home' | 'away',
        playerTeamName: playerTeamName,
        trackerUser_id: newAssignmentData.tracker_user_id,
        trackerName: tracker?.full_name || tracker?.email || 'Unknown Tracker',
        created_at: newAssignmentData.created_at,
        assigned_event_types: newAssignmentData.assigned_event_types,
      };
      setPlayerTrackerAssignments(prev => [newlyConstructedAssignment, ...prev].sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
      toast.success('Player-tracker assignment created successfully.');
      resetCreatePlayerAssignmentForm();
      setIsCreateAssignmentDialogOpen(false);
    } catch (e: any) {
      console.error('Error creating player assignment:', e);
      toast.error(`Failed to create assignment: ${e.message}`);
    }
  };

  const handleUpdatePlayerAssignment = async () => {
    if (!editingPlayerAssignment) {
      toast.error("No assignment selected for editing.");
      return;
    }

    let playerIdToUpdate: number | null = null;
    let playerTeamIdToUpdate: 'home' | 'away' | null = null;

    if (editSelectedPlayerIdAndTeam) {
      const parts = editSelectedPlayerIdAndTeam.split(':');
      if (parts.length === 2) {
        playerIdToUpdate = parseInt(parts[0], 10);
        playerTeamIdToUpdate = parts[1] as 'home' | 'away';
      } else {
        toast.error("Invalid player selection format.");
        return;
      }
    }
    
    const updatePayload: any = {
      tracker_user_id: editSelectedTrackerId || null,
      player_id: playerIdToUpdate,
      player_team_id: playerTeamIdToUpdate,
      assigned_event_types: editAssignAllEventTypes ? null : editSelectedEventTypes,
    };

    try {
      const { data: updatedAssignmentData, error } = await supabase
        .from('match_tracker_assignments')
        .update(updatePayload)
        .eq('id', editingPlayerAssignment.id)
        .select()
        .single();

      if (error) throw error;

      if (updatedAssignmentData) {
        const match = matches.find(m => m.id === updatedAssignmentData.match_id);
        const tracker = users.find(u => u.id === updatedAssignmentData.tracker_user_id);
        let playerName = 'Unknown Player';
        let playerTeamName = 'Unknown Team';

        if (match && updatedAssignmentData.player_id && updatedAssignmentData.player_team_id) {
            const playerList = updatedAssignmentData.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
            const player = Array.isArray(playerList) ? playerList.find(p => p.id === Number(updatedAssignmentData.player_id)) : undefined;
            if (player) playerName = player.name;
            playerTeamName = updatedAssignmentData.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
        } else if (match) {
            playerName = "N/A (Match Assignment)";
            playerTeamName = "N/A";
        }

        const fullyUpdatedUIDisplayAssignment: UIDisplayedPlayerTrackerAssignment = {
          id: updatedAssignmentData.id.toString(),
          matchId: updatedAssignmentData.match_id,
          matchName: match?.name || match?.description || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
          playerId: Number(updatedAssignmentData.player_id) || 0,
          playerName: playerName,
          playerTeamId: (updatedAssignmentData.player_team_id as 'home' | 'away') || 'home',
          playerTeamName: playerTeamName,
          trackerUser_id: updatedAssignmentData.tracker_user_id,
          trackerName: tracker?.full_name || tracker?.email || 'Unknown Tracker',
          created_at: updatedAssignmentData.created_at,
          assigned_event_types: updatedAssignmentData.assigned_event_types,
        };
        
        setPlayerTrackerAssignments(prev =>
          prev.map(a => (a.id === editingPlayerAssignment.id ? fullyUpdatedUIDisplayAssignment : a))
        );
        
        setIsEditPlayerAssignmentDialogOpen(false);
        resetEditPlayerAssignmentForm();
        toast.success('Player-tracker assignment updated successfully.');
      } else {
        toast.error('Failed to update assignment: No data returned.');
      }
    } catch (e: any) {
      console.error('Error updating player assignment:', e);
      toast.error(`Failed to update assignment: ${e.message}`);
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
    fetchData();
  }, [fetchData]);

  const handleEditMatchSuccess = useCallback(() => {
    setIsEditMatchDialogOpen(false);
    setEditingMatch(null);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Please fill in all required fields: Full Name, Email, and Password.');
      return;
    }
    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        method: 'POST', body: JSON.stringify({ fullName: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole }),
      });

      if (functionError) throw functionError;
      if (data && data.error) throw new Error(data.error); 

      toast.success('User created successfully!');
      await fetchData();
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole('user');
      setIsCreateUserDialogOpen(false);
    } catch (e: any) {
      console.error('Error creating user:', e);
      let errorMessage = e.message;
      if (e.context && typeof e.context.error === 'string') {
          errorMessage = e.context.error;
      } else if (e.data && typeof e.data.error === 'string') {
          errorMessage = e.data.error;
      } else if (e.details && typeof e.details === 'string') { 
          errorMessage = e.details;
      }
      toast.error(`Failed to create user: ${errorMessage}`);
    }
  };
    
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase.functions.invoke('admin-set-user-role', {
        body: { target_user_id: userId, new_role: newRole },
      });

      if (error) {
        console.error('Raw error object from invoke admin-set-user-role:', error);
        const message = error.context?.errorMessage || error.message || "Unknown error from function invoke.";
        throw new Error(message);
      }
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      toast.success('User role updated successfully.');
      fetchData();

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.id === userId) {
        console.warn("Current user's role updated. Session refresh might be needed for claims to update immediately.");
      }
    } catch (e: any) {
      console.error('Error updating role:', e);
      toast.error(`Failed to update user role: ${e.message}`); 
    }
  };
    
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This involves multiple steps and might be irreversible.')) return;
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userIdToDelete: userId }});
      if (error) throw error;
      toast.success('User deletion process initiated. Full cleanup depends on backend implementation.');
      await fetchData();
    } catch (e: any) {
      console.error('Error deleting user:', e);
      let errorMessage = e.message;
       if (e.context && typeof e.context.error === 'string') {
          errorMessage = e.context.error;
      } else if (e.data && typeof e.data.error === 'string') {
          errorMessage = e.data.error;
      }
      toast.error('Failed to delete user: ' + errorMessage);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? This will also delete related assignments.')) return;
    try {
      const { error: assignmentError } = await supabase.from('match_tracker_assignments').delete().eq('match_id', matchId);
      if (assignmentError) {
        toast.warning(`Could not clear assignments for match, but proceeding with match deletion: ${assignmentError.message}`);
      }

      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;
      
      setMatches(matches.filter(match => match.id !== matchId));
      setPlayerTrackerAssignments(prev => prev.filter(a => a.matchId !== matchId));
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Matches</TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Event Assignments</TabsTrigger>
          <TabsTrigger value="player-assignments" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Player Assignments</TabsTrigger>
          <TabsTrigger value="accessManagement" className="flex items-center gap-2"><Shield className="h-4 w-4" />Access Management</TabsTrigger>
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
                      <TableCell className="font-medium">{user.id ? user.id.slice(0, 8) + '...' : 'N/A'}</TableCell>
                      <TableCell>{user.full_name || 'No name'}</TableCell>
                      <TableCell>{user.email || 'No email'}</TableCell>
                      <TableCell>
                        <Select value={user.role || 'user'} onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}>
                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem><SelectItem value="tracker">Tracker</SelectItem>
                            <SelectItem value="user">User</SelectItem><SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>Delete User</Button></TableCell>
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
                    <TableHead>Name / Description</TableHead><TableHead>Type</TableHead><TableHead>Teams</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.name || match.description || 'Unnamed Match'}</TableCell>
                      <TableCell>{match.match_type ? match.match_type.charAt(0).toUpperCase() + match.match_type.slice(1) : 'N/A'}</TableCell>
                      <TableCell>{match.home_team_name} vs {match.away_team_name}</TableCell>
                      <TableCell><Badge variant={match.status === 'live' || match.status === 'pending_live' ? 'default' : 'secondary'}>{match.status}</Badge></TableCell>
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
                    <TableHead>Match</TableHead><TableHead>Player</TableHead><TableHead>Player's Team</TableHead><TableHead>Tracker</TableHead><TableHead>Assigned Event Types</TableHead><TableHead>Assigned At</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {playerTrackerAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.matchName}</TableCell><TableCell>{assignment.playerName}</TableCell>
                      <TableCell>{assignment.playerTeamName}</TableCell><TableCell>{assignment.trackerName}</TableCell>
                      <TableCell>
                        {assignment.assigned_event_types && assignment.assigned_event_types.length > 0 
                          ? assignment.assigned_event_types.join(', ') 
                          : 'All Types'}
                      </TableCell>
                      <TableCell>{assignment.created_at ? new Date(assignment.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mr-2"
                          onClick={() => {
                            setEditingPlayerAssignment(assignment);
                            setEditSelectedPlayerIdAndTeam(assignment.playerId && assignment.playerTeamId ? `${assignment.playerId}:${assignment.playerTeamId}` : '');
                            setEditSelectedTrackerId(assignment.trackerUser_id || '');
                            if (assignment.assigned_event_types === null || assignment.assigned_event_types?.length === 0) {
                              setEditAssignAllEventTypes(true);
                              setEditSelectedEventTypes([]);
                            } else {
                              setEditAssignAllEventTypes(false);
                              setEditSelectedEventTypes(assignment.assigned_event_types || []);
                            }
                            setIsEditPlayerAssignmentDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePlayerAssignment(assignment.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessManagement" className="mt-6">
          <AccessManagementComponent />
        </TabsContent>
        
        <TabsContent value="audit" className="mt-6"><Card><CardHeader><CardTitle>Audit Log</CardTitle></CardHeader><CardContent><p>Audit log feature coming soon.</p></CardContent></Card></TabsContent>
        <TabsContent value="settings" className="mt-6"><Card><CardHeader><CardTitle>Settings</CardTitle></CardHeader><CardContent><p>General settings coming soon.</p></CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Create New User</DialogTitle><DialogDescription>Fill in the details for the new user.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Full Name</Label><Input id="name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="password" className="text-right">Password</Label><Input id="password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="role" className="text-right">Role</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="tracker">Tracker</SelectItem><SelectItem value="user">User</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleCreateUser}>Create User</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={(open) => {
        setIsCreateAssignmentDialogOpen(open);
        if (!open) {
          resetCreatePlayerAssignmentForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]"><DialogHeader><DialogTitle>Create Player-Tracker Assignment</DialogTitle><DialogDescription>Assign a player from a specific match to a tracker.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label htmlFor="assign-match">Select Match</Label>
              <Select value={selectedMatchIdForAssignment || ''} onValueChange={(value) => { setSelectedMatchIdForAssignment(value); setSelectedPlayerForAssignment(null); }}>
                <SelectTrigger id="assign-match"><SelectValue placeholder="Select a match" /></SelectTrigger>
                <SelectContent>
                  {validMatchesForSelection.length > 0 ? validMatchesForSelection.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.name || match.description || `${match.home_team_name} vs ${match.away_team_name}`}
                    </SelectItem>
                  )) : <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">No valid matches available.</div>}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="assign-player">Select Player</Label>
              <Select 
                value={selectedPlayerForAssignment ? `${selectedPlayerForAssignment.playerId}:${selectedPlayerForAssignment.playerTeamId}` : ''}
                onValueChange={(value) => { 
                  if (value) { 
                    const [idStr, team] = value.split(':'); 
                    setSelectedPlayerForAssignment({ playerId: parseInt(idStr), playerTeamId: team as 'home' | 'away' }); 
                  } else { 
                    setSelectedPlayerForAssignment(null); 
                  }}}
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
                    return players.length ? players : <div className="px-2 py-1.5 text-sm text-muted-foreground">No players in this match. Ensure players have 'id' and 'name'.</div>;
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
            <div>
              <Label>Event Types</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="assign-all-events"
                  checked={assignAllEventTypes}
                  onCheckedChange={(checked) => setAssignAllEventTypes(checked as boolean)}
                />
                <Label htmlFor="assign-all-events" className="font-medium">
                  Assign all event types
                </Label>
              </div>
              {!assignAllEventTypes && (
                <div className="mt-2 p-2 border rounded-md max-h-48 overflow-y-auto space-y-1">
                  <Label className="text-sm text-muted-foreground">Select specific event types:</Label>
                  {availableEventTypes.map((eventType) => (
                    <div key={eventType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-assign-${eventType}`}
                        checked={selectedEventTypesForCreate.includes(eventType)}
                        onCheckedChange={(checked) => {
                          setSelectedEventTypesForCreate(prev =>
                            checked
                              ? [...prev, eventType]
                              : prev.filter(et => et !== eventType)
                          );
                        }}
                      />
                      <Label htmlFor={`create-assign-${eventType}`} className="text-sm font-normal">
                        {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setIsCreateAssignmentDialogOpen(false); resetCreatePlayerAssignmentForm(); }}>Cancel</Button><Button onClick={handleCreatePlayerAssignment}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateMatchDialogOpen} onOpenChange={setIsCreateMatchDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Match</DialogTitle>
            <DialogDescription>Follow the steps to create a new match, including team setup and tracker assignments.</DialogDescription>
          </DialogHeader>
          <CreateMatchForm onSuccess={handleCreateMatchSuccess} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditMatchDialogOpen} onOpenChange={(open) => {
        setIsEditMatchDialogOpen(open);
        if (!open) setEditingMatch(null);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
            <DialogDescription>Modify the details of the selected match.</DialogDescription>
          </DialogHeader>
          {editingMatch && <CreateMatchForm 
                            isEditMode 
                            initialData={{
                              id: editingMatch.id, 
                              name: editingMatch.name || '',
                              match_type: editingMatch.match_type || '',
                              home_team_name: editingMatch.home_team_name, 
                              away_team_name: editingMatch.away_team_name,
                              status: editingMatch.status as MatchFormData['status'], 
                              description: editingMatch.description || '',
                            }} 
                            onSuccess={handleEditMatchSuccess} 
                          />}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPlayerAssignmentDialogOpen} onOpenChange={(open) => {
        setIsEditPlayerAssignmentDialogOpen(open);
        if (!open) {
          resetEditPlayerAssignmentForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Player-Tracker Assignment</DialogTitle>
            <DialogDescription>Modify the player, tracker, or assigned event types.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Match</Label>
              <p className="text-sm font-medium py-2 px-3 bg-muted rounded-md">{editingPlayerAssignment?.matchName || 'N/A'}</p>
            </div>
            <div>
              <Label htmlFor="edit-assign-player">Player</Label>
              <Select
                value={editSelectedPlayerIdAndTeam}
                onValueChange={setEditSelectedPlayerIdAndTeam}
                disabled={!editingPlayerAssignment?.matchId}
              >
                <SelectTrigger id="edit-assign-player"><SelectValue placeholder="Select a player" /></SelectTrigger>
                <SelectContent>
                  {editingPlayerAssignment?.matchId && (() => {
                    const currentMatch = matches.find(m => m.id === editingPlayerAssignment.matchId);
                    if (!currentMatch) return <div className="px-2 py-1.5 text-sm text-muted-foreground">Match not found.</div>;
                    
                    const players: React.ReactNode[] = [];
                    (Array.isArray(currentMatch.home_team_players) ? currentMatch.home_team_players : []).forEach(p => {
                      if (p && p.id !== undefined && p.id !== null && p.name) {
                        players.push(<SelectItem key={`home-${p.id}`} value={`${p.id}:home`}>{p.name} ({currentMatch.home_team_name} - Home)</SelectItem>);
                      }
                    });
                    (Array.isArray(currentMatch.away_team_players) ? currentMatch.away_team_players : []).forEach(p => {
                       if (p && p.id !== undefined && p.id !== null && p.name) {
                        players.push(<SelectItem key={`away-${p.id}`} value={`${p.id}:away`}>{p.name} ({currentMatch.away_team_name} - Away)</SelectItem>);
                       }
                    });
                    return players.length ? players : <div className="px-2 py-1.5 text-sm text-muted-foreground">No players in this match.</div>;
                  })()}
                  {!editingPlayerAssignment?.matchId && <div className="px-2 py-1.5 text-sm text-muted-foreground">Select a match first (should be pre-filled).</div>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-assign-tracker">Tracker</Label>
              <Select value={editSelectedTrackerId} onValueChange={setEditSelectedTrackerId}>
                <SelectTrigger id="edit-assign-tracker"><SelectValue placeholder="Select a tracker" /></SelectTrigger>
                <SelectContent>
                  {validTrackersForSelection.map((tracker) => (
                    <SelectItem key={tracker.id} value={tracker.id}>{tracker.full_name || tracker.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Types</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="edit-assign-all-events"
                  checked={editAssignAllEventTypes}
                  onCheckedChange={(checked) => setEditAssignAllEventTypes(checked as boolean)}
                />
                <Label htmlFor="edit-assign-all-events" className="font-medium">
                  Assign all event types
                </Label>
              </div>
              {!editAssignAllEventTypes && (
                <div className="mt-2 p-2 border rounded-md max-h-48 overflow-y-auto space-y-1">
                  <Label className="text-sm text-muted-foreground">Select specific event types:</Label>
                  {availableEventTypes.map((eventType) => (
                    <div key={eventType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-assign-${eventType}`}
                        checked={editSelectedEventTypes.includes(eventType)}
                        onCheckedChange={(checked) => {
                          setEditSelectedEventTypes(prev =>
                            checked
                              ? [...prev, eventType]
                              : prev.filter(et => et !== eventType)
                          );
                        }}
                      />
                      <Label htmlFor={`edit-assign-${eventType}`} className="text-sm font-normal">
                        {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPlayerAssignmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePlayerAssignment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateEventAssignmentDialogOpen} onOpenChange={setIsCreateEventAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Assign Event Type to User</DialogTitle><DialogDescription>Select a user and an event type to assign.</DialogDescription></DialogHeader>
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
