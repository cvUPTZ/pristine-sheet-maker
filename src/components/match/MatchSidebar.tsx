import React, { useEffect, useState } from 'react';
import MatchTimer from '@/components/MatchTimer';
import ActionButtons from '@/components/ActionButtons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import { Statistics, Player, TimeSegmentStatistics } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  trackBallMovement: (coordinates: {
    x: number;
    y: number;
  }) => void;
  homeTeam: {
    name: string;
    players: Player[];
    formation: string;
  };
  awayTeam: {
    name: string;
    players: Player[];
    formation: string;
  };
  statistics: Statistics;
  updateStatistics?: (stats: Statistics) => void;
  setTimeSegments?: (segments: TimeSegmentStatistics[]) => void;
  calculateTimeSegments?: () => TimeSegmentStatistics[];
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
  statistics,
  updateStatistics,
  setTimeSegments,
  calculateTimeSegments
}) => {
  const {
    toast
  } = useToast();
  const [hasCalculatedSegments, setHasCalculatedSegments] = useState(false);
  const handleCalculateTimeSegments = () => {
    if (calculateTimeSegments && setTimeSegments) {
      const segments = calculateTimeSegments();
      setTimeSegments(segments);
      setHasCalculatedSegments(true);
      toast({
        title: "Time Segments Calculated",
        description: `Analysis complete for ${segments.length} time segments`
      });
    }
  };
  const handleVideoAnalysis = (videoStats: Statistics) => {
    if (updateStatistics) {
      console.log("Video analysis complete, updating statistics:", videoStats);
      updateStatistics(videoStats);
      toast({
        title: "Statistics Updated",
        description: "Match statistics have been updated from video analysis"
      });
    } else {
      console.warn("Cannot update statistics: updateStatistics function not provided");
    }
  };

  // Automatically calculate time segments once we have enough data
  useEffect(() => {
    if (!hasCalculatedSegments && ballTrackingPoints.length > 50 && calculateTimeSegments && setTimeSegments) {
      handleCalculateTimeSegments();
    }
  }, [ballTrackingPoints, hasCalculatedSegments, calculateTimeSegments, setTimeSegments]);
  return <div className="space-y-4">
      <Card className="p-4 bg-white shadow-md">
        <MatchTimer isRunning={isRunning} onToggle={toggleTimer} onReset={resetTimer} elapsedTime={elapsedTime} setElapsedTime={setElapsedTime} />
      </Card>
      
      <Accordion type="single" collapsible defaultValue="actions" className="lg:hidden">
        <AccordionItem value="actions">
          <AccordionTrigger>Actions</AccordionTrigger>
          <AccordionContent>
            <Card className="p-4 bg-white shadow-md">
              <h3 className="font-semibold mb-2">
                {mode === 'piano' ? 'Select Action' : 'Ball Tracking Mode'}
              </h3>
              {mode === 'piano' ? <>
                  <div className="mb-2 text-sm">
                    Selected Player: {selectedPlayer ? `${selectedPlayer.name} (${selectedPlayer.number})` : 'None'}
                  </div>
                  <ActionButtons onSelectAction={handleActionSelect} disabled={!selectedPlayer} />
                </> : <div className="text-sm text-muted-foreground">
                  <p>Click anywhere on the pitch to track ball movement</p>
                  <p className="mt-2">Ball path points: {ballTrackingPoints.length}</p>
                  {ballTrackingPoints.length > 0 && <Button variant="outline" size="sm" className="mt-2" onClick={() => {
                trackBallMovement({
                  x: 0,
                  y: 0
                }); // Reset call
                toast({
                  title: "Ball Tracking Reset",
                  description: "All tracking points have been cleared"
                });
              }}>
                      Reset Ball Path
                    </Button>}
                </div>}
            </Card>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="teams">
          <AccordionTrigger>Team Summary</AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="stats">
          <AccordionTrigger>Match Statistics</AccordionTrigger>
          <AccordionContent>
            <StatisticsDisplay statistics={statistics} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />
          </AccordionContent>
        </AccordionItem>
        
        {ballTrackingPoints.length > 20 && <AccordionItem value="analysis">
            <AccordionTrigger>Time Segment Analysis</AccordionTrigger>
            <AccordionContent>
              <Card className="p-4 bg-white shadow-md">
                <div className="text-sm">
                  <p className="mb-2">Time segment analysis helps visualize statistics over 5-minute intervals.</p>
                  <div className="flex justify-between items-center">
                    <Button onClick={handleCalculateTimeSegments} className="mt-2" disabled={!calculateTimeSegments || ballTrackingPoints.length < 20}>
                      Calculate Time Segments
                    </Button>
                    <Link to="/stats">
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        View Stats
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>}
      </Accordion>
      
      {/* Desktop version */}
      <div className="hidden lg:block">
        
        
        <Card className="p-4 bg-white shadow-md mb-4">
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
        
        <StatisticsDisplay statistics={statistics} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />
        
        {ballTrackingPoints.length > 20 && <Card className="p-4 bg-white shadow-md mt-4">
            <h3 className="font-semibold mb-2">Time Segment Analysis</h3>
            <div className="text-sm mb-4">
              <p>Calculate detailed time segment statistics for visualization.</p>
            </div>
            <div className="flex justify-between">
              <Button onClick={handleCalculateTimeSegments} size="sm" disabled={!calculateTimeSegments || ballTrackingPoints.length < 20}>
                Calculate Segments
              </Button>
              <Link to="/stats">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  View Stats
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>}
      </div>
    </div>;
};
export default MatchSidebar;