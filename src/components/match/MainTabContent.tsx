
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw } from 'lucide-react';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import { Match, Team, MatchEvent, Statistics, BallTrackingPoint, TimelineEvent } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MainTabContentProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  statistics: Statistics;
  ballTrackingData: BallTrackingPoint[];
  timerValue: number;
  timerStatus: 'running' | 'stopped' | 'paused';
  onTimerStart: () => void;
  onTimerStop: () => void;
  onTimerReset: () => void;
  onEventDelete: (eventId: string) => Promise<void>;
}

const MainTabContent: React.FC<MainTabContentProps> = ({
  match,
  homeTeam,
  awayTeam,
  events,
  statistics,
  ballTrackingData,
  timerValue,
  timerStatus,
  onTimerStart,
  onTimerStop,
  onTimerReset,
  onEventDelete
}) => {
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<TimelineEvent | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineEventClick = (event: TimelineEvent) => {
    setSelectedTimelineEvent(event);
  };

  return (
    <div className="space-y-6">
      {/* Timer and Match Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Match Timer</span>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-mono font-bold">
                {formatTime(timerValue)}
              </div>
              <Badge variant={timerStatus === 'running' ? 'default' : 'secondary'}>
                {timerStatus}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={timerStatus === 'running' ? onTimerStop : onTimerStart}
              variant={timerStatus === 'running' ? 'destructive' : 'default'}
            >
              {timerStatus === 'running' ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button onClick={onTimerReset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Match Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ball Flow Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <BallFlowVisualization
                  ballTrackingPoints={ballTrackingData}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Player Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerStatsTable
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  events={events}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Events Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <MatchEventsTimeline
                events={events}
                onEventDelete={onEventDelete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Possession</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{homeTeam.name}</span>
                    <span>{statistics.possession?.home || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{awayTeam.name}</span>
                    <span>{statistics.possession?.away || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{homeTeam.name}</span>
                    <span>{statistics.shots?.home || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{awayTeam.name}</span>
                    <span>{statistics.shots?.away || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Passes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{homeTeam.name}</span>
                    <span>{statistics.passes?.home || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{awayTeam.name}</span>
                    <span>{statistics.passes?.away || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                Advanced analytics features coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainTabContent;
