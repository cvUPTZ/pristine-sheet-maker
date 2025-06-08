
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
              value={statistics.possession?.home || 0} 
              max={100} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{statistics.possession?.home || 0}%</span>
              <span>{statistics.possession?.away || 0}%</span>
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
                {statistics.passes?.home?.successful || 0} / {statistics.passes?.home?.attempted || 0} passes
              </div>
              <Progress 
                value={statistics.passes?.home?.successful || 0} 
                max={Math.max(statistics.passes?.home?.attempted || 1, 1)} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.passes?.home?.attempted ? 
                  Math.round(((statistics.passes.home.successful || 0) / statistics.passes.home.attempted) * 100) : 0}% accuracy
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {statistics.passes?.away?.successful || 0} / {statistics.passes?.away?.attempted || 0} passes
              </div>
              <Progress 
                value={statistics.passes?.away?.successful || 0} 
                max={Math.max(statistics.passes?.away?.attempted || 1, 1)} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {statistics.passes?.away?.attempted ? 
                  Math.round(((statistics.passes.away.successful || 0) / statistics.passes.away.attempted) * 100) : 0}% accuracy
              </div>
            </div>
          </div>
        </div>

        {/* Shots */}
        <div>
          <h4 className="font-semibold mb-3">Shot Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">{homeTeamName}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {statistics.shots?.home?.onTarget || 0} / {(statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0)} on target
              </div>
              <Progress 
                value={statistics.shots?.home?.onTarget || 0} 
                max={Math.max((statistics.shots?.home?.onTarget || 0) + (statistics.shots?.home?.offTarget || 0), 1)} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Total xG: {statistics.shots?.home?.totalXg?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {statistics.shots?.away?.onTarget || 0} / {(statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0)} on target
              </div>
              <Progress 
                value={statistics.shots?.away?.onTarget || 0} 
                max={Math.max((statistics.shots?.away?.onTarget || 0) + (statistics.shots?.away?.offTarget || 0), 1)} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Total xG: {statistics.shots?.away?.totalXg?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Fouls */}
        <div>
          <h4 className="font-semibold mb-3">Disciplinary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">{homeTeamName}</div>
              <div className="text-xs text-muted-foreground">
                Fouls: {statistics.fouls?.home || 0}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{awayTeamName}</div>
              <div className="text-xs text-muted-foreground">
                Fouls: {statistics.fouls?.away || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div>
          <h4 className="font-semibold mb-3">Additional Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium mb-2">{homeTeamName}</div>
              <div className="space-y-1">
                <div>Corners: {statistics.corners?.home || 0}</div>
                <div>Offsides: {statistics.offsides?.home || 0}</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">{awayTeamName}</div>
              <div className="space-y-1">
                <div>Corners: {statistics.corners?.away || 0}</div>
                <div>Offsides: {statistics.offsides?.away || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatisticsDisplay;
