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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface PerformanceComparisonGraphsProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Removed SimpleComparisonBarGraph

const PerformanceComparisonGraphs: React.FC<PerformanceComparisonGraphsProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const chartConfig = {
    [homeTeamName]: { label: homeTeamName, color: "hsl(var(--chart-1))" },
    [`${homeTeamName} (Attempts)`]: { label: `${homeTeamName} (Attempts)`, color: "hsl(var(--chart-1)/0.5)" },
    [`${homeTeamName} (Successful)`]: { label: `${homeTeamName} (Successful)`, color: "hsl(var(--chart-1))" },
    [awayTeamName]: { label: awayTeamName, color: "hsl(var(--chart-2))" },
    [`${awayTeamName} (Attempts)`]: { label: `${awayTeamName} (Attempts)`, color: "hsl(var(--chart-2)/0.5)" },
    [`${awayTeamName} (Successful)`]: { label: `${awayTeamName} (Successful)`, color: "hsl(var(--chart-2))" },
    "Foot Shots": { label: "Foot Shots", color: "hsl(var(--chart-3))" },
    "Header Shots": { label: "Header Shots", color: "hsl(var(--chart-4))" },
    "On Target": { label: "On Target", color: "hsl(var(--chart-5))" },
    "xG": { label: "xG", color: "hsl(var(--chart-6))" },
  };

  // Data for Shot Type Comparison (Foot vs Header)
  const shotTypeData = [
    {
      name: 'Foot Shots', // Category for XAxis
      [homeTeamName]: (homeStats.dangerousFootShots || 0) + (homeStats.nonDangerousFootShots || 0),
      [awayTeamName]: (awayStats.dangerousFootShots || 0) + (awayStats.nonDangerousFootShots || 0),
    },
    {
      name: 'Header Shots', // Category for XAxis
      [homeTeamName]: (homeStats.dangerousHeaderShots || 0) + (homeStats.nonDangerousHeaderShots || 0),
      [awayTeamName]: (awayStats.dangerousHeaderShots || 0) + (awayStats.nonDangerousHeaderShots || 0),
    },
  ];

  // Data for Shot Outcome Comparison
  const shotOutcomeData = [
    {
      name: 'Foot On Target',
      [homeTeamName]: homeStats.footShotsOnTarget || 0,
      [awayTeamName]: awayStats.footShotsOnTarget || 0,
    },
    {
      name: 'Header On Target',
      [homeTeamName]: homeStats.headerShotsOnTarget || 0,
      [awayTeamName]: awayStats.headerShotsOnTarget || 0,
    },
    {
      name: 'Foot Total xG', // Sum of xG from dangerous and non-dangerous foot shots
      [homeTeamName]: parseFloat( ((homeStats.dangerousFootShots || 0) * 0.2 + (homeStats.nonDangerousFootShots || 0) * 0.05).toFixed(2)), // Simplified xG
      [awayTeamName]: parseFloat( ((awayStats.dangerousFootShots || 0) * 0.2 + (awayStats.nonDangerousFootShots || 0) * 0.05).toFixed(2)), // Simplified xG
    },
     {
      name: 'Header Total xG',
      [homeTeamName]: parseFloat( ((homeStats.dangerousHeaderShots || 0) * 0.15 + (homeStats.nonDangerousHeaderShots || 0) * 0.04).toFixed(2)), // Simplified xG
      [awayTeamName]: parseFloat( ((awayStats.dangerousHeaderShots || 0) * 0.15 + (awayStats.nonDangerousHeaderShots || 0) * 0.04).toFixed(2)), // Simplified xG
    },
  ];

  // Data for Action Success (Crosses)
  const crossActionData = [
    {
      name: 'Crosses', // Category for XAxis
      [`${homeTeamName} (Attempts)`]: homeStats.crosses || 0,
      [`${homeTeamName} (Successful)`]: homeStats.successfulCrosses || 0,
      [`${awayTeamName} (Attempts)`]: awayStats.crosses || 0,
      [`${awayTeamName} (Successful)`]: awayStats.successfulCrosses || 0,
    },
    // Can add Dribbles here if total attempted dribbles becomes available in TeamDetailedStats
  ];

  const renderGroupedBarChart = (title: string, data: any[], dataKeyX: string, barKeys: {key: string, name: string, color: string}[]) => (
    <div className="mb-6 p-3 border rounded">
      <h5 className="text-md font-semibold text-center mb-3">{title}</h5>
      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={Math.max(250, data.length * 80)}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKeyX} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => value.toLocaleString()} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {barKeys.map(bar => (
              <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={3} barSize={20} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Comparison Graphs</CardTitle>
        <CardDescription>Comparing various performance metrics between {homeTeamName} and {awayTeamName}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderGroupedBarChart("Shots by Body Part", shotTypeData, "name", [
          { key: homeTeamName, name: homeTeamName, color: chartConfig[homeTeamName].color },
          { key: awayTeamName, name: awayTeamName, color: chartConfig[awayTeamName].color },
        ])}

        {renderGroupedBarChart("Selected Shot Outcomes & xG", shotOutcomeData, "name", [
          { key: homeTeamName, name: homeTeamName, color: chartConfig[homeTeamName].color },
          { key: awayTeamName, name: awayTeamName, color: chartConfig[awayTeamName].color },
        ])}

        {renderGroupedBarChart("Action Success: Crosses", crossActionData, "name", [
           { key: `${homeTeamName} (Attempts)`, name: `${homeTeamName} (Attempts)`, color: chartConfig[`${homeTeamName} (Attempts)`].color },
           { key: `${homeTeamName} (Successful)`, name: `${homeTeamName} (Successful)`, color: chartConfig[`${homeTeamName} (Successful)`].color },
           { key: `${awayTeamName} (Attempts)`, name: `${awayTeamName} (Attempts)`, color: chartConfig[`${awayTeamName} (Attempts)`].color },
           { key: `${awayTeamName} (Successful)`, name: `${awayTeamName} (Successful)`, color: chartConfig[`${awayTeamName} (Successful)`].color },
        ])}
      </CardContent>
    </Card>
  );
};

export default PerformanceComparisonGraphs;
