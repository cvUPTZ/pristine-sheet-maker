import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Circle, Line } from 'react-konva';
import { EventType, Player, Team } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils"

interface PitchProps {
  homeTeam: Team;
  awayTeam: Team;
  events: any[];
  onEventAdd: (eventType: EventType, playerId: number, team: 'home' | 'away', coordinates: { x: number; y: number }) => void;
  ballPosition?: { x: number; y: number };
  onBallPositionChange?: (x: number, y: number) => void;
  showPlayerNames?: boolean;
  showEventHistory?: boolean;
}

const Pitch: React.FC<PitchProps> = ({ 
  homeTeam, 
  awayTeam, 
  events, 
  onEventAdd,
  ballPosition,
  onBallPositionChange,
  showPlayerNames = true,
  showEventHistory = true 
}) => {
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [pitchWidth, setPitchWidth] = useState(800);
  const [pitchHeight, setPitchHeight] = useState(600);

  useEffect(() => {
    const handleResize = () => {
      // Adjust pitch dimensions based on window size
      setPitchWidth(Math.min(window.innerWidth - 50, 800));
      setPitchHeight(Math.min(window.innerHeight - 200, 600));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handlePitchClick = (event: React.MouseEvent<SVGElement>) => {
    if (!selectedEventType || !selectedPlayer) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const coordinates = { x, y };

    // Convert player ID to number if it's a string
    const playerId = typeof selectedPlayer.id === 'string' ? parseInt(selectedPlayer.id) : selectedPlayer.id;

    onEventAdd(selectedEventType, playerId, selectedTeam, coordinates);
    
    setSelectedPlayer(null);
    setSelectedEventType(null);
    setSelectedTeam(null);
  };

  const renderPlayers = (team: Team, teamType: 'home' | 'away') => {
    const teamColor = teamType === 'home' ? 'green' : 'red';

    return team.players?.map((player, index) => {
      const x = 10 + (index % 5) * 15;
      const y = 10 + Math.floor(index / 5) * 15;

      return (
        <Circle
          key={`${teamType}-${player.id}`}
          x={(teamType === 'home' ? x : 100 - x) * (pitchWidth / 100)}
          y={y * (pitchHeight / 100)}
          radius={10}
          fill={teamColor}
          stroke="black"
          strokeWidth={1}
          onClick={() => {
            setSelectedPlayer(player);
            setSelectedTeam(teamType);
          }}
          style={{ cursor: 'pointer' }}
        />
      );
    });
  };

  const renderPlayerLabels = (team: Team, teamType: 'home' | 'away') => {
    if (!showPlayerNames) return null;

    return team.players?.map((player, index) => {
      const x = 10 + (index % 5) * 15;
      const y = 10 + Math.floor(index / 5) * 15;

      return (
        <Text
          key={`${teamType}-${player.id}-label`}
          x={(teamType === 'home' ? x : 100 - x) * (pitchWidth / 100) - 20}
          y={y * (pitchHeight / 100) + 15}
          text={player.name}
          fontSize={12}
          fill="black"
          align="center"
        />
      );
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <Card>
          <CardContent>
            <Stage width={pitchWidth} height={pitchHeight} style={{ border: '1px solid gray' }}>
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={pitchWidth}
                  height={pitchHeight}
                  fill="#69b469"
                  onClick={handlePitchClick}
                />
                {/* Center Line */}
                <Line
                  points={[pitchWidth / 2, 0, pitchWidth / 2, pitchHeight]}
                  stroke="white"
                  strokeWidth={2}
                />
                {/* Center Circle */}
                <Circle
                  x={pitchWidth / 2}
                  y={pitchHeight / 2}
                  radius={pitchWidth * 0.08}
                  stroke="white"
                  strokeWidth={2}
                />
                {/* Home Team Players */}
                {renderPlayers(homeTeam, 'home')}
                {renderPlayerLabels(homeTeam, 'home')}
                {/* Away Team Players */}
                {renderPlayers(awayTeam, 'away')}
                {renderPlayerLabels(awayTeam, 'away')}
                {/* Ball */}
                {ballPosition && (
                  <Circle
                    x={ballPosition.x * (pitchWidth / 100)}
                    y={ballPosition.y * (pitchHeight / 100)}
                    radius={5}
                    fill="black"
                  />
                )}
              </Layer>
            </Stage>
          </CardContent>
        </Card>
      </div>

      <div className="w-full md:w-80">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Event Type</Label>
              <Select onValueChange={(value) => setSelectedEventType(JSON.parse(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={JSON.stringify({ key: 'pass', label: 'Pass' })}>Pass</SelectItem>
                  <SelectItem value={JSON.stringify({ key: 'tackle', label: 'Tackle' })}>Tackle</SelectItem>
                  <SelectItem value={JSON.stringify({ key: 'shot', label: 'Shot' })}>Shot</SelectItem>
                  <SelectItem value={JSON.stringify({ key: 'foul', label: 'Foul' })}>Foul</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Team</Label>
              <RadioGroup onValueChange={(value) => setSelectedTeam(value as 'home' | 'away')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="home" id="r1" className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                  <Label htmlFor="r1">Home</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="away" id="r2" className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                  <Label htmlFor="r2">Away</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {showEventHistory && (
          <Card className="mt-4">
            <CardContent className="space-y-2">
              <Label>Event History</Label>
              <ScrollArea className="h-[200px] w-full rounded-md border">
                <div className="p-2">
                  {events.map((event, index) => (
                    <div key={index} className="py-1">
                      <Badge variant="secondary">
                        {event.type} - {event.team} - {event.playerId}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Pitch;
