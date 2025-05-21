
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchState } from '@/hooks/useMatchState';
import { useToast } from '@/components/ui/use-toast';
import { Player } from '@/types';
import { getPlayerPositions } from '@/utils/formationUtils';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import SetupScreen from '@/components/match/SetupScreen';

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
      <SetupScreen 
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        updateTeams={updateTeams}
        completeSetup={completeSetup}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <MatchHeader 
          mode={mode}
          setMode={setMode}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          handleToggleTracking={handleToggleTracking}
          handleSave={handleSave}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <MainTabContent 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              teamPositions={teamPositions}
              selectedPlayer={selectedPlayer}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              handlePlayerSelect={handlePlayerSelect}
              ballTrackingPoints={ballTrackingPoints}
              mode={mode}
              handlePitchClick={handlePitchClick}
              addBallTrackingPoint={addBallTrackingPoint}
              statistics={statistics}
              playerStats={playerStats}
              handleUndo={handleUndo}
              handleSave={handleSave}
            />
          </div>
          
          <div>
            <MatchSidebar 
              isRunning={isRunning}
              toggleTimer={toggleTimer}
              resetTimer={resetTimer}
              elapsedTime={elapsedTime}
              setElapsedTime={setElapsedTime}
              mode={mode}
              selectedPlayer={selectedPlayer}
              handleActionSelect={handleActionSelect}
              ballTrackingPoints={ballTrackingPoints}
              trackBallMovement={trackBallMovement}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              statistics={statistics}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchRecording;
