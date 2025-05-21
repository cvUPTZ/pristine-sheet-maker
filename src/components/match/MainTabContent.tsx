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
  teamPositions: Record<number, {
    x: number;
    y: number;
  }>;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: BallTrackingPoint[];
  mode: 'piano' | 'tracking';
  handlePitchClick: (coordinates: {
    x: number;
    y: number;
  }) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  statistics: Statistics;
  playerStats: PlayerStatistics[];
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments?: TimeSegmentStatistics[];
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: {
    x: number;
    y: number;
  }) => void;
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
  const [statsView, setStatsView] = useState<'summary' | 'radar' | 'heatmap' | 'timeline' | 'coach'>('summary');
  const [tableView, setTableView] = useState<'individual' | 'team'>('individual');
  const [timelineView, setTimelineView] = useState<'ballsPlayed' | 'possession' | 'recoveryTime'>('ballsPlayed');
  return <div>
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="mb-4 overflow-x-auto flex w-full justify-start lg:justify-center no-scrollbar">
          <TabsTrigger value="pitch" className="flex items-center gap-1">
            <Flag className="h-4 w-4" />
            Match Analysis
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PitchView homeTeam={homeTeam} awayTeam={awayTeam} teamPositions={teamPositions} selectedPlayer={selectedPlayer} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} handlePlayerSelect={handlePlayerSelect} ballTrackingPoints={ballTrackingPoints} mode={mode} handlePitchClick={handlePitchClick} addBallTrackingPoint={addBallTrackingPoint} />
            </div>
            <div>
              <PianoInput homeTeam={homeTeam} awayTeam={awayTeam} onRecordEvent={recordEvent} teamPositions={teamPositions} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} compact={true} />
            </div>
          </div>
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
                <TabsTrigger value="coach" className="text-xs md:text-sm">
                  Coach Analysis
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary">
                <Card className="p-4 bg-white shadow-md">
                  <StatisticsDisplay statistics={statistics} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />
                </Card>
              </TabsContent>
              
              <TabsContent value="radar">
                <MatchRadarChart statistics={statistics} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />
              </TabsContent>
              
              <TabsContent value="heatmap">
                <PlayerHeatmap homeTeam={homeTeam} awayTeam={awayTeam} teamPositions={teamPositions} selectedTeam={selectedTeam} onSelectTeam={setSelectedTeam} />
              </TabsContent>

              <TabsContent value="coach">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-white shadow-md">
                    <h3 className="text-lg font-semibold mb-2">Key Performance Insights</h3>
                    <div className="space-y-2">
                      {/* Generate some coaching insights based on the statistics */}
                      {statistics.possession.home > 60 && <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="font-medium">Strong Possession</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam.name} is dominating possession ({Math.round(statistics.possession.home)}%). 
                            Capitalize on this control with more forward passes.
                          </p>
                        </div>}
                      {statistics.possession.away > 60 && <div className="p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                          <p className="font-medium">Possession Challenge</p>
                          <p className="text-sm text-gray-600">
                            {awayTeam.name} is controlling possession ({Math.round(statistics.possession.away)}%). 
                            Consider adjusting press intensity and defensive shape.
                          </p>
                        </div>}
                      {statistics.shots.home.onTarget + statistics.shots.home.offTarget > (statistics.shots.away.onTarget + statistics.shots.away.offTarget) * 2 && <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="font-medium">Shot Dominance</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam.name} is creating significantly more shooting opportunities. 
                            Continue with the current attacking approach.
                          </p>
                        </div>}
                      {statistics.passes.home.attempted > 0 && statistics.passes.home.successful / statistics.passes.home.attempted < 0.7 && <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="font-medium">Passing Accuracy Concern</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam.name} has a low pass completion rate 
                            ({Math.round(statistics.passes.home.successful / statistics.passes.home.attempted * 100)}%). 
                            Focus on safer passing options or adjust positioning.
                          </p>
                        </div>}
                      {statistics.ballsLost.home > statistics.ballsLost.away * 1.5 && <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="font-medium">Ball Retention Issue</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam.name} is losing possession frequently. 
                            Consider adjusting buildup play and player positioning.
                          </p>
                        </div>}
                      {statistics.duels.home.won > statistics.duels.home.lost * 1.5 && <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="font-medium">Strong in Duels</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam.name} is winning most duels. 
                            Continue with physical play and direct challenges.
                          </p>
                        </div>}
                    </div>
                  </Card>

                  <Card className="p-4 bg-white shadow-md">
                    <h3 className="text-lg font-semibold mb-2">Player Recommendations</h3>
                    <div className="space-y-3">
                      {/* Top performers based on different metrics */}
                      {playerStats.filter(p => p.team === 'home').length > 0 && <>
                          <div>
                            <h4 className="font-medium text-sm">Top Passers</h4>
                            <ul className="text-sm">
                              {playerStats.filter(p => p.team === 'home').sort((a, b) => b.passes - a.passes).slice(0, 3).map((player, i) => <li key={i} className="flex justify-between py-1 border-b border-dashed">
                                    <span>#{player.player.number} {player.player.name}</span>
                                    <span>{player.passes} passes</span>
                                  </li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">Goal Threats</h4>
                            <ul className="text-sm">
                              {playerStats.filter(p => p.team === 'home').sort((a, b) => b.shots - a.shots).slice(0, 3).map((player, i) => <li key={i} className="flex justify-between py-1 border-b border-dashed">
                                    <span>#{player.player.number} {player.player.name}</span>
                                    <span>{player.shots} shots</span>
                                  </li>)}
                            </ul>
                          </div>
                        </>}

                      {/* Tactical suggestions */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <h4 className="font-medium">Tactical Adjustments</h4>
                        <ul className="text-sm list-disc pl-5 mt-1">
                          <li>
                            {statistics.possession.home > statistics.possession.away ? "Consider more direct attacks when possession is established" : "Focus on winning second balls and transitions"}
                          </li>
                          <li>
                            {statistics.passes.home.successful > statistics.passes.away.successful ? "Use width more effectively to stretch defense" : "Tighten passing lanes and improve ball retention"}
                          </li>
                          <li>
                            {statistics.duels.home.won > statistics.duels.away.won ? "Encourage more 1v1 situations to exploit physical advantage" : "Focus on group defending and avoid isolated duels"}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
        
        <TabsContent value="details">
          <Card className="p-4 bg-white shadow-md">
            <div className="flex justify-start mb-4 gap-2">
              <Button variant={tableView === 'individual' ? 'default' : 'outline'} size="sm" onClick={() => setTableView('individual')}>
                Individual Stats
              </Button>
              <Button variant={tableView === 'team' ? 'default' : 'outline'} size="sm" onClick={() => setTableView('team')}>
                Team Stats
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <DetailedStatsTable playerStats={playerStats} type={tableView} teamId={tableView === 'team' ? selectedTeam : undefined} />
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <Card className="p-4 bg-white shadow-md">
            <div className="flex justify-start mb-4 gap-2 overflow-x-auto">
              <Button variant={timelineView === 'ballsPlayed' ? 'default' : 'outline'} size="sm" onClick={() => setTimelineView('ballsPlayed')}>
                Balls Played
              </Button>
              <Button variant={timelineView === 'possession' ? 'default' : 'outline'} size="sm" onClick={() => setTimelineView('possession')}>
                Possession
              </Button>
              <Button variant={timelineView === 'recoveryTime' ? 'default' : 'outline'} size="sm" onClick={() => setTimelineView('recoveryTime')}>
                Recovery Time
              </Button>
            </div>
            
            {timeSegments && timeSegments.length > 0 ? <TimeSegmentChart timeSegments={timeSegments} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} dataKey={timelineView} title={`${timelineView.charAt(0).toUpperCase() + timelineView.slice(1).replace(/([A-Z])/g, ' $1')} by Time Segment`} description="Analysis of match progression in 5-minute intervals" /> : <div className="text-center py-8 text-muted-foreground">
                No timeline data available
              </div>}
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
        <Button variant="outline" onClick={handleUndo}>
          Undo Last Action
        </Button>
        <Button variant="outline" onClick={handleSave}>
          Save Match Data
        </Button>
      </div>
    </div>;
};
export default MainTabContent;