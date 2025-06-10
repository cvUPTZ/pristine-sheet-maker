
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Statistics } from '@/types';

interface StatisticsDisplayProps {
  statistics: Statistics;
  homeTeamName: string;
  awayTeamName: string;
}

const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({
  statistics,
  homeTeamName,
  awayTeamName,
}) => {
  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Match Statistics</CardTitle>
        <CardDescription>Real-time match metrics and performance data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ball Possession */}
        <div>
          <h4 className="font-semibold mb-2">Ball Possession</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{homeTeamName}</span>
              <span>{awayTeamName}</span>
            </div>
            <Progress 
              value={statistics.home?.possessionPercentage || 0}
              max={100} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{statistics.home?.possessionPercentage || 0}%</span>
              <span>{statistics.away?.possessionPercentage || 0}%</span>
            </div>
          </div>
        </div>

        {/* Passes */}
        <div>
          <h4 className="font-semibold mb-3">Passing Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">{homeTeamName}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {statistics.home?.passesCompleted || 0} / {statistics.home?.passesAttempted || 0} passes
              </div>
              <Progress
                value={statistics.home?.passesCompleted || 0}
                max={Math.max(statistics.home?.passesAttempted || 1, 1)}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.home?.passesAttempted ?
                  Math.round(((statistics.home.passesCompleted || 0) / statistics.home.passesAttempted) * 100) : 0}% accuracy
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div>Support: {statistics.home?.supportPasses || 0}</div>
                <div>Offensive: {statistics.home?.offensivePasses || 0}</div>
                <div>Long: {statistics.home?.longPasses || 0}</div>
                <div>Forward: {statistics.home?.forwardPasses || 0}</div>
                <div>Backward: {statistics.home?.backwardPasses || 0}</div>
                <div>Lateral: {statistics.home?.lateralPasses || 0}</div>
                <div>Decisive: {statistics.home?.decisivePasses || 0}</div>
                <div>Successful Crosses: {statistics.home?.successfulCrosses || 0} (Attempted: {statistics.home?.crosses || 0})</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {statistics.away?.passesCompleted || 0} / {statistics.away?.passesAttempted || 0} passes
              </div>
              <Progress
                value={statistics.away?.passesCompleted || 0}
                max={Math.max(statistics.away?.passesAttempted || 1, 1)}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.away?.passesAttempted ?
                  Math.round(((statistics.away.passesCompleted || 0) / statistics.away.passesAttempted) * 100) : 0}% accuracy
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div>Support: {statistics.away?.supportPasses || 0}</div>
                <div>Offensive: {statistics.away?.offensivePasses || 0}</div>
                <div>Long: {statistics.away?.longPasses || 0}</div>
                <div>Forward: {statistics.away?.forwardPasses || 0}</div>
                <div>Backward: {statistics.away?.backwardPasses || 0}</div>
                <div>Lateral: {statistics.away?.lateralPasses || 0}</div>
                <div>Decisive: {statistics.away?.decisivePasses || 0}</div>
                <div>Successful Crosses: {statistics.away?.successfulCrosses || 0} (Attempted: {statistics.away?.crosses || 0})</div>
              </div>
            </div>
          </div>
        </div>

        {/* Shots */}
        <div>
          <h4 className="font-semibold mb-3">Shooting Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">{homeTeamName}</div>
              <div className="text-xs text-muted-foreground mb-1">
                Total Shots: {statistics.home?.shots || 0} (On Target: {statistics.home?.shotsOnTarget || 0})
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                xG: {statistics.home?.totalXg?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs space-y-1">
                <div>Foot Shots: { (statistics.home?.dangerousFootShots || 0) + (statistics.home?.nonDangerousFootShots || 0) }
                  (On Target: {statistics.home?.footShotsOnTarget || 0}, Post: {statistics.home?.footShotsPostHits || 0}, Blocked: {statistics.home?.footShotsBlocked || 0})
                </div>
                <div>Header Shots: { (statistics.home?.dangerousHeaderShots || 0) + (statistics.home?.nonDangerousHeaderShots || 0) }
                  (On Target: {statistics.home?.headerShotsOnTarget || 0}, Post: {statistics.home?.headerShotsPostHits || 0}, Blocked: {statistics.home?.headerShotsBlocked || 0})
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground mb-1">
                Total Shots: {statistics.away?.shots || 0} (On Target: {statistics.away?.shotsOnTarget || 0})
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                xG: {statistics.away?.totalXg?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs space-y-1">
                <div>Foot Shots: { (statistics.away?.dangerousFootShots || 0) + (statistics.away?.nonDangerousFootShots || 0) }
                  (On Target: {statistics.away?.footShotsOnTarget || 0}, Post: {statistics.away?.footShotsPostHits || 0}, Blocked: {statistics.away?.footShotsBlocked || 0})
                </div>
                <div>Header Shots: { (statistics.away?.dangerousHeaderShots || 0) + (statistics.away?.nonDangerousHeaderShots || 0) }
                  (On Target: {statistics.away?.headerShotsOnTarget || 0}, Post: {statistics.away?.headerShotsPostHits || 0}, Blocked: {statistics.away?.headerShotsBlocked || 0})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Duels and Ball Control */}
        <div>
          <h4 className="font-semibold mb-3">Duels & Ball Control</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium mb-2">{homeTeamName}</div>
              <div className="space-y-1">
                <div>Duels Won: {statistics.home?.duelsWon || 0} (Lost: {statistics.home?.duelsLost || 0})</div>
                <div>Aerial Duels Won: {statistics.home?.aerialDuelsWon || 0} (Lost: {statistics.home?.aerialDuelsLost || 0})</div>
                <div>Balls Played: {statistics.home?.ballsPlayed || 0}</div>
                <div>Balls Recovered: {statistics.home?.ballsRecovered || 0}</div>
                <div>Balls Lost: {statistics.home?.ballsLost || 0}</div>
                <div>Contacts: {statistics.home?.contacts || 0}</div>
                <div>Successful Dribbles: {statistics.home?.successfulDribbles || 0}</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">{awayTeamName}</div>
              <div className="space-y-1">
                <div>Duels Won: {statistics.away?.duelsWon || 0} (Lost: {statistics.away?.duelsLost || 0})</div>
                <div>Aerial Duels Won: {statistics.away?.aerialDuelsWon || 0} (Lost: {statistics.away?.aerialDuelsLost || 0})</div>
                <div>Balls Played: {statistics.away?.ballsPlayed || 0}</div>
                <div>Balls Recovered: {statistics.away?.ballsRecovered || 0}</div>
                <div>Balls Lost: {statistics.away?.ballsLost || 0}</div>
                <div>Contacts: {statistics.away?.contacts || 0}</div>
                <div>Successful Dribbles: {statistics.away?.successfulDribbles || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Disciplinary & Game Flow */}
        <div>
          <h4 className="font-semibold mb-3">Disciplinary & Game Flow</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium mb-2">{homeTeamName}</div>
              <div className="space-y-1">
                <div>Fouls Committed: {statistics.home?.foulsCommitted || 0}</div>
                <div>Yellow Cards: {statistics.home?.yellowCards || 0}</div>
                <div>Red Cards: {statistics.home?.redCards || 0}</div>
                <div>Free Kicks Awarded: {statistics.home?.freeKicks || 0}</div>
                <div>6m Violations: {statistics.home?.sixMeterViolations || 0}</div>
                <div>Corners: {statistics.home?.corners || 0}</div>
                <div>Offsides: {statistics.home?.offsides || 0}</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">{awayTeamName}</div>
              <div className="space-y-1">
                <div>Fouls Committed: {statistics.away?.foulsCommitted || 0}</div>
                <div>Yellow Cards: {statistics.away?.yellowCards || 0}</div>
                <div>Red Cards: {statistics.away?.redCards || 0}</div>
                <div>Free Kicks Awarded: {statistics.away?.freeKicks || 0}</div>
                <div>6m Violations: {statistics.away?.sixMeterViolations || 0}</div>
                <div>Corners: {statistics.away?.corners || 0}</div>
                <div>Offsides: {statistics.away?.offsides || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsDisplay;
