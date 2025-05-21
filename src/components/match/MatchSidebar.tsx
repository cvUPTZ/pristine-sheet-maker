
import React from 'react';
import MatchTimer from '@/components/MatchTimer';
import ActionButtons from '@/components/ActionButtons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import { Statistics, Player } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface MatchSidebarProps {
  isRunning: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  elapsedTime: number;
  setElapsedTime: (time: number) => void;
  mode: 'piano' | 'tracking';
  selectedPlayer: Player | null;
  handleActionSelect: (action: string) => void;
  ballTrackingPoints: any[];
  trackBallMovement: (coordinates: { x: number; y: number }) => void;
  homeTeam: { name: string; players: Player[]; formation: string };
  awayTeam: { name: string; players: Player[]; formation: string };
  statistics: Statistics;
}

const MatchSidebar: React.FC<MatchSidebarProps> = ({
  isRunning,
  toggleTimer,
  resetTimer,
  elapsedTime,
  setElapsedTime,
  mode,
  selectedPlayer,
  handleActionSelect,
  ballTrackingPoints,
  trackBallMovement,
  homeTeam,
  awayTeam,
  statistics
}) => {
  const { toast } = useToast();

  return (
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
                  trackBallMovement({ x: 0, y: 0 }); // Reset call
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
  );
};

export default MatchSidebar;
