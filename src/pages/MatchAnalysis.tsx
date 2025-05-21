import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMatchState } from '@/hooks/useMatchState';
import MatchSidebar from '@/components/match/MatchSidebar';
import Pitch from '@/components/Pitch';
import { MatchEvent, Player, Team, Statistics, BallTrackingPoint, TimeSegmentStatistics } from '@/types';
import TeamTimeSegmentCharts from '@/components/visualizations/TeamTimeSegmentCharts';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const matchState = useMatchState();
  const { toast } = useToast()

  const [match, setMatch] = useState(matchState.match);
  const [homeTeam, setHomeTeam] = useState(matchState.homeTeam);
  const [awayTeam, setAwayTeam] = useState(matchState.awayTeam);
  const [teamPositions, setTeamPositions] = useState(matchState.teamPositions);
  const [selectedPlayer, setSelectedPlayer] = useState(matchState.selectedPlayer);
  const [selectedTeam, setSelectedTeam] = useState(matchState.selectedTeam);
  const [matchEvents, setMatchEvents] = useState(matchState.matchEvents);
  const [statistics, setStatistics] = useState(matchState.statistics);
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>(matchState.ballTrackingPoints);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>(matchState.timeSegments);
  const [isRunning, setIsRunning] = useState(matchState.isRunning);
  const [elapsedTime, setElapsedTime] = useState(matchState.elapsedTime);
  const [setupComplete, setSetupComplete] = useState(matchState.setupComplete);
  const [ballTrackingMode, setBallTrackingMode] = useState(matchState.ballTrackingMode);
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video'>(
    matchState.activeTab
  );
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');

  useEffect(() => {
    // Load match data from localStorage based on matchId
    const loadMatchData = () => {
      if (matchId) {
        try {
          const matchData = JSON.parse(localStorage.getItem(`efootpad_match_${matchId}`) || '{}');
          
          // Update match state with loaded data
          matchState.setMatch(matchData);
          matchState.setHomeTeam(matchData.homeTeam);
          matchState.setAwayTeam(matchData.awayTeam);
          matchState.setStatistics(matchData.statistics);
          matchState.setElapsedTime(matchData.elapsedTime);
          matchState.setTimeSegments(matchData.timeSegments);
          if (matchData.ballTrackingPoints) {
            matchState.setBallTrackingPoints(matchData.ballTrackingPoints);
          }
          
          setMatch(matchData);
          setHomeTeam(matchData.homeTeam);
          setAwayTeam(matchData.awayTeam);
          setStatistics(matchData.statistics);
          setElapsedTime(matchData.elapsedTime);
          setTimeSegments(matchData.timeSegments);
          if (matchData.ballTrackingPoints) {
            setBallTrackingPoints(matchData.ballTrackingPoints);
          }
          
          console.log("Loaded Match Data:", matchData);
        } catch (error) {
          console.error('Error loading match data:', error);
        }
      }
    };

    loadMatchData();
  }, [matchId, matchState]);

  useEffect(() => {
    // Update local state when matchState changes
    setMatch(matchState.match);
    setHomeTeam(matchState.homeTeam);
    setAwayTeam(matchState.awayTeam);
    setTeamPositions(matchState.teamPositions);
    setSelectedPlayer(matchState.selectedPlayer);
    setSelectedTeam(matchState.selectedTeam);
    setMatchEvents(matchState.matchEvents);
    setStatistics(matchState.statistics);
    setBallTrackingPoints(matchState.ballTrackingPoints);
    setTimeSegments(matchState.timeSegments);
    setIsRunning(matchState.isRunning);
    setElapsedTime(matchState.elapsedTime);
    setSetupComplete(matchState.setupComplete);
    setBallTrackingMode(matchState.ballTrackingMode);
    setActiveTab(matchState.activeTab);
  }, [matchState]);

  const handleActionSelect = (action: string) => {
    if (!selectedPlayer) {
      toast({
        title: "No Player Selected",
        description: "Please select a player before choosing an action.",
      })
      return;
    }

    matchState.recordEvent(
      action as any,
      selectedPlayer.id,
      selectedTeam,
      { x: 0, y: 0 }
    );
  };

  // Add a handler to calculate time segments
  useEffect(() => {
    // Calculate time segments if we have enough data and haven't done so yet
    if (ballTrackingPoints.length > 30 && timeSegments.length === 0 && matchState.calculateTimeSegments) {
      const segments = matchState.calculateTimeSegments();
      matchState.setTimeSegments(segments);
    }
  }, [ballTrackingPoints.length, timeSegments, matchState]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Match Analysis</h1>
          </div>
          <div className="space-x-2">
            <Button onClick={() => setActiveTab('pitch')} variant={activeTab === 'pitch' ? 'default' : 'outline'}>Pitch</Button>
            <Button onClick={() => setActiveTab('stats')} variant={activeTab === 'stats' ? 'default' : 'outline'}>Stats</Button>
            <Button onClick={() => setActiveTab('details')} variant={activeTab === 'details' ? 'default' : 'outline'}>Details</Button>
            <Button onClick={() => setActiveTab('piano')} variant={activeTab === 'piano' ? 'default' : 'outline'}>Piano</Button>
            <Button onClick={() => setActiveTab('timeline')} variant={activeTab === 'timeline' ? 'default' : 'outline'}>Timeline</Button>
            <Button onClick={() => setActiveTab('video')} variant={activeTab === 'video' ? 'default' : 'outline'}>Video</Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video')}>
              <TabsContent value="pitch" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Visualization</CardTitle>
                    <CardDescription>
                      Interactive pitch to track player positions and actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {homeTeam && awayTeam ? (
                      <Pitch 
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                        teamPositions={teamPositions}
                        onTeamPositionsChange={matchState.setTeamPositions}
                        selectedPlayer={selectedPlayer}
                        onSelectPlayer={matchState.setSelectedPlayer}
                        selectedTeam={selectedTeam}
                        onSelectTeam={matchState.setSelectedTeam}
                        ballTrackingMode={ballTrackingMode}
                        onTrackBallMovement={matchState.trackBallMovement}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Configure teams to view the pitch
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="mt-4">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Possession</CardTitle>
                        <CardDescription>
                          Percentage of ball possession
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress value={statistics.possession.home} max={100} />
                        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                          <span>{homeTeam?.name || 'Home'}: {statistics.possession.home}%</span>
                          <span>{awayTeam?.name || 'Away'}: {statistics.possession.away}%</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Shots on Target</CardTitle>
                        <CardDescription>
                          Number of shots that hit the goal
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress value={statistics.shots.home.onTarget} max={statistics.shots.home.onTarget + statistics.shots.away.onTarget} />
                        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                          <span>{homeTeam?.name || 'Home'}: {statistics.shots.home.onTarget}</span>
                          <span>{awayTeam?.name || 'Away'}: {statistics.shots.away.onTarget}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Match Statistics</CardTitle>
                      <CardDescription>
                        Key performance metrics for this match
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableCaption>A summary of the match statistics.</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Statistic</TableHead>
                            <TableHead>Home</TableHead>
                            <TableHead>Away</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Possession</TableCell>
                            <TableCell>{statistics.possession.home}%</TableCell>
                            <TableCell>{statistics.possession.away}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Shots on Target</TableCell>
                            <TableCell>{statistics.shots.home.onTarget}</TableCell>
                            <TableCell>{statistics.shots.away.onTarget}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Shots off Target</TableCell>
                            <TableCell>{statistics.shots.home.offTarget}</TableCell>
                            <TableCell>{statistics.shots.away.offTarget}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Passes Successful</TableCell>
                            <TableCell>{statistics.passes.home.successful}</TableCell>
                            <TableCell>{statistics.passes.away.successful}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Passes Attempted</TableCell>
                            <TableCell>{statistics.passes.home.attempted}</TableCell>
                            <TableCell>{statistics.passes.away.attempted}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Balls Played</TableCell>
                            <TableCell>{statistics.ballsPlayed.home}</TableCell>
                            <TableCell>{statistics.ballsPlayed.away}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Balls Lost</TableCell>
                            <TableCell>{statistics.ballsLost.home}</TableCell>
                            <TableCell>{statistics.ballsLost.away}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Duels Won</TableCell>
                            <TableCell>{statistics.duels.home.won}</TableCell>
                            <TableCell>{statistics.duels.away.won}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Duels Lost</TableCell>
                            <TableCell>{statistics.duels.home.lost}</TableCell>
                            <TableCell>{statistics.duels.away.lost}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Aerial Duels</TableCell>
                            <TableCell>{statistics.duels.home.aerial}</TableCell>
                            <TableCell>{statistics.duels.away.aerial}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Yellow Cards</TableCell>
                            <TableCell>{statistics.cards.home.yellow}</TableCell>
                            <TableCell>{statistics.cards.away.yellow}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Red Cards</TableCell>
                            <TableCell>{statistics.cards.home.red}</TableCell>
                            <TableCell>{statistics.cards.away.red}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Crosses Total</TableCell>
                            <TableCell>{statistics.crosses.home.total}</TableCell>
                            <TableCell>{statistics.crosses.away.total}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Crosses Successful</TableCell>
                            <TableCell>{statistics.crosses.home.successful}</TableCell>
                            <TableCell>{statistics.crosses.away.successful}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Dribbles Successful</TableCell>
                            <TableCell>{statistics.dribbles.home.successful}</TableCell>
                            <TableCell>{statistics.dribbles.away.successful}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Dribbles Attempted</TableCell>
                            <TableCell>{statistics.dribbles.home.attempted}</TableCell>
                            <TableCell>{statistics.dribbles.away.attempted}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Corners</TableCell>
                            <TableCell>{statistics.corners.home}</TableCell>
                            <TableCell>{statistics.corners.away}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Offsides</TableCell>
                            <TableCell>{statistics.offsides.home}</TableCell>
                            <TableCell>{statistics.offsides.away}</TableCell>
                          </TableRow>
                           <TableRow>
                            <TableCell className="font-medium">Free Kicks</TableCell>
                            <TableCell>{statistics.freeKicks.home}</TableCell>
                            <TableCell>{statistics.freeKicks.away}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Add the new visualizations section */}
                  {match && homeTeam && awayTeam && (
                    <MatchStatsVisualizer
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      ballTrackingPoints={ballTrackingPoints}
                      timeSegments={timeSegments}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Details</CardTitle>
                    <CardDescription>
                      Detailed information about the match
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Home Team</Label>
                        <Input type="text" value={homeTeam?.name || ''} disabled />
                      </div>
                      <div>
                        <Label>Away Team</Label>
                        <Input type="text" value={awayTeam?.name || ''} disabled />
                      </div>
                      <div>
                        <Label>Elapsed Time</Label>
                        <Input type="text" value={elapsedTime.toString()} disabled />
                      </div>
                      <div>
                        <Label>Match Events</Label>
                        <ul>
                          {matchEvents.map((event) => (
                            <li key={event.id}>{event.type} - {event.playerId}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="piano" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Action Recorder</CardTitle>
                    <CardDescription>
                      Record match events using the action piano
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {homeTeam && awayTeam ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            Selected Team: {selectedTeam === 'home' ? homeTeam.name : awayTeam.name}
                          </div>
                          <div className="space-x-2">
                            <Button onClick={() => setSelectedTeam('home')} variant={selectedTeam === 'home' ? 'default' : 'outline'}>Home</Button>
                            <Button onClick={() => setSelectedTeam('away')} variant={selectedTeam === 'away' ? 'default' : 'outline'}>Away</Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            Selected Player: {selectedPlayer?.name || 'None'}
                          </div>
                        </div>
                        <div>
                          <Button onClick={() => setMode('piano')} variant={mode === 'piano' ? 'default' : 'outline'}>Piano Mode</Button>
                          <Button onClick={() => setMode('tracking')} variant={mode === 'tracking' ? 'default' : 'outline'}>Tracking Mode</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Configure teams to record actions
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Timeline</CardTitle>
                    <CardDescription>
                      Visualize match events over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={matchEvents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="playerId" stroke="#8884d8" fill="#8884d8" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="video" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Video Analysis</CardTitle>
                    <CardDescription>
                      Analyze match video and extract statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Video analysis feature coming soon!</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <MatchSidebar 
              isRunning={isRunning}
              toggleTimer={matchState.toggleTimer}
              resetTimer={matchState.resetTimer}
              elapsedTime={elapsedTime}
              setElapsedTime={matchState.setElapsedTime}
              mode={mode}
              selectedPlayer={selectedPlayer}
              handleActionSelect={handleActionSelect}
              ballTrackingPoints={ballTrackingPoints}
              trackBallMovement={matchState.trackBallMovement}
              homeTeam={homeTeam || { name: 'Home', players: [], formation: '' }}
              awayTeam={awayTeam || { name: 'Away', players: [], formation: '' }}
              statistics={statistics}
              updateStatistics={matchState.setStatistics}
              setTimeSegments={matchState.setTimeSegments}
              calculateTimeSegments={matchState.calculateTimeSegments}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MatchAnalysis;
