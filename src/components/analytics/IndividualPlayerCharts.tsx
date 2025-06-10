import React from 'react';
import { PlayerStatSummary, Player } from '@/types'; // Assuming PlayerStatSummary is available in @/types
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IndividualPlayerChartsProps {
  playerStats: PlayerStatSummary[];
  selectedPlayerId: string | number | null; // Allow null for no selection
  // allPlayersForMatch: Player[]; // May not be needed if PlayerStatSummary has all info
}

// Simple Bar component for demonstration
const SimplePlayerStatBar = ({ value, maxValue, label, color }: { value: number; maxValue: number; label: string; color: string }) => {
  const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex flex-col items-center mx-2" style={{width: '60px'}}>
      <div className="w-10 h-32 bg-gray-200 relative">
        <div
          className="absolute bottom-0 w-full"
          style={{ height: `${heightPercentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs mt-1 text-center">{label}</div>
      <div className="text-xs font-bold text-center">{value}</div>
    </div>
  );
};


const IndividualPlayerCharts: React.FC<IndividualPlayerChartsProps> = ({
  playerStats,
  selectedPlayerId,
}) => {
  const selectedStat = playerStats.find(p => String(p.playerId) === String(selectedPlayerId));

  if (!selectedPlayerId || !selectedStat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Individual Player Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Select a player to view their detailed statistics charts.</p>
        </CardContent>
      </Card>
    );
  }

  const playerName = selectedStat.playerName || `Player ${selectedStat.playerId}`;

  const shootingData = [
    { name: 'Shots', value: selectedStat.shots || 0, color: '#3b82f6' },
    { name: 'On Target', value: selectedStat.shotsOnTarget || 0, color: '#16a34a' },
    { name: 'xG', value: parseFloat((selectedStat.totalXg || 0).toFixed(2)), color: '#f97316' },
    // Foot/Header breakdowns from PlayerStatSummary
    { name: 'Foot Shots', value: (selectedStat.dangerousFootShots || 0) + (selectedStat.nonDangerousFootShots || 0), color: '#6366f1'},
    { name: 'Header Shots', value: (selectedStat.dangerousHeaderShots || 0) + (selectedStat.nonDangerousHeaderShots || 0), color: '#ec4899'},
  ];
  const maxShootingValue = Math.max(...shootingData.map(s => s.value), 1);

  const passingData = [
    { name: 'Attempted', value: selectedStat.passesAttempted || 0, color: '#3b82f6' },
    { name: 'Completed', value: selectedStat.passesCompleted || 0, color: '#16a34a' },
    { name: 'Support', value: selectedStat.supportPasses || 0, color: '#eab308' },
    { name: 'Decisive', value: selectedStat.decisivePasses || 0, color: '#f97316' },
  ];
  const maxPassingValue = Math.max(...passingData.map(s => s.value), 1);

  const generalActivityData = [
     { name: 'Dribbles', value: selectedStat.dribbles || 0, color: '#3b82f6' }, // Assuming 'dribbles' is successful or total attempts based on previous def.
     { name: 'Tackles', value: selectedStat.tackles || 0, color: '#16a34a' },
     { name: 'Interceptions', value: selectedStat.interceptions || 0, color: '#eab308' },
     { name: 'Balls Recovered', value: selectedStat.ballsRecovered || 0, color: '#6366f1' },
     { name: 'Contacts', value: selectedStat.contacts || 0, color: '#ec4899' },
  ];
  const maxGeneralActivityValue = Math.max(...generalActivityData.map(s => s.value), 1);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Charts for: {playerName}</CardTitle>
        <CardDescription>Team: {selectedStat.team}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2 text-center">Shooting Stats</h4>
          <div className="flex flex-wrap justify-around">
            {shootingData.map(data => (
              <SimplePlayerStatBar key={data.name} value={data.value} maxValue={maxShootingValue} label={data.name} color={data.color} />
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-center">Passing Stats</h4>
           <div className="flex flex-wrap justify-around">
            {passingData.map(data => (
              <SimplePlayerStatBar key={data.name} value={data.value} maxValue={maxPassingValue} label={data.name} color={data.color} />
            ))}
          </div>
        </div>
         <div>
          <h4 className="font-semibold mb-2 text-center">General Activity</h4>
           <div className="flex flex-wrap justify-around">
            {generalActivityData.map(data => (
              <SimplePlayerStatBar key={data.name} value={data.value} maxValue={maxGeneralActivityValue} label={data.name} color={data.color} />
            ))}
          </div>
        </div>
        {/* Placeholder for Recharts BarChart
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={shootingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" /> <YAxis /> <Tooltip /> <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
        */}
      </CardContent>
    </Card>
  );
};

export default IndividualPlayerCharts;
