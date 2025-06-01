
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { PlayerStatistics } from '@/types';

interface PlayerPerformanceChartProps {
  playerStats: PlayerStatistics[];
  homeTeamName: string;
  awayTeamName: string;
}

const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({
  playerStats,
  homeTeamName,
  awayTeamName,
}) => {
  const chartData = playerStats.map(player => ({
    name: player.playerName,
    team: player.team,
    passes: player.events.passes.attempted,
    passAccuracy: player.events.passes.attempted > 0 
      ? Math.round((player.events.passes.successful / player.events.passes.attempted) * 100) 
      : 0,
    shots: player.events.shots.onTarget + player.events.shots.offTarget,
    goals: player.events.goals,
    fouls: player.events.fouls,
    performance: (player.events.goals * 10) + (player.events.passes.successful * 0.5) + (player.events.shots.onTarget * 2) - (player.events.fouls * 1)
  }));

  const homeTeamData = chartData.filter(p => p.team === 'home');
  const awayTeamData = chartData.filter(p => p.team === 'away');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Player Pass Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="passAccuracy" 
                  fill="#8884d8" 
                  name="Pass Accuracy (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Player Performance Index</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="performance" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Performance Index"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Team Comparison - Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="passes" fill="#8884d8" name="Passes" />
                <Bar dataKey="shots" fill="#82ca9d" name="Shots" />
                <Bar dataKey="goals" fill="#ffc658" name="Goals" />
                <Bar dataKey="fouls" fill="#ff7c7c" name="Fouls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerPerformanceChart;
