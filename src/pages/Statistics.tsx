
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BallTrackingPoint, Statistics as StatisticsType, Team, MatchEvent, Player } from '@/types';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import BallFlowVisualization from '@/components/visualizations/BallFlowVisualization';
import { aggregateMatchEvents, AggregatedStats } from '@/lib/analytics/eventAggregator';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'; // Direct import from recharts


const Statistics: React.FC = () => {
  const [stats, setStats] = useState<StatisticsType | null>(null); // Will be populated by aggregatedData for MatchStatsVisualizer
  const [rawEvents, setRawEvents] = useState<MatchEvent[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedStats | null>(null);
  const [ballTrackingData, setBallTrackingData] = useState<BallTrackingPoint[]>([]);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>([]);
  const [homeTeamInfo, setHomeTeamInfo] = useState<Partial<Team>>({ name: 'Home Team', formation: '4-4-2' });
  const [awayTeamInfo, setAwayTeamInfo] = useState<Partial<Team>>({ name: 'Away Team', formation: '4-3-3' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatchDataAndEvents = async () => {
      setLoading(true);
      try {
        // 1. Fetch the latest match details
        const { data: matchDetails, error: matchError } = await supabase
          .from('matches')
          .select('id, match_statistics, ball_tracking_data, home_team_name, away_team_name, home_team_players, away_team_players, home_team_formation, away_team_formation')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (matchError) {
          console.error('Error fetching latest match:', matchError);
          setLoading(false);
          return;
        }

        if (!matchDetails) {
          console.log('No match details found.');
          setLoading(false);
          return;
        }

        // Set team names and formations
        setHomeTeamInfo({ name: matchDetails.home_team_name || 'Home Team', formation: matchDetails.home_team_formation || '4-4-2' });
        setAwayTeamInfo({ name: matchDetails.away_team_name || 'Away Team', formation: matchDetails.away_team_formation || '4-3-3' });

        // Parse player data
        // Ensure players have id, name, and number (jersey_number)
        const parsePlayers = (playerData: any): Player[] => {
          if (!Array.isArray(playerData)) {
            try {
              // Attempt to parse if it's a JSON string
              const parsed = JSON.parse(playerData as string);
              if (Array.isArray(parsed)) playerData = parsed;
              else return [];
            } catch (e) {
              console.warn('Player data is not an array or valid JSON string:', playerData);
              return [];
            }
          }
          return playerData.map((p: any) => ({
            id: String(p.id || p.player_id || `unknown-${Math.random()}`), // Ensure ID exists
            name: p.name || p.player_name || 'Unknown Player',
            number: p.number || p.jersey_number || 0,
            position: p.position || 'Unknown', // Add position if available
            teamId: p.team_id // Add teamId if available
          }));
        };

        const homePlayers = parsePlayers(matchDetails.home_team_players);
        const awayPlayers = parsePlayers(matchDetails.away_team_players);
        setHomeTeamPlayers(homePlayers);
        setAwayTeamPlayers(awayPlayers);

        // 2. Fetch match_events for this match
        const { data: eventsData, error: eventsError } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchDetails.id);

        if (eventsError) {
          console.error('Error fetching match events:', eventsError);
          // Continue without events if necessary, or handle error more strictly
        }
        setRawEvents(eventsData || []);

        // 3. Aggregate events
        const aggregated = aggregateMatchEvents(eventsData || [], homePlayers, awayPlayers);
        setAggregatedData(aggregated);

        // 4. Adapt aggregatedData to the existing StatisticsType for MatchStatsVisualizer
        // This is a temporary step. Ideally, MatchStatsVisualizer would use AggregatedStats.
        if (aggregated) {
          const adaptedStats: StatisticsType = {
            possession: { home: aggregated.homeTeamStats.possession, away: aggregated.awayTeamStats.possession }, // Placeholder
            shots: {
              home: { onTarget: aggregated.homeTeamStats.shotsOnTarget, offTarget: aggregated.homeTeamStats.shots - aggregated.homeTeamStats.shotsOnTarget, total: aggregated.homeTeamStats.shots },
              away: { onTarget: aggregated.awayTeamStats.shotsOnTarget, offTarget: aggregated.awayTeamStats.shots - aggregated.awayTeamStats.shotsOnTarget, total: aggregated.awayTeamStats.shots },
            },
            corners: { home: aggregated.homeTeamStats.corners, away: aggregated.awayTeamStats.corners },
            fouls: { home: aggregated.homeTeamStats.foulsCommitted, away: aggregated.awayTeamStats.foulsCommitted },
            offsides: { home: aggregated.homeTeamStats.offsides, away: aggregated.awayTeamStats.offsides },
            passes: {
              home: { successful: aggregated.homeTeamStats.passesCompleted, attempted: aggregated.homeTeamStats.passesAttempted },
              away: { successful: aggregated.awayTeamStats.passesCompleted, attempted: aggregated.awayTeamStats.passesAttempted },
            },
            // These might not be in StatisticsType, add if necessary or ignore
            ballsPlayed: { home: 0, away: 0 }, // Placeholder
            ballsLost: { home: 0, away: 0 }, // Placeholder
            duels: { home: {}, away: {} }, // Placeholder
            crosses: { home: {total: aggregated.homeTeamStats.crosses}, away: {total: aggregated.awayTeamStats.crosses} }, // Placeholder
          };
          setStats(adaptedStats);
        }

        // Set ball tracking data (remains the same)
        const ballData = matchDetails.ball_tracking_data;
        if (ballData && Array.isArray(ballData)) {
          const validBallData: BallTrackingPoint[] = ballData
            .filter((item): item is any => item !== null && typeof item === 'object')
            .map(item => item as BallTrackingPoint);
          setBallTrackingData(validBallData);
        }

      } catch (error) {
        console.error('Error in fetchMatchDataAndEvents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDataAndEvents();
  }, []);

  const chartDataConfig = useMemo(() => {
    if (!aggregatedData) return null;
    const homeName = homeTeamInfo?.name || 'Home';
    const awayName = awayTeamInfo?.name || 'Away';

    // Using direct hex codes for simplicity, replace with CSS variables if theme is set up
    const homeColor = "#1E90FF"; // DodgerBlue
    const awayColor = "#FF6347"; // Tomato
    const homeTargetColor = "#6495ED"; // CornflowerBlue (lighter blue)
    const awayTargetColor = "#FFA07A"; // LightSalmon (lighter red)
    const yellowCardColor = "#FFD700"; // Gold
    const redCardColor = "#DC143C"; // Crimson

    return {
      fouls: [
        { name: homeName, value: aggregatedData.homeTeamStats.foulsCommitted, fill: homeColor },
        { name: awayName, value: aggregatedData.awayTeamStats.foulsCommitted, fill: awayColor },
      ],
      shots: [
        { team: homeName, "Total Shots": aggregatedData.homeTeamStats.shots, "On Target": aggregatedData.homeTeamStats.shotsOnTarget, fillTotal: homeColor, fillTarget: homeTargetColor },
        { team: awayName, "Total Shots": aggregatedData.awayTeamStats.shots, "On Target": aggregatedData.awayTeamStats.shotsOnTarget, fillTotal: awayColor, fillTarget: awayTargetColor },
      ],
      goals: [
        { name: homeName, value: aggregatedData.homeTeamStats.goals, fill: homeColor },
        { name: awayName, value: aggregatedData.awayTeamStats.goals, fill: awayColor },
      ],
      corners: [
        { name: homeName, value: aggregatedData.homeTeamStats.corners, fill: homeColor },
        { name: awayName, value: aggregatedData.awayTeamStats.corners, fill: awayColor },
      ],
      offsides: [
        { name: homeName, value: aggregatedData.homeTeamStats.offsides, fill: homeColor },
        { name: awayName, value: aggregatedData.awayTeamStats.offsides, fill: awayColor },
      ],
      cards: [
        { team: homeName, "Yellow Cards": aggregatedData.homeTeamStats.yellowCards, "Red Cards": aggregatedData.homeTeamStats.redCards, fillYellow: yellowCardColor, fillRed: redCardColor },
        { team: awayName, "Yellow Cards": aggregatedData.awayTeamStats.yellowCards, "Red Cards": aggregatedData.awayTeamStats.redCards, fillYellow: yellowCardColor, fillRed: redCardColor },
      ]
    };
  }, [aggregatedData, homeTeamInfo, awayTeamInfo]);


  // Prepare full Team objects for visualizations
  const homeTeamForViz: Team | null = homeTeamInfo.name ? {
    id: 'home',
    name: homeTeamInfo.name,
    formation: homeTeamInfo.formation as any,
    players: homeTeamPlayers
  } : null;

  const awayTeamForViz: Team | null = awayTeamInfo.name ? {
    id: 'away',
    name: awayTeamInfo.name,
    formation: awayTeamInfo.formation as any,
    players: awayTeamPlayers
  } : null;


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Match Statistics</h1>

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {/* Optional: Add a spinner here */}
          <p className="text-lg text-muted-foreground">Loading statistics...</p>
        </div>
      )}

      {!loading && !aggregatedData && rawEvents.length === 0 && (
         <Card>
           <CardContent className="py-12">
             <p className="text-center text-xl text-muted-foreground">
               No match data found to generate statistics.
             </p>
             <p className="text-center text-sm text-muted-foreground mt-2">
               Please ensure a match has been played and events are recorded.
             </p>
           </CardContent>
         </Card>
      )}
      
      {!loading && !aggregatedData && rawEvents.length > 0 && (
         <Card>
           <CardContent className="py-12">
             <p className="text-center text-xl text-muted-foreground">
               Aggregating statistics...
             </p>
             <p className="text-center text-sm text-muted-foreground mt-2">
               This may take a moment for matches with many events.
             </p>
           </CardContent>
         </Card>
      )}

      {aggregatedData && chartDataConfig && (
        <>
          {/* Team Stats Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Goals Chart */}
            <Card>
              <CardHeader><CardTitle>Goals</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartDataConfig.goals} accessibilityLayer>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false}/>
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Bar dataKey="value" radius={4} /> {/* fill will be picked from data */}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Shots Chart */}
            <Card>
              <CardHeader><CardTitle>Shots</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartDataConfig.shots} accessibilityLayer>
                    <XAxis dataKey="team" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false}/>
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Bar dataKey="Total Shots" stackId="shots" fill={chartDataConfig.shots[0]?.fillTotal || '#8884d8'} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="On Target" stackId="shots" fill={chartDataConfig.shots[0]?.fillTarget || '#82ca9d'} radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Fouls Chart */}
            <Card>
              <CardHeader><CardTitle>Fouls Committed</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartDataConfig.fouls} accessibilityLayer>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false}/>
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Bar dataKey="value" radius={4} /> {/* fill from data */}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cards Chart */}
            <Card>
              <CardHeader><CardTitle>Disciplinary Cards</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartDataConfig.cards} accessibilityLayer>
                    <XAxis dataKey="team" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false}/>
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                    <Bar dataKey="Yellow Cards" stackId="cards" fill={chartDataConfig.cards[0]?.fillYellow || '#FFEB3B'} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Red Cards" stackId="cards" fill={chartDataConfig.cards[0]?.fillRed || '#F44336'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Corners Chart */}
            <Card>
              <CardHeader><CardTitle>Corners</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartDataConfig.corners} accessibilityLayer>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false}/>
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Bar dataKey="value" radius={4} /> {/* fill from data */}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Offsides Chart */}
            <Card>
              <CardHeader><CardTitle>Offsides</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartDataConfig.offsides} accessibilityLayer>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false}/>
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                    <Bar dataKey="value" radius={4} /> {/* fill from data */}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Player Stats Table */}
          {aggregatedData.playerStats.length > 0 && (
            <Card className="mt-8">
              <CardHeader><CardTitle>Player Statistics</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Player</TableHead>
                      <TableHead className="text-center">Team</TableHead>
                      <TableHead className="text-right">G</TableHead>
                      <TableHead className="text-right">A</TableHead>
                      <TableHead className="text-right">Sh</TableHead>
                      <TableHead className="text-right">SoT</TableHead>
                      <TableHead className="text-right">Pass (Cmp)</TableHead>
                      <TableHead className="text-right">Fouls</TableHead>
                      <TableHead className="text-center">YC</TableHead>
                      <TableHead className="text-center">RC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedData.playerStats.sort((a,b) => b.goals - a.goals || b.assists - a.assists || b.shots - a.shots).map((player) => (
                      <TableRow key={`${player.playerId}-${player.team}`}>
                        <TableCell className="font-medium">{player.playerName}{player.jerseyNumber ? ` (#${player.jerseyNumber})` : ''}</TableCell>
                        <TableCell className="text-center capitalize">{player.team}</TableCell>
                        <TableCell className="text-right">{player.goals}</TableCell>
                        <TableCell className="text-right">{player.assists}</TableCell>
                        <TableCell className="text-right">{player.shots}</TableCell>
                        <TableCell className="text-right">{player.shotsOnTarget}</TableCell>
                        <TableCell className="text-right">{player.passesAttempted} ({player.passesCompleted})</TableCell>
                        <TableCell className="text-right">{player.foulsCommitted}</TableCell>
                        <TableCell className="text-center">{player.yellowCards > 0 ? player.yellowCards : '-'}</TableCell>
                        <TableCell className="text-center">{player.redCards > 0 ? player.redCards : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Existing MatchStatsVisualizer and BallFlowVisualization can remain for now or be phased out */}
          {stats && homeTeamForViz && awayTeamForViz && (
            <div className="mt-8 opacity-50 hover:opacity-100 transition-opacity"> {/* Visually de-emphasize old viz */}
              <h2 className="text-xl font-semibold text-center my-4 text-muted-foreground">(Legacy Stats Visualizer)</h2>
              <MatchStatsVisualizer
                homeTeam={homeTeamForViz}
                awayTeam={awayTeamForViz}
                events={rawEvents}
                ballTrackingPoints={ballTrackingData}
                timeSegments={[]}
                ballTrackingData={ballTrackingData} // Pass existing ballTrackingData
              />
            </div>
          )}
          {ballTrackingData.length > 0 && homeTeamForViz && awayTeamForViz && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Ball Movement Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <BallFlowVisualization 
                  ballTrackingPoints={ballTrackingData} 
                  homeTeam={homeTeamForViz}
                  awayTeam={awayTeamForViz}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
       {/* This specific condition might be redundant if the one above covers it,
           but kept for explicitness if there's a state where rawEvents exist,
           aggregation is done, but aggregatedData is still null (e.g. error in aggregation)
           However, the current logic sets aggregatedData even if empty.
           So, the main conditions are: loading, no data at all, or has data.
        */}
    </div>
  );
};

export default Statistics;
