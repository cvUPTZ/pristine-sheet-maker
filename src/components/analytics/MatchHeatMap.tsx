
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MatchEvent } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MatchHeatMapProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

const MatchHeatMap: React.FC<MatchHeatMapProps> = ({
  events,
  homeTeamName,
  awayTeamName,
}) => {
  const fieldWidth = 100;
  const fieldHeight = 60;
  const gridSize = 10;

  // Create heat map data
  const heatMapData = React.useMemo(() => {
    const grid: { [key: string]: { home: number; away: number } } = {};
    
    events.forEach(event => {
      if (event.coordinates) {
        const x = Math.floor((event.coordinates.x / fieldWidth) * gridSize);
        const y = Math.floor((event.coordinates.y / fieldHeight) * gridSize);
        const key = `${x}-${y}`;
        
        if (!grid[key]) {
          grid[key] = { home: 0, away: 0 };
        }
        
        if (event.team === 'home') {
          grid[key].home++;
        } else if (event.team === 'away') {
          grid[key].away++;
        }
      }
    });
    
    return grid;
  }, [events]);

  const maxIntensity = Math.max(
    ...Object.values(heatMapData).map(cell => Math.max(cell.home, cell.away))
  );

  const getHeatColor = (intensity: number, team: 'home' | 'away') => {
    const opacity = intensity / maxIntensity;
    return team === 'home' 
      ? `rgba(31, 119, 180, ${opacity * 0.7})`
      : `rgba(255, 127, 14, ${opacity * 0.7})`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{homeTeamName} Activity Heat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full bg-green-100 rounded-lg overflow-hidden" style={{ paddingBottom: '60%' }}>
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${gridSize} ${gridSize}`}
              preserveAspectRatio="none"
            >
              {/* Field markings */}
              <rect x="0" y="0" width={gridSize} height={gridSize} fill="#4ade80" fillOpacity="0.3" />
              <line x1="0" y1={gridSize/2} x2={gridSize} y2={gridSize/2} stroke="white" strokeWidth="0.1" />
              <line x1={gridSize/2} y1="0" x2={gridSize/2} y2={gridSize} stroke="white" strokeWidth="0.1" />
              <circle cx={gridSize/2} cy={gridSize/2} r="1" fill="none" stroke="white" strokeWidth="0.1" />
              
              {/* Heat map cells */}
              {Object.entries(heatMapData).map(([key, data]) => {
                const [x, y] = key.split('-').map(Number);
                if (data.home === 0) return null;
                
                return (
                  <TooltipProvider key={`home-tooltip-${key}`} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <rect
                          x={x}
                          y={y}
                          width="1"
                          height="1"
                          fill={getHeatColor(data.home, 'home')}
                          style={{ cursor: 'pointer' }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-background text-foreground border shadow-lg p-2 rounded-md text-xs">
                        <p>Zone: ({x}, {y})</p>
                        <p>Events: {data.home}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{awayTeamName} Activity Heat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full bg-green-100 rounded-lg overflow-hidden" style={{ paddingBottom: '60%' }}>
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${gridSize} ${gridSize}`}
              preserveAspectRatio="none"
            >
              {/* Field markings */}
              <rect x="0" y="0" width={gridSize} height={gridSize} fill="#4ade80" fillOpacity="0.3" />
              <line x1="0" y1={gridSize/2} x2={gridSize} y2={gridSize/2} stroke="white" strokeWidth="0.1" />
              <line x1={gridSize/2} y1="0" x2={gridSize/2} y2={gridSize} stroke="white" strokeWidth="0.1" />
              <circle cx={gridSize/2} cy={gridSize/2} r="1" fill="none" stroke="white" strokeWidth="0.1" />
              
              {/* Heat map cells */}
              {Object.entries(heatMapData).map(([key, data]) => {
                const [x, y] = key.split('-').map(Number);
                if (data.away === 0) return null;
                
                return (
                  <TooltipProvider key={`away-tooltip-${key}`} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <rect
                          x={x}
                          y={y}
                          width="1"
                          height="1"
                          fill={getHeatColor(data.away, 'away')}
                          style={{ cursor: 'pointer' }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-background text-foreground border shadow-lg p-2 rounded-md text-xs">
                        <p>Zone: ({x}, {y})</p>
                        <p>Events: {data.away}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity Legend & Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.team === 'home').length}
              </div>
              <div className="text-sm text-gray-600">{homeTeamName} Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {events.filter(e => e.team === 'away').length}
              </div>
              <div className="text-sm text-gray-600">{awayTeamName} Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(heatMapData).length}
              </div>
              <div className="text-sm text-gray-600">Active Zones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {maxIntensity}
              </div>
              <div className="text-sm text-gray-600">Max Intensity</div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 opacity-70"></div>
              <span className="text-sm">{homeTeamName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 opacity-70"></div>
              <span className="text-sm">{awayTeamName}</span>
            </div>
            <div className="text-xs text-gray-500 ml-auto">
              Darker areas indicate higher activity
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchHeatMap;
