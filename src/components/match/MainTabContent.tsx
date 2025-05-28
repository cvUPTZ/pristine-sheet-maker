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
import { Statistics, TimeSegmentStatistics, Team, Player, EventType, MatchEvent } from '@/types'; // Added Player, EventType, MatchEvent

interface MainTabContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  homeTeam: Team;
  awayTeam: Team;
  teamPositions: Record<string, Record<number, { x: number; y: number }>>; // This is the raw data from parent
  selectedPlayer: Player | null; // Changed from number | null
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void; // Changed from playerId: number
  ballTrackingPoints: Array<{ x: number; y: number; timestamp: number }>;
  mode: 'piano' | 'tracking'; // Changed from 'select' | 'ball'
  handlePitchClick: (coordinates: { x: number; y: number }) => void; // Changed event: any
  addBallTrackingPoint: (point: { x: number; y: number }) => void;
  statistics: Statistics;
  setStatistics: (stats: Statistics) => void;
  playerStats: any; // Consider defining a specific type
  handleUndo: () => void;
  handleSave: () => void;
  timeSegments: TimeSegmentStatistics[];
  recordEvent: (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates?: { x: number; y: number }) => void; // eventType to EventType, coordinates optional
  assignedPlayerForMatch: { id: number; name: string; teamId: 'home' | 'away'; teamName: string } | null;
  assignedEventTypes: string[]; // Should ideally be EventType[]
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
  mode, // Prop 'mode' is now 'piano' | 'tracking'
  handlePitchClick,
  addBallTrackingPoint,
  statistics,
  setStatistics,
  playerStats, // Still any, consider typing
  handleUndo,
  handleSave,
  timeSegments,
  recordEvent, // Prop 'recordEvent' now has EventType and optional coordinates
  assignedPlayerForMatch,
  assignedEventTypes, // Consider EventType[]
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
  
  // PianoInput related state and handlers - these are placeholders and might need to be lifted up or managed differently
  const [currentSelectedEventType, setCurrentSelectedEventType] = useState<EventType | null>(null);
  const [currentSelectedTeamForPiano, setCurrentSelectedTeamForPiano] = useState<Team | null>(null);
  // fullSelectedPlayer is already memoized above for the selected player object
  const [isPianoPassTrackingMode, setIsPianoPassTrackingMode] = useState<boolean>(false); // Example state

  const handlePianoEventTypeSelect = (eventType: EventType) => {
    setCurrentSelectedEventType(eventType);
  };
  const handlePianoTeamSelect = (team: Team) => {
    setCurrentSelectedTeamForPiano(team);
  };
  const handlePianoPlayerSelect = (player: Player) => {
    // This might conflict with the main handlePlayerSelect if PianoInput is meant to control a different selection
    console.log("PianoInput selected player:", player);
    // For now, let's assume it uses the main selectedPlayer logic or its own
    handlePlayerSelect(player); 
  };


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
                  teamPositions={allPlayerPositions} // Use flattened positions
                  selectedPlayer={selectedPlayer}    // Pass Player object
                  selectedTeam={selectedTeam}
                  setSelectedTeam={setSelectedTeam}   // Prop name matches PitchView
                  handlePlayerSelect={handlePlayerSelect} // Prop name matches PitchView
                  ballTrackingPoints={ballTrackingPoints}
                  mode={mode} // mode is now 'piano' | 'tracking'
                  handlePitchClick={handlePitchClick} // Prop name matches PitchView
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
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    ballTrackingPoints={ballTrackingPoints}
                    timeSegments={timeSegments}
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
                    teamPositions={allPlayerPositions} // Pass flattened positions
                    selectedTeam={selectedTeam}
                    onSelectTeam={setSelectedTeam} // Pass handler
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
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                  onEventAdd={(event: MatchEvent) => {
                    // Adapt MatchEvent to recordEvent's signature
                    // Assuming event.teamId from PianoInput is 'home' or 'away' string if not full Team object
                    // Or if PianoInput provides full Team object, use event.team.id === homeTeam.id etc.
                    // For now, direct pass-through if MatchEvent.teamId is 'home' | 'away'
                    recordEvent(event.type, event.playerId, event.teamId, event.coordinates);
                  }}
                  elapsedTime={0} // Placeholder - This needs to come from a timer state
                  selectedEventType={currentSelectedEventType}
                  onEventTypeSelect={handlePianoEventTypeSelect}
                  selectedTeam={currentSelectedTeamForPiano}
                  onTeamSelect={handlePianoTeamSelect}
                  selectedPlayer={selectedPlayer} // Pass the main selectedPlayer (Player | null)
                  onPlayerSelect={handlePianoPlayerSelect} // Pass appropriate handler
                  isPassTrackingMode={isPianoPassTrackingMode} // Pass relevant state
                  // assignedEventTypes prop is not in PianoInputProps, remove if not needed by PianoInput
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
                  events={timeSegments.flatMap(segment => segment.events || [])}
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