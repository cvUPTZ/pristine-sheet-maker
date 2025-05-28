import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Button } from '@/components/ui/button';
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
      events: segment.events?.filter((event: any) => selectedEventTypes.includes(event.type)) || []
    }));
  }, [timeSegments, selectedEventTypes]);

  // Get player positions for heatmap
  const allPlayerPositions = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    Object.values(teamPositions).forEach(teamPos => {
      Object.entries(teamPos).forEach(([playerId, pos]) => {
        positions[parseInt(playerId)] = pos;
      });
    });
    return positions;
  }, [teamPositions]);

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
            <StatisticsDisplay 
              statistics={statistics}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics Visualizer</CardTitle>
                </CardHeader>
                <CardContent>
                  <MatchStatsVisualizer 
                    homeStats={statistics.home}
                    awayStats={statistics.away}
                    homeTeamName={homeTeam.name}
                    awayTeamName={awayTeam.name}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <TeamTimeSegmentCharts 
                    timeSegments={timeSegments}
                    homeTeamName={homeTeam.name}
                    awayTeamName={awayTeam.name}
                  />
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
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    selectedPlayer={selectedPlayer}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Ball Flow Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <BallFlowVisualization 
                    ballTrackingPoints={ballTrackingPoints}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                  />
                </CardContent>
              </Card>
            </div>
            
            <DetailedStatsTable 
              statistics={statistics}
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
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
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