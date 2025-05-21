
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Flag, TableIcon } from 'lucide-react';
import PitchView from './PitchView';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import DetailedStatsTable from '@/components/DetailedStatsTable';
import { BallTrackingPoint, Player, PlayerStatistics, Statistics } from '@/types';

interface MainTabContentProps {
  activeTab: 'pitch' | 'stats' | 'details';
  setActiveTab: (tab: 'pitch' | 'stats' | 'details') => void;
  homeTeam: any;
  awayTeam: any;
  teamPositions: Record<number, { x: number; y: number }>;
  selectedPlayer: Player | null;
  selectedTeam: 'home' | 'away';
  setSelectedTeam: (team: 'home' | 'away') => void;
  handlePlayerSelect: (player: Player) => void;
  ballTrackingPoints: BallTrackingPoint[];
  mode: 'piano' | 'tracking';
  handlePitchClick: (coordinates: { x: number; y: number }) => void;
  addBallTrackingPoint: (point: BallTrackingPoint) => void;
  statistics: Statistics;
  playerStats: PlayerStatistics[];
  handleUndo: () => void;
  handleSave: () => void;
}

const MainTabContent: React.FC<MainTabContentProps> = ({
  activeTab,
  setActiveTab,
  homeTeam,
  awayTeam,
  teamPositions,
  selectedPlayer,
  selectedTeam,
  setSelectedTeam,
  handlePlayerSelect,
  ballTrackingPoints,
  mode,
  handlePitchClick,
  addBallTrackingPoint,
  statistics,
  playerStats,
  handleUndo,
  handleSave
}) => {
  return (
    <div>
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
          <PitchView
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
          />
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
  );
};

export default MainTabContent;
