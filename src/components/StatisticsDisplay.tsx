
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Statistics } from '@/types';
import { Progress } from '@/components/ui/progress';

interface StatisticsDisplayProps {
  statistics: Statistics | null;
  homeTeamName: string;
  awayTeamName: string;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ 
  statistics, 
  homeTeamName, 
  awayTeamName 
}) => {
  // Handle null statistics case
  if (!statistics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Match Statistics</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-muted-foreground py-8">
            No statistics available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Match Statistics</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-6">
          {/* Possession */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <div className="font-medium text-football-home">{Math.round(statistics.possession?.home || 0)}%</div>
              <div className="text-muted-foreground">Possession</div>
              <div className="font-medium text-football-away">{Math.round(statistics.possession?.away || 0)}%</div>
            </div>
            <div className="h-2 relative rounded-full overflow-hidden bg-muted">
              <div 
                className="h-full bg-football-home absolute left-0 top-0 rounded-l-full" 
                style={{ width: `${statistics.possession?.home || 0}%` }}
              />
              <div 
                className="h-full bg-football-away absolute right-0 top-0 rounded-r-full" 
                style={{ width: `${statistics.possession?.away || 0}%` }}
              />
            </div>
          </div>
          
          {/* Shots */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-1">
              <div className="text-right font-medium text-football-home">
                {(statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0)}
              </div>
              <div className="text-center text-muted-foreground">Shots (total)</div>
              <div className="text-left font-medium text-football-away">
                {(statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0)}
              </div>
            </div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right text-xs text-muted-foreground">
                ({statistics.shots?.home?.onTarget || 0} on target)
              </div>
              <div className="text-center"></div>
              <div className="text-left text-xs text-muted-foreground">
                ({statistics.shots?.away?.onTarget || 0} on target)
              </div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={(statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0)} 
                max={Math.max(
                  (statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0),
                  (statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0),
                  1
                )}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={(statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0)}
                max={Math.max(
                  (statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0),
                  (statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0),
                  1
                )}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away"
              />
            </div>
          </div>
          
          {/* Passes */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-1">
              <div className="text-right font-medium text-football-home">
                {statistics.passes?.home?.successful || 0}/{statistics.passes?.home?.attempted || 0}
              </div>
              <div className="text-center text-muted-foreground">Passes (success/total)</div>
              <div className="text-left font-medium text-football-away">
                {statistics.passes?.away?.successful || 0}/{statistics.passes?.away?.attempted || 0}
              </div>
            </div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right text-xs text-muted-foreground">
                ({(statistics.passes?.home?.attempted || 0) ? 
                  Math.round(((statistics.passes?.home?.successful || 0) / (statistics.passes?.home?.attempted || 1)) * 100) : 0}% success)
              </div>
              <div className="text-center"></div>
              <div className="text-left text-xs text-muted-foreground">
                ({(statistics.passes?.away?.attempted || 0) ? 
                  Math.round(((statistics.passes?.away?.successful || 0) / (statistics.passes?.away?.attempted || 1)) * 100) : 0}% success)
              </div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.passes?.home?.attempted || 0}
                max={Math.max((statistics.passes?.home?.attempted || 0), (statistics.passes?.away?.attempted || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home/30"
              />
              <Progress 
                value={statistics.passes?.away?.attempted || 0}
                max={Math.max((statistics.passes?.home?.attempted || 0), (statistics.passes?.away?.attempted || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away/30"
              />
            </div>
            <div className="flex gap-1 h-2 mt-1">
              <Progress 
                value={statistics.passes?.home?.successful || 0}
                max={Math.max((statistics.passes?.home?.attempted || 0), (statistics.passes?.away?.attempted || 0), 1)}
                className="bg-transparent h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.passes?.away?.successful || 0}
                max={Math.max((statistics.passes?.home?.attempted || 0), (statistics.passes?.away?.attempted || 0), 1)}
                className="bg-transparent h-2"
                indicatorClassName="bg-football-away"
              />
            </div>
          </div>
          
          {/* Balls Played */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right font-medium text-football-home">{statistics.ballsPlayed?.home || 0}</div>
              <div className="text-center text-muted-foreground">Balls Played</div>
              <div className="text-left font-medium text-football-away">{statistics.ballsPlayed?.away || 0}</div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.ballsPlayed?.home || 0}
                max={Math.max((statistics.ballsPlayed?.home || 0), (statistics.ballsPlayed?.away || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.ballsPlayed?.away || 0}
                max={Math.max((statistics.ballsPlayed?.home || 0), (statistics.ballsPlayed?.away || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away"
              />
            </div>
          </div>
          
          {/* Balls Lost */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right font-medium text-football-home">{statistics.ballsLost?.home || 0}</div>
              <div className="text-center text-muted-foreground">Fouls</div>
              <div className="text-left font-medium text-football-away">{statistics.ballsLost?.away || 0}</div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.ballsLost?.home || 0}
                max={Math.max((statistics.ballsLost?.home || 0), (statistics.ballsLost?.away || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.ballsLost?.away || 0}
                max={Math.max((statistics.ballsLost?.home || 0), (statistics.ballsLost?.away || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsDisplay;
