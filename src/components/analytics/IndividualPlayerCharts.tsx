
import React from 'react';
import { PlayerStatSummary } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface IndividualPlayerChartsProps {
  playerStats: PlayerStatSummary[];
  selectedPlayerId: string | number | null;
}

const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-1)/0.8)",
    "hsl(var(--chart-2)/0.8)",
];

const IndividualPlayerCharts: React.FC<IndividualPlayerChartsProps> = ({
  playerStats,
  selectedPlayerId,
}) => {
  const selectedStat = playerStats.find(p => String(p.playerId) === String(selectedPlayerId));

  if (!selectedPlayerId || !selectedStat) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Individual Player Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select a player to view their detailed statistics charts.</p>
        </CardContent>
      </Card>
    );
  }

  const playerName = selectedStat.playerName || `Player ${selectedStat.playerId}`;

  const shootingData = [
    { name: 'Shots', value: selectedStat.shots || 0 },
    { name: 'On Target', value: selectedStat.shotsOnTarget || 0 },
    { name: 'xG', value: parseFloat((selectedStat.totalXg || 0).toFixed(2)) },
    { name: 'Foot Shots', value: (selectedStat.footShotsOnTarget || 0) + (selectedStat.footShotsOffTarget || 0) + (selectedStat.footShotsPostHits || 0) + (selectedStat.footShotsBlocked || 0) },
    { name: 'Header Shots', value: (selectedStat.headerShotsOnTarget || 0) + (selectedStat.headerShotsOffTarget || 0) + (selectedStat.headerShotsPostHits || 0) + (selectedStat.headerShotsBlocked || 0) },
    { name: 'Goals', value: selectedStat.goals || 0 },
  ].filter(d => d.value > 0 || d.name === 'xG');

  const passingData = [
    { name: 'Attempted', value: selectedStat.passesAttempted || 0 },
    { name: 'Completed', value: selectedStat.passesCompleted || 0 },
    { name: 'Support', value: selectedStat.supportPasses || 0 },
    { name: 'Decisive', value: selectedStat.decisivePasses || 0 },
    { name: 'Forward', value: selectedStat.forwardPasses || 0 },
    { name: 'Long', value: selectedStat.longPasses || 0 },
    { name: 'Assists', value: selectedStat.assists || 0 },
  ].filter(d => d.value > 0);

  const defensiveData = [
     { name: 'Tackles', value: selectedStat.tackles || 0 },
     { name: 'Interceptions', value: selectedStat.interceptions || 0 },
     { name: 'Recoveries', value: selectedStat.ballsRecovered || 0 },
     { name: 'Blocks', value: selectedStat.blocks || 0 },
     { name: 'Clearances', value: selectedStat.clearances || 0 },
     { name: 'Duels Won', value: selectedStat.duelsWon || 0 },
     { name: 'Aerial Duels Won', value: selectedStat.aerialDuelsWon || 0 },
  ].filter(d => d.value > 0);

  const generalActivityData = [
     { name: 'Dribbles', value: selectedStat.dribbles || 0 },
     { name: 'Succ. Dribbles', value: selectedStat.successfulDribbles || 0 },
     { name: 'Contacts', value: selectedStat.contacts || 0 },
     { name: 'Balls Played', value: selectedStat.ballsPlayed || 0 },
     { name: 'Balls Given', value: selectedStat.ballsGiven || 0 },
     { name: 'Fouls', value: selectedStat.foulsCommitted || 0 },
  ].filter(d => d.value > 0);

  const renderPlayerBarChart = (data: Array<{name: string; value: number }>, title: string) => {
    if (data.length === 0) {
      return <div className="text-center text-muted-foreground text-sm py-4">No {title.toLowerCase()} data.</div>;
    }
    return (
      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-md text-center">{title}</h4>
        <ChartContainer config={{ value: { label: "Value" } }} className="min-h-[200px] w-full aspect-[3/2]">
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={title.includes("xG")} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" interval={0} tick={{ fontSize: 10 }} width={80} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" radius={3} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Performance Charts: {playerName}</CardTitle>
        <CardDescription>Visual breakdown of key statistics for {selectedStat.team} team.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
        {renderPlayerBarChart(shootingData, "Shooting Stats")}
        {renderPlayerBarChart(passingData, "Passing Stats")}
        {renderPlayerBarChart(defensiveData, "Defensive Actions")}
        {renderPlayerBarChart(generalActivityData, "General Activity")}
      </CardContent>
    </Card>
  );
};

export default IndividualPlayerCharts;
