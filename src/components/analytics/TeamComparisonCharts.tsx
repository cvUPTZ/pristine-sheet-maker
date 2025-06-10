import React from 'react';
import { TeamDetailedStats } from '@/types'; // Assuming TeamDetailedStats is exported from index.ts
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Assuming a Chart component exists, or we'll use simple divs for bars
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Example if using Recharts

interface TeamComparisonChartsProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Simple Bar component for demonstration if no chart library is readily available or easy to use
const SimpleBar = ({ value, maxValue, label, color }: { value: number; maxValue: number; label: string; color: string }) => {
  const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex flex-col items-center mx-2">
      <div className="w-10 h-32 bg-gray-200 relative">
        <div
          className="absolute bottom-0 w-full"
          style={{ height: `${heightPercentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs mt-1">{label}</div>
      <div className="text-xs font-bold">{value}</div>
    </div>
  );
};

const TeamComparisonCharts: React.FC<TeamComparisonChartsProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const passData = [
    { name: 'Total Passes', [homeTeamName]: homeStats.passesAttempted || 0, [awayTeamName]: awayStats.passesAttempted || 0 },
    { name: 'Completed', [homeTeamName]: homeStats.passesCompleted || 0, [awayTeamName]: awayStats.passesCompleted || 0 },
    { name: 'Offensive', [homeTeamName]: homeStats.offensivePasses || 0, [awayTeamName]: awayStats.offensivePasses || 0 },
    { name: 'Support', [homeTeamName]: homeStats.supportPasses || 0, [awayTeamName]: awayStats.supportPasses || 0 },
  ];

  const ballControlData = [
    { name: 'Played', [homeTeamName]: homeStats.ballsPlayed || 0, [awayTeamName]: awayStats.ballsPlayed || 0 },
    { name: 'Recovered', [homeTeamName]: homeStats.ballsRecovered || 0, [awayTeamName]: awayStats.ballsRecovered || 0 },
    { name: 'Lost', [homeTeamName]: homeStats.ballsLost || 0, [awayTeamName]: awayStats.ballsLost || 0 },
  ];

  const shootingData = [
    { name: 'Total Shots', [homeTeamName]: homeStats.shots || 0, [awayTeamName]: awayStats.shots || 0 },
    { name: 'On Target', [homeTeamName]: homeStats.shotsOnTarget || 0, [awayTeamName]: awayStats.shotsOnTarget || 0 },
    { name: 'xG', [homeTeamName]: parseFloat((homeStats.totalXg || 0).toFixed(2)), [awayTeamName]: parseFloat((awayStats.totalXg || 0).toFixed(2)) },
  ];

  const duelData = [
    { name: 'Duels Won', [homeTeamName]: homeStats.duelsWon || 0, [awayTeamName]: awayStats.duelsWon || 0 },
    { name: 'Aerial Duels Won', [homeTeamName]: homeStats.aerialDuelsWon || 0, [awayTeamName]: awayStats.aerialDuelsWon || 0 },
  ];

  const renderComparisonSection = (title: string, data: Array<{[key: string]: string | number }>) => {
    // Find max value for scaling SimpleBar if used
    let overallMaxValue = 0;
    data.forEach(item => {
        overallMaxValue = Math.max(overallMaxValue, item[homeTeamName] as number, item[awayTeamName] as number);
    });
    overallMaxValue = Math.max(1, overallMaxValue); // Ensure max value is at least 1

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-md">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-around">
          {data.map((item) => (
            <div key={item.name as string} className="m-2 p-2 border rounded text-center">
              <h5 className="text-sm font-semibold mb-2">{item.name}</h5>
              <div className="flex justify-center">
                <SimpleBar value={item[homeTeamName] as number} maxValue={overallMaxValue} label={homeTeamName} color="lightblue" />
                <SimpleBar value={item[awayTeamName] as number} maxValue={overallMaxValue} label={awayTeamName} color="lightcoral" />
              </div>
            </div>
          ))}
          {/* Placeholder for actual chart component if available
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={homeTeamName} fill="#8884d8" />
              <Bar dataKey={awayTeamName} fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
          */}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Team Comparison</h3>
      {renderComparisonSection("Passing Comparison", passData)}
      {renderComparisonSection("Ball Control", ballControlData)}
      {renderComparisonSection("Shooting Comparison", shootingData)}
      {renderComparisonSection("Duels Comparison", duelData)}
    </div>
  );
};

export default TeamComparisonCharts;
