
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlayerAssignment {
  id: string;
  match_id: string;
  tracker_user_id: string;
  player_id: number;
  player_team_id: string;
  created_at: string;
  match?: {
    name: string;
    home_team_name: string;
    away_team_name: string;
  };
  tracker?: {
    email: string;
    full_name?: string;
  };
}

interface Match {
  id: string;
  name?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_players: any[];
  away_team_players: any[];
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

const PlayerAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const [assignmentsResponse, matchesResponse, usersResponse] = await Promise.all([
        supabase
          .from('match_tracker_assignments')
          .select(`
            id,
            match_id,
            tracker_user_id,
            player_id,
            player_team_id,
            assigned_event_types,
            created_at,
            matches:match_id (
              name,
              home_team_name,
              away_team_name
            ),
            profiles:tracker_user_id (
              full_name,
              email
            )
          `),
        supabase
          .from('matches')
          .select('id, name, home_team_name, away_team_name, home_team_players, away_team_players'),
        supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('role', 'tracker')
      ]);

      if (assignmentsResponse.error) throw assignmentsResponse.error;
      if (matchesResponse.error) throw matchesResponse.error;
      if (usersResponse.error) throw usersResponse.error;

      // Transform assignments
      const transformedAssignments = (assignmentsResponse.data || [])
        .filter(assignment => assignment.player_id !== null)
        .map(assignment => ({
          id: assignment.id,
          match_id: assignment.match_id,
          tracker_user_id: assignment.tracker_user_id,
          player_id: assignment.player_id!,
          player_team_id: assignment.player_team_id,
          assigned_event_types: assignment.assigned_event_types || [],
          created_at: assignment.created_at,
          matches: assignment.matches,
          profiles: assignment.profiles
        }));

      // Transform matches with proper null handling
      const transformedMatches = (matchesResponse.data || []).map(match => ({
        id: match.id,
        name: match.name || undefined,
        home_team_name: match.home_team_name,
        away_team_name: match.away_team_name,
        home_team_players: Array.isArray(match.home_team_players) ? match.home_team_players : [],
        away_team_players: Array.isArray(match.away_team_players) ? match.away_team_players : []
      }));

      // Transform users
      const transformedUsers = (usersResponse.data || [])
        .filter(user => user.email && user.full_name)
        .map(user => ({
          id: user.id,
          email: user.email!,
          full_name: user.full_name!,
          role: 'tracker' as const
        }));

      setAssignments(transformedAssignments);
      setMatches(transformedMatches);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedMatch || !selectedTracker || !selectedPlayer || !selectedTeam) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .insert([{
          match_id: selectedMatch,
          tracker_user_id: selectedTracker,
          player_id: parseInt(selectedPlayer),
          player_team_id: selectedTeam
        }]);

      if (error) throw error;

      toast.success('Player assignment created successfully');
      setSelectedMatch('');
      setSelectedTracker('');
      setSelectedPlayer('');
      setSelectedTeam('home');
      await fetchAssignments();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create player assignment');
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

      toast.success('Player assignment deleted successfully');
      await fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete player assignment');
    }
  };

  const getPlayersForSelectedMatch = () => {
    const match = matches.find(m => m.id === selectedMatch);
    if (!match) return [];

    const teamPlayers = selectedTeam === 'home' ? match.home_team_players : match.away_team_players;
    return Array.isArray(teamPlayers) ? teamPlayers : [];
  };

  const getPlayerName = (match: any, playerId: number, teamId: string) => {
    try {
      const playersData = teamId === 'home' ? match.home_team_players : match.away_team_players;
      const players: any[] = typeof playersData === 'string' ? JSON.parse(playersData) : playersData || [];
      const player = players.find((p: any) => p.id === playerId || p.jersey_number === playerId);
      return player ? (player.name || player.player_name || `Player ${playerId}`) : `Player ${playerId}`;
    } catch (error) {
      console.error('Error parsing player data:', error);
      return `Player ${playerId}`;
    }
  };

  if (loading) {
    return <div className="p-4">Loading player assignments...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          Player Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
        {/* Create New Assignment */}
        <Card>
          <CardHeader className="p-4">
            <h3 className="text-md font-semibold">Create New Assignment</h3>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Match</label>
                <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select match" />
                  </SelectTrigger>
                  <SelectContent>
                    {matches.map(match => (
                      <SelectItem key={match.id} value={match.id}>
                        {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Tracker</label>
                <Select value={selectedTracker} onValueChange={setSelectedTracker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tracker" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Team</label>
                <Select value={selectedTeam} onValueChange={(value: 'home' | 'away') => setSelectedTeam(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home Team</SelectItem>
                    <SelectItem value="away">Away Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Player</label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer} disabled={!selectedMatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPlayersForSelectedMatch().map(player => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.player_name || player.name} (#{player.jersey_number || player.number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleCreateAssignment} className="w-full">
                  Assign
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
              <p className="text-center py-8 text-gray-500">No player assignments found</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium">
                          {assignment.tracker?.full_name || assignment.tracker?.email || 'Unknown Tracker'}
                        </span>
                        <Badge variant="outline">
                          {getPlayerName(assignment.match, assignment.player_id, assignment.player_team_id)}
                        </Badge>
                        <Badge className={assignment.player_team_id === 'home' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}>
                          {assignment.player_team_id === 'home' ? 'Home' : 'Away'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Match: {assignment.match?.name || `${assignment.match?.home_team_name} vs ${assignment.match?.away_team_name}`}
                      </p>
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

export default PlayerAssignments;
