
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
  const { home, away } = statistics;

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
              value={home?.possessionPercentage || 0}
              max={100} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{home?.possessionPercentage || 0}%</span>
              <span>{away?.possessionPercentage || 0}%</span>
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
                {home?.passesCompleted || 0} / {home?.passesAttempted || 0} passes
              </div>
              <Progress
                value={home?.passesCompleted || 0}
                max={Math.max(home?.passesAttempted || 1, 1)}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {home?.passesAttempted ?
                  Math.round(((home.passesCompleted || 0) / home.passesAttempted) * 100) : 0}% accuracy
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div>Support: {home?.supportPasses || 0}</div>
                <div>Offensive: {home?.offensivePasses || 0}</div>
                <div>Long: {home?.longPasses || 0}</div>
                <div>Forward: {home?.forwardPasses || 0}</div>
                <div>Backward: {home?.backwardPasses || 0}</div>
                <div>Lateral: {home?.lateralPasses || 0}</div>
                <div>Decisive: {home?.decisivePasses || 0}</div>
                <div>Successful Crosses: {home?.successfulCrosses || 0} (Attempted: {home?.crosses || 0})</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {away?.passesCompleted || 0} / {away?.passesAttempted || 0} passes
              </div>
              <Progress
                value={away?.passesCompleted || 0}
                max={Math.max(away?.passesAttempted || 1, 1)}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {away?.passesAttempted ?
                  Math.round(((away.passesCompleted || 0) / away.passesAttempted) * 100) : 0}% accuracy
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div>Support: {away?.supportPasses || 0}</div>
                <div>Offensive: {away?.offensivePasses || 0}</div>
                <div>Long: {away?.longPasses || 0}</div>
                <div>Forward: {away?.forwardPasses || 0}</div>
                <div>Backward: {away?.backwardPasses || 0}</div>
                <div>Lateral: {away?.lateralPasses || 0}</div>
                <div>Decisive: {away?.decisivePasses || 0}</div>
                <div>Successful Crosses: {away?.successfulCrosses || 0} (Attempted: {away?.crosses || 0})</div>
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
                Total Shots: {home?.shots || 0} (On Target: {home?.shotsOnTarget || 0})
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                xG: {home?.totalXg?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs space-y-1">
                <div>Foot Shots: { (home?.dangerousFootShots || 0) + (home?.nonDangerousFootShots || 0) }
                  (On Target: {home?.footShotsOnTarget || 0}, Post: {home?.footShotsPostHits || 0}, Blocked: {home?.footShotsBlocked || 0})
                </div>
                <div>Header Shots: { (home?.dangerousHeaderShots || 0) + (home?.nonDangerousHeaderShots || 0) }
                  (On Target: {home?.headerShotsOnTarget || 0}, Post: {home?.headerShotsPostHits || 0}, Blocked: {home?.headerShotsBlocked || 0})
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground mb-1">
                Total Shots: {away?.shots || 0} (On Target: {away?.shotsOnTarget || 0})
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                xG: {away?.totalXg?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs space-y-1">
                <div>Foot Shots: { (away?.dangerousFootShots || 0) + (away?.nonDangerousFootShots || 0) }
                  (On Target: {away?.footShotsOnTarget || 0}, Post: {away?.footShotsPostHits || 0}, Blocked: {away?.footShotsBlocked || 0})
                </div>
                <div>Header Shots: { (away?.dangerousHeaderShots || 0) + (away?.nonDangerousHeaderShots || 0) }
                  (On Target: {away?.headerShotsOnTarget || 0}, Post: {away?.headerShotsPostHits || 0}, Blocked: {away?.headerShotsBlocked || 0})
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
                <div>Duels Won: {home?.duelsWon || 0} (Lost: {home?.duelsLost || 0})</div>
                <div>Aerial Duels Won: {home?.aerialDuelsWon || 0} (Lost: {home?.aerialDuelsLost || 0})</div>
                <div>Balls Played: {home?.ballsPlayed || 0}</div>
                <div>Balls Recovered: {home?.ballsRecovered || 0}</div>
                <div>Balls Lost: {home?.ballsLost || 0}</div>
                <div>Contacts: {home?.contacts || 0}</div>
                <div>Successful Dribbles: {home?.successfulDribbles || 0}</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">{awayTeamName}</div>
              <div className="space-y-1">
                <div>Duels Won: {away?.duelsWon || 0} (Lost: {away?.duelsLost || 0})</div>
                <div>Aerial Duels Won: {away?.aerialDuelsWon || 0} (Lost: {away?.aerialDuelsLost || 0})</div>
                <div>Balls Played: {away?.ballsPlayed || 0}</div>
                <div>Balls Recovered: {away?.ballsRecovered || 0}</div>
                <div>Balls Lost: {away?.ballsLost || 0}</div>
                <div>Contacts: {away?.contacts || 0}</div>
                <div>Successful Dribbles: {away?.successfulDribbles || 0}</div>
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
                <div>Fouls Committed: {home?.foulsCommitted || 0}</div>
                <div>Yellow Cards: {home?.yellowCards || 0}</div>
                <div>Red Cards: {home?.redCards || 0}</div>
                <div>Free Kicks Awarded: {home?.freeKicks || 0}</div>
                <div>6m Violations: {home?.sixMeterViolations || 0}</div>
                <div>Corners: {home?.corners || 0}</div>
                <div>Offsides: {home?.offsides || 0}</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">{awayTeamName}</div>
              <div className="space-y-1">
                <div>Fouls Committed: {away?.foulsCommitted || 0}</div>
                <div>Yellow Cards: {away?.yellowCards || 0}</div>
                <div>Red Cards: {away?.redCards || 0}</div>
                <div>Free Kicks Awarded: {away?.freeKicks || 0}</div>
                <div>6m Violations: {away?.sixMeterViolations || 0}</div>
                <div>Corners: {away?.corners || 0}</div>
                <div>Offsides: {away?.offsides || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsDisplay;
