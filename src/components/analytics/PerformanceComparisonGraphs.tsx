import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface PerformanceComparisonGraphsProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Simple Bar component for demonstration (can be reused or use a centralized one if available)
const SimpleComparisonBarGraph = ({ data, homeKey, awayKey, dataKey, title, homeColor, awayColor }: {
  data: any[]; homeKey: string; awayKey: string; dataKey: string; title: string; homeColor: string; awayColor: string;
}) => {
  return (
    <div className="mb-6 p-3 border rounded">
      <h5 className="text-md font-semibold text-center mb-3">{title}</h5>
      {/* This is a placeholder for a grouped bar chart.
          A real chart library would render bars side-by-side for each category.
          Here, we'll just list the data for simplicity. */}
      {data.map(item => (
        <div key={item[dataKey]} className="mb-2 text-sm">
          <p className="font-medium">{item[dataKey]}:</p>
          <div className="flex justify-between">
            <span style={{ color: homeColor }}>{homeTeamName}: {item[homeKey]}</span>
            <span style={{ color: awayColor }}>{awayTeamName}: {item[awayKey]}</span>
          </div>
        </div>
      ))}
       {/* Example of how Recharts might be used:
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={homeKey} name={homeTeamName} fill={homeColor} />
          <Bar dataKey={awayKey} name={awayTeamName} fill={awayColor} />
        </BarChart>
      </ResponsiveContainer>
      */}
    </div>
  );
};

const PerformanceComparisonGraphs: React.FC<PerformanceComparisonGraphsProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  // Data for Shot Type Comparison (Foot vs Header)
  const shotTypeData = [
    {
      type: 'Foot Shots',
      [homeTeamName]: (homeStats.dangerousFootShots || 0) + (homeStats.nonDangerousFootShots || 0),
      [awayTeamName]: (awayStats.dangerousFootShots || 0) + (awayStats.nonDangerousFootShots || 0),
    },
    {
      type: 'Header Shots',
      [homeTeamName]: (homeStats.dangerousHeaderShots || 0) + (homeStats.nonDangerousHeaderShots || 0),
      [awayTeamName]: (awayStats.dangerousHeaderShots || 0) + (awayStats.nonDangerousHeaderShots || 0),
    },
  ];

  // Data for Shot Outcome Comparison (e.g., On Target for Foot vs Header)
  const shotOutcomeData = [
    {
      outcome: 'Foot On Target',
      [homeTeamName]: homeStats.footShotsOnTarget || 0,
      [awayTeamName]: awayStats.footShotsOnTarget || 0,
    },
    {
      outcome: 'Header On Target',
      [homeTeamName]: homeStats.headerShotsOnTarget || 0,
      [awayTeamName]: awayStats.headerShotsOnTarget || 0,
    },
    {
      outcome: 'Foot xG',
      [homeTeamName]: parseFloat(((homeStats.dangerousFootShots || 0) * 0.2 + (homeStats.nonDangerousFootShots || 0) * 0.05).toFixed(2)), // Simplified xG calc for demo
      [awayTeamName]: parseFloat(((awayStats.dangerousFootShots || 0) * 0.2 + (awayStats.nonDangerousFootShots || 0) * 0.05).toFixed(2)),
    },
     {
      outcome: 'Header xG',
      [homeTeamName]: parseFloat(((homeStats.dangerousHeaderShots || 0) * 0.15 + (homeStats.nonDangerousHeaderShots || 0) * 0.04).toFixed(2)), // Simplified xG
      [awayTeamName]: parseFloat(((awayStats.dangerousHeaderShots || 0) * 0.15 + (awayStats.nonDangerousHeaderShots || 0) * 0.04).toFixed(2)),
    },
  ];

  // Successful vs Attempted (using available data)
  const actionSuccessData = [
    {
      action: 'Crosses',
      [homeTeamName + ' Success']: homeStats.successfulCrosses || 0,
      [homeTeamName + ' Attempts']: homeStats.crosses || 0, // Total attempted crosses
      [awayTeamName + ' Success']: awayStats.successfulCrosses || 0,
      [awayTeamName + ' Attempts']: awayStats.crosses || 0,
    },
    // Add dribbles if 'totalDribblesAttempted' becomes available in TeamDetailedStats
    // {
    //   action: 'Dribbles',
    //   [homeTeamName + ' Success']: homeStats.successfulDribbles || 0,
    //   [homeTeamName + ' Attempts']: homeStats.totalDribblesAttempted || 0,
    //   [awayTeamName + ' Success']: awayStats.successfulDribbles || 0,
    //   [awayTeamName + ' Attempts']: awayStats.totalDribblesAttempted || 0,
    // }
  ];


  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Comparison Graphs</CardTitle>
        <CardDescription>Comparing various performance metrics between {homeTeamName} and {awayTeamName}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SimpleComparisonBarGraph
          title="Shots by Body Part"
          data={shotTypeData}
          dataKey="type"
          homeKey={homeTeamName}
          awayKey={awayTeamName}
          homeColor="lightblue"
          awayColor="lightcoral"
        />
        <SimpleComparisonBarGraph
          title="Shot Outcomes & xG (Selected)"
          data={shotOutcomeData}
          dataKey="outcome"
          homeKey={homeTeamName}
          awayKey={awayTeamName}
          homeColor="skyblue"
          awayColor="salmon"
        />

        {/* For actionSuccessData, a more complex grouped bar chart would be needed in a real scenario */}
        <div className="mb-6 p-3 border rounded">
            <h5 className="text-md font-semibold text-center mb-3">Action Success (Crosses)</h5>
            {actionSuccessData.map(item => (
                <div key={item.action} className="mb-2 text-sm">
                    <p className="font-medium">{item.action}:</p>
                    <div className="flex justify-between">
                        <span>{homeTeamName}: {item[homeTeamName + ' Success']} / {item[homeTeamName + ' Attempts']}</span>
                        <span>{awayTeamName}: {item[awayTeamName + ' Success']} / {item[awayTeamName + ' Attempts']}</span>
                    </div>
                </div>
            ))}
        </div>

      </CardContent>
    </Card>
  );
};

export default PerformanceComparisonGraphs;
