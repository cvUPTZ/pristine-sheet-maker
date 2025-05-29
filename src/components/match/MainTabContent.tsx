import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import MatchEventsTimeline from '@/components/match/MatchEventsTimeline';
import FootballPitch from '@/components/FootballPitch';
import { useMatchState } from '@/hooks/useMatchState';
import { useBreakpoint } from '@/hooks/use-mobile';
import { BallFlowVisualization } from '@/components/visualizations/BallFlowVisualization';
import { PlayerStatsTable } from '@/components/visualizations/PlayerStatsTable';
import { MatchEvent, TimelineEvent } from '@/types/index';

interface MainTabContentProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFormation: string;
  awayTeamFormation: string;
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
  onEventRecord: (event: any) => void;
}

const MainTabContent: React.FC<MainTabContentProps> = ({ 
  matchId,
  homeTeamName,
  awayTeamName,
  homeTeamFormation,
  awayTeamFormation,
  homeTeamPlayers,
  awayTeamPlayers,
  onEventRecord
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [ballTrackingData, setBallTrackingData] = useState<any[]>([]);
  const { match, fetchMatch } = useMatchState(matchId);
  const isMobile = useBreakpoint('md');

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/match/${matchId}/events`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Could not fetch events:", error);
      }
    };

    fetchEvents();
  }, [matchId]);

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      const response = await fetch(`/api/match/${matchId}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      setSelectedEvent(null);
    } catch (error) {
      console.error("Could not delete event:", error);
    }
  };

  const handleBallTrackingData = (data: any) => {
    setBallTrackingData(data);
  };

  // Convert TimelineEvent to MatchEvent format
  const convertTimelineToMatchEvents = (timelineEvents: TimelineEvent[]): MatchEvent[] => {
    return timelineEvents.map(event => ({
      id: event.id,
      matchId: event.matchId,
      type: event.type,
      timestamp: event.timestamp,
      playerId: event.playerId,
      teamId: event.teamId,
      coordinates: event.coordinates
    }));
  };

  const homeTeamStats = [
    { name: 'Possession', value: match?.statistics?.home?.possession },
    { name: 'Shots', value: match?.statistics?.home?.shots },
    { name: 'Shots on Target', value: match?.statistics?.home?.shotsOnTarget },
    { name: 'Corners', value: match?.statistics?.home?.corners },
    { name: 'Fouls', value: match?.statistics?.home?.fouls },
    { name: 'Yellow Cards', value: match?.statistics?.home?.yellowCards },
    { name: 'Red Cards', value: match?.statistics?.home?.redCards },
  ];

  const awayTeamStats = [
    { name: 'Possession', value: match?.statistics?.away?.possession },
    { name: 'Shots', value: match?.statistics?.away?.shots },
    { name: 'Shots on Target', value: match?.statistics?.away?.shotsOnTarget },
    { name: 'Corners', value: match?.statistics?.away?.corners },
    { name: 'Fouls', value: match?.statistics?.away?.fouls },
    { name: 'Yellow Cards', value: match?.statistics?.away?.yellowCards },
    { name: 'Red Cards', value: match?.statistics?.away?.redCards },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Match Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Home Team</p>
                <p className="text-base">{homeTeamName}</p>
                <p className="text-sm text-gray-500">Formation: {homeTeamFormation}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Away Team</p>
                <p className="text-base">{awayTeamName}</p>
                <p className="text-sm text-gray-500">Formation: {awayTeamFormation}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <h4 className="text-md font-semibold mb-2">Ball Tracking Data</h4>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const jsonData = JSON.parse(event.target?.result as string);
                      handleBallTrackingData(jsonData);
                    } catch (error) {
                      console.error("Error parsing JSON:", error);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Team Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-md font-semibold mb-2">{homeTeamName} Stats</h4>
                <PlayerStatsTable stats={homeTeamStats} />
              </div>
              <div>
                <h4 className="text-md font-semibold mb-2">{awayTeamName} Stats</h4>
                <PlayerStatsTable stats={awayTeamStats} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Ball Flow Visualization</h3>
            <BallFlowVisualization
              homePlayers={homeTeamPlayers}
              awayPlayers={awayTeamPlayers}
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card className="h-[500px]">
          <CardContent className="p-4">
            <FootballPitch
              homeTeam={{ name: homeTeamName, formation: homeTeamFormation, players: homeTeamPlayers }}
              awayTeam={{ name: awayTeamName, formation: awayTeamFormation, players: awayTeamPlayers }}
              ballTrackingPoints={ballTrackingData}
              onPitchClick={() => { }}
              selectedPlayer={null}
              selectedTeam="home"
              onPlayerSelect={() => { }}
              events={convertTimelineToMatchEvents(events)}
            />
          </CardContent>
        </Card>
        
        <MatchEventsTimeline 
          events={convertTimelineToMatchEvents(events)} 
          onEventClick={handleEventClick}
          onEventDelete={handleEventDelete}
        />
        
        {selectedEvent && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">Selected Event</h3>
              <p>Type: {selectedEvent.type}</p>
              <p>Timestamp: {new Date(selectedEvent.timestamp).toLocaleString()}</p>
              {selectedEvent.playerId && <p>Player ID: {selectedEvent.playerId}</p>}
              {selectedEvent.teamId && <p>Team: {selectedEvent.teamId}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MainTabContent;
