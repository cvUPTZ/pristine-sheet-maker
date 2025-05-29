import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Added Checkbox
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
import { EventType } from '@/types'; 
import CreateMatchForm, { MatchFormData } from '@/components/CreateMatchForm'; // Import MatchFormData
// import { useAuth } from '@/hooks/useAuth'; 

// Define Player interface (or import from @/types if it exists there)
export interface Player {
  id: number; // Assuming player IDs are numbers as used in UIDisplayedPlayerTrackerAssignment
  name: string;
  // Add other player properties if needed e.g. jersey_number, position
  [key: string]: any; // For flexibility
}

interface User {
  id: string;
  email?: string;
  full_name: string;
  role: 'admin' | 'tracker' | 'user' | 'viewer';
  created_at: string;
  updated_at?: string;
}

type UserRole = User['role'];

interface Match {
  id: string;
  name?: string;
  match_type?: string; // Added
  description?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_formation?: string;
  away_team_formation?: string;
  status: string;
  match_date: string; // Consider Date object if doing date manipulations
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
  assigned_event_types?: string[] | null; // Added
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

  // State for Edit Player-Tracker Assignment Dialog
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

  // const auth = useAuth(); 

  const fetchData = useCallback(async () => {
    setLoading(true);
    let fetchedUsers: User[] = [];
    let fetchedMatches: Match[] = [];

    try {
      // Updated to use 'get-users' which returns actual emails and full_name correctly
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
          full_name: user.full_name || user.raw_user_meta_data?.full_name || '', // Check both
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
        .select('id, match_id, tracker_user_id, player_id, player_team_id, created_at, assigned_event_types'); // Ensure player_id and assigned_event_types are selected
      if (playerTrackerAssignmentsError) throw playerTrackerAssignmentsError;

      if (rawAssignments) {
        const processedAssignments = rawAssignments.map(assignment => {
          const match = fetchedMatches.find(m => m.id === assignment.match_id);
          const tracker = fetchedUsers.find(u => u.id === assignment.tracker_user_id);
          
          let playerName = 'Unknown Player';
          let playerTeamName = 'Unknown Team';
          let processedPlayerId = 0; // Default for match-level or if player_id is missing
          let playerTeamContext: 'home' | 'away' | undefined = undefined; // Handle possible null for player_team_id

          if (assignment.player_id !== null && assignment.player_id !== undefined) {
            // This is a player-specific assignment
            processedPlayerId = Number(assignment.player_id);
            playerTeamContext = assignment.player_team_id as 'home' | 'away'; // Assume valid if player_id exists

            if (match && playerTeamContext) {
              const playerList = playerTeamContext === 'home' ? match.home_team_players : match.away_team_players;
              const player = Array.isArray(playerList) ? playerList.find(p => p.id === processedPlayerId) : null;
              if (player) {
                playerName = player.name;
              } else {
                playerName = `Player ID ${processedPlayerId} not found in roster`;
              }
              playerTeamName = playerTeamContext === 'home' ? match.home_team_name : match.away_team_name;
            } else if (match) { // Player ID exists, but team context might be missing or match not found for player
              playerName = `Player ID ${processedPlayerId}`;
              playerTeamName = "Team context error or match not fully loaded";
            }
          } else if (match) {
            // This is a general match assignment (player_id is NULL)
            playerName = "N/A (Match Assignment)";
            playerTeamName = "N/A";
            // playerTeamContext remains undefined or you can assign a default like 'home' if your type strictly needs it
            // For UIDisplayedPlayerTrackerAssignment, playerTeamId is 'home' | 'away'.
            // If player_team_id can be null from DB for match assignments, this needs care.
            // Assuming for now match-level assignments won't have a player_team_id from DB or it's ignored.
            // We'll set a default for the type if necessary, or adjust the type.
            // Let's ensure playerTeamContext has a default for the type if player_id is null.
            playerTeamContext = assignment.player_team_id ? assignment.player_team_id as 'home' | 'away' : undefined; // Use if available, else undefined.
                                                                                                                      // If playerTeamId must be 'home'|'away', then a default is needed here.
                                                                                                                      // For now, if it's a match assignment, "N/A" for team name is clear.
          } else {
            // Match not found for this assignment
            playerName = "N/A (Match data missing)";
            playerTeamName = "N/A";
          }

          return {
            id: assignment.id.toString(),
            matchId: assignment.match_id,
            matchName: match?.name || match?.description || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
            playerId: processedPlayerId,
            playerName: playerName,
            // If playerTeamContext is undefined for a match assignment, and the type UIDisplayedPlayerTrackerAssignment.playerTeamId
            // is strictly 'home' | 'away', this might cause issues. Let's provide a fallback if needed, or adjust type.
            // For now, if team context is undefined (e.g. for match-level), we pass it as such.
            // The UI type `UIDisplayedPlayerTrackerAssignment` has `playerTeamId: 'home' | 'away'`.
            // So, if `player_id` is null, `playerTeamContext` might be null/undefined from `assignment.player_team_id`.
            // A default value like 'home' or a specific 'match-level' enum could be used if the type isn't changed.
            // Given the UI, "N/A" for playerTeamName is the most important part for match assignments.
            playerTeamId: playerTeamContext || 'home', // Default to 'home' if undefined, to satisfy type. Or adjust type.
            playerTeamName: playerTeamName,
            trackerUser_id: assignment.tracker_user_id,
            trackerName: tracker?.full_name || tracker?.email || tracker?.id || 'Unknown Tracker',
            created_at: assignment.created_at,
            assigned_event_types: assignment.assigned_event_types, // Added
          };
        }); // .filter(Boolean) is removed as the map always returns an object now.
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
      // ... (rest of handleCreateEventAssignment logic - unchanged)
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

    if (playerIdToUpdate === null || playerTeamIdToUpdate === null) {
        // This case implies unassigning the player, or an invalid state.
        // For now, we'll allow it if your DB schema supports NULL player_id for an assignment.
        // If a player must always be assigned, you should add a validation error here.
        // console.warn("Player ID or Team ID is null. This might unassign the player.");
    }
    
    const updatePayload: any = {
      tracker_user_id: editSelectedTrackerId || null, // Ensure tracker can be unassigned if needed, or validate
      player_id: playerIdToUpdate,
      player_team_id: playerTeamIdToUpdate,
      assigned_event_types: editAssignAllEventTypes ? null : editSelectedEventTypes,
    };

    try {
      const { data: updatedAssignmentData, error } = await supabase
        .from('match_tracker_assignments')
        .update(updatePayload)
        .eq('id', editingPlayerAssignment.id)
        .select() // Fetches all columns
        .single();

      if (error) throw error;

      if (updatedAssignmentData) {
        // For a more robust update without needing full fetchData, we'd map updatedAssignmentData
        // back to UIDisplayedPlayerTrackerAssignment. This involves finding match name, player name, tracker name.
        // For simplicity as per considerations, calling fetchData() is a safe fallback if direct mapping is complex.
        // However, let's try to update locally if possible or if names are not changing.
        // If only tracker or event types change, names might remain the same.
        // If player changes, playerName and playerTeamName need re-evaluation.
        
        // Optimistic update (simple, might need enhancement if names change):
        const match = matches.find(m => m.id === updatedAssignmentData.match_id);
        const tracker = users.find(u => u.id === updatedAssignmentData.tracker_user_id);
        let playerName = 'Unknown Player';
        let playerTeamName = 'Unknown Team';

        if (match && updatedAssignmentData.player_id && updatedAssignmentData.player_team_id) {
            const playerList = updatedAssignmentData.player_team_id === 'home' ? match.home_team_players : match.away_team_players;
            const player = Array.isArray(playerList) ? playerList.find(p => p.id === Number(updatedAssignmentData.player_id)) : undefined;
            if (player) playerName = player.name;
            playerTeamName = updatedAssignmentData.player_team_id === 'home' ? match.home_team_name : match.away_team_name;
        } else if (match) { // Player unassigned or match-level
            playerName = "N/A (Match Assignment)";
            playerTeamName = "N/A";
        }


        const fullyUpdatedUIDisplayAssignment: UIDisplayedPlayerTrackerAssignment = {
          id: updatedAssignmentData.id.toString(),
          matchId: updatedAssignmentData.match_id,
          matchName: match?.name || match?.description || (match ? `${match.home_team_name} vs ${match.away_team_name}` : 'Unknown Match'),
          playerId: Number(updatedAssignmentData.player_id) || 0, // Ensure number, or handle null if player can be unassigned
          playerName: playerName,
          playerTeamId: updatedAssignmentData.player_team_id as 'home' | 'away' || 'home', // Default if null, or adjust type
          playerTeamName: playerTeamName,
          trackerUser_id: updatedAssignmentData.tracker_user_id,
          trackerName: tracker?.full_name || tracker?.email || 'Unknown Tracker',
          created_at: updatedAssignmentData.created_at, // This might be updated_at by db, or created_at if not changed
          assigned_event_types: updatedAssignmentData.assigned_event_types,
        };
        
        setPlayerTrackerAssignments(prev =>
          prev.map(a => (a.id === editingPlayerAssignment.id ? fullyUpdatedUIDisplayAssignment : a))
        );
        // Alternative: Call fetchData() for simplicity if the above mapping is too complex or error-prone
        // fetchData(); 
        
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
    // ... (unchanged)
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

  // REMOVED handleUpdateMatch as CreateMatchForm handles its own updates now

  const handleDeletePlayerAssignment = async (assignmentId: string) => {
    // ... (unchanged)
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
    fetchData(); // Refetch data to show the new match
  }, [fetchData]);

  const handleEditMatchSuccess = useCallback(() => {
    setIsEditMatchDialogOpen(false);
    setEditingMatch(null);
    fetchData(); // Refetch data to show updated match
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUser = async () => {
    // ... (unchanged, error parsing seems fine from original)
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
      await fetchData(); // Refetch users
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
    // ... (unchanged, error parsing seems fine from original)
    try {
      const { error } = await supabase.functions.invoke('admin-set-user-role', {
        body: { target_user_id: userId, new_role: newRole },
      });

      if (error) {
        console.error('Raw error object from invoke admin-set-user-role:', error);
        const message = error.context?.errorMessage || error.message || "Unknown error from function invoke.";
        throw new Error(message);
      }
      // Optimistic update + refetch for full consistency
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      toast.success('User role updated successfully.');
      fetchData(); // Refetch to ensure data consistency, especially if role change has wider effects

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
    // ... (unchanged)
    if (!confirm('Are you sure you want to delete this user? This involves multiple steps and might be irreversible.')) return;
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userIdToDelete: userId }});
      if (error) throw error;
      toast.success('User deletion process initiated. Full cleanup depends on backend implementation.');
      await fetchData(); // Refetch users
    } catch (e: any)
     {
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
    // ... (unchanged)
    if (!confirm('Are you sure you want to delete this match? This will also delete related assignments.')) return;
    try {
      // Consider deleting related match_tracker_assignments first if cascade isn't set up
      // For simplicity, assuming cascade or manual cleanup later if needed
      const { error: assignmentError } = await supabase.from('match_tracker_assignments').delete().eq('match_id', matchId);
      if (assignmentError) {
        toast.warning(`Could not clear assignments for match, but proceeding with match deletion: ${assignmentError.message}`);
      }

      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;
      
      setMatches(matches.filter(match => match.id !== matchId));
      // Also remove from playerTrackerAssignments locally if any were tied to this match
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
        {/* ... TabsList (unchanged) ... */}
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Matches</TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Event Assignments</TabsTrigger>
          <TabsTrigger value="player-assignments" className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Player Assignments</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Audit</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          {/* ... Users Tab Content (largely unchanged, ensure keys and data access are correct) ... */}
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
           {/* ... Matches Tab Content (largely unchanged) ... */}
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
          {/* ... Event Assignments Tab Content (largely unchanged) ... */}
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
          {/* ... Player Assignments Tab Content (largely unchanged) ... */}
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
        
        <TabsContent value="audit" className="mt-6"><Card><CardHeader><CardTitle>Audit Log</CardTitle></CardHeader><CardContent><p>Audit log feature coming soon.</p></CardContent></Card></TabsContent>
        <TabsContent value="settings" className="mt-6"><Card><CardHeader><CardTitle>Settings</CardTitle></CardHeader><CardContent><p>General settings coming soon.</p></CardContent></Card></TabsContent>
      </Tabs>

      {/* Dialogs */}
      {/* Create User Dialog (unchanged) */}
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

      {/* Create Player-Tracker Assignment Dialog (largely unchanged) */}
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
                    // Ensure players are arrays and have id/name before mapping
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

      {/* Create Match Dialog */}
      <Dialog open={isCreateMatchDialogOpen} onOpenChange={setIsCreateMatchDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Match</DialogTitle>
            <DialogDescription>Follow the steps to create a new match, including team setup and tracker assignments.</DialogDescription>
          </DialogHeader>
          <CreateMatchForm onSuccess={handleCreateMatchSuccess} />
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={isEditMatchDialogOpen} onOpenChange={(open) => {
        setIsEditMatchDialogOpen(open);
        if (!open) setEditingMatch(null); // Clear editingMatch when dialog closes
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
            <DialogDescription>Modify the details of the selected match.</DialogDescription>
          </DialogHeader>
          {editingMatch && <CreateMatchForm 
                            isEditMode 
                            initialData={{ // Map fields from `Match` to `MatchFormData`
                              id: editingMatch.id, 
                              name: editingMatch.name || '',
                              match_type: editingMatch.match_type || '',
                              home_team_name: editingMatch.home_team_name, 
                              away_team_name: editingMatch.away_team_name,
                              status: editingMatch.status as MatchFormData['status'], 
                              description: editingMatch.description || '',
                              // assigned_tracker_id will be fetched by CreateMatchForm itself
                            }} 
                            onSuccess={handleEditMatchSuccess} 
                          />}
        </DialogContent>
      </Dialog>

      {/* Edit Player-Tracker Assignment Dialog */}
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
                     // Option to unassign player, if applicable to your logic
                    // players.push(<SelectItem key="unassign-player" value="">Unassign Player</SelectItem>);
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

      {/* Create Event Assignment Dialog (unchanged) */}
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
