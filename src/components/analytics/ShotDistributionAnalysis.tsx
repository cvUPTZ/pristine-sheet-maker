import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';


interface ShotDistributionAnalysisProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

// Removed SimpleBarDisplay

const chartColors = {
  'Foot Shots': 'hsl(var(--chart-1))',
  'Header Shots': 'hsl(var(--chart-2))',
  'Other Shots': 'hsl(var(--chart-3))',
  'On Target (All)': 'hsl(var(--chart-1))',
  'Off Target (All)': 'hsl(var(--chart-2))',
  'Hit Post (All)': 'hsl(var(--chart-3))',
  'Blocked (All)': 'hsl(var(--chart-4))',
};


const ShotDistributionAnalysis: React.FC<ShotDistributionAnalysisProps> = ({
  teamStats,
  teamName,
}) => {
  const totalFootShots = (teamStats.footShotsOnTarget || 0) + (teamStats.footShotsOffTarget || 0) + (teamStats.footShotsPostHits || 0) + (teamStats.footShotsBlocked || 0);
  const totalHeaderShots = (teamStats.headerShotsOnTarget || 0) + (teamStats.headerShotsOffTarget || 0) + (teamStats.headerShotsPostHits || 0) + (teamStats.headerShotsBlocked || 0);
  const totalShots = teamStats.shots || 0;
  const otherShots = Math.max(0, totalShots - totalFootShots - totalHeaderShots);


  const bodyPartData = [
    { name: 'Foot Shots', count: totalFootShots, fill: chartColors['Foot Shots'] },
    { name: 'Header Shots', count: totalHeaderShots, fill: chartColors['Header Shots'] },
    { name: 'Other Shots', count: otherShots, fill: chartColors['Other Shots'] },
  ].filter(d => d.count > 0);

  const outcomeData = [
    { name: 'On Target', count: teamStats.shotsOnTarget || 0, fill: chartColors['On Target (All)'] },
    { name: 'Off Target', count: (teamStats.footShotsOffTarget || 0) + (teamStats.headerShotsOffTarget || 0), fill: chartColors['Off Target (All)'] },
    { name: 'Hit Post', count: (teamStats.footShotsPostHits || 0) + (teamStats.headerShotsPostHits || 0), fill: chartColors['Hit Post (All)'] },
    { name: 'Blocked', count: (teamStats.footShotsBlocked || 0) + (teamStats.headerShotsBlocked || 0), fill: chartColors['Blocked (All)'] },
  ].filter(d => d.count > 0);

  const renderBarChart = (data: Array<{name: string; count: number; fill: string}>, title: string, totalForTitle: number) => {
     if (data.length === 0) {
      return (
        <div className="text-center">
          <h4 className="font-semibold text-md mb-3">{title} (Total: {totalForTitle})</h4>
          <p className="text-xs text-muted-foreground">No data to display.</p>
        </div>
      );
    }
    return (
      <div className="mb-6">
        <h4 className="font-semibold text-md mb-3 text-center">{title} (Total: {totalForTitle})</h4>
        <ChartContainer config={{}} className="min-h-[200px] w-full aspect-[4/3]">
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" interval={0} tick={{ fontSize: 10 }} width={80} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="count" radius={4} barSize={25}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shot Distribution Analysis: {teamName}</CardTitle>
        <CardDescription>Breakdown of shots by body part and outcome.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderBarChart(bodyPartData, "Shots by Body Part", totalShots)}
          {renderBarChart(outcomeData, "Shots by Overall Outcome", totalShots)}
        </div>

        <div className="mt-8"> {/* Increased margin-top for separation */}
            <h4 className="font-semibold text-md mb-3">Detailed Shot Counts Table</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow><TableCell>Total Shots</TableCell><TableCell className="text-right">{teamStats.shots || 0}</TableCell></TableRow>
                    <TableRow><TableCell>Total Foot Shots</TableCell><TableCell className="text-right">{totalFootShots}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Dangerous Foot Shots</TableCell><TableCell className="text-right">{teamStats.dangerousFootShots || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Non-Dangerous Foot Shots</TableCell><TableCell className="text-right">{teamStats.nonDangerousFootShots || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Foot Shots On Target</TableCell><TableCell className="text-right">{teamStats.footShotsOnTarget || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Foot Shots Off Target</TableCell><TableCell className="text-right">{teamStats.footShotsOffTarget || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Foot Shots Hit Post</TableCell><TableCell className="text-right">{teamStats.footShotsPostHits || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Foot Shots Blocked</TableCell><TableCell className="text-right">{teamStats.footShotsBlocked || 0}</TableCell></TableRow>

                    <TableRow><TableCell>Total Header Shots</TableCell><TableCell className="text-right">{totalHeaderShots}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Dangerous Header Shots</TableCell><TableCell className="text-right">{teamStats.dangerousHeaderShots || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Non-Dangerous Header Shots</TableCell><TableCell className="text-right">{teamStats.nonDangerousHeaderShots || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Header Shots On Target</TableCell><TableCell className="text-right">{teamStats.headerShotsOnTarget || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Header Shots Off Target</TableCell><TableCell className="text-right">{teamStats.headerShotsOffTarget || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Header Shots Hit Post</TableCell><TableCell className="text-right">{teamStats.headerShotsPostHits || 0}</TableCell></TableRow>
                    <TableRow><TableCell>&nbsp;&nbsp;&nbsp;- Header Shots Blocked</TableCell><TableCell className="text-right">{teamStats.headerShotsBlocked || 0}</TableCell></TableRow>
                </TableBody>
            </Table>
        </div>

      </CardContent>
    </Card>
  );
};

export default ShotDistributionAnalysis;
