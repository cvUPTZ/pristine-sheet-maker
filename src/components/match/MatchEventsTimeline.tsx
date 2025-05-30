
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Clock } from 'lucide-react';
import { MatchEvent, Player, Team } from '@/types';

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  onEventSelect?: (event: MatchEvent) => void;
  onEventUpdate?: (event: MatchEvent) => void;
  onEventDelete: (eventId: string) => Promise<void>;
  homeTeam?: Team;
  awayTeam?: Team;
}

const MatchEventsTimeline: React.FC<MatchEventsTimelineProps> = ({
  events,
  onEventSelect,
  onEventUpdate,
  onEventDelete,
  homeTeam,
  awayTeam
}) => {
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const getPlayerName = (player: Player | undefined): string => {
    if (!player) return 'Unknown Player';
    return player.name || player.player_name || `Player ${player.number || player.jersey_number || '?'}`;
  };

  const getTeamName = (team: 'home' | 'away' | undefined): string => {
    if (!team) return 'Unknown Team';
    if (team === 'home') return homeTeam?.name || 'Home Team';
    return awayTeam?.name || 'Away Team';
  };

  const formatTime = (timestamp: number): string => {
    const minutes = Math.floor(timestamp / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEventIcon = (eventType: string): string => {
    switch (eventType) {
      case 'goal': return '⚽';
      case 'card': return '🟨';
      case 'yellowCard': return '🟨';
      case 'redCard': return '🟥';
      case 'substitution': return '🔄';
      case 'corner': return '📐';
      case 'offside': return '🚩';
      case 'foul': return '⚠️';
      case 'pass': return '🏃';
      case 'shot': return '🎯';
      case 'tackle': return '⚔️';
      default: return '⚪';
    }
  };

  const handleDelete = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await onEventDelete(eventId);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No events recorded yet</p>
        <p className="text-sm">Events will appear here as they are tracked during the match</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedEvents.map((event) => (
        <div
          key={event.id}
          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
            event.team === 'home' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-red-500'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="text-2xl">{getEventIcon(event.type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {formatTime(event.timestamp)}
                </Badge>
                <Badge variant={event.team === 'home' ? 'default' : 'secondary'}>
                  {getTeamName(event.team)}
                </Badge>
              </div>
              <div className="font-medium capitalize">{event.type.replace(/([A-Z])/g, ' $1').trim()}</div>
              {event.player && (
                <div className="text-sm text-gray-600">
                  {getPlayerName(event.player)}
                </div>
              )}
              {event.description && (
                <div className="text-sm text-gray-500">{event.description}</div>
              )}
              {event.coordinates && (
                <div className="text-xs text-gray-400">
                  Position: ({Math.round(event.coordinates.x)}, {Math.round(event.coordinates.y)})
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {onEventUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEventUpdate(event)}
                title="Edit event"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onEventSelect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEventSelect(event)}
                title="View details"
              >
                View
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(event.id)}
              className="text-red-600 hover:text-red-800 hover:bg-red-50"
              title="Delete event"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchEventsTimeline;
