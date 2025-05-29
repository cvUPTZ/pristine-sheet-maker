
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Clock } from 'lucide-react';
import { MatchEvent } from '@/types/index';

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  onEventSelect: (event: MatchEvent) => void;
  onEventUpdate: (event: MatchEvent) => void;
  onEventDelete: (eventId: string) => void;
}

const MatchEventsTimeline: React.FC<MatchEventsTimelineProps> = ({
  events,
  onEventSelect,
  onEventUpdate,
  onEventDelete,
}) => {
  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'goal':
        return 'bg-green-500';
      case 'foul':
        return 'bg-yellow-500';
      case 'card':
        return 'bg-red-500';
      case 'substitution':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Match Events Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No events recorded yet</p>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={event.id}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onEventSelect(event)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-3 h-3 rounded-full ${getEventColor(event.type)}`}
                  />
                  <div className="text-sm font-mono text-gray-600">
                    {formatTimestamp(event.timestamp)}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                  <div className="text-sm text-gray-700">
                    {event.teamId === 'home' ? 'Home' : 'Away'} Team
                  </div>
                  {event.playerId && (
                    <div className="text-sm text-gray-600">
                      Player #{event.playerId}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventUpdate(event);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventDelete(event.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchEventsTimeline;
