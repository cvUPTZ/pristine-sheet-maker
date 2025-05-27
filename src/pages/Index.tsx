
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import MainTabContent from '@/components/match/MainTabContent';
import SetupScreen from '@/components/match/SetupScreen';
import { useMatchState } from '@/hooks/useMatchState';
import { Team } from '@/types';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pitch' | 'stats' | 'details' | 'piano' | 'timeline' | 'video' | 'fast-track'>('pitch');

  const {
    homeTeam,
    awayTeam,
    teamPositions,
    selectedPlayer,
    selectedTeam,
    ballTrackingPoints,
    ballTrackingMode,
    statistics,
    playerStats,
    timeSegments,
    setSelectedTeam,
    setSelectedPlayer,
    addBallTrackingPoint,
    setStatistics,
    generateMatchId,
    setTeamPositions,
    recordEvent,
    setupComplete,
    updateTeams,
    completeSetup,
    toggleBallTrackingMode,
    undoLastEvent,
    isPassTrackingModeActive,
    potentialPasser,
    ballPathHistory,
    togglePassTrackingMode,
  } = useMatchState();

  const handleSave = () => {
    const newMatchId = generateMatchId();
    navigate(`/match/${newMatchId}`);
  };

  const handleCompleteSetup = (homeTeamData: Team, awayTeamData: Team) => {
    updateTeams(homeTeamData, awayTeamData);
    completeSetup(homeTeamData, awayTeamData);
  };

  const handlePlayerSelect = (player: any) => {
    setSelectedPlayer(player);
  };

  const handlePitchClick = (coordinates: { x: number; y: number }) => {
    if (ballTrackingMode) {
      addBallTrackingPoint({
        x: coordinates.x,
        y: coordinates.y,
        timestamp: Date.now(),
        playerId: selectedPlayer?.id || 0,
        teamId: selectedTeam
      });
    }
  };

  if (!setupComplete) {
    return (
      <SetupScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        updateTeams={updateTeams}
        completeSetup={handleCompleteSetup}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col">
          <MatchHeader 
            homeTeam={homeTeam} 
            awayTeam={awayTeam}
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            setMode={toggleBallTrackingMode}
            handleToggleTracking={toggleBallTrackingMode}
            handleSave={handleSave}
          />
          
          <MatchSidebar
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            selectedPlayer={selectedPlayer}
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            toggleBallTrackingMode={toggleBallTrackingMode}
            ballTrackingPoints={ballTrackingPoints}
            statistics={statistics}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            teamPositions={teamPositions}
            setTeamPositions={setTeamPositions}
            isPassTrackingModeActive={isPassTrackingModeActive}
            potentialPasser={potentialPasser}
            ballPathHistory={ballPathHistory}
            togglePassTrackingMode={togglePassTrackingMode}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-auto">
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
              mode={ballTrackingMode ? 'tracking' : 'piano'}
              handlePitchClick={handlePitchClick}
              addBallTrackingPoint={addBallTrackingPoint}
              statistics={statistics}
              setStatistics={setStatistics}
              playerStats={playerStats}
              handleUndo={undoLastEvent}
              handleSave={handleSave}
              timeSegments={timeSegments}
              recordEvent={recordEvent}
              assignedPlayerForMatch={null}
              assignedEventTypes={null}
              userRole={null}
              matchId={''}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
