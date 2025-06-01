import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Target, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackerUser {
  id: string;
  email: string;
  full_name: string;
}

interface Assignment {
  id: string;
  tracker_user_id: string;
  player_id: number;
  player_team_id: 'home' | 'away';
  assigned_event_types: string[];
  tracker_name?: string;
  tracker_email?: string;
}

interface SpecializedTrackerAssignmentProps {
  matchId: string;
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
}

const EVENT_TYPES = [
  'pass', 'shot', 'goal', 'foul', 'card', 'substitution',
  'corner', 'throw_in', 'offside', 'tackle', 'interception',
  'cross', 'header', 'save', 'clearance'
];

const SpecializedTrackerAssignment: React.FC<SpecializedTrackerAssignmentProps> = ({
  matchId,
  homeTeamPlayers,
  awayTeamPlayers
}) => {
  const [trackerUsers, setTrackerUsers] = useState<TrackerUser[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
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

      const typedUsers: TrackerUser[] = (data || [])
        .filter(user => user.id)
        .map(user => ({
          id: user.id!,
          email: user.email || 'No email',
          full_name: user.full_name || 'No name',
        }));

      setTrackerUsers(typedUsers);
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
        .not('player_id', 'is', null);

      if (error) throw error;

      // Transform the data to match our Assignment interface
      const transformedAssignments: Assignment[] = (data || [])
        .filter(item => item.id && item.tracker_user_id && item.player_id)
        .map(item => ({
          id: item.id!,
          tracker_user_id: item.tracker_user_id!,
          player_id: item.player_id!,
          player_team_id: (item.player_team_id as 'home' | 'away') || 'home',
          assigned_event_types: item.assigned_event_types || [],
          tracker_name: item.tracker_name || undefined,
          tracker_email: item.tracker_email || undefined,
        }));

      setAssignments(transformedAssignments);
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    }
  };

  const getPlayerName = (playerId: number, teamId: 'home' | 'away') => {
    const players = teamId === 'home' ? homeTeamPlayers : awayTeamPlayers;
    const player = players.find(p => p.id === playerId);
    return player ? `#${player.jersey_number} ${player.player_name}` : `Player ${playerId}`;
  };

  const getTeamPlayers = () => {
    return selectedTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
  };

  const isAssignmentTaken = (playerId: number, teamId: 'home' | 'away', eventType: string) => {
    return assignments.some(a => 
      a.player_id === playerId && 
      a.player_team_id === teamId && 
      a.assigned_event_types.includes(eventType)
    );
  };

  const handleCreateAssignment = async () => {
    if (!selectedTracker || !selectedPlayer || !selectedEventType) {
      toast.error('Please select tracker, player, and event type');
      return;
    }

    const playerId = parseInt(selectedPlayer);
    
    if (isAssignmentTaken(playerId, selectedTeam, selectedEventType)) {
      toast.error('This player-event combination is already assigned');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_tracker_assignments')
        .insert([{
          match_id: matchId,
          tracker_user_id: selectedTracker,
          player_id: playerId,
          player_team_id: selectedTeam,
          assigned_event_types: [selectedEventType]
        }]);

      if (error) throw error;

      toast.success('Specialized assignment created successfully');
      setSelectedTracker('');
      setSelectedPlayer('');
      setSelectedEventType('');
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

  // Create assignment matrix for visualization
  const createAssignmentMatrix = () => {
    const allPlayers = [
      ...homeTeamPlayers.map(p => ({ ...p, team: 'home' as const })),
      ...awayTeamPlayers.map(p => ({ ...p, team: 'away' as const }))
    ];

    return allPlayers.map(player => {
      const playerAssignments = assignments.filter(a => 
        a.player_id === player.id && a.player_team_id === player.team
      );
      
      return {
        player,
        assignments: playerAssignments,
        eventTypes: EVENT_TYPES.map(eventType => ({
          eventType,
          isAssigned: playerAssignments.some(a => a.assigned_event_types.includes(eventType)),
          assignment: playerAssignments.find(a => a.assigned_event_types.includes(eventType))
        }))
      };
    });
  };

  const assignmentMatrix = createAssignmentMatrix();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Specialized Tracker Assignment
          </CardTitle>
          <p className="text-sm text-gray-600">
            Assign one tracker to track one specific event type for one player
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assignment Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {getTeamPlayers().map(player => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      #{player.jersey_number} {player.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(eventType => (
                    <SelectItem 
                      key={eventType} 
                      value={eventType}
                      disabled={selectedPlayer ? isAssignmentTaken(parseInt(selectedPlayer), selectedTeam, eventType) : false}
                    >
                      {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                      {selectedPlayer && isAssignmentTaken(parseInt(selectedPlayer), selectedTeam, eventType) && 
                        <span className="ml-2 text-red-500">(Taken)</span>
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleCreateAssignment} 
                disabled={loading || !selectedTracker || !selectedPlayer || !selectedEventType}
                className="w-full"
              >
                Assign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assignment Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignmentMatrix.map(({ player, assignments, eventTypes }) => (
              <div key={`${player.team}-${player.id}`} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={player.team === 'home' ? 'default' : 'secondary'}>
                      {player.team === 'home' ? 'Home' : 'Away'}
                    </Badge>
                    <span className="font-medium">
                      #{player.jersey_number} {player.player_name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {assignments.length} assignments
                  </div>
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                  {eventTypes.map(({ eventType, isAssigned, assignment }) => (
                    <div
                      key={eventType}
                      className={`p-2 rounded text-xs text-center ${
                        isAssigned 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <div className="font-medium">{eventType}</div>
                      {isAssigned && assignment && (
                        <div className="mt-1">
                          <div className="truncate">{assignment.tracker_name || 'Unknown'}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 mt-1"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecializedTrackerAssignment;
