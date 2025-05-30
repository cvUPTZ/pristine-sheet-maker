
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PlayerStatsTable from '@/components/visualizations/PlayerStatsTable';
import MatchStatsVisualizer from '@/components/visualizations/MatchStatsVisualizer';
import type { Match, Statistics, MatchEvent, BallTrackingPoint } from '@/types';

const Statistics: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (matchId) {
      fetchMatchData(matchId);
    }
  }, [matchId]);

  const fetchMatchData = async (id: string) => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (matchError) throw matchError;

      if (matchData) {
        const transformedMatch: Match = {
          ...matchData,
          homeTeamName: matchData.home_team_name,
          awayTeamName: matchData.away_team_name,
          homeTeamFormation: matchData.home_team_formation || undefined,
          awayTeamFormation: matchData.away_team_formation || undefined,
          matchDate: matchData.match_date || undefined,
          venue: matchData.location || undefined,
          homeTeam: {
            id: 'home',
            name: matchData.home_team_name,
            formation: (matchData.home_team_formation as any) || '4-4-2',
            players: []
          },
          awayTeam: {
            id: 'away',
            name: matchData.away_team_name,
            formation: (matchData.away_team_formation as any) || '4-3-3',
            players: []
          },
          statistics: (() => {
            let parsedStatistics: Statistics | undefined = undefined;
            if (matchData.match_statistics) {
              if (typeof matchData.match_statistics === 'string') {
                try {
                  parsedStatistics = JSON.parse(matchData.match_statistics);
                } catch (e) {
                  console.error('Failed to parse match_statistics string:', e);
                }
              } else if (typeof matchData.match_statistics === 'object') {
                parsedStatistics = matchData.match_statistics as Statistics;
              }
            }
            return parsedStatistics || {
              possession: { home: 0, away: 0 },
              shots: { home: { onTarget: 0, offTarget: 0, total: 0 }, away: { onTarget: 0, offTarget: 0, total: 0 } },
              corners: { home: 0, away: 0 },
              fouls: { home: 0, away: 0 },
              offsides: { home: 0, away: 0 },
              passes: { home: { successful: 0, attempted: 0 }, away: { successful: 0, attempted: 0 } },
              ballsPlayed: { home: 0, away: 0 },
              ballsLost: { home: 0, away: 0 },
              duels: { home: { won: 0, total: 0 }, away: { won: 0, total: 0 } },
              crosses: { home: { successful: 0, total: 0 }, away: { successful: 0, total: 0 } }
            };
          })(),
          ballTrackingData: (() => {
            let parsedBallTrackingData: BallTrackingPoint[] | undefined = undefined;
            if (matchData.ball_tracking_data) {
              if (typeof matchData.ball_tracking_data === 'string') {
                try {
                  parsedBallTrackingData = JSON.parse(matchData.ball_tracking_data);
                  if (!Array.isArray(parsedBallTrackingData)) {
                    console.error('Parsed ball_tracking_data is not an array.');
                    parsedBallTrackingData = [];
                  }
                } catch (e) {
                  console.error('Failed to parse ball_tracking_data string:', e);
                }
              } else if (Array.isArray(matchData.ball_tracking_data)) {
                parsedBallTrackingData = matchData.ball_tracking_data as BallTrackingPoint[];
              }
            }
            return parsedBallTrackingData || [];
          })()
        };

        // Fetch events
        const { data: eventsData, error: eventsError } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', id)
          .order('timestamp', { ascending: true });

        if (!eventsError && eventsData) {
          const transformedEvents: MatchEvent[] = eventsData.map(event => ({
            id: event.id,
            match_id: event.match_id,
            timestamp: event.timestamp || 0,
            event_type: event.event_type,
            type: event.event_type as any,
            team: event.team as 'home' | 'away',
            player_id: event.player_id || undefined,
            coordinates: event.coordinates as { x: number; y: number } || { x: 0, y: 0 },
            created_by: event.created_by
          }));
          transformedMatch.events = transformedEvents;
        }

        setMatch(transformedMatch);
        setSelectedMatch(transformedMatch);
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (match: Match) => {
    if (!match.events) return null;

    const stats = {
      totalEvents: match.events.length,
      homeEvents: match.events.filter(e => e.team === 'home').length,
      awayEvents: match.events.filter(e => e.team === 'away').length,
      goals: {
        home: match.events.filter(e => e.type === 'goal' && e.team === 'home').length,
        away: match.events.filter(e => e.type === 'goal' && e.team === 'away').length
      },
      shots: {
        home: match.events.filter(e => e.type === 'shot' && e.team === 'home').length,
        away: match.events.filter(e => e.type === 'shot' && e.team === 'away').length
      },
      fouls: {
        home: match.events.filter(e => e.type === 'foul' && e.team === 'home').length,
        away: match.events.filter(e => e.type === 'foul' && e.team === 'away').length
      },
      cards: {
        home: match.events.filter(e => (e.type === 'yellowCard' || e.type === 'redCard') && e.team === 'home').length,
        away: match.events.filter(e => (e.type === 'yellowCard' || e.type === 'redCard') && e.team === 'away').length
      },
      corners: {
        home: match.events.filter(e => e.type === 'corner' && e.team === 'home').length,
        away: match.events.filter(e => e.type === 'corner' && e.team === 'away').length
      },
      passes: {
        home: match.events.filter(e => e.type === 'pass' && e.team === 'home').length,
        away: match.events.filter(e => e.type === 'pass' && e.team === 'away').length
      }
    };

    return stats;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading match statistics...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-red-600">Match not found</div>
      </div>
    );
  }

  const stats = calculateStats(match);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {match.name || `${match.homeTeam?.name || 'Home'} vs ${match.awayTeam?.name || 'Away'}`}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {match.matchDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(match.matchDate).toLocaleDateString()}
                  </div>
                )}
                {match.venue && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {match.venue}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {match.homeTeam?.formation || '4-4-2'} vs {match.awayTeam?.formation || '4-3-3'}
                </div>
              </div>
            </div>
            <Badge variant={match.status === 'live' ? 'default' : match.status === 'completed' ? 'secondary' : 'outline'}>
              {match.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.goals.home}</div>
              <div className="text-sm text-gray-600">{match.homeTeam?.name || 'Home'} Goals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.goals.away}</div>
              <div className="text-sm text-gray-600">{match.awayTeam?.name || 'Away'} Goals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {match.statistics?.possession?.home || 0}% - {match.statistics?.possession?.away || 0}%
              </div>
              <div className="text-sm text-gray-600">Possession</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Statistics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="visualizations">Charts</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Team Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="font-semibold">{match.homeTeam?.name || 'Home'}</div>
                      <div className="font-semibold">Statistic</div>
                      <div className="font-semibold">{match.awayTeam?.name || 'Away'}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center py-2 border-t">
                      <div className="text-lg font-bold">{stats.shots.home}</div>
                      <div className="text-sm">Shots</div>
                      <div className="text-lg font-bold">{stats.shots.away}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center py-2 border-t">
                      <div className="text-lg font-bold">{stats.fouls.home}</div>
                      <div className="text-sm">Fouls</div>
                      <div className="text-lg font-bold">{stats.fouls.away}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center py-2 border-t">
                      <div className="text-lg font-bold">{stats.corners.home}</div>
                      <div className="text-sm">Corners</div>
                      <div className="text-lg font-bold">{stats.corners.away}</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center py-2 border-t">
                      <div className="text-lg font-bold">{stats.cards.home}</div>
                      <div className="text-sm">Cards</div>
                      <div className="text-lg font-bold">{stats.cards.away}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Match Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Match Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className="ml-2" variant={match.status === 'live' ? 'default' : 'outline'}>
                        {match.status}
                      </Badge>
                    </div>
                    {match.matchDate && (
                      <div>
                        <span className="font-medium">Date:</span>
                        <span className="ml-2">{new Date(match.matchDate).toLocaleString()}</span>
                      </div>
                    )}
                    {match.venue && (
                      <div>
                        <span className="font-medium">Venue:</span>
                        <span className="ml-2">{match.venue}</span>
                      </div>
                    )}
                    {match.competition && (
                      <div>
                        <span className="font-medium">Competition:</span>
                        <span className="ml-2">{match.competition}</span>
                      </div>
                    )}
                    {match.description && (
                      <div>
                        <span className="font-medium">Description:</span>
                        <p className="mt-1 text-sm">{match.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="players">
          {match.homeTeam && match.awayTeam && (
            <PlayerStatsTable
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
            />
          )}
        </TabsContent>

        <TabsContent value="visualizations">
          {selectedMatch && selectedMatch.homeTeam && selectedMatch.awayTeam && (
            <MatchStatsVisualizer
              homeTeam={selectedMatch.homeTeam}
              awayTeam={selectedMatch.awayTeam}
              ballTrackingPoints={selectedMatch.ballTrackingData || []}
              timeSegments={selectedMatch.timeSegments || []}
              events={selectedMatch.events || []}
              ballTrackingData={selectedMatch.ballTrackingData || []}
            />
          )}
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Match Events Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {match.events && match.events.length > 0 ? (
                <div className="space-y-2">
                  {match.events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant={event.team === 'home' ? 'default' : 'secondary'}>
                          {event.team === 'home' ? match.homeTeam?.name : match.awayTeam?.name}
                        </Badge>
                        <span className="font-medium capitalize">{event.type}</span>
                        {event.player_id && (
                          <span className="text-sm text-gray-600">Player {event.player_id}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.floor(event.timestamp / 60000)}:{((event.timestamp % 60000) / 1000).toFixed(0).padStart(2, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No events recorded for this match
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Statistics;
