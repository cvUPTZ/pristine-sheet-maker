import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FootballPitch from '@/components/FootballPitch';
import PlayerMarker from '@/components/PlayerMarker';
import MatchTimer from '@/components/MatchTimer';
import ActionButtons from '@/components/ActionButtons';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import TeamSetupWithFormation from '@/components/TeamSetupWithFormation';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import BallTracker from '@/components/BallTracker';
import { useMatchState } from '@/hooks/useMatchState';
import { Player } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, BarChart3, Flag, TableIcon } from 'lucide-react';
import { getPlayerPositions } from '@/utils/formationUtils';

const MatchRecording = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'piano' | 'tracking'>('piano');
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details'>('pitch');
  
  const {
    homeTeam,
    awayTeam,
    isRunning,
    elapsedTime,
    selectedTeam,
    selectedPlayer,
    statistics,
    setupComplete,
    ballTrackingMode,
    ballTrackingPoints,
    playerStats,
    setSelectedTeam,
    setSelectedPlayer,
    toggleTimer,
    resetTimer,
    addEvent,
    undoLastEvent,
    updateTeams,
    updateTeamFormation,
    completeSetup,
    setElapsedTime,
    toggleBallTrackingMode,
    addBallTrackingPoint,
    trackBallMovement,
    saveMatch,
  } = useMatchState();
  
  // Get player positions based on formations
  const homeTeamPositions = getPlayerPositions(homeTeam, true);
  const awayTeamPositions = getPlayerPositions(awayTeam, false);
  const teamPositions = { ...homeTeamPositions, ...awayTeamPositions };

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
      description: `Match data stored successfully`,
    });
    navigate(`/match/${matchId}`);
  };

  const handleToggleTracking = () => {
    toggleBallTrackingMode();
    setMode(ballTrackingMode ? 'piano' : 'tracking');
    toast({
      title: ballTrackingMode ? "Piano Mode Activated" : "Ball Tracking Mode Activated",
      description: ballTrackingMode 
        ? "Click on players to record actions" 
        : "Click on the pitch to track ball movement",
    });
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-center">New Match Setup</h1>
            <div className="w-[100px]"></div>
          </div>
          
          <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
            <TeamSetupWithFormation 
              teams={{ home: homeTeam, away: awayTeam }}
              onTeamsChange={updateTeams}
              onConfirm={completeSetup}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-2">
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-football-home to-football-away bg-clip-text text-transparent">EFOOTPAD</h1>
            <Button 
              variant="outline"
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Match
            </Button>
          </div>
          
          <div className="flex justify-center my-2">
            <Tabs 
              value={mode} 
              className="w-full max-w-md"
              onValueChange={(value) => setMode(value as 'piano' | 'tracking')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="piano">Piano Mode</TabsTrigger>
                <TabsTrigger value="tracking" onClick={handleToggleTracking}>Ball Tracking</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xl font-semibold text-football-home">
              {homeTeam.name} ({homeTeam.formation})
            </div>
            <div className="text-lg font-mono font-bold">
              vs
            </div>
            <div className="text-xl font-semibold text-football-away">
              {awayTeam.name} ({awayTeam.formation})
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList className="mb-4">
                <TabsTrigger value="pitch" className="flex items-center gap-1">
                  <Flag className="h-4 w-4" />
                  Pitch
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Statistics
                </TabsTrigger>
                <TabsTrigger value="details" className="flex items-center gap-1">
                  <TableIcon className="h-4 w-4" />
                  Detailed Stats
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pitch">
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
                    
                    {/* Ball tracking */}
                    <BallTracker 
                      trackingPoints={ballTrackingPoints} 
                      isActive={mode === 'tracking'} 
                      onAddPoint={addBallTrackingPoint} 
                    />
                  </FootballPitch>
                </div>
              </TabsContent>
              
              <TabsContent value="stats">
                <Card className="p-4 bg-white shadow-md">
                  <StatisticsDisplay 
                    statistics={statistics}
                    homeTeamName={homeTeam.name}
                    awayTeamName={awayTeam.name}
                  />
                </Card>
              </TabsContent>
              
              <TabsContent value="details">
                <Card className="p-4 bg-white shadow-md">
                  <DetailedStatsTable 
                    playerStats={playerStats} 
                    type="individual" 
                  />
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
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
            
            <Card className="p-4 bg-white shadow-md">
              <h3 className="font-semibold mb-2">
                {mode === 'piano' ? 'Select Action' : 'Ball Tracking Mode'}
              </h3>
              {mode === 'piano' ? (
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
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Click anywhere on the pitch to track ball movement</p>
                  <p className="mt-2">Ball path points: {ballTrackingPoints.length}</p>
                  {ballTrackingPoints.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        trackBallMovement({ x: 0, y: 0 }); // This is just a dummy call
                        toast({
                          title: "Ball Tracking Reset",
                          description: "All tracking points have been cleared",
                        });
                      }}
                    >
                      Reset Ball Path
                    </Button>
                  )}
                </div>
              )}
            </Card>
            
            <Card className="p-4 bg-white shadow-md">
              <h3 className="font-semibold mb-2">Team Summary</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Home Team: {homeTeam.name}</div>
                  <div className="text-xs text-muted-foreground">Formation: {homeTeam.formation}</div>
                  <div className="text-xs text-muted-foreground">Players: {homeTeam.players.length}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Away Team: {awayTeam.name}</div>
                  <div className="text-xs text-muted-foreground">Formation: {awayTeam.formation}</div>
                  <div className="text-xs text-muted-foreground">Players: {awayTeam.players.length}</div>
                </div>
              </div>
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

export default MatchRecording;
