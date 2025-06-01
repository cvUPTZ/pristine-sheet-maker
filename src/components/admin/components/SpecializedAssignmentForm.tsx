
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';
import { TrackerUser, EVENT_TYPES, Assignment } from '../types/TrackerAssignmentTypes';

interface SpecializedAssignmentFormProps {
  trackerUsers: TrackerUser[];
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
  assignments: Assignment[];
  loading: boolean;
  onCreateAssignment: (trackerId: string, playerId: number, teamId: 'home' | 'away', eventType: string) => Promise<boolean>;
}

const SpecializedAssignmentForm: React.FC<SpecializedAssignmentFormProps> = ({
  trackerUsers,
  homeTeamPlayers,
  awayTeamPlayers,
  assignments,
  loading,
  onCreateAssignment
}) => {
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedEventType, setSelectedEventType] = useState<string>('');

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
      return;
    }

    const playerId = parseInt(selectedPlayer);
    
    if (isAssignmentTaken(playerId, selectedTeam, selectedEventType)) {
      return;
    }

    const success = await onCreateAssignment(selectedTracker, playerId, selectedTeam, selectedEventType);
    if (success) {
      setSelectedTracker('');
      setSelectedPlayer('');
      setSelectedEventType('');
    }
  };

  return (
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
  );
};

export default SpecializedAssignmentForm;
