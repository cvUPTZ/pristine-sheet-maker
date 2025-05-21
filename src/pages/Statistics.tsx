import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Activity, Medal, TrendingUp, FileBarChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeamTimeSegmentCharts from '@/components/visualizations/TeamTimeSegmentCharts';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import { TimeSegmentStatistics, BallTrackingPoint, Player, Team } from '@/types';

interface Player {
  id: number;
  name: string;
  number: number;
  position: string;
}

interface Team {
  name: string;
  players: Player[];
}

interface MatchEvent {
  id: string;
  type: string;
  teamId: string;
  playerId: number;
  timestamp: number;
  coordinates: { x: number; y: number };
}

interface SavedMatch {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  elapsedTime: number;
  events: MatchEvent[];
  statistics: {
    possession?: { home?: number; away?: number };
    shots?: { home?: { total?: number; onTarget?: number }; away?: { total?: number; onTarget?: number } };
    passes?: { home?: { total?: number; successful?: number }; away?: { total?: number; successful?: number } };
    fouls?: { home?: number; away?: number };
    corners?: { home?: number; away?: number };
    // Add any other statistics tracked
  };
}

const Statistics: React.FC = () => {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [topScorers, setTopScorers] = useState<{player: Player; team: string; goals: number}[]>([]);
  const [topAssists, setTopAssists] = useState<{player: Player; team: string; assists: number}[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<SavedMatch | null>(null);
  const [timeSegments, setTimeSegments] = useState<TimeSegmentStatistics[]>([]);
  const [ballTrackingPoints, setBallTrackingPoints] = useState<BallTrackingPoint[]>([]);

  useEffect(() => {
    // Load all match data from localStorage
    const loadMatchData = () => {
      const savedMatches: SavedMatch[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('efootpad_match_')) {
          try {
            const matchData = JSON.parse(localStorage.getItem(key) || '{}');
            savedMatches.push(matchData);
          } catch (error) {
            console.error('Error parsing match data:', error);
          }
        }
      }
      
      // Sort by date (newest first)
      savedMatches.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      return savedMatches;
    };

    const calculatePlayerStats = (matchesData: SavedMatch[]) => {
      // Track players and their stats
      const playerStats: Record<string, {
        player: Player;
        team: string;
        goals: number;
        assists: number;
        passes: number;
        shots: number;
      }> = {};
      
      matchesData.forEach(match => {
        // Process home team players
        match.homeTeam.players.forEach(player => {
          const key = `${match.homeTeam.name}-${player.id}`;
          if (!playerStats[key]) {
            playerStats[key] = {
              player,
              team: match.homeTeam.name,
              goals: 0,
              assists: 0,
              passes: 0,
              shots: 0
            };
          }
        });
        
        // Process away team players
        match.awayTeam.players.forEach(player => {
          const key = `${match.awayTeam.name}-${player.id}`;
          if (!playerStats[key]) {
            playerStats[key] = {
              player,
              team: match.awayTeam.name,
              goals: 0,
              assists: 0,
              passes: 0,
              shots: 0
            };
          }
        });
        
        // Count events
        match.events.forEach(event => {
          const teamName = event.teamId === 'home' ? match.homeTeam.name : match.awayTeam.name;
          const key = `${teamName}-${event.playerId}`;
          
          if (playerStats[key]) {
            switch (event.type) {
              case 'goal':
                playerStats[key].goals += 1;
                break;
              case 'assist':
                playerStats[key].assists += 1;
                break;
              case 'pass':
                playerStats[key].passes += 1;
                break;
              case 'shot':
                playerStats[key].shots += 1;
                break;
              default:
                break;
            }
          }
        });
      });
      
      // Create sorted arrays for top scorers and assists
      const scorers = Object.values(playerStats)
        .filter(stats => stats.goals > 0)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 5)
        .map(stats => ({
          player: stats.player,
          team: stats.team,
          goals: stats.goals
        }));
        
      const assisters = Object.values(playerStats)
        .filter(stats => stats.assists > 0)
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 5)
        .map(stats => ({
          player: stats.player,
          team: stats.team,
          assists: stats.assists
        }));
      
      return { scorers, assisters };
    };

    const matchesData = loadMatchData();
    setMatches(matchesData);
    
    // Set the first match as selected by default if available
    if (matchesData.length > 0) {
      setSelectedMatch(matchesData[0]);
      
      // Load ball tracking points and time segments for the first match if available
      const firstMatch = matchesData[0];
      if (firstMatch.ballTrackingPoints && firstMatch.ballTrackingPoints.length > 0) {
        setBallTrackingPoints(firstMatch.ballTrackingPoints);
      }
      
      if (firstMatch.timeSegments && firstMatch.timeSegments.length > 0) {
        setTimeSegments(firstMatch.timeSegments);
      }
    }
    
    const { scorers, assisters } = calculatePlayerStats(matchesData);
    setTopScorers(scorers);
    setTopAssists(assisters);
    
    setLoading(false);
  }, []);

  // Handle match selection
  const handleMatchSelect = (match: SavedMatch) => {
    setSelectedMatch(match);
    
    // Load match-specific data
    if (match.ballTrackingPoints && match.ballTrackingPoints.length > 0) {
      setBallTrackingPoints(match.ballTrackingPoints);
    } else {
      setBallTrackingPoints([]);
    }
    
    if (match.timeSegments && match.timeSegments.length > 0) {
      setTimeSegments(match.timeSegments);
    } else {
      setTimeSegments([]);
    }
  };

  // Calculate aggregate statistics
  const totalMatches = matches.length;
  
  const aggregateStats = {
    totalGoals: matches.reduce((sum, match) => {
      const homeGoals = match.statistics.shots?.home?.onTarget || 0;
      const awayGoals = match.statistics.shots?.away?.onTarget || 0;
      return sum + homeGoals + awayGoals;
    }, 0),
    totalShots: matches.reduce((sum, match) => {
      const homeShots = match.statistics.shots?.home?.total || 0;
      const awayShots = match.statistics.shots?.away?.total || 0;
      return sum + homeShots + awayShots;
    }, 0),
    totalPasses: matches.reduce((sum, match) => {
      const homePasses = match.statistics.passes?.home?.total || 0;
      const awayPasses = match.statistics.passes?.away?.total || 0;
      return sum + homePasses + awayPasses;
    }, 0),
    totalCorners: matches.reduce((sum, match) => {
      const homeCorners = match.statistics.corners?.home || 0;
      const awayCorners = match.statistics.corners?.away || 0;
      return sum + homeCorners + awayCorners;
    }, 0),
    averageGoalsPerMatch: totalMatches > 0 
      ? matches.reduce((sum, match) => {
          const homeGoals = match.statistics.shots?.home?.onTarget || 0;
          const awayGoals = match.statistics.shots?.away?.onTarget || 0;
          return sum + homeGoals + awayGoals;
        }, 0) / totalMatches
      : 0,
    shotAccuracy: matches.reduce((sum, match) => {
      const homeShotsTotal = match.statistics.shots?.home?.total || 0;
      const homeShotsOnTarget = match.statistics.shots?.home?.onTarget || 0;
      const awayShotsTotal = match.statistics.shots?.away?.total || 0;
      const awayShotsOnTarget = match.statistics.shots?.away?.onTarget || 0;
      
      const totalShots = homeShotsTotal + awayShotsTotal;
      const totalOnTarget = homeShotsOnTarget + awayShotsOnTarget;
      
      return totalShots > 0 ? (totalOnTarget / totalShots) * 100 : 0;
    }, 0) / (totalMatches || 1),
    passAccuracy: matches.reduce((sum, match) => {
      const homePassesTotal = match.statistics.passes?.home?.total || 0;
      const homePassesSuccessful = match.statistics.passes?.home?.successful || 0;
      const awayPassesTotal = match.statistics.passes?.away?.total || 0;
      const awayPassesSuccessful = match.statistics.passes?.away?.successful || 0;
      
      const totalPasses = homePassesTotal + awayPassesTotal;
      const totalSuccessful = homePassesSuccessful + awayPassesSuccessful;
      
      return totalPasses > 0 ? (totalSuccessful / totalPasses) * 100 : 0;
    }, 0) / (totalMatches || 1)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium">Loading statistics...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-football-home to-football-away bg-clip-text text-transparent">
              EFOOTPAD STATISTICS
            </h1>
            <div className="w-[100px]"></div>
          </div>
        </header>

        {totalMatches === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No Match Data Available</h2>
            <p className="text-muted-foreground mb-6">
              Record your first match to view statistics
            </p>
            <Button asChild>
              <Link to="/match">Record First Match</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-football-home" />
                    Total Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{aggregateStats.totalGoals}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Avg. {aggregateStats.averageGoalsPerMatch.toFixed(1)} per match
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-football-away" />
                    Shot Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    {aggregateStats.shotAccuracy.toFixed(1)}%
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={aggregateStats.shotAccuracy} 
                      max={100}
                      indicatorClassName="bg-football-away"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-green-600" />
                    Pass Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    {aggregateStats.passAccuracy.toFixed(1)}%
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={aggregateStats.passAccuracy} 
                      max={100}
                      indicatorClassName="bg-green-600" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="players">Top Players</TabsTrigger>
                <TabsTrigger value="teams">Team Analysis</TabsTrigger>
                <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Match Statistics Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">Total Matches</div>
                          <div className="text-2xl font-bold">{totalMatches}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Total Goals</div>
                          <div className="text-2xl font-bold">{aggregateStats.totalGoals}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Total Shots</div>
                          <div className="text-2xl font-bold">{aggregateStats.totalShots}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">Total Passes</div>
                          <div className="text-2xl font-bold">{aggregateStats.totalPasses}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Total Corners</div>
                          <div className="text-2xl font-bold">{aggregateStats.totalCorners}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Goals Per Match</div>
                          <div className="text-2xl font-bold">
                            {aggregateStats.averageGoalsPerMatch.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium">Shot Accuracy</div>
                          <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">
                              {aggregateStats.shotAccuracy.toFixed(1)}%
                            </div>
                          </div>
                          <div className="mt-2">
                            <Progress 
                              value={aggregateStats.shotAccuracy} 
                              max={100}
                              indicatorClassName="bg-football-home" 
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium">Pass Accuracy</div>
                          <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">
                              {aggregateStats.passAccuracy.toFixed(1)}%
                            </div>
                          </div>
                          <div className="mt-2">
                            <Progress 
                              value={aggregateStats.passAccuracy} 
                              max={100} 
                              indicatorClassName="bg-football-away"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="players" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Goalscorers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {topScorers.length > 0 ? (
                        <div className="space-y-4">
                          {topScorers.map((scorer, index) => (
                            <div key={`scorer-${index}`} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-football-home text-white font-medium text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{scorer.player.name}</div>
                                  <div className="text-xs text-muted-foreground">{scorer.team}</div>
                                </div>
                              </div>
                              <div className="text-xl font-bold">{scorer.goals}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No goal data recorded
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Assists</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {topAssists.length > 0 ? (
                        <div className="space-y-4">
                          {topAssists.map((assister, index) => (
                            <div key={`assist-${index}`} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-football-away text-white font-medium text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{assister.player.name}</div>
                                  <div className="text-xs text-muted-foreground">{assister.team}</div>
                                </div>
                              </div>
                              <div className="text-xl font-bold">{assister.assists}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No assist data recorded
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="teams" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Performance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {matches.length > 0 ? (
                        matches.map((match, index) => {
                          const homeGoals = match.statistics.shots?.home?.onTarget || 0;
                          const awayGoals = match.statistics.shots?.away?.onTarget || 0;
                          const homePossession = match.statistics.possession?.home || 50;
                          const awayPossession = match.statistics.possession?.away || 50;
                          
                          return (
                            <div key={match.matchId} className="border rounded-md p-4">
                              <div className="flex justify-between items-center mb-2">
                                <div className="font-medium text-football-home">{match.homeTeam.name}</div>
                                <div className="text-xl font-mono">{homeGoals} - {awayGoals}</div>
                                <div className="font-medium text-football-away">{match.awayTeam.name}</div>
                              </div>
                              
                              <div className="text-xs text-center text-muted-foreground mb-4">
                                {new Date(match.date).toLocaleString()}
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Possession</span>
                                    <span>{homePossession}% - {awayPossession}%</span>
                                  </div>
                                  <div className="flex h-2 w-full rounded-full overflow-hidden">
                                    <div 
                                      className="bg-football-home" 
                                      style={{ width: `${homePossession}%` }}
                                    ></div>
                                    <div 
                                      className="bg-football-away" 
                                      style={{ width: `${awayPossession}%` }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Shots</span>
                                    <span>
                                      {match.statistics.shots?.home?.total || 0} - {match.statistics.shots?.away?.total || 0}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={(match.statistics.shots?.home?.total || 0) / ((match.statistics.shots?.home?.total || 0) + (match.statistics.shots?.away?.total || 1)) * 100} 
                                    max={100}
                                    indicatorClassName="bg-football-home" 
                                  />
                                </div>
                                
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Passes</span>
                                    <span>
                                      {match.statistics.passes?.home?.total || 0} - {match.statistics.passes?.away?.total || 0}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={(match.statistics.passes?.home?.total || 0) / ((match.statistics.passes?.home?.total || 0) + (match.statistics.passes?.away?.total || 1)) * 100} 
                                    max={100}
                                    indicatorClassName="bg-football-home" 
                                  />
                                </div>
                              </div>
                              
                              <div className="mt-4 text-right">
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/match/${match.matchId}`}>
                                    View Details
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No match data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="visualizations" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileBarChart className="h-5 w-5 text-primary" />
                      Advanced Match Visualizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedMatch ? (
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {matches.map(match => (
                            <Button 
                              key={match.matchId}
                              variant={selectedMatch.matchId === match.matchId ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleMatchSelect(match)}
                            >
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </Button>
                          ))}
                        </div>
                        
                        {ballTrackingPoints.length > 0 ? (
                          <Tabs defaultValue="time" className="w-full">
                            <TabsList className="grid grid-cols-3 mb-4">
                              <TabsTrigger value="time">Time Analysis</TabsTrigger>
                              <TabsTrigger value="player">Player Stats</TabsTrigger>
                              <TabsTrigger value="flow">Ball Flow</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="time">
                              {timeSegments.length > 0 ? (
                                <TeamTimeSegmentCharts 
                                  timeSegments={timeSegments}
                                  homeTeamName={selectedMatch.homeTeam.name}
                                  awayTeamName={selectedMatch.awayTeam.name}
                                />
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>No time segment data available for this match.</p>
                                  <p className="text-sm mt-2">Return to the match to calculate time segments.</p>
                                </div>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="player">
                              <PlayerStatsTable
                                ballTrackingPoints={ballTrackingPoints}
                                homeTeam={selectedMatch.homeTeam as Team}
                                awayTeam={selectedMatch.awayTeam as Team}
                              />
                            </TabsContent>
                            
                            <TabsContent value="flow">
                              <BallFlowVisualization
                                ballTrackingPoints={ballTrackingPoints}
                                homeTeam={selectedMatch.homeTeam as Team}
                                awayTeam={selectedMatch.awayTeam as Team}
                                width={800}
                                height={600}
                              />
                            </TabsContent>
                          </Tabs>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No ball tracking data available for this match.</p>
                            <p className="text-sm mt-2">
                              Use ball tracking mode during matches to collect visualization data.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Select a match to view detailed visualizations</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
