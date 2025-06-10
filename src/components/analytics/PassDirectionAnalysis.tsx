import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface PassDirectionAnalysisProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

// Removed SimpleBarForPasses

const chartColors = {
  'Forward Passes': 'hsl(var(--chart-1))',
  'Backward Passes': 'hsl(var(--chart-2))',
  'Lateral Passes': 'hsl(var(--chart-3))',
  'Long Passes': 'hsl(var(--chart-4))',
  'Support Passes': 'hsl(var(--chart-5))', // Added for completeness if desired
  'Offensive Passes': 'hsl(var(--chart-1)/0.8)', // Added for completeness
};

const PassDirectionAnalysis: React.FC<PassDirectionAnalysisProps> = ({
  teamStats,
  teamName,
}) => {
  const passData = [
    { name: 'Forward', value: teamStats.forwardPasses || 0, fill: chartColors['Forward Passes'] },
    { name: 'Backward', value: teamStats.backwardPasses || 0, fill: chartColors['Backward Passes'] },
    { name: 'Lateral', value: teamStats.lateralPasses || 0, fill: chartColors['Lateral Passes'] },
    { name: 'Long', value: teamStats.longPasses || 0, fill: chartColors['Long Passes'] },
    { name: 'Support', value: teamStats.supportPasses || 0, fill: chartColors['Support Passes'] },
    { name: 'Offensive', value: teamStats.offensivePasses || 0, fill: chartColors['Offensive Passes'] },
  ].filter(d => d.value > 0); // Filter out zero values

  const totalPassesInChart = passData.reduce((sum, item) => sum + item.value, 0);

  if (passData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pass Type Analysis: {teamName}</CardTitle>
          <CardDescription>Distribution of different pass types.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">No pass data for these categories.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pass Type Analysis: {teamName}</CardTitle>
        <CardDescription>Distribution of different pass types (Successful Counts). Total in chart: {totalPassesInChart}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="min-h-[250px] w-full aspect-[4/3]">
          <ResponsiveContainer width="100%" height={Math.max(250, passData.length * 50)}>
            <BarChart data={passData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={100} interval={0} tick={{ fontSize: 10 }} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              {/* No legend needed for single bar with cells, or if using distinct bars per type */}
              <Bar dataKey="value" radius={4} barSize={25}>
                {passData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || '#8884d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PassDirectionAnalysis;
