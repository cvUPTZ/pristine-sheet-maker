
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import MatchTimer from '@/components/MatchTimer';
import ActionButtons from '@/components/ActionButtons';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import TeamSetup from '@/components/TeamSetup';
import { useMatchState } from '@/hooks/useMatchState';
import { Player } from '@/types';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  
  const {
    homeTeam,
    awayTeam,
    isRunning,
    elapsedTime,
    selectedTeam,
    selectedPlayer,
    statistics,
    setupComplete,
    setSelectedTeam,
    setSelectedPlayer,
    toggleTimer,
    resetTimer,
    addEvent,
    undoLastEvent,
    updateTeams,
    completeSetup,
    setElapsedTime,
    trackBallMovement,
  } = useMatchState();

  // Player positions - in a full implementation this would be more dynamic
  const getPlayerPositions = (teamId: string) => {
    const team = teamId === 'home' ? homeTeam : awayTeam;
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
    
    team.players.forEach((player, index) => {
      positions[player.id] = index < basePositions.length 
        ? basePositions[index] 
        : { x: Math.random(), y: Math.random() };
    });
    
    return positions;
  };

  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    if (mode === 'tracking') {
      trackBallMovement(coordinates);
    }
  };

  const handleActionSelect = (action: string) => {
    if (selectedPlayer) {
      const playerPos = teamPositions[selectedPlayer.id];
      addEvent(action as any, playerPos);
      toast({
        title: `Event Recorded`,
        description: `${action} by ${selectedPlayer.name} (${selectedTeam === 'home' ? homeTeam.name : awayTeam.name})`,
      });
    }
  };

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleUndo = () => {
    undoLastEvent();
    toast({
      title: "Action Undone",
      description: "Last recorded event has been removed.",
    });
  };

  const handleSave = () => {
    const matchId = saveMatch();
    toast({
      title: "Match Saved",
      description: `Match data stored locally (ID: ${matchId.slice(0, 8)})`,
    });
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <TeamSetup 
            teams={{ home: homeTeam, away: awayTeam }}
            onTeamsChange={updateTeams}
            onConfirm={completeSetup}
          />
        </div>
      </div>
    );
  }

  const teamPositions = {
    ...getPlayerPositions('home'),
    ...getPlayerPositions('away'),
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-center">EFOOTPAD</h1>
          <div className="flex justify-center my-2">
            <Tabs 
              defaultValue="piano" 
              className="w-full max-w-md"
              onValueChange={(value) => setMode(value as 'piano' | 'tracking')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="piano">Piano Mode</TabsTrigger>
                <TabsTrigger value="tracking" disabled>Ball Tracking</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xl font-semibold text-football-home">
              {homeTeam.name}
            </div>
            <div className="text-lg font-mono font-bold">
              vs
            </div>
            <div className="text-xl font-semibold text-football-away">
              {awayTeam.name}
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="mb-4">
              <FootballPitch onClick={handlePitchClick}>
                {/* Render home team players */}
                {homeTeam.players.map((player) => (
                  <PlayerMarker
                    key={`home-${player.id}`}
                    player={player}
                    teamColor="#1A365D" // Home team color
                    position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
                    onClick={() => {
                      setSelectedTeam('home');
                      handlePlayerSelect(player);
                    }}
                    selected={selectedPlayer?.id === player.id && selectedTeam === 'home'}
                  />
                ))}
                
                {/* Render away team players */}
                {awayTeam.players.map((player) => (
                  <PlayerMarker
                    key={`away-${player.id}`}
                    player={player}
                    teamColor="#D3212C" // Away team color
                    position={teamPositions[player.id] || { x: 0.5, y: 0.5 }}
                    onClick={() => {
                      setSelectedTeam('away');
                      handlePlayerSelect(player);
                    }}
                    selected={selectedPlayer?.id === player.id && selectedTeam === 'away'}
                  />
                ))}
              </FootballPitch>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button 
                variant="outline" 
                onClick={handleUndo}
              >
                Undo Last Action
              </Button>
              <Button 
                variant="outline"
                onClick={handleSave}
              >
                Save Match Data
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <MatchTimer 
              isRunning={isRunning}
              onToggle={toggleTimer}
              onReset={resetTimer}
              elapsedTime={elapsedTime}
              setElapsedTime={setElapsedTime}
            />
            
            <Card className="p-4">
              <h3 className="font-semibold mb-2">
                {mode === 'piano' ? 'Select Action' : 'Ball Tracking Mode'}
              </h3>
              {mode === 'piano' && (
                <>
                  <div className="mb-2 text-sm">
                    Selected Player: {selectedPlayer 
                      ? `${selectedPlayer.name} (${selectedPlayer.number})` 
                      : 'None'}
                  </div>
                  <ActionButtons 
                    onSelectAction={handleActionSelect}
                    disabled={!selectedPlayer}
                  />
                </>
              )}
            </Card>
            
            <StatisticsDisplay 
              statistics={statistics}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
