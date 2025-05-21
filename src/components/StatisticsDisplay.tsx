
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Statistics } from '@/types';
import { Progress } from '@/components/ui/progress';

interface StatisticsDisplayProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ 
  statistics, 
  homeTeamName, 
  awayTeamName 
}) => {
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
              <div className="font-medium text-football-home">{Math.round(statistics.possession.home)}%</div>
              <div className="text-muted-foreground">Possession</div>
              <div className="font-medium text-football-away">{Math.round(statistics.possession.away)}%</div>
            </div>
            <div className="h-2 relative rounded-full overflow-hidden bg-muted">
              <div 
                className="h-full bg-football-home absolute left-0 top-0 rounded-l-full" 
                style={{ width: `${statistics.possession.home}%` }}
              />
              <div 
                className="h-full bg-football-away absolute right-0 top-0 rounded-r-full" 
                style={{ width: `${statistics.possession.away}%` }}
              />
            </div>
          </div>
          
          {/* Shots */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-1">
              <div className="text-right font-medium text-football-home">
                {statistics.shots.home.onTarget + statistics.shots.home.offTarget}
              </div>
              <div className="text-center text-muted-foreground">Shots (total)</div>
              <div className="text-left font-medium text-football-away">
                {statistics.shots.away.onTarget + statistics.shots.away.offTarget}
              </div>
            </div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right text-xs text-muted-foreground">
                ({statistics.shots.home.onTarget} on target)
              </div>
              <div className="text-center"></div>
              <div className="text-left text-xs text-muted-foreground">
                ({statistics.shots.away.onTarget} on target)
              </div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.shots.home.onTarget + statistics.shots.home.offTarget} 
                max={Math.max(
                  statistics.shots.home.onTarget + statistics.shots.home.offTarget,
                  statistics.shots.away.onTarget + statistics.shots.away.offTarget,
                  1
                )}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.shots.away.onTarget + statistics.shots.away.offTarget}
                max={Math.max(
                  statistics.shots.home.onTarget + statistics.shots.home.offTarget,
                  statistics.shots.away.onTarget + statistics.shots.away.offTarget,
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
                {statistics.passes.home.successful}/{statistics.passes.home.attempted}
              </div>
              <div className="text-center text-muted-foreground">Passes (success/total)</div>
              <div className="text-left font-medium text-football-away">
                {statistics.passes.away.successful}/{statistics.passes.away.attempted}
              </div>
            </div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right text-xs text-muted-foreground">
                ({statistics.passes.home.attempted ? 
                  Math.round((statistics.passes.home.successful / statistics.passes.home.attempted) * 100) : 0}% success)
              </div>
              <div className="text-center"></div>
              <div className="text-left text-xs text-muted-foreground">
                ({statistics.passes.away.attempted ? 
                  Math.round((statistics.passes.away.successful / statistics.passes.away.attempted) * 100) : 0}% success)
              </div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.passes.home.attempted}
                max={Math.max(statistics.passes.home.attempted, statistics.passes.away.attempted, 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home/30"
              />
              <Progress 
                value={statistics.passes.away.attempted}
                max={Math.max(statistics.passes.home.attempted, statistics.passes.away.attempted, 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away/30"
              />
            </div>
            <div className="flex gap-1 h-2 mt-1">
              <Progress 
                value={statistics.passes.home.successful}
                max={Math.max(statistics.passes.home.attempted, statistics.passes.away.attempted, 1)}
                className="bg-transparent h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.passes.away.successful}
                max={Math.max(statistics.passes.home.attempted, statistics.passes.away.attempted, 1)}
                className="bg-transparent h-2"
                indicatorClassName="bg-football-away"
              />
            </div>
          </div>
          
          {/* Balls Played */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right font-medium text-football-home">{statistics.ballsPlayed.home}</div>
              <div className="text-center text-muted-foreground">Balls Played</div>
              <div className="text-left font-medium text-football-away">{statistics.ballsPlayed.away}</div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.ballsPlayed.home}
                max={Math.max(statistics.ballsPlayed.home, statistics.ballsPlayed.away, 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.ballsPlayed.away}
                max={Math.max(statistics.ballsPlayed.home, statistics.ballsPlayed.away, 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away"
              />
            </div>
          </div>
          
          {/* Balls Lost */}
          <div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right font-medium text-football-home">{statistics.ballsLost.home}</div>
              <div className="text-center text-muted-foreground">Fouls</div>
              <div className="text-left font-medium text-football-away">{statistics.ballsLost.away}</div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={statistics.ballsLost.home}
                max={Math.max(statistics.ballsLost.home, statistics.ballsLost.away, 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={statistics.ballsLost.away}
                max={Math.max(statistics.ballsLost.home, statistics.ballsLost.away, 1)}
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
