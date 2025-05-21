
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, BarChart3, Flag, TableIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import BallTracker from '@/components/BallTracker';
import { getPlayerPositions } from '@/utils/formationUtils';
import { MatchEvent } from '@/types';

const MatchAnalysis: React.FC = () => {
  const { toast } = useToast();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [matchData, setMatchData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showBallPath, setShowBallPath] = React.useState(false);
  
  React.useEffect(() => {
    const loadMatchData = () => {
      try {
        const data = localStorage.getItem(`efootpad_match_${matchId}`);
        if (data) {
          setMatchData(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading match data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load match data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadMatchData();
  }, [matchId, toast]);
  
  const exportToCSV = () => {
    if (!matchData) return;
    
    const { homeTeam, awayTeam, events, date } = matchData;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add header
    csvContent += `Match: ${homeTeam.name} vs ${awayTeam.name}, Date: ${new Date(date).toLocaleDateString()}\n\n`;
    csvContent += "Time,Team,Player,Event,X Position,Y Position\n";
    
    // Add events
    events.forEach((event: MatchEvent) => {
      const team = event.teamId === 'home' ? homeTeam : awayTeam;
      const player = team.players.find((p: any) => p.id === event.playerId);
      const playerName = player ? player.name : 'Unknown';
      
      const minutes = Math.floor(event.timestamp / 60);
      const seconds = event.timestamp % 60;
      const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      csvContent += `${timeFormatted},${team.name},${playerName},${event.type},${event.coordinates.x.toFixed(2)},${event.coordinates.y.toFixed(2)}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `match_${homeTeam.name}_vs_${awayTeam.name}_${new Date(date).toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Export Successful',
      description: 'Match data has been exported to CSV',
    });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium">Loading match data...</h2>
        </div>
      </div>
    );
  }
  
  if (!matchData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-4">Match not found</h2>
          <Button onClick={() => navigate('/matches')}>
            Back to Matches
          </Button>
        </div>
      </div>
    );
  }
  
  const { homeTeam, awayTeam, statistics, events, date, ballTrackingPoints = [], playerStats = [] } = matchData;
  
  // Get player positions based on formations
  const homeTeamPositions = getPlayerPositions(homeTeam, true);
  const awayTeamPositions = getPlayerPositions(awayTeam, false);
  const teamPositions = { ...homeTeamPositions, ...awayTeamPositions };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">Match Analysis</h1>
          <Button variant="outline" className="flex items-center gap-2" onClick={exportToCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <div className="text-xl font-semibold text-football-home">
                {homeTeam.name} ({homeTeam.formation || '4-4-2'})
              </div>
              <div className="text-2xl font-mono font-bold my-2 sm:my-0">
                {statistics.shots.home.onTarget || 0} - {statistics.shots.away.onTarget || 0}
              </div>
              <div className="text-xl font-semibold text-football-away">
                {awayTeam.name} ({awayTeam.formation || '4-3-3'})
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {new Date(date).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="pitch">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pitch" className="flex items-center gap-1">
              <Flag className="h-4 w-4" />
              Pitch View
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-1">
              <TableIcon className="h-4 w-4" />
              Detailed Stats
            </TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pitch" className="mt-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle>Pitch Analysis</CardTitle>
                {ballTrackingPoints.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowBallPath(!showBallPath)}
                  >
                    {showBallPath ? "Hide Ball Path" : "Show Ball Path"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-2">
                <FootballPitch>
                  {/* Render home team players */}
                  {homeTeam.players.map((player: any) => (
                    <PlayerMarker
                      key={`home-${player.id}`}
                      player={player}
                      teamColor="#1A365D" // Home team color
                      position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
                      selected={false}
                    />
                  ))}
                  
                  {/* Render away team players */}
                  {awayTeam.players.map((player: any) => (
                    <PlayerMarker
                      key={`away-${player.id}`}
                      player={player}
                      teamColor="#D3212C" // Away team color
                      position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
                      selected={false}
                    />
                  ))}
                  
                  {/* Render event markers */}
                  {events.map((event: MatchEvent) => (
                    <div
                      key={event.id}
                      className="absolute w-3 h-3 rounded-full bg-yellow-400 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform"
                      style={{
                        left: `${event.coordinates.x * 100}%`,
                        top: `${event.coordinates.y * 100}%`,
                      }}
                      title={`${event.type} - ${Math.floor(event.timestamp / 60)}:${(event.timestamp % 60).toString().padStart(2, '0')}`}
                    />
                  ))}
                  
                  {/* Show ball path if enabled */}
                  {showBallPath && ballTrackingPoints.length > 0 && (
                    <BallTracker 
                      trackingPoints={ballTrackingPoints} 
                      isActive={false} 
                      onAddPoint={() => {}} 
                    />
                  )}
                </FootballPitch>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Match Events Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <MatchEventsTimeline 
                  events={events} 
                  homeTeam={homeTeam} 
                  awayTeam={awayTeam} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats" className="mt-4">
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
          </TabsContent>
          
          <TabsContent value="detailed" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All Players</TabsTrigger>
                    <TabsTrigger value="home">{homeTeam.name}</TabsTrigger>
                    <TabsTrigger value="away">{awayTeam.name}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <DetailedStatsTable 
                      playerStats={playerStats} 
                      type="individual" 
                    />
                  </TabsContent>
                  
                  <TabsContent value="home">
                    <DetailedStatsTable 
                      playerStats={playerStats} 
                      type="team" 
                      teamId="home"
                    />
                  </TabsContent>
                  
                  <TabsContent value="away">
                    <DetailedStatsTable 
                      playerStats={playerStats} 
                      type="team" 
                      teamId="away"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="players" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-football-home">{homeTeam.name} Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {homeTeam.players.map((player: any) => (
                      <div key={player.id} className="flex items-center p-2 border rounded-md">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-football-home text-white mr-3">
                          {player.number}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.position}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-football-away">{awayTeam.name} Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {awayTeam.players.map((player: any) => (
                      <div key={player.id} className="flex items-center p-2 border rounded-md">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-football-away text-white mr-3">
                          {player.number}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.position}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MatchAnalysis;
