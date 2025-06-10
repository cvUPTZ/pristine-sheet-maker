import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Using Progress for visual representation

interface ActionEffectivenessMetricsProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

interface EffectivenessMetric {
  label: string;
  value: number; // Raw count or percentage (0-100 if ratio)
  displayValue: string;
  description?: string;
  isRatio: boolean; // To determine if progress bar is applicable (0-100 scale)
}

const ActionEffectivenessMetrics: React.FC<ActionEffectivenessMetricsProps> = ({
  teamStats,
  teamName,
}) => {
  const crossSuccessRate = (teamStats.crosses || 0) > 0
    ? ((teamStats.successfulCrosses || 0) / (teamStats.crosses || 0)) * 100
    : 0;

  // Assuming 'dribbles' field in PlayerStatSummary (if aggregated to team) would be total dribbles.
  // TeamDetailedStats does not have 'totalDribbles'. We only have 'successfulDribbles'.
  // So, we can only show successful dribbles count, not a rate, unless total is added.
  const successfulDribblesCount = teamStats.successfulDribbles || 0;

  const metrics: EffectivenessMetric[] = [
    {
      label: 'Crossing Accuracy',
      value: crossSuccessRate,
      displayValue: `${crossSuccessRate.toFixed(1)}%`,
      description: `(${teamStats.successfulCrosses || 0} Successful / ${teamStats.crosses || 0} Total Attempted)`,
      isRatio: true,
    },
    {
      label: 'Successful Dribbles',
      value: successfulDribblesCount, // This is a count, not a rate for progress bar 0-100
      displayValue: `${successfulDribblesCount}`,
      description: `(Total attempted dribbles not available in TeamDetailedStats for a rate)`,
      isRatio: false, // Cannot be represented as a 0-100 ratio easily without total
    },
    {
      label: 'Decisive Passes',
      value: teamStats.decisivePasses || 0, // Count
      displayValue: `${teamStats.decisivePasses || 0}`,
      isRatio: false,
    },
    // Example: If we had 'total tackles' and 'successful tackles' in TeamDetailedStats
    // const tackleSuccessRate = (teamStats.totalTackles || 0) > 0
    //   ? ((teamStats.successfulTackles || 0) / (teamStats.totalTackles || 0)) * 100
    //   : 0;
    // {
    //   label: 'Tackle Success Rate',
    //   value: tackleSuccessRate,
    //   displayValue: `${tackleSuccessRate.toFixed(1)}%`,
    //   isRatio: true,
    // }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Effectiveness: {teamName}</CardTitle>
        <CardDescription>Metrics related to the effectiveness of specific actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between mb-1 items-baseline">
              <span className="text-sm font-medium">{metric.label}</span>
              <span className="text-lg font-semibold">{metric.displayValue}</span>
            </div>
            {metric.isRatio ? (
              <Progress value={metric.value} max={100} className="h-3" />
            ) : (
              <div className="w-full bg-gray-200 rounded h-3">
                 {/* For counts, we could show a bar relative to an expected max or just text */}
                 {/* Or, if a typical max is known, e.g. typical decisive passes in a match ~10-20?
                 <div style={{ width: `${(metric.value / 20) * 100}%` }} className="h-3 bg-blue-500 rounded"></div>
                 */}
              </div>
            )}
            {metric.description && (
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ActionEffectivenessMetrics;
