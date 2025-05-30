
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Statistics, ShotStats, PassStats } from '@/types';
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

  const getShotStats = (shots: ShotStats | number) => {
    if (typeof shots === 'number') return { onTarget: 0, offTarget: shots, total: shots };
    return shots;
  };

  const getPassStats = (passes: PassStats | number) => {
    if (typeof passes === 'number') return { successful: 0, attempted: passes };
    return passes;
  };

  const homeShots = getShotStats(statistics.shots?.home || 0);
  const awayShots = getShotStats(statistics.shots?.away || 0);
  const homePasses = getPassStats(statistics.passes?.home || 0);
  const awayPasses = getPassStats(statistics.passes?.away || 0);

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
                {(homeShots.onTarget || 0) + (homeShots.offTarget || 0)}
              </div>
              <div className="text-center text-muted-foreground">Shots (total)</div>
              <div className="text-left font-medium text-football-away">
                {(awayShots.onTarget || 0) + (awayShots.offTarget || 0)}
              </div>
            </div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right text-xs text-muted-foreground">
                ({homeShots.onTarget || 0} on target)
              </div>
              <div className="text-center"></div>
              <div className="text-left text-xs text-muted-foreground">
                ({awayShots.onTarget || 0} on target)
              </div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={(homeShots.onTarget || 0) + (homeShots.offTarget || 0)} 
                max={Math.max(
                  (homeShots.onTarget || 0) + (homeShots.offTarget || 0),
                  (awayShots.onTarget || 0) + (awayShots.offTarget || 0),
                  1
                )}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={(awayShots.onTarget || 0) + (awayShots.offTarget || 0)}
                max={Math.max(
                  (homeShots.onTarget || 0) + (homeShots.offTarget || 0),
                  (awayShots.onTarget || 0) + (awayShots.offTarget || 0),
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
                {homePasses.successful || 0}/{homePasses.attempted || 0}
              </div>
              <div className="text-center text-muted-foreground">Passes (success/total)</div>
              <div className="text-left font-medium text-football-away">
                {awayPasses.successful || 0}/{awayPasses.attempted || 0}
              </div>
            </div>
            <div className="grid grid-cols-3 text-sm mb-2">
              <div className="text-right text-xs text-muted-foreground">
                ({(homePasses.attempted || 0) ? 
                  Math.round(((homePasses.successful || 0) / (homePasses.attempted || 1)) * 100) : 0}% success)
              </div>
              <div className="text-center"></div>
              <div className="text-left text-xs text-muted-foreground">
                ({(awayPasses.attempted || 0) ? 
                  Math.round(((awayPasses.successful || 0) / (awayPasses.attempted || 1)) * 100) : 0}% success)
              </div>
            </div>
            <div className="flex gap-1 h-2">
              <Progress 
                value={homePasses.attempted || 0}
                max={Math.max((homePasses.attempted || 0), (awayPasses.attempted || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-home/30"
              />
              <Progress 
                value={awayPasses.attempted || 0}
                max={Math.max((homePasses.attempted || 0), (awayPasses.attempted || 0), 1)}
                className="bg-muted h-2"
                indicatorClassName="bg-football-away/30"
              />
            </div>
            <div className="flex gap-1 h-2 mt-1">
              <Progress 
                value={homePasses.successful || 0}
                max={Math.max((homePasses.attempted || 0), (awayPasses.attempted || 0), 1)}
                className="bg-transparent h-2"
                indicatorClassName="bg-football-home"
              />
              <Progress 
                value={awayPasses.successful || 0}
                max={Math.max((homePasses.attempted || 0), (awayPasses.attempted || 0), 1)}
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
