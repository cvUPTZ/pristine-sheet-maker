
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PitchView from '@/components/match/PitchView';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import PlayerHeatmap from '@/components/visualizations/PlayerHeatmap';
import TeamTimeSegmentCharts from '@/components/visualizations/TeamTimeSegmentCharts';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import PianoInput from '@/components/match/PianoInput';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import VideoAnalyzer from '@/components/VideoAnalyzer';
import DedicatedTrackerUI from '@/components/match/DedicatedTrackerUI';
import { Statistics, TimeSegmentStatistics, Team } from '@/types';

const EVENT_TYPES = [
  { id: 'pass', label: 'Pass' },
  { id: 'shot', label: 'Shot' },
  { id: 'tackle', label: 'Tackle' },
  { id: 'foul', label: 'Foul' },
  { id: 'corner', label: 'Corner' },
  { id: 'offside', label: 'Offside' },
  { id: 'yellowCard', label: 'Yellow Card' },
  { id: 'redCard', label: 'Red Card' },
  { id: 'substitution', label: 'Substitution' },
  { id: 'possession', label: 'Possession' },
  { id: 'ballLost', label: 'Ball Lost' },
  { id: 'ballRecovered', label: 'Ball Recovered' },
  { id: 'dribble', label: 'Dribble' },
  { id: 'cross', label: 'Cross' },
  { id: 'clearance', label: 'Clearance' },
  { id: 'block', label: 'Block' },
  { id: 'interception', label: 'Interception' },
  { id: 'save', label: 'Save' },
  { id: 'penalty', label: 'Penalty' },
  { id: 'ownGoal', label: 'Own Goal' },
  { id: 'freeKick', label: 'Free Kick' },
  { id: 'throwIn', label: 'Throw In' },
  { id: 'goalKick', label: 'Goal Kick' },
  { id: 'aerialDuel', label: 'Aerial Duel' },
  { id: 'groundDuel', label: 'Ground Duel' }
];

interface MainTabContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  homeTeam: Team;
  awayTeam: Team;
  teamPositions: Record<string, Record<number, { x: number; y: number }>>;
  selectedPlayer: number | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (playerId: number) => void;
  ballTrackingPoints: Array<{ x: number; y: number; timestamp: number }>;
  mode: 'select' | 'ball';
  handlePitchClick: (event: any) => void;
  addBallTrackingPoint: (point: { x: number; y: number }) => void;
  statistics: Statistics;
  setStatistics: (stats: Statistics) => void;
  playerStats: any;
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments: TimeSegmentStatistics[];
  recordEvent: (eventType: string, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
  assignedPlayerForMatch: { id: number; name: string; teamId: 'home' | 'away'; teamName: string } | null;
  assignedEventTypes: string[];
  userRole: string | null;
  matchId: string;
}

const MainTabContent: React.FC<MainTabContentProps> = ({
  activeTab,
  setActiveTab,
  homeTeam,
  awayTeam,
  teamPositions,
  selectedPlayer,
  selectedTeam,
  setSelectedTeam,
  handlePlayerSelect,
  ballTrackingPoints,
  mode,
  handlePitchClick,
  addBallTrackingPoint,
  statistics,
  setStatistics,
  playerStats,
  handleUndo,
  handleSave,
  timeSegments,
  recordEvent,
  assignedPlayerForMatch,
  assignedEventTypes,
  userRole,
  matchId
}) => {
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);

  const toggleEventType = (eventType: string) => {
    setSelectedEventTypes(prev =>
      prev.includes(eventType)
        ? prev.filter(type => type !== eventType)
        : [...prev, eventType]
    );
  };

  const filteredTimeSegments = useMemo(() => {
    if (selectedEventTypes.length === 0) return timeSegments;
    return timeSegments.map(segment => ({
      ...segment,
      // Fix: TimeSegmentStatistics might not have events property
      events: (segment as any).events?.filter((event: any) => selectedEventTypes.includes(event.type)) || []
    }));
  }, [timeSegments, selectedEventTypes]);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="pitch">Pitch</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="piano">Piano</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="fast-track">Fast Track</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="pitch" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <PitchView
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  teamPositions={teamPositions}
                  selectedPlayer={selectedPlayer}
                  selectedTeam={selectedTeam}
                  onTeamSelect={setSelectedTeam}
                  onPlayerSelect={handlePlayerSelect}
                  ballTrackingPoints={ballTrackingPoints}
                  mode={mode}
                  onPitchClick={handlePitchClick}
                  addBallTrackingPoint={addBallTrackingPoint}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <StatisticsDisplay statistics={statistics} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics Visualizer</CardTitle>
                </CardHeader>
                <CardContent>
                  <MatchStatsVisualizer statistics={statistics} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <TeamTimeSegmentCharts timeSegments={timeSegments} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Player Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlayerHeatmap 
                    playerPositions={Object.values(teamPositions).reduce((acc, team) => ({ ...acc, ...team }), {})}
                    selectedPlayer={selectedPlayer}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Ball Flow Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <BallFlowVisualization ballTrackingPoints={ballTrackingPoints} />
                </CardContent>
              </Card>
            </div>
            
            <DetailedStatsTable 
              homeTeamStats={statistics.home}
              awayTeamStats={statistics.away}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
            />
          </TabsContent>

          <TabsContent value="piano" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Piano Input Interface</CardTitle>
              </CardHeader>
              <CardContent>
                <PianoInput
                  onEventRecord={(eventType, playerId, team: Team, coordinates) => 
                    recordEvent(eventType, playerId, team.name === homeTeam.name ? 'home' : 'away', coordinates)
                  }
                  selectedPlayer={selectedPlayer}
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  assignedEventTypes={assignedEventTypes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Match Events Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <MatchEventsTimeline 
                  events={timeSegments.flatMap((segment: any) => segment.events || [])}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <VideoAnalyzer />
          </TabsContent>

          <TabsContent value="fast-track" className="space-y-4">
            {assignedPlayerForMatch && (
              <DedicatedTrackerUI
                assignedPlayerForMatch={assignedPlayerForMatch}
                recordEvent={recordEvent}
                assignedEventTypes={assignedEventTypes}
                matchId={matchId}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MainTabContent;
