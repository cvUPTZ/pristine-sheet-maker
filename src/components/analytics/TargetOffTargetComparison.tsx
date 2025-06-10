import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Example

interface TargetOffTargetComparisonProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Simple Bar component for demonstration
const SimpleComparisonBar = ({ homeValue, awayValue, maxValue, label, homeColor, awayColor }: {
  homeValue: number; awayValue: number; maxValue: number; label: string; homeColor: string; awayColor: string;
}) => {
  const homeHeightPercentage = maxValue > 0 ? (homeValue / maxValue) * 100 : 0;
  const awayHeightPercentage = maxValue > 0 ? (awayValue / maxValue) * 100 : 0;

  return (
    <div className="flex flex-col items-center mx-2 p-2 border rounded" style={{width: '150px'}}>
      <div className="text-sm font-semibold mb-2 h-10 flex items-center justify-center text-center">{label}</div>
      <div className="flex justify-around w-full items-end h-32">
        <div className="flex flex-col items-center">
          <div className="w-10 bg-gray-200 relative" style={{ height: '100%'}}>
            <div
              className="absolute bottom-0 w-full"
              style={{ height: `${homeHeightPercentage}%`, backgroundColor: homeColor }}
            />
          </div>
          <div className="text-xs mt-1">Home</div>
          <div className="text-xs font-bold">{homeValue}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 bg-gray-200 relative" style={{ height: '100%'}}>
            <div
              className="absolute bottom-0 w-full"
              style={{ height: `${awayHeightPercentage}%`, backgroundColor: awayColor }}
            />
          </div>
          <div className="text-xs mt-1">Away</div>
          <div className="text-xs font-bold">{awayValue}</div>
        </div>
      </div>
    </div>
  );
};


const TargetOffTargetComparison: React.FC<TargetOffTargetComparisonProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const comparisonData = [
    {
      label: 'Foot Shots On Target',
      homeValue: homeStats.footShotsOnTarget || 0,
      awayValue: awayStats.footShotsOnTarget || 0,
    },
    {
      label: 'Foot Shots Off Target',
      homeValue: homeStats.footShotsOffTarget || 0,
      awayValue: awayStats.footShotsOffTarget || 0,
    },
    {
      label: 'Header Shots On Target',
      homeValue: homeStats.headerShotsOnTarget || 0,
      awayValue: awayStats.headerShotsOnTarget || 0,
    },
    {
      label: 'Header Shots Off Target',
      homeValue: homeStats.headerShotsOffTarget || 0,
      awayValue: awayStats.headerShotsOffTarget || 0,
    },
    {
      label: 'Foot Shots Hit Post',
      homeValue: homeStats.footShotsPostHits || 0,
      awayValue: awayStats.footShotsPostHits || 0,
    },
    {
      label: 'Header Shots Hit Post',
      homeValue: homeStats.headerShotsPostHits || 0,
      awayValue: awayStats.headerShotsPostHits || 0,
    },
    {
      label: 'Foot Shots Blocked',
      homeValue: homeStats.footShotsBlocked || 0,
      awayValue: awayStats.footShotsBlocked || 0,
    },
    {
      label: 'Header Shots Blocked',
      homeValue: homeStats.headerShotsBlocked || 0,
      awayValue: awayStats.headerShotsBlocked || 0,
    },
  ];

  const overallMaxValue = Math.max(...comparisonData.map(d => Math.max(d.homeValue, d.awayValue)), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shot Outcome Comparison: {homeTeamName} vs {awayTeamName}</CardTitle>
        <CardDescription>Comparing shots on target, off target, post hits, and blocked shots for foot and header.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap justify-center">
        {comparisonData.map(stat => (
          <SimpleComparisonBar
            key={stat.label}
            label={stat.label}
            homeValue={stat.homeValue}
            awayValue={stat.awayValue}
            maxValue={overallMaxValue}
            homeColor="lightblue"
            awayColor="lightcoral"
          />
        ))}
        {/* Placeholder for actual grouped bar chart
         <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartCompatibleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="homeValue" name={homeTeamName} fill="#8884d8" />
            <Bar dataKey="awayValue" name={awayTeamName} fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default TargetOffTargetComparison;
