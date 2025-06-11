
import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface AdvancedEfficiencyRatioChartsProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Simple Bar component for demonstration
const SimpleRatioBar = ({ label, homeValue, awayValue, unit = '', homeTeamName, awayTeamName }: { 
  label: string; 
  homeValue: number; 
  awayValue: number; 
  unit?: string;
  homeTeamName: string;
  awayTeamName: string;
}) => {
  const maxValue = Math.max(homeValue, awayValue, 1); // Ensure max is at least 1 for scaling
  const homePercentage = (homeValue / maxValue) * 100;
  const awayPercentage = (awayValue / maxValue) * 100;

  return (
    <div className="mb-4 p-2 border rounded">
      <h5 className="text-sm font-semibold text-center mb-2">{label}</h5>
      <div className="flex items-center mb-1">
        <span className="text-xs w-1/4 pr-1 text-right">{homeTeamName}:</span>
        <div className="w-3/4 bg-gray-200 rounded h-4">
          <div style={{ width: `${homePercentage}%`, backgroundColor: 'lightblue' }} className="h-4 rounded"></div>
        </div>
        <span className="text-xs pl-1">{homeValue.toFixed(2)}{unit}</span>
      </div>
      <div className="flex items-center">
        <span className="text-xs w-1/4 pr-1 text-right">{awayTeamName}:</span>
        <div className="w-3/4 bg-gray-200 rounded h-4">
          <div style={{ width: `${awayPercentage}%`, backgroundColor: 'lightcoral' }} className="h-4 rounded"></div>
        </div>
        <span className="text-xs pl-1">{awayValue.toFixed(2)}{unit}</span>
      </div>
    </div>
  );
};


const AdvancedEfficiencyRatioCharts: React.FC<AdvancedEfficiencyRatioChartsProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const calculateRatio = (numerator: number, denominator: number): number => {
    return denominator > 0 ? numerator / denominator : 0;
  };

  const homeBallLossRatio = calculateRatio(homeStats.ballsLost || 0, homeStats.ballsPlayed || 0) * 100; // as percentage
  const awayBallLossRatio = calculateRatio(awayStats.ballsLost || 0, awayStats.ballsPlayed || 0) * 100;

  // Recovery Efficiency
  const totalRecoveries = (homeStats.ballsRecovered || 0) + (awayStats.ballsRecovered || 0);
  const homeRecoveryShare = totalRecoveries > 0 ? ((homeStats.ballsRecovered || 0) / totalRecoveries) * 100 : 0;
  const awayRecoveryShare = totalRecoveries > 0 ? ((awayStats.ballsRecovered || 0) / totalRecoveries) * 100 : 0;

  const homeRecoveryRateVsOpponent = calculateRatio(homeStats.ballsRecovered || 0, awayStats.ballsPlayed || 0) * 100; // Recoveries per 100 opponent balls played
  const awayRecoveryRateVsOpponent = calculateRatio(awayStats.ballsRecovered || 0, homeStats.ballsPlayed || 0) * 100;

  // Possession Efficiency (using possessionPercentage as a proxy for time/control)
  const homeGoalsPerPossessionProxy = calculateRatio(homeStats.goals || 0, homeStats.possessionPercentage || 1); // Goals per 1% of possession
  const awayGoalsPerPossessionProxy = calculateRatio(awayStats.goals || 0, awayStats.possessionPercentage || 1);
  const homeShotsPerPossessionProxy = calculateRatio(homeStats.shots || 0, homeStats.possessionPercentage || 1); // Shots per 1% of possession
  const awayShotsPerPossessionProxy = calculateRatio(awayStats.shots || 0, awayStats.possessionPercentage || 1);


  const efficiencyMetrics = [
    {
      groupTitle: "Ball Retention & Loss",
      metrics: [
        { label: 'Ball Loss Ratio (%) (Lower is Better)', homeValue: homeBallLossRatio, awayValue: awayBallLossRatio, unit: '%' },
      ]
    },
    {
      groupTitle: "Recovery Efficiency",
      metrics: [
        { label: 'Total Balls Recovered', homeValue: homeStats.ballsRecovered || 0, awayValue: awayStats.ballsRecovered || 0 },
        { label: 'Share of Total Recoveries (%)', homeValue: homeRecoveryShare, awayValue: awayRecoveryShare, unit: '%' },
        { label: 'Recovery Rate (vs Opponent Balls Played %)', homeValue: homeRecoveryRateVsOpponent, awayValue: awayRecoveryRateVsOpponent, unit: '%' },
      ]
    },
    {
      groupTitle: "Possession Efficiency (Proxies based on Possession %)",
      metrics: [
        { label: 'Goals per 1% Possession', homeValue: homeGoalsPerPossessionProxy, awayValue: awayGoalsPerPossessionProxy },
        { label: 'Shots per 1% Possession', homeValue: homeShotsPerPossessionProxy, awayValue: awayShotsPerPossessionProxy },
      ]
    }
  ];

  const successfulPassCounts = [
    { label: "Long Passes", homeValue: homeStats.longPasses || 0, awayValue: awayStats.longPasses || 0 },
    { label: "Forward Passes", homeValue: homeStats.forwardPasses || 0, awayValue: awayStats.forwardPasses || 0 },
    { label: "Backward Passes", homeValue: homeStats.backwardPasses || 0, awayValue: awayStats.backwardPasses || 0 },
    { label: "Lateral Passes", homeValue: homeStats.lateralPasses || 0, awayValue: awayStats.lateralPasses || 0 },
  ];

  // Calculate all metrics first for the Radar Chart
  const homePassAccuracy = calculateRatio(homeStats.passesCompleted || 0, homeStats.passesAttempted || 0) * 100;
  const awayPassAccuracy = calculateRatio(awayStats.passesCompleted || 0, awayStats.passesAttempted || 0) * 100;

  const homeShotConversion = calculateRatio(homeStats.goals || 0, homeStats.shots || 0) * 100;
  const awayShotConversion = calculateRatio(awayStats.goals || 0, awayStats.shots || 0) * 100;

  const homeDuelSuccessRate = calculateRatio(homeStats.duelsWon || 0, (homeStats.duelsWon || 0) + (homeStats.duelsLost || 0)) * 100;
  const awayDuelSuccessRate = calculateRatio(awayStats.duelsWon || 0, (awayStats.duelsWon || 0) + (awayStats.duelsLost || 0)) * 100;

  // Using the already defined homeBallLossRatio and awayBallLossRatio from the top of the component
  const homeBallRetention = 100 - homeBallLossRatio;
  const awayBallRetention = 100 - awayBallLossRatio;

  // Using the already defined homeRecoveryShare and awayRecoveryShare
  // Using the already defined homeGoalsPerPossessionProxy and awayGoalsPerPossessionProxy

  const radarChartData = [
    { subject: 'Pass Acc.', [homeTeamName]: homePassAccuracy, [awayTeamName]: awayPassAccuracy, fullMark: 100 },
    { subject: 'Shot Conv.', [homeTeamName]: homeShotConversion, [awayTeamName]: awayShotConversion, fullMark: Math.max(25, homeShotConversion, awayShotConversion) },
    { subject: 'Duel Win %', [homeTeamName]: homeDuelSuccessRate, [awayTeamName]: awayDuelSuccessRate, fullMark: 100 },
    { subject: 'Retention', [homeTeamName]: homeBallRetention, [awayTeamName]: awayBallRetention, fullMark: 100 },
    { subject: 'Rec. Share', [homeTeamName]: homeRecoveryShare, [awayTeamName]: awayRecoveryShare, fullMark: 100 },
    { subject: 'Goals/Poss%', [homeTeamName]: homeGoalsPerPossessionProxy, [awayTeamName]: awayGoalsPerPossessionProxy, fullMark: Math.max(1, homeGoalsPerPossessionProxy, awayGoalsPerPossessionProxy)},
  ];

  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Efficiency Ratios Comparison</CardTitle>
        <CardDescription>Comparing {homeTeamName} and {awayTeamName} on advanced efficiency metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        {efficiencyMetrics.map(group => (
          <div key={group.groupTitle} className="mb-6">
            <h4 className="text-md font-semibold mb-3 border-b pb-1">{group.groupTitle}</h4>
            {group.metrics.map(metric => (
              <SimpleRatioBar
                key={metric.label}
                label={metric.label}
                homeValue={metric.homeValue}
                awayValue={metric.awayValue}
                unit={metric.unit}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
              />
            ))}
          </div>
        ))}

        <div className="mt-4 p-2 border rounded">
           <h4 className="text-md font-semibold text-center mb-3 border-b pb-1">Successful Pass Type Counts</h4>
           <p className="text-xs text-muted-foreground text-center mb-2">Note: These are counts of successful passes, not success rates for each specific type.</p>
           {successfulPassCounts.map(passStat => (
             <SimpleRatioBar
               key={passStat.label}
               label={passStat.label}
               homeValue={passStat.homeValue}
               awayValue={passStat.awayValue}
               homeTeamName={homeTeamName}
               awayTeamName={awayTeamName}
             />
           ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <h4 className="text-md font-semibold text-center mb-3">Overall Efficiency Profile (Radar)</h4>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full aspect-video">
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                <PolarGrid strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} tickFormatter={(value) => `${value.toFixed(0)}`} /> {/* Adjust domain if not 0-100 */}
                <Radar name={homeTeamName} dataKey={homeTeamName} stroke={chartConfig[homeTeamName].color} fill={chartConfig[homeTeamName].color} fillOpacity={0.5} />
                <Radar name={awayTeamName} dataKey={awayTeamName} stroke={chartConfig[awayTeamName].color} fill={chartConfig[awayTeamName].color} fillOpacity={0.5} />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedEfficiencyRatioCharts;
