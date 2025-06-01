
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users } from 'lucide-react';
import { Assignment, EVENT_TYPES, Player } from '../types/TrackerAssignmentTypes';

interface AssignmentMatrixProps {
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
  assignments: Assignment[];
  onDeleteAssignment: (assignmentId: string) => void;
}

const AssignmentMatrix: React.FC<AssignmentMatrixProps> = ({
  homeTeamPlayers,
  awayTeamPlayers,
  assignments,
  onDeleteAssignment
}) => {
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

  const handleDeleteAssignment = (assignmentId: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      onDeleteAssignment(assignmentId);
    }
  };

  return (
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
  );
};

export default AssignmentMatrix;
