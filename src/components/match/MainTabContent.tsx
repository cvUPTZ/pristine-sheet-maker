
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Save, Undo } from 'lucide-react';
import PitchView from './PitchView';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import { PianoInput } from './PianoInput';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import TimeSegmentChart from '@/components/visualizations/TimeSegmentChart';
import DedicatedTrackerUI from '@/components/match/DedicatedTrackerUI';
import { Team, Player, MatchEvent, EventType, Statistics, TimeSegmentStatistics } from '@/types';
import { EventType as PianoEventType, AssignedPlayers } from './types';

interface AssignedPlayerForMatch {
  id: string | number;
  name: string;
  teamId: 'home' | 'away';
  teamName: string;
}

interface MainTabContentProps {
  matchId: string;
  userRole: string;
  assignedPlayerForMatch?: AssignedPlayerForMatch | null;
  assignedEventTypes?: string[];
  
  activeTab: string;
  setActiveTab: (tab: string) => void;
  homeTeam: Team;
  awayTeam: Team;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: Array<{ x: number; y: number; timestamp: number }>;
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: { x: number; y: number }) => void;
  statistics: Statistics | null;
  setStatistics: (stats: Statistics) => void;
  playerStats: any;
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments: TimeSegmentStatistics[];
  recordEvent: (eventType: EventType, playerId: string | number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void;
  events: MatchEvent[];
  fullMatchRoster?: AssignedPlayers | null;
  assignedPlayers?: AssignedPlayers | null;
  assignedEventTypesList?: PianoEventType[] | null;
}

const MainTabContent: React.FC<MainTabContentProps> = ({
  matchId,
  userRole,
  assignedPlayerForMatch,
  assignedEventTypes = [],
  
  activeTab,
  setActiveTab,
  homeTeam,
  awayTeam,
  selectedPlayer,
  selectedTeam,
  setSelectedTeam,
  handlePlayerSelect,
  ballTrackingPoints,
  handlePitchClick,
  addBallTrackingPoint,
  statistics,
  setStatistics,
  playerStats,
  handleUndo,
  handleSave,
  timeSegments,
  recordEvent,
  events,
  fullMatchRoster = null,
  assignedPlayers = null,
  assignedEventTypesList = null
}) => {
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleTimerToggle = () => {
    setTimerRunning(!timerRunning);
  };

  const handleTimerReset = () => {
    setElapsedTime(0);
    setTimerRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEventRecord = (eventType: PianoEventType, player?: any, details?: Record<string, any>) => {
    if (player) {
      recordEvent(eventType.key as EventType, player.id, player.team_context === 'home' ? 'home' : 'away');
    }
  };

  // For tracker role, show only assigned tabs
  const getAvailableTabs = () => {
    if (userRole === 'tracker') {
      return ['piano']; // Trackers only get piano input
    }
    return ['pitch', 'piano', 'statistics', 'timeline', 'analytics'];
  };

  const availableTabs = getAvailableTabs();

  return (
    <div className="space-y-4">
      {/* Timer and Action Controls - Only for admin */}
      {userRole === 'admin' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Match Timer</span>
              <div className="text-2xl font-mono">
                {formatTime(elapsedTime)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex gap-2">
              <Button
                onClick={handleTimerToggle}
                variant={timerRunning ? "destructive" : "default"}
                size="sm"
              >
                {timerRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {timerRunning ? 'Pause' : 'Start'}
              </Button>
              <Button onClick={handleTimerReset} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} variant="secondary" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleUndo} variant="outline" size="sm">
                <Undo className="w-4 h-4 mr-2" />
                Undo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dedicated Tracker UI for tracker role */}
      {userRole === 'tracker' && assignedPlayerForMatch && (
        <DedicatedTrackerUI
          assignedPlayerForMatch={assignedPlayerForMatch}
          recordEvent={recordEvent}
          assignedEventTypes={assignedEventTypes}
          matchId={matchId}
        />
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
          {availableTabs.includes('pitch') && <TabsTrigger value="pitch">Pitch View</TabsTrigger>}
          {availableTabs.includes('piano') && <TabsTrigger value="piano">Piano Input</TabsTrigger>}
          {availableTabs.includes('statistics') && <TabsTrigger value="statistics">Statistics</TabsTrigger>}
          {availableTabs.includes('timeline') && <TabsTrigger value="timeline">Timeline</TabsTrigger>}
          {availableTabs.includes('analytics') && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        {availableTabs.includes('pitch') && (
          <TabsContent value="pitch" className="space-y-4">
            <PitchView
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              selectedPlayer={selectedPlayer}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              handlePlayerSelect={handlePlayerSelect}
              ballTrackingPoints={ballTrackingPoints}
              handlePitchClick={handlePitchClick}
              addBallTrackingPoint={addBallTrackingPoint}
              recordEvent={recordEvent}
              events={events}
            />
          </TabsContent>
        )}

        {availableTabs.includes('piano') && (
          <TabsContent value="piano" className="space-y-4">
            <PianoInput
              fullMatchRoster={fullMatchRoster}
              assignedEventTypes={assignedEventTypesList}
              assignedPlayers={assignedPlayers}
              onEventRecord={handleEventRecord}
            />
          </TabsContent>
        )}

        {availableTabs.includes('statistics') && (
          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StatisticsDisplay
                statistics={statistics}
                homeTeamName={homeTeam.name}
                awayTeamName={awayTeam.name}
              />
              <DetailedStatsTable
                statistics={statistics || {
                  home: { passes: 0, shots: 0, tackles: 0, fouls: 0, possession: 50 },
                  away: { passes: 0, shots: 0, tackles: 0, fouls: 0, possession: 50 },
                  possession: { home: 50, away: 50 },
                  shots: {
                    home: { onTarget: 0, offTarget: 0 },
                    away: { onTarget: 0, offTarget: 0 }
                  },
                  passes: {
                    home: { successful: 0, attempted: 0 },
                    away: { successful: 0, attempted: 0 }
                  },
                  ballsPlayed: { home: 0, away: 0 },
                  ballsLost: { home: 0, away: 0 },
                  duels: {
                    home: { won: 0, lost: 0, aerial: 0 },
                    away: { won: 0, lost: 0, aerial: 0 }
                  },
                  cards: {
                    home: { yellow: 0, red: 0 },
                    away: { yellow: 0, red: 0 }
                  },
                  crosses: {
                    home: { total: 0, successful: 0 },
                    away: { total: 0, successful: 0 }
                  },
                  dribbles: {
                    home: { successful: 0, attempted: 0 },
                    away: { successful: 0, attempted: 0 }
                  },
                  corners: { home: 0, away: 0 },
                  offsides: { home: 0, away: 0 },
                  freeKicks: { home: 0, away: 0 }
                }}
                homeTeamName={homeTeam.name}
                awayTeamName={awayTeam.name}
              />
            </div>
          </TabsContent>
        )}

        {availableTabs.includes('timeline') && (
          <TabsContent value="timeline" className="space-y-4">
            <MatchEventsTimeline
              events={events.map(event => ({
                time: event.timestamp,
                label: event.type,
              }))}
            />
          </TabsContent>
        )}

        {availableTabs.includes('analytics') && (
          <TabsContent value="analytics" className="space-y-4">
            {timeSegments.length > 0 ? (
              <div className="grid gap-4">
                <TimeSegmentChart
                  timeSegments={timeSegments}
                  homeTeamName={homeTeam.name}
                  awayTeamName={awayTeam.name}
                  dataKey="possession"
                  title="Possession Over Time"
                  description="Ball possession percentage by time segment"
                  chartType="area"
                />
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No analytics data available yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MainTabContent;
