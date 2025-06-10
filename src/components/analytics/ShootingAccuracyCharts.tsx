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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface ShootingAccuracyChartsProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

// Removed SimplePieChart placeholder

const chartColors = {
  'On Target': 'hsl(var(--chart-1))', // Blue
  'Off Target': 'hsl(var(--chart-2))', // Red/Pink
  'Hit Post': 'hsl(var(--chart-3))', // Yellow/Orange
  'Blocked': 'hsl(var(--chart-4))', // Gray/Purple
  'Dangerous': 'hsl(var(--chart-5))', // Darker Red/Another color
  'Non-Dangerous': 'hsl(var(--chart-1)/0.6)', // Lighter blue
};


const ShootingAccuracyCharts: React.FC<ShootingAccuracyChartsProps> = ({
  teamStats,
  teamName,
}) => {
  const totalFootShots = (teamStats.footShotsOnTarget || 0) + (teamStats.footShotsOffTarget || 0) + (teamStats.footShotsPostHits || 0) + (teamStats.footShotsBlocked || 0);
  const footShotOutcomeData = [
    { name: 'On Target', value: teamStats.footShotsOnTarget || 0, fill: chartColors['On Target'] },
    { name: 'Off Target', value: teamStats.footShotsOffTarget || 0, fill: chartColors['Off Target'] },
    { name: 'Hit Post', value: teamStats.footShotsPostHits || 0, fill: chartColors['Hit Post'] },
    { name: 'Blocked', value: teamStats.footShotsBlocked || 0, fill: chartColors['Blocked'] },
  ].filter(d => d.value > 0); // Filter out zero values for cleaner pie chart

  const totalHeaderShots = (teamStats.headerShotsOnTarget || 0) + (teamStats.headerShotsOffTarget || 0) + (teamStats.headerShotsPostHits || 0) + (teamStats.headerShotsBlocked || 0);
  const headerShotOutcomeData = [
    { name: 'On Target', value: teamStats.headerShotsOnTarget || 0, fill: chartColors['On Target'] },
    { name: 'Off Target', value: teamStats.headerShotsOffTarget || 0, fill: chartColors['Off Target'] },
    { name: 'Hit Post', value: teamStats.headerShotsPostHits || 0, fill: chartColors['Hit Post'] },
    { name: 'Blocked', value: teamStats.headerShotsBlocked || 0, fill: chartColors['Blocked'] },
  ].filter(d => d.value > 0);

  const totalDangerousFootShots = teamStats.dangerousFootShots || 0;
  const totalNonDangerousFootShots = teamStats.nonDangerousFootShots || 0;
  const footShotDangerData = [
    { name: 'Dangerous', value: totalDangerousFootShots, fill: chartColors['Dangerous'] },
    { name: 'Non-Dangerous', value: totalNonDangerousFootShots, fill: chartColors['Non-Dangerous'] },
  ].filter(d => d.value > 0);

  const totalDangerousHeaderShots = teamStats.dangerousHeaderShots || 0;
  const totalNonDangerousHeaderShots = teamStats.nonDangerousHeaderShots || 0;
  const headerShotDangerData = [
    { name: 'Dangerous', value: totalDangerousHeaderShots, fill: chartColors['Dangerous'] },
    { name: 'Non-Dangerous', value: totalNonDangerousHeaderShots, fill: chartColors['Non-Dangerous'] },
  ].filter(d => d.value > 0);

  const renderPieChart = (data: Array<{name: string; value: number; fill: string}>, title: string, totalCount: number) => {
    if (data.length === 0 || totalCount === 0) {
      return (
        <div className="text-center">
          <h4 className="font-semibold mb-2 text-sm">{title} (Total: {totalCount})</h4>
          <p className="text-xs text-muted-foreground">No data to display.</p>
        </div>
      );
    }
    return (
      <div className="text-center">
        <h4 className="font-semibold mb-2 text-sm">{title} (Total: {totalCount})</h4>
        <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false}
                   label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 1.3; // Label outside
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill={data[index].fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                          {`${name} (${value})`}
                        </text>
                      );
                    }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="name" />} />
              {/* <ChartLegend content={<ChartLegendContent nameKey="name" />} className="mt-4" /> */}
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shooting Accuracy Charts: {teamName}</CardTitle>
        <CardDescription>Analysis of shot outcomes and danger levels.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {renderPieChart(footShotOutcomeData, "Foot Shot Outcomes", totalFootShots)}
        {renderPieChart(headerShotOutcomeData, "Header Shot Outcomes", totalHeaderShots)}
        {renderPieChart(footShotDangerData, "Foot Shot Danger Levels", totalDangerousFootShots + totalNonDangerousFootShots)}
        {renderPieChart(headerShotDangerData, "Header Shot Danger Levels", totalDangerousHeaderShots + totalNonDangerousHeaderShots)}
      </CardContent>
    </Card>
  );
};

export default ShootingAccuracyCharts;
