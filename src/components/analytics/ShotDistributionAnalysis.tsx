import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ShotDistributionAnalysisProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

// Simple Bar component for demonstration
const SimpleBarDisplay = ({ value, maxValue, label, barColor }: { value: number; maxValue: number; label:string; barColor: string; }) => {
  const widthPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded h-4">
        <div
          className="h-4 rounded"
          style={{ width: `${widthPercentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};


const ShotDistributionAnalysis: React.FC<ShotDistributionAnalysisProps> = ({
  teamStats,
  teamName,
}) => {
  const totalFootShots = (teamStats.dangerousFootShots || 0) + (teamStats.nonDangerousFootShots || 0);
  // Note: footShotsOnTarget + footShotsOffTarget + footShotsPostHits + footShotsBlocked should also sum to totalFootShots if data is consistent.
  // Using dangerous + nonDangerous as the primary sum for total foot shots here.

  const totalHeaderShots = (teamStats.dangerousHeaderShots || 0) + (teamStats.nonDangerousHeaderShots || 0);
  const totalShots = teamStats.shots || 0; // This should be the grand total

  const bodyPartData = [
    { label: 'Foot Shots', value: totalFootShots, color: '#3b82f6' }, // blue
    { label: 'Header Shots', value: totalHeaderShots, color: '#16a34a' }, // green
    { label: 'Other Shots (if any)', value: totalShots - totalFootShots - totalHeaderShots, color: '#71717a'} // gray
  ];
  const maxBodyPartValue = Math.max(...bodyPartData.map(d => d.value), 1);


  const outcomeData = [
    { label: 'On Target (All)', value: teamStats.shotsOnTarget || 0, color: '#16a34a' },
    { label: 'Off Target (All)', value: (teamStats.footShotsOffTarget || 0) + (teamStats.headerShotsOffTarget || 0), color: '#ef4444' },
    { label: 'Hit Post (All)', value: (teamStats.footShotsPostHits || 0) + (teamStats.headerShotsPostHits || 0), color: '#eab308' },
    { label: 'Blocked (All)', value: (teamStats.footShotsBlocked || 0) + (teamStats.headerShotsBlocked || 0), color: '#71717a' },
  ];
   const maxOutcomeValue = Math.max(...outcomeData.map(d => d.value), 1);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Shot Distribution Analysis: {teamName}</CardTitle>
        <CardDescription>Breakdown of shots by body part and outcome.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h4 className="font-semibold text-md mb-3">Shots by Body Part (Total: {totalShots})</h4>
          {bodyPartData.map(item => (
            <SimpleBarDisplay
              key={item.label}
              label={item.label}
              value={item.value}
              maxValue={maxBodyPartValue}
              barColor={item.color}
            />
          ))}
        </div>

        <div>
          <h4 className="font-semibold text-md mb-3">Shots by Outcome (Total: {totalShots})</h4>
           {outcomeData.map(item => (
            <SimpleBarDisplay
              key={item.label}
              label={item.label}
              value={item.value}
              maxValue={maxOutcomeValue}
              barColor={item.color}
            />
          ))}
        </div>

        <div className="mt-6">
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
