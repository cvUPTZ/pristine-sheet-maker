import React from 'react';
import { TeamDetailedStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AdvancedEfficiencyRatioChartsProps {
  homeStats: TeamDetailedStats;
  awayStats: TeamDetailedStats;
  homeTeamName: string;
  awayTeamName: string;
}

// Simple Bar component for demonstration
const SimpleRatioBar = ({ label, homeValue, awayValue, unit = '' }: { label: string; homeValue: number; awayValue: number; unit?: string }) => {
  const maxValue = Math.max(homeValue, awayValue, 1); // Ensure max is at least 1 for scaling
  const homePercentage = (homeValue / maxValue) * 100;
  const awayPercentage = (awayValue / maxValue) * 100;

  return (
    <div className="mb-4 p-2 border rounded">
      <h5 className="text-sm font-semibold text-center mb-2">{label}</h5>
      <div className="flex items-center mb-1">
        <span className="text-xs w-1/4 pr-1 text-right">{homeTeamName}:</span>
        <div className="w-3/4 bg-gray-200 rounded h-4">
          <div style={{ width: `${homePercentage}%`, backgroundColor: 'lightblue' }} className="h-4 rounded"></div>
        </div>
        <span className="text-xs pl-1">{homeValue.toFixed(2)}{unit}</span>
      </div>
      <div className="flex items-center">
        <span className="text-xs w-1/4 pr-1 text-right">{awayTeamName}:</span>
        <div className="w-3/4 bg-gray-200 rounded h-4">
          <div style={{ width: `${awayPercentage}%`, backgroundColor: 'lightcoral' }} className="h-4 rounded"></div>
        </div>
        <span className="text-xs pl-1">{awayValue.toFixed(2)}{unit}</span>
      </div>
    </div>
  );
};


const AdvancedEfficiencyRatioCharts: React.FC<AdvancedEfficiencyRatioChartsProps> = ({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}) => {
  const calculateRatio = (numerator: number, denominator: number): number => {
    return denominator > 0 ? numerator / denominator : 0;
  };

  const homeBallLossRatio = calculateRatio(homeStats.ballsLost || 0, homeStats.ballsPlayed || 0) * 100; // as percentage
  const awayBallLossRatio = calculateRatio(awayStats.ballsLost || 0, awayStats.ballsPlayed || 0) * 100;

  // Recovery Efficiency: Balls Recovered per 100 Opponent Balls Played (conceptual)
  // This requires knowing opponent's balls played. For simplicity, just comparing raw recoveries.
  // Or, if we consider balls played by opponent as total balls played minus own team's balls played (not accurate for all scenarios)
  // For now, let's just show Balls Recovered directly or as a ratio against something simple if possible.
  // Let's use Balls Recovered / (Balls Recovered + Opponent Balls Recovered) as a share of recoveries.
  const totalRecoveries = (homeStats.ballsRecovered || 0) + (awayStats.ballsRecovered || 0);
  const homeRecoveryShare = totalRecoveries > 0 ? ((homeStats.ballsRecovered || 0) / totalRecoveries) * 100 : 0;
  const awayRecoveryShare = totalRecoveries > 0 ? ((awayStats.ballsRecovered || 0) / totalRecoveries) * 100 : 0;


  // Possession Efficiency: Goals per 1% of Possession
  const homePossessionEfficiency = calculateRatio(homeStats.goals || 0, homeStats.possessionPercentage || 1); // Per 1% possession
  const awayPossessionEfficiency = calculateRatio(awayStats.goals || 0, awayStats.possessionPercentage || 1);

  // Pass Completion Rates for specific types
  const homeLongPassCompletion = calculateRatio(homeStats.longPasses || 0, homeStats.passesAttempted > 0 ? homeStats.longPasses || 0 : 0); // This logic is flawed. Needs total long passes attempted.
                                                                                                                                    // Assuming longPasses in TeamDetailedStats is successful long passes.
                                                                                                                                    // We don't have "long passes attempted". So, cannot calculate this accurately.
                                                                                                                                    // Displaying raw counts of successful long passes instead for now.

  const ratios = [
    { label: 'Ball Loss Ratio (%) (Lower is Better)', homeValue: homeBallLossRatio, awayValue: awayBallLossRatio, unit: '%' },
    { label: 'Share of Total Recoveries (%)', homeValue: homeRecoveryShare, awayValue: awayRecoveryShare, unit: '%' },
    { label: 'Goals per 1% Possession', homeValue: homePossessionEfficiency, awayValue: awayPossessionEfficiency },
    // Add more as data allows, e.g., if total attempted long passes were available
  ];

  // Data for Radar chart (example)
  const radarData = [
    { subject: 'Ball Loss Ratio', A: awayBallLossRatio, B: homeBallLossRatio, fullMark: 100 }, // Inverted for radar "higher is better" view
    { subject: 'Recovery Share', A: homeRecoveryShare, B: awayRecoveryShare, fullMark: 100 },
    { subject: 'Poss. Efficiency', A: homePossessionEfficiency, B: awayPossessionEfficiency, fullMark: Math.max(homePossessionEfficiency, awayPossessionEfficiency, 1) },
    // Add more normalized values here for radar
  ];


  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Efficiency Ratios Comparison</CardTitle>
        <CardDescription>Comparing {homeTeamName} and {awayTeamName} on advanced efficiency metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        {ratios.map(ratio => (
          <SimpleRatioBar
            key={ratio.label}
            label={ratio.label}
            homeValue={ratio.homeValue}
            awayValue={ratio.awayValue}
            unit={ratio.unit}
          />
        ))}
        <div className="mt-4 p-2 border rounded">
           <h5 className="text-sm font-semibold text-center mb-2">Pass Type Counts (Successful)</h5>
           <SimpleRatioBar label="Long Passes" homeValue={homeStats.longPasses || 0} awayValue={awayStats.longPasses || 0} />
           <SimpleRatioBar label="Forward Passes" homeValue={homeStats.forwardPasses || 0} awayValue={awayStats.forwardPasses || 0} />
           {/* Add other pass types if needed */}
        </div>

        {/* Placeholder for Radar Chart for overall comparison
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} />
            <Radar name={homeTeamName} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Radar name={awayTeamName} dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default AdvancedEfficiencyRatioCharts;
