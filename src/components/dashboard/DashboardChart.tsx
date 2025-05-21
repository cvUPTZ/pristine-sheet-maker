
import React from 'react';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent, 
} from '@/components/ui/chart';
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Legend, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';

interface DashboardChartProps {
  matches: any[];
}

const DashboardChart: React.FC<DashboardChartProps> = ({ matches }) => {
  const prepareChartData = () => {
    if (!matches.length) return [];
    
    return matches.slice(0, 5).map(match => {
      const homeGoals = match.statistics?.shots?.home?.onTarget || 0;
      const awayGoals = match.statistics?.shots?.away?.onTarget || 0;
      const homePasses = match.statistics?.passes?.home?.successful || 0;
      const awayPasses = match.statistics?.passes?.away?.successful || 0;
      
      return {
        name: `${match.homeTeam.name.substring(0, 3)} vs ${match.awayTeam.name.substring(0, 3)}`,
        homeGoals,
        awayGoals,
        homePasses: Math.min(homePasses, 100), // Cap for better visualization
        awayPasses: Math.min(awayPasses, 100), // Cap for better visualization
        matchId: match.id,
      };
    }).reverse(); // Show most recent matches on the right
  };

  const chartData = prepareChartData();
  
  const chartConfig = {
    goals: {
      label: "Goals",
      theme: {
        light: "#1A365D",
        dark: "#D3212C",
      },
    },
    passes: {
      label: "Passes",
      theme: {
        light: "#3a8d45",
        dark: "#6a9b6d",
      },
    },
  };
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-md">
        <p className="text-muted-foreground">No match data available</p>
      </div>
    );
  }
  
  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar yAxisId="left" dataKey="homeGoals" name="Home Goals" fill="#1A365D" />
          <Bar yAxisId="left" dataKey="awayGoals" name="Away Goals" fill="#D3212C" />
          <Bar yAxisId="right" dataKey="homePasses" name="Home Passes" fill="#3a8d45" />
          <Bar yAxisId="right" dataKey="awayPasses" name="Away Passes" fill="#6a9b6d" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <ChartTooltipContent>
      <div className="bg-white p-2 rounded-md shadow-md border text-sm">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    </ChartTooltipContent>
  );
};

export default DashboardChart;
