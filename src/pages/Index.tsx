import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchState } from '@/hooks/useMatchState';
import { useToast } from '@/components/ui/use-toast';
import { EventType, Player, Team } from '@/types';
import { getPlayerPositions } from '@/utils/formationUtils';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import SetupScreen from '@/components/match/SetupScreen';

const MatchRecording = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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
    ballTrackingMode,
    ballTrackingPoints,
    playerStats,
    timeSegments,
    activeTab,
    setActiveTab,
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
    saveMatch, // This exists in useMatchState as used here
    recordEvent,
    setStatistics,
    teamPositions,
    isPassTrackingModeActive,
    togglePassTrackingMode
  } = useMatchState();

  // Get player positions based on formations but handle null teams
  const homeTeamPositions = homeTeam ? getPlayerPositions(homeTeam, true) : {};
  const awayTeamPositions = awayTeam ? getPlayerPositions(awayTeam, false) : {};
  const allTeamPositions = { ...homeTeamPositions, ...awayTeamPositions };

  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    if (mode === 'tracking') {
      trackBallMovement(coordinates);
    }
  };

  const handleActionSelect = (action: string) => {
    if (selectedPlayer) {
      const playerPos = allTeamPositions[selectedPlayer.id];
      const newEvent = {
        id: `event-${Date.now()}`,
        matchId: 'current-match',
        teamId: selectedTeam,
        playerId: selectedPlayer.id,
        type: action as any,
        timestamp: Date.now(),
        coordinates: playerPos || { x: 0.5, y: 0.5 },
        status: 'confirmed' as const
      };
      addEvent(newEvent);
      toast({
        title: `Event Recorded`,
        description: `${action} by ${selectedPlayer.name} (${selectedTeam === 'home' ? homeTeam?.name : awayTeam?.name})`,
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
    const matchId = saveMatch(); // saveMatch is used here
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

  const handleRecordEvent = (eventType: EventType, playerId: number, teamId: 'home' | 'away', coordinates: { x: number; y: number }) => {
    recordEvent(eventType, playerId, teamId, coordinates);

    const team = teamId === 'home' ? homeTeam : awayTeam;
    const player = team?.players.find(p => p.id === playerId);

    toast({
      title: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Recorded`,
      description: `By ${player?.name || 'Unknown Player'} (${teamId === 'home' ? homeTeam?.name || 'Home Team' : awayTeam?.name || 'Away Team'})`,
    });
  };

  const handleUpdateTeams = (teams: { home: Team; away: Team }) => {
    updateTeams(teams.home, teams.away);
  };

  const handleCompleteSetup = () => {
    if (homeTeam && awayTeam) {
      completeSetup(homeTeam, awayTeam);
    }
  };

  if (!setupComplete) {
    return (
      <SetupScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        updateTeams={handleUpdateTeams} // This expects (teams: { home: Team; away: Team; }) => void
        completeSetup={handleCompleteSetup} // This expects () => void
      />
    );
  }

  // Before rendering the main UI, ensure we have valid teams
  if (!homeTeam || !awayTeam) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading Teams...</h1>
        <p>Please wait while we load your teams data.</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 md:p-4">
      <div className="max-w-6xl mx-auto">
        <MatchHeader
          mode={mode}
          setMode={setMode}
          homeTeam={{
            name: homeTeam.name,
            formation: homeTeam.formation || '4-4-2'
          }}
          awayTeam={{
            name: awayTeam.name,
            formation: awayTeam.formation || '4-4-2'
          }}
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
              teamPositions={allTeamPositions}
              selectedPlayer={selectedPlayer}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              handlePlayerSelect={handlePlayerSelect}
              ballTrackingPoints={ballTrackingPoints}
              mode={mode}
              handlePitchClick={handlePitchClick}
              addBallTrackingPoint={addBallTrackingPoint}
              statistics={statistics}
              setStatistics={setStatistics}
              playerStats={playerStats}
              handleUndo={handleUndo}
              handleSave={handleSave}
              timeSegments={timeSegments}
              recordEvent={handleRecordEvent}
            />
          </div>

          <div className="hidden lg:block">
            <MatchSidebar
              isRunning={isRunning}
              elapsedTime={elapsedTime}
              setElapsedTime={setElapsedTime}
              mode={mode}
              selectedPlayer={selectedPlayer}
              handleActionSelect={handleActionSelect}
              ballTrackingPoints={ballTrackingPoints}
              trackBallMovement={trackBallMovement}
              homeTeam={{
                name: homeTeam.name,
                players: homeTeam.players,
                formation: homeTeam.formation || '4-4-2'
              }}
              awayTeam={{
                name: awayTeam.name,
                players: awayTeam.players,
                formation: awayTeam.formation || '4-4-2'
              }}
              statistics={statistics}
              isPassTrackingModeActive={isPassTrackingModeActive}
              togglePassTrackingMode={togglePassTrackingMode}
              // toggleBallTrackingMode is NOT a prop of MatchSidebar here, consistent with MatchAnalysis fix
            />
          </div>

          {/* Mobile sidebar that appears at the bottom */}
          <div className="lg:hidden mt-4">
            <MatchSidebar
              isRunning={isRunning}
              elapsedTime={elapsedTime}
              setElapsedTime={setElapsedTime}
              mode={mode}
              selectedPlayer={selectedPlayer}
              handleActionSelect={handleActionSelect}
              ballTrackingPoints={ballTrackingPoints}
              trackBallMovement={trackBallMovement}
              homeTeam={{
                name: homeTeam.name,
                players: homeTeam.players,
                formation: homeTeam.formation || '4-4-2'
              }}
              awayTeam={{
                name: awayTeam.name,
                players: awayTeam.players,
                formation: awayTeam.formation || '4-4-2'
              }}
              statistics={statistics}
              isPassTrackingModeActive={isPassTrackingModeActive}
              togglePassTrackingMode={togglePassTrackingMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchRecording;
