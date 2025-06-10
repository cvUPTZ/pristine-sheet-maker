import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Placeholder for chart imports, e.g., from Recharts or a custom chart component
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ShootingAccuracyChartsProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

// Simple Pie Chart Placeholder
const SimplePieChart = ({ data, title }: { data: Array<{ name: string; value: number; color: string }>, title: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">No data for {title}</p>;

  return (
    <div className="m-2 p-2 border rounded text-center" style={{ width: '200px' }}>
      <h5 className="text-sm font-semibold mb-2">{title}</h5>
      <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center bg-gray-200 relative overflow-hidden">
        {/* This is a very basic visual representation, not a real pie chart */}
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          // This simplified version just lists percentages, a real pie would draw segments
          return (
            <div key={index} className="text-xs" style={{ color: item.color }}>
              {item.name}: {item.value} ({percentage.toFixed(1)}%)
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-1">
        {data.map(item => (
          <div key={item.name} className="flex items-center justify-center text-xs">
            <span className="w-3 h-3 mr-1" style={{ backgroundColor: item.color }}></span>
            {item.name}: {item.value}
          </div>
        ))}
      </div>
    </div>
  );
};


const ShootingAccuracyCharts: React.FC<ShootingAccuracyChartsProps> = ({
  teamStats,
  teamName,
}) => {
  const totalFootShots = (teamStats.footShotsOnTarget || 0) + (teamStats.footShotsOffTarget || 0) + (teamStats.footShotsPostHits || 0) + (teamStats.footShotsBlocked || 0);
  const footShotOutcomeData = [
    { name: 'On Target', value: teamStats.footShotsOnTarget || 0, color: '#16a34a' }, // green
    { name: 'Off Target', value: teamStats.footShotsOffTarget || 0, color: '#ef4444' }, // red
    { name: 'Hit Post', value: teamStats.footShotsPostHits || 0, color: '#eab308' },   // yellow
    { name: 'Blocked', value: teamStats.footShotsBlocked || 0, color: '#71717a' },   // gray
  ];

  const totalHeaderShots = (teamStats.headerShotsOnTarget || 0) + (teamStats.headerShotsOffTarget || 0) + (teamStats.headerShotsPostHits || 0) + (teamStats.headerShotsBlocked || 0);
  const headerShotOutcomeData = [
    { name: 'On Target', value: teamStats.headerShotsOnTarget || 0, color: '#16a34a' },
    { name: 'Off Target', value: teamStats.headerShotsOffTarget || 0, color: '#ef4444' },
    { name: 'Hit Post', value: teamStats.headerShotsPostHits || 0, color: '#eab308' },
    { name: 'Blocked', value: teamStats.headerShotsBlocked || 0, color: '#71717a' },
  ];

  const footShotDangerData = [
    { name: 'Dangerous', value: teamStats.dangerousFootShots || 0, color: '#dc2626' }, // darker red
    { name: 'Non-Dangerous', value: teamStats.nonDangerousFootShots || 0, color: '#3b82f6' }, // blue
  ];

  const headerShotDangerData = [
    { name: 'Dangerous', value: teamStats.dangerousHeaderShots || 0, color: '#dc2626' },
    { name: 'Non-Dangerous', value: teamStats.nonDangerousHeaderShots || 0, color: '#3b82f6' },
  ];


  return (
    <Card>
      <CardHeader>
        <CardTitle>Shooting Accuracy Charts: {teamName}</CardTitle>
        <CardDescription>Analysis of shot outcomes and danger levels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2 text-center">Foot Shot Outcomes (Total: {totalFootShots})</h4>
          <div className="flex flex-wrap justify-around">
            <SimplePieChart data={footShotOutcomeData} title="Foot Shot Outcomes" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-center">Header Shot Outcomes (Total: {totalHeaderShots})</h4>
           <div className="flex flex-wrap justify-around">
            <SimplePieChart data={headerShotOutcomeData} title="Header Shot Outcomes" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-center">Foot Shot Danger Levels (Total Dangerous: {teamStats.dangerousFootShots || 0})</h4>
           <div className="flex flex-wrap justify-around">
            <SimplePieChart data={footShotDangerData} title="Foot Shot Danger" />
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-center">Header Shot Danger Levels (Total Dangerous: {teamStats.dangerousHeaderShots || 0})</h4>
           <div className="flex flex-wrap justify-around">
            <SimplePieChart data={headerShotDangerData} title="Header Shot Danger" />
          </div>
        </div>
         {/*
        Placeholder for actual chart components e.g. using Recharts PieChart:
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={footShotOutcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {footShotOutcomeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default ShootingAccuracyCharts;
