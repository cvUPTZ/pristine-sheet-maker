
import React from 'react';
import { MatchEvent } from '@/types';

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  homeTeam: any;
  awayTeam: any;
}

const MatchEventsTimeline: React.FC<MatchEventsTimelineProps> = ({ events, homeTeam, awayTeam }) => {
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return '⚽';
      case 'shot':
        return '🥅';
      case 'pass':
        return '↗️';
      case 'foul':
        return '🟨';
      case 'card':
        return '🟥';
      case 'corner':
        return '🚩';
      case 'penalty':
        return '❗';
      case 'free-kick':
        return '🔄';
      case 'offside':
        return '🚩';
      case 'goal-kick':
        return '🥅';
      case 'throw-in':
        return '↩️';
      default:
        return '●';
    }
  };
  
  const getPlayerName = (teamId: string, playerId: number) => {
    const team = teamId === 'home' ? homeTeam : awayTeam;
    const player = team.players.find((p: any) => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}'${remainingSeconds > 0 ? `${remainingSeconds}"` : ''}`;
  };
  
  if (sortedEvents.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No events recorded</div>;
  }
  
  return (
    <div className="space-y-4">
      {sortedEvents.map((event) => {
        const teamColor = event.teamId === 'home' ? 'bg-football-home' : 'bg-football-away';
        const teamName = event.teamId === 'home' ? homeTeam.name : awayTeam.name;
        const playerName = getPlayerName(event.teamId, event.playerId);
        const eventType = event.type.charAt(0).toUpperCase() + event.type.slice(1).replace('-', ' ');

        let statusStyle: React.CSSProperties = {};
        let statusText = '';

        if (event.status === 'pending_confirmation') {
          statusStyle = { opacity: 0.6, fontStyle: 'italic' };
          statusText = '(Pending)';
        } else if (event.status === 'failed') {
          statusStyle = { textDecoration: 'line-through', color: 'red' };
          statusText = '(Failed)';
        }
        
        return (
          <div key={event.id} className="flex items-start" style={statusStyle}>
            <div className="flex-none w-14 text-right font-mono font-medium text-sm mt-1">
              {formatTime(event.timestamp)}
            </div>
            
            <div className={`flex-none w-5 h-5 mx-3 rounded-full ${teamColor} flex items-center justify-center text-xs text-white`}>
              {getEventIcon(event.type)}
            </div>
            
            <div className="flex-1">
              <div className="font-medium">
                {eventType} {statusText && <span className="text-xs ml-1">{statusText}</span>}
              </div>
              <div className="text-sm text-muted-foreground">
                {playerName}, {teamName}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Position: {event.coordinates.x.toFixed(2)}, {event.coordinates.y.toFixed(2)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MatchEventsTimeline;
