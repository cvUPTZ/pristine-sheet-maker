
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Flag, TableIcon, ActivityIcon, MapPinIcon, Clock } from 'lucide-react';
import PitchView from './PitchView';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import { BallTrackingPoint, EventType, Player, PlayerStatistics, Statistics, TimeSegmentStatistics } from '@/types';
import MatchRadarChart from '@/components/visualizations/MatchRadarChart';
import PlayerHeatmap from '@/components/visualizations/PlayerHeatmap';
import PianoInput from './PianoInput';
import TimeSegmentChart from '@/components/visualizations/TimeSegmentChart';
import PianoIcon from '@/components/ui/icons/PianoIcon';

interface MainTabContentProps {
  activeTab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline';
  setActiveTab: (tab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline') => void;
  homeTeam: any;
  awayTeam: any;
  teamPositions: Record<number, { x: number; y: number }>;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: BallTrackingPoint[];
  mode: 'piano' | 'tracking';
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  statistics: Statistics;
  playerStats: PlayerStatistics[];
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments?: TimeSegmentStatistics[];
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
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
  playerStats,
  handleUndo,
  handleSave,
  timeSegments = [],
  recordEvent
}) => {
  const [statsView, setStatsView] = useState<'summary' | 'radar' | 'heatmap' | 'timeline'>('summary');
  const [tableView, setTableView] = useState<'individual' | 'team'>('individual');
  const [timelineView, setTimelineView] = useState<'ballsPlayed' | 'possession' | 'recoveryTime'>('ballsPlayed');
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="mb-4 overflow-x-auto flex w-full justify-start lg:justify-center no-scrollbar">
          <TabsTrigger value="pitch" className="flex items-center gap-1">
            <Flag className="h-4 w-4" />
            Pitch
          </TabsTrigger>
          <TabsTrigger value="piano" className="flex items-center gap-1">
            <PianoIcon className="h-4 w-4" />
            Piano
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-1">
            <TableIcon className="h-4 w-4" />
            Detailed Stats
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pitch">
          <PitchView
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            teamPositions={teamPositions}
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            handlePlayerSelect={handlePlayerSelect}
            ballTrackingPoints={ballTrackingPoints}
            mode={mode}
            handlePitchClick={handlePitchClick}
            addBallTrackingPoint={addBallTrackingPoint}
          />
        </TabsContent>
        
        <TabsContent value="piano">
          <PianoInput
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            onRecordEvent={recordEvent}
            teamPositions={teamPositions}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
          />
        </TabsContent>
        
        <TabsContent value="stats">
          <div className="mb-4">
            <Tabs value={statsView} onValueChange={(value: any) => setStatsView(value)}>
              <TabsList className="mb-4 w-full md:w-auto">
                <TabsTrigger value="summary" className="text-xs md:text-sm">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="radar" className="text-xs md:text-sm">
                  <ActivityIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Radar Chart
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="text-xs md:text-sm">
                  <MapPinIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Heatmap
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary">
                <Card className="p-4 bg-white shadow-md">
                  <StatisticsDisplay 
                    statistics={statistics}
                    homeTeamName={homeTeam.name}
                    awayTeamName={awayTeam.name}
                  />
                </Card>
              </TabsContent>
              
              <TabsContent value="radar">
                <MatchRadarChart 
                  statistics={statistics} 
                  homeTeamName={homeTeam.name} 
                  awayTeamName={awayTeam.name}
                />
              </TabsContent>
              
              <TabsContent value="heatmap">
                <PlayerHeatmap 
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  teamPositions={teamPositions}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
        
        <TabsContent value="details">
          <Card className="p-4 bg-white shadow-md">
            <div className="flex justify-start mb-4 gap-2">
              <Button
                variant={tableView === 'individual' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTableView('individual')}
              >
                Individual Stats
              </Button>
              <Button 
                variant={tableView === 'team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTableView('team')}
              >
                Team Stats
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <DetailedStatsTable 
                playerStats={playerStats} 
                type={tableView}
                teamId={tableView === 'team' ? selectedTeam : undefined} 
              />
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <Card className="p-4 bg-white shadow-md">
            <div className="flex justify-start mb-4 gap-2 overflow-x-auto">
              <Button
                variant={timelineView === 'ballsPlayed' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimelineView('ballsPlayed')}
              >
                Balls Played
              </Button>
              <Button 
                variant={timelineView === 'possession' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView('possession')}
              >
                Possession
              </Button>
              <Button 
                variant={timelineView === 'recoveryTime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView('recoveryTime')}
              >
                Recovery Time
              </Button>
            </div>
            
            {timeSegments && timeSegments.length > 0 ? (
              <TimeSegmentChart
                timeSegments={timeSegments}
                homeTeamName={homeTeam.name}
                awayTeamName={awayTeam.name}
                dataKey={timelineView}
                title={`${timelineView.charAt(0).toUpperCase() + timelineView.slice(1).replace(/([A-Z])/g, ' $1')} by Time Segment`}
                description="Analysis of match progression in 5-minute intervals"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No timeline data available
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
        <Button 
          variant="outline" 
          onClick={handleUndo}
        >
          Undo Last Action
        </Button>
        <Button 
          variant="outline"
          onClick={handleSave}
        >
          Save Match Data
        </Button>
      </div>
    </div>
  );
};

export default MainTabContent;
