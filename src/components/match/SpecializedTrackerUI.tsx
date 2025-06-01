
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, User, Clock } from 'lucide-react';
import { EventType } from '@/types';

interface SpecializedTrackerUIProps {
  assignedPlayer: {
    id: number;
    name: string;
    jerseyNumber: number;
    teamId: 'home' | 'away';
    teamName: string;
  };
  assignedEventType: string;
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void;
  matchId: string;
  eventCount: number;
  lastEventTime?: number;
}

const SpecializedTrackerUI: React.FC<SpecializedTrackerUIProps> = ({
  assignedPlayer,
  assignedEventType,
  recordEvent,
  matchId,
  eventCount,
  lastEventTime
}) => {
  const handleEventRecord = () => {
    recordEvent(
      assignedEventType as EventType,
      assignedPlayer.id,
      assignedPlayer.teamId
    );
  };

  const formatLastEventTime = (timestamp?: number) => {
    if (!timestamp) return 'No events yet';
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  };

  const getEventTypeDescription = (eventType: string) => {
    const descriptions: Record<string, string> = {
      pass: 'Record when player makes a pass',
      shot: 'Record when player takes a shot',
      goal: 'Record when player scores',
      foul: 'Record when player commits a foul',
      tackle: 'Record when player makes a tackle',
      interception: 'Record when player intercepts',
      cross: 'Record when player makes a cross',
      header: 'Record when player heads the ball',
      clearance: 'Record when player clears the ball'
    };
    return descriptions[eventType] || `Record ${eventType} events`;
  };

  return (
    <div className="space-y-4">
      {/* Assignment Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-blue-600" />
            Specialized Tracking Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-600" />
            <div>
              <span className="font-medium">#{assignedPlayer.jerseyNumber} {assignedPlayer.name}</span>
              <Badge 
                variant={assignedPlayer.teamId === 'home' ? 'default' : 'secondary'}
                className="ml-2"
              >
                {assignedPlayer.teamName}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-gray-600" />
            <div>
              <span className="font-medium capitalize">{assignedEventType}</span>
              <span className="text-sm text-gray-600 ml-2">events only</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 bg-white/50 p-2 rounded">
            {getEventTypeDescription(assignedEventType)}
          </div>
        </CardContent>
      </Card>

      {/* Recording Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Record {assignedEventType.charAt(0).toUpperCase() + assignedEventType.slice(1)}</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">
                {formatLastEventTime(lastEventTime)}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button
              onClick={handleEventRecord}
              size="lg"
              className="w-full h-20 text-xl font-semibold bg-green-600 hover:bg-green-700"
            >
              Record {assignedEventType.charAt(0).toUpperCase() + assignedEventType.slice(1)}
            </Button>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{eventCount}</div>
            <div className="text-sm text-gray-600">events recorded</div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Tracking Instructions:</h4>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>• Focus only on player #{assignedPlayer.jerseyNumber}</li>
            <li>• Record only {assignedEventType} events</li>
            <li>• Tap the button immediately when the event occurs</li>
            <li>• Ignore all other events and players</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecializedTrackerUI;
