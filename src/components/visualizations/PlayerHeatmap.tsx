
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Player } from '@/types';

interface PlayerHeatmapProps {
  homeTeam: {
    name: string;
    players: Player[];
  };
  awayTeam: {
    name: string;
    players: Player[];
  };
  teamPositions: Record<string | number, { x: number; y: number }>;
  selectedTeam: 'home' | 'away';
  onSelectTeam: (team: 'home' | 'away') => void;
}

const PlayerHeatmap: React.FC<PlayerHeatmapProps> = ({
  homeTeam,
  awayTeam,
  teamPositions,
  selectedTeam,
  onSelectTeam,
}) => {
  // Create heatmap data
  const generateHeatmap = (team: 'home' | 'away') => {
    const players = team === 'home' ? homeTeam.players : awayTeam.players;
    const gridSize = 10; // 10x10 grid
    const grid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    // Add position data to grid
    players.forEach(player => {
      const playerId = String(player.id);
      const pos = teamPositions[playerId];
      if (pos) {
        const gridX = Math.min(gridSize - 1, Math.floor(pos.x * gridSize));
        const gridY = Math.min(gridSize - 1, Math.floor(pos.y * gridSize));
        grid[gridY][gridX] += 1;
      }
    });
    
    return grid;
  };
  
  const homeHeatmap = generateHeatmap('home');
  const awayHeatmap = generateHeatmap('away');
  const activeHeatmap = selectedTeam === 'home' ? homeHeatmap : awayHeatmap;
  
  const maxValue = Math.max(
    ...homeHeatmap.flatMap(row => row),
    ...awayHeatmap.flatMap(row => row)
  );
  
  const getIntensity = (value: number) => {
    const normalizedValue = value / maxValue;
    return Math.max(0, Math.min(255, Math.floor(normalizedValue * 255)));
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Player Position Heatmap</CardTitle>
        <CardDescription>View team positional tendencies</CardDescription>
        
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => onSelectTeam('home')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              selectedTeam === 'home' 
                ? 'bg-football-home text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {homeTeam.name}
          </button>
          <button 
            onClick={() => onSelectTeam('away')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              selectedTeam === 'away' 
                ? 'bg-football-away text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {awayTeam.name}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[68/105] bg-[#3a8d45] rounded overflow-hidden border">
          {/* Pitch markings (simplified) */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/30"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30%] aspect-square rounded-full border border-white/30"></div>
          </div>
          
          {/* Heatmap grid */}
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {activeHeatmap.map((row, yIndex) => 
              row.map((value, xIndex) => (
                <div 
                  key={`${yIndex}-${xIndex}`} 
                  className="relative"
                  style={{
                    backgroundColor: value > 0 ? 
                      selectedTeam === 'home' ? 
                        `rgba(26, 54, 93, ${value / maxValue * 0.8})` : 
                        `rgba(211, 33, 44, ${value / maxValue * 0.8})` 
                      : 'transparent'
                  }}
                >
                  {value > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                      {value}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="text-xs text-center mt-2 text-muted-foreground">
          Intensity represents player density in each zone
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerHeatmap;
