
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import MatchEventsTimeline from '@/components/match/MatchEventsTimeline';
import { Team, MatchEvent, Statistics } from '@/types';

interface MainTabContentProps {
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  statistics: Statistics;
  onEventDelete: (eventId: string) => Promise<void>;
}

const MainTabContent: React.FC<MainTabContentProps> = ({
  homeTeam,
  awayTeam,
  events,
  statistics,
  onEventDelete,
}) => {
  // Helper function to safely render statistics values
  const renderStatValue = (value: any) => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      if ('total' in value) {
        return value.total;
      }
      if ('successful' in value && 'attempted' in value) {
        return `${value.successful}/${value.attempted}`;
      }
      if ('onTarget' in value && 'offTarget' in value) {
        return `${value.onTarget + value.offTarget}`;
      }
    }
    return 0;
  };

  // Safely access values from both home and away teams
  const { home, away } = statistics;

  return (
    <div className="space-y-6">
      {/* Match Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Match Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <h3 className="font-semibold text-lg">{homeTeam.name}</h3>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Statistic</h3>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{awayTeam.name}</h3>
            </div>
            
            {/* Possession */}
            <div className="text-2xl font-bold">
              {home?.possessionPercentage || 0}%
            </div>
            <div className="text-sm text-gray-600">Possession</div>
            <div className="text-2xl font-bold">
              {away?.possessionPercentage || 0}%
            </div>
            
            {/* Shots */}
            <div className="text-2xl font-bold">
              {home?.shots || 0}
            </div>
            <div className="text-sm text-gray-600">Shots</div>
            <div className="text-2xl font-bold">
              {away?.shots || 0}
            </div>
            
            {/* Shots on Target */}
            <div className="text-2xl font-bold">
              {home?.shotsOnTarget || 0}
            </div>
            <div className="text-sm text-gray-600">Shots on Target</div>
            <div className="text-2xl font-bold">
              {away?.shotsOnTarget || 0}
            </div>
            
            {/* Passes */}
            <div className="text-2xl font-bold">
              {home?.passesCompleted || 0}/{home?.passesAttempted || 0}
            </div>
            <div className="text-sm text-gray-600">Passes</div>
            <div className="text-2xl font-bold">
              {away?.passesCompleted || 0}/{away?.passesAttempted || 0}
            </div>
            
            {/* Balls Played */}
            <div className="text-2xl font-bold">
              {home?.ballsPlayed || 0}
            </div>
            <div className="text-sm text-gray-600">Balls Played</div>
            <div className="text-2xl font-bold">
              {away?.ballsPlayed || 0}
            </div>
            
            {/* Balls Lost */}
            <div className="text-2xl font-bold">
              {home?.ballsLost || 0}
            </div>
            <div className="text-sm text-gray-600">Balls Lost</div>
            <div className="text-2xl font-bold">
              {away?.ballsLost || 0}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerStatsTable 
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </CardContent>
      </Card>

      {/* Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Match Events</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchEventsTimeline 
            events={events}
            onEventDelete={onEventDelete}
            onEventSelect={(event: MatchEvent) => console.log('Event selected:', event)}
            onEventUpdate={(event: MatchEvent) => console.log('Event updated:', event)}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MainTabContent;
