
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
import { useMatchState, BallPath } from '@/hooks/useMatchState'; // Import BallPath
import { useMatchCollaboration } from '@/hooks/useMatchCollaboration'; // Import useMatchCollaboration
import MatchSidebar from '@/components/match/MatchSidebar';
import Pitch from '@/components/Pitch';
import { MatchEvent, Player, Team, Statistics, BallTrackingPoint, TimeSegmentStatistics, EventType } from '@/types';
import TeamTimeSegmentCharts from '@/components/visualizations/TeamTimeSegmentCharts';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import PianoInput from '@/components/match/PianoInput';
import MatchTimer from '@/components/MatchTimer';

// Define a default statistics object to prevent undefined errors
const defaultStatistics: Statistics = {
  possession: { home: 50, away: 50 },
  shots: { 
    home: { onTarget: 0, offTarget: 0, total: 0 }, 
    away: { onTarget: 0, offTarget: 0, total: 0 } 
  },
  passes: { 
    home: { successful: 0, attempted: 0, total: 0 }, 
    away: { successful: 0, attempted: 0, total: 0 } 
  },
  ballsPlayed: { home: 0, away: 0 },
  ballsLost: { home: 0, away: 0 },
  duels: { home: { won: 0, lost: 0, aerial: 0 }, away: { won: 0, lost: 0, aerial: 0 } },
  cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
  crosses: { home: { total: 0, successful: 0 }, away: { total: 0, successful: 0 } },
  dribbles: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
  corners: { home: 0, away: 0 },
  offsides: { home: 0, away: 0 },
  freeKicks: { home: 0, away: 0 }
};

// Define default team objects to satisfy the Team interface
const defaultHomeTeam: Team = {
  id: 'home-default',
  name: 'Home',
  players: [],
  formation: ''
};

const defaultAwayTeam: Team = {
  id: 'away-default',
  name: 'Away',
  players: [],
  formation: ''
};

const MatchAnalysis: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>(); // Ensure matchId is treated as potentially undefined if it can be
  const matchState = useMatchState();
  const { toast } = useToast();

  // Initialize useMatchCollaboration
  // Note: The recordEvent from useMatchCollaboration is the one to be passed to useMatchState's actions
  const { 
    events: collaborativeEvents, 
    lastReceivedEvent, 
    recordEvent: collaborativeRecordEventFn 
  } = useMatchCollaboration({ 
    matchId: matchId || undefined // Pass undefined if matchId is null/undefined
  });

  const [lastProcessedEventId, setLastProcessedEventId] = useState<string | null>(null);
  const [initialEventsProcessed, setInitialEventsProcessed] = useState(false);

  const [match, setMatch] = useState(matchState.match);
  const [homeTeam, setHomeTeam] = useState<Team>(matchState.homeTeam || defaultHomeTeam);
  const [awayTeam, setAwayTeam] = useState<Team>(matchState.awayTeam || defaultAwayTeam);
  const [teamPositions, setTeamPositions] = useState(matchState.teamPositions);
  const [selectedPlayer, setSelectedPlayer] = useState(matchState.selectedPlayer);
  const [selectedTeam, setSelectedTeam] = useState(matchState.selectedTeam);
  const [matchEvents, setMatchEvents] = useState(matchState.matchEvents);
  // Initialize with defaultStatistics to avoid undefined errors
  const [statistics, setStatistics] = useState<Statistics>(matchState.statistics || defaultStatistics);
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>(matchState.ballTrackingPoints || []);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>(matchState.timeSegments || []);
  const [isRunning, setIsRunning] = useState(matchState.isRunning);
  const [elapsedTime, setElapsedTime] = useState(matchState.elapsedTime);
  const [setupComplete, setSetupComplete] = useState(matchState.setupComplete);
  const [ballTrackingMode, setBallTrackingMode] = useState(matchState.ballTrackingMode);
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video'>("pitch");
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [isPassTrackingModeActive, setIsPassTrackingModeActive] = useState(matchState.isPassTrackingModeActive);
  const [potentialPasser, setPotentialPasser] = useState(matchState.potentialPasser);
  const [ballPathHistory, setBallPathHistory] = useState(matchState.ballPathHistory || []);


  useEffect(() => {
    // Load match data from localStorage based on matchId
    const loadMatchData = () => {
      if (matchId) {
        try {
          const matchData = JSON.parse(localStorage.getItem(`efootpad_match_${matchId}`) || '{}');
          
          // Ensure statistics has a default value if not available in matchData
          const safeStatistics = matchData.statistics || defaultStatistics;
          
          // Update match state with loaded data, using defaults where needed
          matchState.setMatch(matchData);
          matchState.setHomeTeam(matchData.homeTeam || defaultHomeTeam);
          matchState.setAwayTeam(matchData.awayTeam || defaultAwayTeam);
          matchState.setStatistics(safeStatistics);
          matchState.setElapsedTime(matchData.elapsedTime || 0);
          matchState.setTimeSegments(matchData.timeSegments || []);
          if (matchData.ballTrackingPoints) {
            matchState.setBallTrackingPoints(matchData.ballTrackingPoints);
          }
          if (matchData.matchEvents) {
            matchState.setMatchEvents(matchData.matchEvents);
          }
          const loadedBallPathHistory = matchData.ballPathHistory || [];
          matchState.setBallPathHistory(loadedBallPathHistory);
          
          setMatch(matchData);
          setHomeTeam(matchData.homeTeam || defaultHomeTeam);
          setAwayTeam(matchData.awayTeam || defaultAwayTeam);
          setStatistics(safeStatistics);
          setElapsedTime(matchData.elapsedTime || 0);
          setMatchEvents(matchData.matchEvents || []);
          setTimeSegments(matchData.timeSegments || []);
          if (matchData.ballTrackingPoints) {
            setBallTrackingPoints(matchData.ballTrackingPoints);
          }
          setBallPathHistory(loadedBallPathHistory);
          
          console.log("Loaded Match Data:", matchData);
        } catch (error) {
          console.error('Error loading match data:', error);
          // Set default values in case of error
          setStatistics(defaultStatistics);
          setHomeTeam(defaultHomeTeam);
          setAwayTeam(defaultAwayTeam);
        }
      }
    };

    loadMatchData();
  }, [matchId, matchState]);

  // Simple toggle function for the timer
  const toggleTimer = () => {
    setIsRunning(prev => !prev);
    matchState.toggleTimer();
  };

  // Function to reset timer
  const resetTimer = () => {
    setElapsedTime(0);
    setIsRunning(false);
    matchState.resetTimer();
  };

  // Function to update elapsed time
  const updateElapsedTime = (time: number | ((prevTime: number) => number)) => {
    if (typeof time === 'function') {
      setElapsedTime(prev => {
        const newTime = time(prev);
        matchState.setElapsedTime(newTime);
        return newTime;
      });
    } else {
      setElapsedTime(time);
      matchState.setElapsedTime(time);
    }
  };

  useEffect(() => {
    // Update local state when matchState changes
    setMatch(matchState.match);
    setHomeTeam(matchState.homeTeam || defaultHomeTeam);
    setAwayTeam(matchState.awayTeam || defaultAwayTeam);
    setTeamPositions(matchState.teamPositions);
    setSelectedPlayer(matchState.selectedPlayer);
    setSelectedTeam(matchState.selectedTeam);
    setMatchEvents(matchState.matchEvents);
    // Ensure statistics always has a valid value
    setStatistics(matchState.statistics || defaultStatistics);
    setBallTrackingPoints(matchState.ballTrackingPoints || []);
    setTimeSegments(matchState.timeSegments || []);
    setIsRunning(matchState.isRunning);
    setElapsedTime(matchState.elapsedTime);
    setSetupComplete(matchState.setupComplete);
    setBallTrackingMode(matchState.ballTrackingMode);
    setIsPassTrackingModeActive(matchState.isPassTrackingModeActive);
    setPotentialPasser(matchState.potentialPasser);
    setBallPathHistory(matchState.ballPathHistory || []);
  }, [matchState]);

  // Effect to process collaborative events and update local state
  useEffect(() => {
    // Process the initial batch of events
    if (matchId && collaborativeEvents && collaborativeEvents.length > 0 && !initialEventsProcessed) {
      console.log("Processing initial collaborative events batch:", collaborativeEvents);
      matchState.processEventsForLocalState(collaborativeEvents);
      setInitialEventsProcessed(true); // Mark initial processing as done
      // Set the last processed ID to the last event from the initial batch to avoid reprocessing it via single event logic
      if (collaborativeEvents.length > 0) {
        setLastProcessedEventId(collaborativeEvents[collaborativeEvents.length - 1].id);
      }
    }
  }, [collaborativeEvents, matchId, matchState.processEventsForLocalState, initialEventsProcessed]);

  // Effect to process single new remote events incrementally
  useEffect(() => {
    if (lastReceivedEvent && matchState.processSingleRemoteEvent) {
      if (lastReceivedEvent.id !== lastProcessedEventId) {
        console.log("Processing single remote event:", lastReceivedEvent);
        matchState.processSingleRemoteEvent(lastReceivedEvent);
        setLastProcessedEventId(lastReceivedEvent.id);
      }
    }
  }, [lastReceivedEvent, matchState.processSingleRemoteEvent, lastProcessedEventId]);


  // Wrapped event handlers
  const wrappedRecordEvent = (
    eventType: EventType, 
    playerId: number, 
    teamIdStr: 'home' | 'away', 
    coordinates: { x: number; y: number },
    relatedPlayerId?: number
  ) => {
    if (matchId && collaborativeRecordEventFn) {
      matchState.recordEvent(eventType, playerId, teamIdStr, coordinates, collaborativeRecordEventFn, matchId, relatedPlayerId);
    } else {
      matchState.recordEvent(eventType, playerId, teamIdStr, coordinates, undefined, undefined, relatedPlayerId);
    }
  };

  const wrappedRecordPass = (
    passer: Player, 
    receiver: Player, 
    passerTeamIdStr: 'home' | 'away', 
    receiverTeamIdStr: 'home' | 'away', 
    passerCoords: {x: number, y: number}, 
    receiverCoords: {x: number, y: number}
  ) => {
    if (matchId && collaborativeRecordEventFn) {
      matchState.recordPass(passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords, collaborativeRecordEventFn, matchId);
    } else {
      matchState.recordPass(passer, receiver, passerTeamIdStr, receiverTeamIdStr, passerCoords, receiverCoords);
    }
  };

  const handleActionSelect = (action: EventType) => {
    if (!selectedPlayer) {
      toast({
        title: "No Player Selected",
        description: "Please select a player before choosing an action.",
      });
      return;
    }

    // Use wrappedRecordEvent
    wrappedRecordEvent(
      action,
      selectedPlayer.id,
      selectedTeam, // 'home' or 'away'
      teamPositions[selectedPlayer.id] || { x: 0.5, y: 0.5 }
    );
    
    // Toast remains here for immediate UI feedback, even in collaborative mode.
    // The actual state update will come via subscription if collaborative.
    toast({
      title: "Event Recorded",
      description: `${action} recorded for ${selectedPlayer.name}`,
    });
  };

  const handlePianoEvent = (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    // Use wrappedRecordEvent for events from PianoInput that are not passes
    // Passes from PianoInput are handled by its onRecordPass prop, which calls wrappedRecordPass
    wrappedRecordEvent(eventType, playerId, teamId, coordinates);

    // Toast logic remains for immediate feedback
    let playerName = "Unknown Player";
    const teamToSearch = teamId === 'home' ? homeTeam : awayTeam;
    const player = teamToSearch?.players.find(p => p.id === playerId);
    if (player) {
      playerName = player.name;
    }
    
    // Capitalize eventType for display
    const displayEventType = eventType.charAt(0).toUpperCase() + eventType.slice(1);

    toast({
      title: "Event Recorded",
      description: `${displayEventType} for ${playerName}`,
    });
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
          <div className="space-x-2 overflow-x-auto flex">
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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsContent value="pitch" className="mt-4">
                <Card className={isPassTrackingModeActive ? "border-2 border-green-500 shadow-lg" : ""}>
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
                        isPassTrackingModeActive={isPassTrackingModeActive}
                        potentialPasser={potentialPasser}
                        setPotentialPasser={matchState.setPotentialPasser}
                        onRecordPass={wrappedRecordPass} // Pass the wrapped action
                        ballTrackingPoints={ballTrackingPoints} // Pass the ball tracking points
                        handleEventSelect={ (eventType, playerFromMarker, coords) => {
                            let teamIdStr: 'home' | 'away';
                            if (homeTeam && homeTeam.players.some(p => p.id === playerFromMarker.id)) {
                              teamIdStr = 'home';
                            } else if (awayTeam && awayTeam.players.some(p => p.id === playerFromMarker.id)) {
                              teamIdStr = 'away';
                            } else {
                              console.error("Could not determine team for player from Pitch event:", playerFromMarker);
                              // Attempt to use selectedTeam as a fallback, though less accurate if player isn't on selectedTeam
                              teamIdStr = selectedTeam; 
                              // return; // Or handle error appropriately
                            }
                            wrappedRecordEvent(eventType, playerFromMarker.id, teamIdStr, coords, undefined);
                          }}
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
                        <Progress value={statistics.shots.home.onTarget} max={Math.max(1, statistics.shots.home.onTarget + statistics.shots.away.onTarget)} />
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

                  {/* Add the new visualizations section with proper null checks */}
                  {homeTeam && awayTeam && (
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
                      <div className="mt-4">
                        <Label className="mb-2 block">Match Timer</Label>
                        <MatchTimer
                          isRunning={isRunning}
                          onToggle={toggleTimer}
                          onReset={resetTimer}
                          elapsedTime={elapsedTime}
                          setElapsedTime={updateElapsedTime}
                        />
                      </div>
                      <div>
                        <Label>Match Events</Label>
                        <div className="border rounded-md p-4 mt-2 max-h-[400px] overflow-y-auto">
                          <MatchEventsTimeline 
                            events={matchEvents} 
                            homeTeam={homeTeam}
                            awayTeam={awayTeam}
                          />
                        </div>
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
                        <PianoInput
                          homeTeam={homeTeam}
                          awayTeam={awayTeam}
                          onRecordEvent={handlePianoEvent} // For non-pass events from Piano
                          onRecordPass={wrappedRecordPass} // For pass events from Piano
                          teamPositions={teamPositions}
                          selectedTeam={selectedTeam}
                          setSelectedTeam={setSelectedTeam}
                          ballPathHistory={ballPathHistory} 
                        />
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
                    {matchEvents.length > 0 ? (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={matchEvents.map(e => ({ timestamp: e.timestamp, type: e.type, playerId: e.playerId }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="timestamp" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="playerId" stroke="#8884d8" fill="#8884d8" />
                          </AreaChart>
                        </ResponsiveContainer>
                        
                        <MatchEventsTimeline 
                          events={matchEvents} 
                          homeTeam={homeTeam}
                          awayTeam={awayTeam}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No match events recorded yet
                      </div>
                    )}
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
              toggleTimer={toggleTimer}
              resetTimer={resetTimer}
              elapsedTime={elapsedTime}
              setElapsedTime={updateElapsedTime}
              mode={mode}
              selectedPlayer={selectedPlayer}
              handleActionSelect={handleActionSelect}
              ballTrackingPoints={ballTrackingPoints}
              trackBallMovement={matchState.trackBallMovement}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              statistics={statistics}
              updateStatistics={matchState.setStatistics}
              setTimeSegments={matchState.setTimeSegments}
              calculateTimeSegments={matchState.calculateTimeSegments}
              isPassTrackingModeActive={isPassTrackingModeActive}
              togglePassTrackingMode={matchState.togglePassTrackingMode}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MatchAnalysis;
