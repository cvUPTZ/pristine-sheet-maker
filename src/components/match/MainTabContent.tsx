
import React, { useState } from 'react';
import PitchView from '@/components/match/PitchView';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import TimeSegmentChart from '@/components/visualizations/TimeSegmentChart';
import VideoAnalyzer from '@/components/VideoAnalyzer';
import DedicatedTrackerUI, { AssignedPlayerForMatch } from '@/components/match/DedicatedTrackerUI';
import MatchRadarChart from '@/components/visualizations/MatchRadarChart';
import PlayerHeatmap from '@/components/visualizations/PlayerHeatmap';
import PianoInput from '@/components/match/PianoInput';
import {
  BarChart3,
  Flag,
  TableIcon,
  Piano,
  Clock,
  Video,
  Zap,
  Activity as ActivityIcon,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Team, Player, BallTrackingPoint, Statistics, PlayerStatistics, TimeSegmentStatistics, EventType } from '@/types';

// Rename Player from types to avoid conflict with React.Player
type PlayerType = Player;

const defaultStatistics: Statistics = {
  possession: { home: 50, away: 50 },
  shots: { home: { onTarget: 0, offTarget: 0 }, away: { onTarget: 0, offTarget: 0 } },
  passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
  ballsPlayed: { home: 0, away: 0 },
  ballsLost: { home: 0, away: 0 },
  duels: { home: { won: 0, lost: 0, aerial: 0 }, away: { won: 0, lost: 0, aerial: 0 } },
  cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
  crosses: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
  dribbles: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
  corners: { home: 0, away: 0 },
  offsides: { home: 0, away: 0 },
  freeKicks: { home: 0, away: 0 },
};

interface MainTabContentProps {
  activeTab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video' | 'fast-track';
  setActiveTab: (tab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video' | 'fast-track') => void;
  homeTeam: Team;
  awayTeam: Team;
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
  setStatistics?: (stats: Statistics) => void;
  playerStats: PlayerStatistics[];
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments?: TimeSegmentStatistics[];
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates?: { x: number; y: number } | undefined) => void;
  // Props for DedicatedTrackerUI
  assignedPlayerForMatch: AssignedPlayerForMatch | null;
  assignedEventTypes: string[] | null;
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
  statistics = defaultStatistics,
  setStatistics,
  playerStats = [],
  handleUndo,
  handleSave,
  timeSegments = [],
  recordEvent,
  assignedPlayerForMatch,
  assignedEventTypes,
  userRole,
  matchId
}) => {
  const [statsView, setStatsView] = useState<'summary' | 'radar' | 'heatmap' | 'timeline' | 'coach'>('summary');
  const [tableView, setTableView] = useState<'individual' | 'team'>('individual');
  const [timelineView, setTimelineView] = useState<'ballsPlayed' | 'possession' | 'recoveryTime'>('ballsPlayed');
  
  const handleVideoAnalysisComplete = (videoStats: Statistics) => {
    if (setStatistics) {
      setStatistics(videoStats);
    }
  };

  // Helper function to determine if circular menu should be shown
  const shouldShowCircularMenu = activeTab === 'pitch' || activeTab === 'piano';
  
  // Add the missing handleEventSelect function with proper BallTrackingPoint type
  const handleEventSelect = (eventType: EventType, player: PlayerType, coordinates: { x: number; y: number }) => {
    // First select the player
    handlePlayerSelect(player);
    
    // Then record the event using the provided recordEvent function
    recordEvent(eventType, player.id, selectedTeam, coordinates);
    
    // If it's a ball-related event, we'll track the ball movement too
    if (['pass', 'shot', 'goal'].includes(eventType)) {
      // Create a proper BallTrackingPoint object with all required properties
      const ballPoint: BallTrackingPoint = {
        x: coordinates.x,
        y: coordinates.y,
        timestamp: Date.now(),
        playerId: player.id,
        teamId: selectedTeam
      };
      addBallTrackingPoint(ballPoint);
    }
  };

  // Make sure statistics is never undefined
  const safeStats = statistics || defaultStatistics;

  return <div>
      {/* Large, prominent tab navigation */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-2 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant={activeTab === 'pitch' ? 'default' : 'outline'} 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setActiveTab('pitch')}
            >
              <Flag className="h-4 w-4" />
              <span>Pitch</span>
            </Button>
            <Button 
              variant={activeTab === 'stats' ? 'default' : 'outline'} 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Stats</span>
            </Button>
            <Button 
              variant={activeTab === 'details' ? 'default' : 'outline'} 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setActiveTab('details')}
            >
              <TableIcon className="h-4 w-4" />
              <span>Details</span>
            </Button>
            <Button 
              variant={activeTab === 'piano' ? 'default' : 'outline'} 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setActiveTab('piano')}
            >
              <Piano className="h-4 w-4" />
              <span>Piano</span>
            </Button>
            <Button 
              variant={activeTab === 'timeline' ? 'default' : 'outline'} 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setActiveTab('timeline')}
            >
              <Clock className="h-4 w-4" />
              <span>Timeline</span>
            </Button>
          </div>
          <div className="mt-2">
            <Button 
              variant={activeTab === 'video' ? 'default' : 'outline'} 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setActiveTab('video')}
            >
              <Video className="h-4 w-4" />
              <span>Video Analysis</span>
            </Button>
            {userRole === 'tracker' && assignedPlayerForMatch && (
              <Button
                variant={activeTab === 'fast-track' ? 'default' : 'outline'}
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setActiveTab('fast-track')}
              >
                <Zap className="h-4 w-4" />
                <span>Fast Track</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'pitch' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PitchView 
                homeTeam={homeTeam} 
                awayTeam={awayTeam} 
                teamPositions={teamPositions} 
                selectedPlayer={selectedPlayer} 
                selectedTeam={selectedTeam} 
                setSelectedTeam={setSelectedTeam} 
                handlePlayerSelect={handlePlayerSelect} 
                handleEventSelect={shouldShowCircularMenu ? handleEventSelect : undefined}
                ballTrackingPoints={ballTrackingPoints} 
                mode={mode} 
                handlePitchClick={handlePitchClick} 
                addBallTrackingPoint={addBallTrackingPoint} 
              />
            </div>
            <div>
              <PianoInput 
                homeTeam={homeTeam} 
                awayTeam={awayTeam} 
                onRecordEvent={recordEvent} 
                teamPositions={teamPositions} 
                selectedTeam={selectedTeam} 
                setSelectedTeam={setSelectedTeam} 
                compact={true} 
              />
            </div>
          </div>
        )}
        
        {activeTab === 'stats' && (
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
                  <StatisticsDisplay statistics={safeStats} homeTeamName={homeTeam?.name || 'Home'} awayTeamName={awayTeam?.name || 'Away'} />
                </Card>
              </TabsContent>
              
              <TabsContent value="radar">
                <MatchRadarChart statistics={safeStats} homeTeamName={homeTeam?.name || 'Home'} awayTeamName={awayTeam?.name || 'Away'} />
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
                      {safeStats.possession.home > 60 && <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="font-medium">Strong Possession</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam?.name || 'Home'} is dominating possession ({Math.round(safeStats.possession.home)}%). 
                            Capitalize on this control with more forward passes.
                          </p>
                        </div>}
                      {safeStats.possession.away > 60 && <div className="p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                          <p className="font-medium">Possession Challenge</p>
                          <p className="text-sm text-gray-600">
                            {awayTeam?.name || 'Away'} is controlling possession ({Math.round(safeStats.possession.away)}%). 
                            Consider adjusting press intensity and defensive shape.
                          </p>
                        </div>}
                      {safeStats.shots.home.onTarget + safeStats.shots.home.offTarget > (safeStats.shots.away.onTarget + safeStats.shots.away.offTarget) * 2 && <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="font-medium">Shot Dominance</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam?.name || 'Home'} is creating significantly more shooting opportunities. 
                            Continue with the current attacking approach.
                          </p>
                        </div>}
                      {safeStats.passes.home.attempted > 0 && safeStats.passes.home.successful / safeStats.passes.home.attempted < 0.7 && <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="font-medium">Passing Accuracy Concern</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam?.name || 'Home'} has a low pass completion rate 
                            ({Math.round(safeStats.passes.home.successful / safeStats.passes.home.attempted * 100)}%). 
                            Focus on safer passing options or adjust positioning.
                          </p>
                        </div>}
                      {safeStats.ballsLost.home > safeStats.ballsLost.away * 1.5 && <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="font-medium">Ball Retention Issue</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam?.name || 'Home'} is losing possession frequently. 
                            Consider adjusting buildup play and player positioning.
                          </p>
                        </div>}
                      {safeStats.duels.home.won > safeStats.duels.home.lost * 1.5 && <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="font-medium">Strong in Duels</p>
                          <p className="text-sm text-gray-600">
                            {homeTeam?.name || 'Home'} is winning most duels. 
                            Continue with physical play and direct challenges.
                          </p>
                        </div>}
                    </div>
                  </Card>

                  <Card className="p-4 bg-white shadow-md">
                    <h3 className="text-lg font-semibold mb-2">Player Recommendations</h3>
                    <div className="space-y-3">
                      {/* Top performers based on different metrics */}
                      {playerStats.filter(p => p.teamId === homeTeam?.id).length > 0 && <>
                          <div>
                            <h4 className="font-medium text-sm">Top Passers</h4>
                            <ul className="text-sm">
                              {playerStats.filter(p => p.teamId === homeTeam?.id).sort((a, b) => (b.passes || 0) - (a.passes || 0)).slice(0, 3).map((player, i) => <li key={i} className="flex justify-between py-1 border-b border-dashed">
                                    <span>#{player.player?.number || 0} {player.playerName}</span>
                                    <span>{player.passes || 0} passes</span>
                                  </li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">Goal Threats</h4>
                            <ul className="text-sm">
                              {playerStats.filter(p => p.teamId === homeTeam?.id).sort((a, b) => (b.shots || 0) - (a.shots || 0)).slice(0, 3).map((player, i) => <li key={i} className="flex justify-between py-1 border-b border-dashed">
                                    <span>#{player.player?.number || 0} {player.playerName}</span>
                                    <span>{player.shots || 0} shots</span>
                                  </li>)}
                            </ul>
                          </div>
                        </>}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="mb-4">
            <Tabs value={tableView} onValueChange={(value: any) => setTableView(value)}>
              <TabsList className="mb-4">
                <TabsTrigger value="individual">Individual Stats</TabsTrigger>
                <TabsTrigger value="team">Team Comparison</TabsTrigger>
              </TabsList>
              
              <TabsContent value="individual">
                <DetailedStatsTable 
                  playerStats={playerStats} 
                  type="individual"
                />
              </TabsContent>
              
              <TabsContent value="team">
                <Card className="p-4 bg-white shadow-md">
                  <StatisticsDisplay 
                    statistics={safeStats} 
                    homeTeamName={homeTeam?.name || 'Home'} 
                    awayTeamName={awayTeam?.name || 'Away'} 
                  />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === 'piano' && (
          <PianoInput 
            homeTeam={homeTeam} 
            awayTeam={awayTeam} 
            onRecordEvent={recordEvent} 
            teamPositions={teamPositions} 
            selectedTeam={selectedTeam} 
            setSelectedTeam={setSelectedTeam} 
            compact={false} 
          />
        )}

        {activeTab === 'timeline' && (
          <div className="mb-4">
            <Tabs value={timelineView} onValueChange={(value: any) => setTimelineView(value)}>
              <TabsList className="mb-4">
                <TabsTrigger value="ballsPlayed">Balls Played</TabsTrigger>
                <TabsTrigger value="possession">Possession</TabsTrigger>
                <TabsTrigger value="recoveryTime">Recovery Time</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ballsPlayed">
                <TimeSegmentChart 
                  timeSegments={timeSegments} 
                  homeTeamName={homeTeam?.name || 'Home'} 
                  awayTeamName={awayTeam?.name || 'Away'} 
                  dataKey="ballsPlayed"
                  title="Balls Played Over Time"
                  description="Number of balls played by each team across 5-minute segments"
                />
              </TabsContent>
              
              <TabsContent value="possession">
                <TimeSegmentChart 
                  timeSegments={timeSegments} 
                  homeTeamName={homeTeam?.name || 'Home'} 
                  awayTeamName={awayTeam?.name || 'Away'} 
                  dataKey="possession"
                  title="Possession Over Time"
                  description="Ball possession percentage by each team across 5-minute segments"
                />
              </TabsContent>
              
              <TabsContent value="recoveryTime">
                <TimeSegmentChart 
                  timeSegments={timeSegments} 
                  homeTeamName={homeTeam?.name || 'Home'} 
                  awayTeamName={awayTeam?.name || 'Away'} 
                  dataKey="recoveryTime"
                  title="Recovery Time Over Time"
                  description="Average time to recover possession across 5-minute segments"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {activeTab === 'video' && (
          <VideoAnalyzer onAnalysisComplete={handleVideoAnalysisComplete} />
        )}

        {activeTab === 'fast-track' && userRole === 'tracker' && assignedPlayerForMatch && (
          <DedicatedTrackerUI 
            assignedPlayerForMatch={assignedPlayerForMatch}
            assignedEventTypes={assignedEventTypes}
            matchId={matchId}
            recordEvent={recordEvent}
          />
        )}
      </div>
    </div>;
};

export default MainTabContent;
