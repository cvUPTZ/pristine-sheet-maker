
import React, { useEffect, useState, useCallback } from 'react';
import MatchTimer from '@/components/MatchTimer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatisticsDisplay from '@/components/StatisticsDisplay';
import { Statistics, Player, TimeSegmentStatistics } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface MatchSidebarProps {
  // Props for DB-driven timer
  dbTimerValue?: number | null;
  timerStatus?: string | null;
  timerLastStartedAt?: string | null;

  // Legacy timer props - keeping for backward compatibility
  isRunning: boolean;
  elapsedTime?: number;
  setElapsedTime?: (time: number) => void;

  mode: 'piano' | 'tracking';
  selectedPlayer: Player | null;
  onPlayerSelect: (player: any) => void;
  ballTrackingPoints: any[];
  trackBallMovement?: (coordinates: {
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
  isPassTrackingModeActive: boolean;
  togglePassTrackingMode: () => void;
  // Additional props
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  teamPositions?: any;
  setTeamPositions?: (positions: any) => void;
  potentialPasser?: any;
  ballPathHistory?: any;
  toggleBallTrackingMode?: () => void;
}

const MatchSidebar: React.FC<MatchSidebarProps> = ({
  dbTimerValue,
  timerStatus,
  timerLastStartedAt,
  isRunning,
  elapsedTime,
  setElapsedTime,
  mode,
  selectedPlayer,
  onPlayerSelect,
  ballTrackingPoints,
  trackBallMovement,
  homeTeam,
  awayTeam,
  statistics,
  updateStatistics,
  setTimeSegments,
  calculateTimeSegments,
  isPassTrackingModeActive,
  togglePassTrackingMode,
  activeTab,
  setActiveTab,
  teamPositions,
  setTeamPositions,
  potentialPasser,
  ballPathHistory,
  toggleBallTrackingMode
}) => {
  const { toast } = useToast();
  const [hasCalculatedSegments, setHasCalculatedSegments] = useState(false);
  const isMobile = useIsMobile();
  
  const handleCalculateTimeSegments = useCallback(() => {
    if (calculateTimeSegments && setTimeSegments) {
      const segments = calculateTimeSegments();
      setTimeSegments(segments);
      setHasCalculatedSegments(true);
      toast({
        title: "Time Segments Calculated",
        description: `Analysis complete for ${segments.length} time segments`
      });
    }
  }, [calculateTimeSegments, setTimeSegments, toast]);
  
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

  useEffect(() => {
    if (!hasCalculatedSegments && ballTrackingPoints.length > 50 && calculateTimeSegments && setTimeSegments) {
      handleCalculateTimeSegments();
    }
  }, [ballTrackingPoints, hasCalculatedSegments, calculateTimeSegments, setTimeSegments, handleCalculateTimeSegments]);
  
  return (
    <div className="space-y-2 sm:space-y-4">
      <Card className="p-3 sm:p-4 bg-white shadow-md">
        <MatchTimer 
          dbTimerValue={dbTimerValue}
          timerStatus={timerStatus}
          timerLastStartedAt={timerLastStartedAt}
        />
      </Card>

      <Card className="p-3 sm:p-4 bg-white shadow-md">
        <h3 className="font-semibold mb-2 text-xs sm:text-sm">Controls</h3>
        <Button 
          onClick={togglePassTrackingMode} 
          variant={isPassTrackingModeActive ? "default" : "outline"}
          className="w-full text-xs sm:text-sm py-2"
          size={isMobile ? "sm" : "default"}
        >
          {isPassTrackingModeActive ? "Pass Mode: ON" : "Pass Mode: OFF"}
        </Button>
      </Card>
      
      <Accordion type="single" collapsible defaultValue="actions" className="xl:hidden">
        <AccordionItem value="teams">
          <AccordionTrigger className="text-sm">Team Summary</AccordionTrigger>
          <AccordionContent>
            <Card className="p-3 sm:p-4 bg-white shadow-md">
              <h3 className="font-semibold mb-2 text-sm">Team Summary</h3>
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <div className="text-xs sm:text-sm font-medium truncate">Home: {homeTeam.name}</div>
                  <div className="text-xs text-muted-foreground">Formation: {homeTeam.formation}</div>
                  <div className="text-xs text-muted-foreground">Players: {homeTeam.players.length}</div>
                </div>
                
                <div>
                  <div className="text-xs sm:text-sm font-medium truncate">Away: {awayTeam.name}</div>
                  <div className="text-xs text-muted-foreground">Formation: {awayTeam.formation}</div>
                  <div className="text-xs text-muted-foreground">Players: {awayTeam.players.length}</div>
                </div>
              </div>
            </Card>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="stats">
          <AccordionTrigger className="text-sm">Match Statistics</AccordionTrigger>
          <AccordionContent>
            <StatisticsDisplay statistics={statistics} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />
          </AccordionContent>
        </AccordionItem>
        
        {ballTrackingPoints.length > 20 && (
          <AccordionItem value="analysis">
            <AccordionTrigger className="text-sm">Time Analysis</AccordionTrigger>
            <AccordionContent>
              <Card className="p-3 sm:p-4 bg-white shadow-md">
                <div className="text-xs sm:text-sm">
                  <p className="mb-2">Time segment analysis helps visualize statistics over 5-minute intervals.</p>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <Button 
                      onClick={handleCalculateTimeSegments} 
                      className="text-xs sm:text-sm" 
                      size={isMobile ? "sm" : "default"}
                      disabled={!calculateTimeSegments || ballTrackingPoints.length < 20}
                    >
                      Calculate Segments
                    </Button>
                    <Link to="/stats">
                      <Button variant="outline" size={isMobile ? "sm" : "default"} className="flex items-center gap-1 text-xs sm:text-sm">
                        View Stats
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
      
      {/* Desktop version */}
      <div className="hidden xl:block">
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
        
        {ballTrackingPoints.length > 20 && (
          <Card className="p-4 bg-white shadow-md mt-4">
            <h3 className="font-semibold mb-2">Time Segment Analysis</h3>
            <div className="text-sm mb-4">
              <p>Calculate detailed time segment statistics for visualization.</p>
            </div>
            <div className="flex justify-between">
              <Button 
                onClick={handleCalculateTimeSegments} 
                size="sm" 
                disabled={!calculateTimeSegments || ballTrackingPoints.length < 20}
              >
                Calculate Segments
              </Button>
              <Link to="/stats">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  View Stats
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MatchSidebar;
