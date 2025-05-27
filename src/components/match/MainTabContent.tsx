import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PitchView from '@/components/match/PitchView';
import StatisticsDisplay from '@/components/match/StatisticsDisplay';
import PlayerStatsTable from '@/components/match/PlayerStatsTable';
import MatchStatsVisualizer from '@/components/match/MatchStatsVisualizer';
import PlayerHeatmap from '@/components/match/PlayerHeatmap';
import TeamTimeSegmentCharts from '@/components/match/TeamTimeSegmentCharts';
import DetailedStatsTable from '@/components/match/DetailedStatsTable';
import BallFlowVisualization from '@/components/match/BallFlowVisualization';
import PianoInput from '@/components/match/PianoInput';
import MatchEventsTimeline from '@/components/match/MatchEventsTimeline';
import VideoAnalyzer from '@/components/match/VideoAnalyzer';
import DedicatedTrackerUI from '@/components/match/DedicatedTrackerUI';
import { Team, Player, Statistics, BallTrackingPoint, MatchEvent, TimeSegment } from '@/types';

interface MainTabContentProps {
  activeTab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video' | 'fast-track';
  setActiveTab: (tab: 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video' | 'fast-track') => void;
  homeTeam: Team;
  awayTeam: Team;
  teamPositions: { [teamId: string]: { [playerId: number]: { x: number; y: number } } };
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away' | null;
  setSelectedTeam: (team: 'home' | 'away' | null) => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: BallTrackingPoint[];
  mode: 'tracking' | 'piano';
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  statistics: Statistics;
  setStatistics: (stats: Statistics) => void;
  playerStats: any;
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments: TimeSegment[];
  recordEvent: (eventType: any, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => void;
  assignedPlayerForMatch: { id: number; name: string; teamId: 'home' | 'away'; teamName: string; } | null;
  assignedEventTypes: string[] | null;
  userRole: string | null;
  matchId: string;
}

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
  { id: 'groundDuel', label: 'Ground Duel' },
];

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
  matchId,
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
      events: segment.events.filter(event => 
        selectedEventTypes.includes(event.type)
      )
    }));
  }, [timeSegments, selectedEventTypes]);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatisticsDisplay 
                    statistics={statistics} 
                    homeTeamName={homeTeam.name} 
                    awayTeamName={awayTeam.name}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Player Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlayerStatsTable 
                    playerStats={playerStats} 
                    homeTeamName={homeTeam.name} 
                    awayTeamName={awayTeam.name}
                  />
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                <TabsTrigger value="timeline">Time Analysis</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MatchStatsVisualizer 
                      statistics={statistics} 
                      homeTeamName={homeTeam.name} 
                      awayTeamName={awayTeam.name}
                    />
                  </CardContent>
                </Card>
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

              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle>Time Segment Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TeamTimeSegmentCharts 
                      timeSegments={timeSegments} 
                      homeTeamName={homeTeam.name} 
                      awayTeamName={awayTeam.name}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="detailed">
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailedStatsTable 
                      statistics={statistics} 
                      homeTeamName={homeTeam.name} 
                      awayTeamName={awayTeam.name}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Teams Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{homeTeam.name}</h3>
                      <p className="text-sm text-muted-foreground">Formation: {homeTeam.formation}</p>
                      <p className="text-sm text-muted-foreground">Players: {homeTeam.players.length}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{awayTeam.name}</h3>
                      <p className="text-sm text-muted-foreground">Formation: {awayTeam.formation}</p>
                      <p className="text-sm text-muted-foreground">Players: {awayTeam.players.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ball Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <BallFlowVisualization ballTrackingPoints={ballTrackingPoints} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="piano" className="space-y-4">
            <PianoInput
              onRecordEvent={recordEvent}
              selectedPlayer={selectedPlayer}
              selectedTeam={selectedTeam}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              assignedPlayerForMatch={assignedPlayerForMatch}
              assignedEventTypes={assignedEventTypes}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Match Timeline
                  <div className="flex gap-2">
                    <Button onClick={handleUndo} variant="outline" size="sm">
                      Undo Last
                    </Button>
                    <Button onClick={handleSave} variant="outline" size="sm">
                      Save Match
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map(eventType => (
                      <Button
                        key={eventType.id}
                        variant={selectedEventTypes.includes(eventType.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleEventType(eventType.id)}
                      >
                        {eventType.label}
                      </Button>
                    ))}
                  </div>
                  <MatchEventsTimeline timeSegments={filteredTimeSegments} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <VideoAnalyzer matchId={matchId} />
          </TabsContent>

          <TabsContent value="fast-track" className="space-y-4">
            {assignedPlayerForMatch && (
              <DedicatedTrackerUI
                assignedPlayer={assignedPlayerForMatch}
                onRecordEvent={recordEvent}
                assignedEventTypes={assignedEventTypes}
              />
            )}
            {!assignedPlayerForMatch && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No player assigned for dedicated tracking.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MainTabContent;
