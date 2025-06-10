import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PassDirectionAnalysisProps {
  teamStats: TeamDetailedStats;
  teamName: string;
}

// Simple Bar component for demonstration
const SimpleBarForPasses = ({ value, maxValue, label, barColor }: { value: number; maxValue: number; label:string; barColor: string; }) => {
  const widthPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded h-5">
        <div
          className="h-5 rounded flex items-center justify-center text-white text-xs"
          style={{ width: `${widthPercentage}%`, backgroundColor: barColor }}
        >
          {value} ({widthPercentage.toFixed(0)}%)
        </div>
      </div>
    </div>
  );
};

const PassDirectionAnalysis: React.FC<PassDirectionAnalysisProps> = ({
  teamStats,
  teamName,
}) => {
  const passDirectionData = [
    { name: 'Forward Passes', value: teamStats.forwardPasses || 0, color: '#22c55e' }, // green
    { name: 'Backward Passes', value: teamStats.backwardPasses || 0, color: '#ef4444' }, // red
    { name: 'Lateral Passes', value: teamStats.lateralPasses || 0, color: '#3b82f6' },  // blue
    { name: 'Long Passes', value: teamStats.longPasses || 0, color: '#eab308' },     // yellow
    // Note: Offensive and Support passes might overlap with these categories or be a separate classification
    // For this chart, focusing on directional/length based types explicitly listed.
  ];

  const totalDirectionalPasses = passDirectionData.reduce((sum, item) => sum + item.value, 0);
  // If using totalCompletedPasses, ensure it makes sense contextually for these categories
  // const totalCompletedPasses = teamStats.passesCompleted || 0;
  // Using totalDirectionalPasses as maxValue ensures bars are relative to each other in this specific grouping.

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pass Type & Direction Analysis: {teamName}</CardTitle>
        <CardDescription>Distribution of different pass types.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h4 className="font-semibold text-md mb-3">Pass Distribution (Total: {totalDirectionalPasses})</h4>
          {passDirectionData.map(pass => (
            <SimpleBarForPasses
              key={pass.name}
              label={pass.name}
              value={pass.value}
              maxValue={totalDirectionalPasses} // Or use teamStats.passesCompleted if these are exclusive subsets
              barColor={pass.color}
            />
          ))}
        </div>
        {/*
        Placeholder for Pie Chart:
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={passDirectionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false}
                 label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                        {`${passDirectionData[index].name} (${(percent * 100).toFixed(0)}%)`}
                      </text>
                    );
                 }}>
              {passDirectionData.map((entry, index) => (
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

export default PassDirectionAnalysis;
