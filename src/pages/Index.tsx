
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useMatchState } from '@/hooks/useMatchState';
import SetupScreen from '@/components/match/SetupScreen';
import MatchHeader from '@/components/match/MatchHeader';
import MatchSidebar from '@/components/match/MatchSidebar';
import { Team } from '@/types';

const Index: React.FC = () => {
  const {
    homeTeam,
    awayTeam,
    selectedTeam,
    selectedPlayer,
    setupComplete,
    ballTrackingMode,
    teamPositions,
    ballTrackingPoints,
    statistics,
    isPassTrackingModeActive,
    setSelectedTeam,
    completeSetup,
    updateTeams,
    toggleBallTrackingMode,
    togglePassTrackingMode,
  } = useMatchState();

  const handleCompleteSetup = (teams: { home: Team; away: Team }) => {
    updateTeams(teams.home, teams.away);
    completeSetup(teams.home, teams.away);
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <SetupScreen
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          updateTeams={(teams) => updateTeams(teams.home, teams.away)}
          completeSetup={() => completeSetup(homeTeam, awayTeam)}
        />
      </div>
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
            handleSave={() => {}}
          />
          
          <MatchSidebar
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            selectedPlayer={selectedPlayer}
            mode={ballTrackingMode ? 'tracking' : 'piano'}
            handleActionSelect={() => {}}
            ballTrackingPoints={ballTrackingPoints}
            trackBallMovement={() => {}}
            statistics={statistics}
            isRunning={false}
            isPassTrackingModeActive={isPassTrackingModeActive}
            togglePassTrackingMode={togglePassTrackingMode}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Match Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your match setup is complete! Use the sidebar to interact with players and track events.
              </p>
              <p className="text-sm text-muted-foreground">
                Teams: {homeTeam?.name} vs {awayTeam?.name}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
