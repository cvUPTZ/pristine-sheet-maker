
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import MatchEventsTimeline from '@/components/MatchEventsTimeline';
import { MatchEvent } from '@/types';

const MatchAnalysis: React.FC = () => {
  const { toast } = useToast();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [matchData, setMatchData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  
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
  
  const getPlayerPositions = (teamId: string) => {
    if (!matchData) return {};
    
    const team = teamId === 'home' ? matchData.homeTeam : matchData.awayTeam;
    const positions: Record<number, { x: number; y: number }> = {};
    
    const basePositions = teamId === 'home' 
      ? [
          { x: 0.5, y: 0.9 },  // GK
          { x: 0.2, y: 0.7 },  // LB
          { x: 0.4, y: 0.7 },  // CB
          { x: 0.6, y: 0.7 },  // CB
          { x: 0.8, y: 0.7 },  // RB
          { x: 0.3, y: 0.5 },  // LM
          { x: 0.5, y: 0.5 },  // CM
          { x: 0.7, y: 0.5 },  // RM
          { x: 0.3, y: 0.3 },  // LF
          { x: 0.5, y: 0.3 },  // ST
          { x: 0.7, y: 0.3 },  // RF
        ]
      : [
          { x: 0.5, y: 0.1 },  // GK
          { x: 0.2, y: 0.3 },  // LB
          { x: 0.4, y: 0.3 },  // CB
          { x: 0.6, y: 0.3 },  // CB
          { x: 0.8, y: 0.3 },  // RB
          { x: 0.3, y: 0.5 },  // LM
          { x: 0.5, y: 0.5 },  // CM
          { x: 0.7, y: 0.5 },  // RM
          { x: 0.3, y: 0.7 },  // LF
          { x: 0.5, y: 0.7 },  // ST
          { x: 0.7, y: 0.7 },  // RF
        ];
    
    team.players.forEach((player: any, index: number) => {
      positions[player.id] = index < basePositions.length 
        ? basePositions[index] 
        : { x: Math.random(), y: Math.random() };
    });
    
    return positions;
  };
  
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
  
  const { homeTeam, awayTeam, statistics, events, date } = matchData;
  const teamPositions = {
    ...getPlayerPositions('home'),
    ...getPlayerPositions('away'),
  };
  
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
                {homeTeam.name}
              </div>
              <div className="text-2xl font-mono font-bold my-2 sm:my-0">
                {statistics.shots.home.onTarget || 0} - {statistics.shots.away.onTarget || 0}
              </div>
              <div className="text-xl font-semibold text-football-away">
                {awayTeam.name}
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {new Date(date).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="pitch">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pitch">Pitch View</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pitch" className="mt-4">
            <Card>
              <CardContent className="pt-6">
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
