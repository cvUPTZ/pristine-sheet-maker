
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, Zap, MapPin } from 'lucide-react';
import { Team } from '@/types';

interface EnhancedBallFlowProps {
  ballTrackingPoints: any[];
  homeTeam: Team;
  awayTeam: Team;
}

const EnhancedBallFlow: React.FC<EnhancedBallFlowProps> = ({ 
  ballTrackingPoints, 
  homeTeam, 
  awayTeam 
}) => {
  const flowAnalysis = useMemo(() => {
    if (!ballTrackingPoints || ballTrackingPoints.length === 0) {
      return {
        zones: [],
        heatmapData: [],
        flowDirections: [],
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        timeInZones: {},
        ballTrackingPoints: [],
      };
    }

    // Divide field into zones
    const zones = [
      { id: 'def-left', name: 'Defensive Left', x: 0, y: 0, width: 33, height: 50, team: 'home' },
      { id: 'def-center', name: 'Defensive Center', x: 33, y: 0, width: 34, height: 50, team: 'home' },
      { id: 'def-right', name: 'Defensive Right', x: 67, y: 0, width: 33, height: 50, team: 'home' },
      { id: 'mid-left', name: 'Midfield Left', x: 0, y: 50, width: 33, height: 50, team: 'neutral' },
      { id: 'mid-center', name: 'Midfield Center', x: 33, y: 50, width: 34, height: 50, team: 'neutral' },
      { id: 'mid-right', name: 'Midfield Right', x: 67, y: 50, width: 33, height: 50, team: 'neutral' },
      { id: 'att-left', name: 'Attacking Left', x: 0, y: 100, width: 33, height: 50, team: 'away' },
      { id: 'att-center', name: 'Attacking Center', x: 33, y: 100, width: 34, height: 50, team: 'away' },
      { id: 'att-right', name: 'Attacking Right', x: 67, y: 100, width: 33, height: 50, team: 'away' },
    ];

    // Calculate zone occupancy
    const zoneOccupancy: { [key: string]: number } = {};
    let totalDistance = 0;
    let maxSpeed = 0;
    const speeds: number[] = [];

    ballTrackingPoints.forEach((point, index) => {
      if (index > 0) {
        const prevPoint = ballTrackingPoints[index - 1];
        const distance = Math.sqrt(
          Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
        );
        totalDistance += distance;
        
        const timeDiff = (point.timestamp - prevPoint.timestamp) / 1000; // in seconds
        if (timeDiff > 0) {
          const speed = distance / timeDiff;
          speeds.push(speed);
          maxSpeed = Math.max(maxSpeed, speed);
        }
      }

      // Determine zone
      const zone = zones.find(z => 
        point.x >= z.x && point.x < z.x + z.width &&
        point.y >= z.y && point.y < z.y + z.height
      );
      
      if (zone) {
        zoneOccupancy[zone.id] = (zoneOccupancy[zone.id] || 0) + 1;
      }
    });

    const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    // Create heatmap data
    const heatmapData = zones.map(zone => ({
      ...zone,
      intensity: zoneOccupancy[zone.id] || 0,
      percentage: ballTrackingPoints.length > 0 ? 
        Math.round(((zoneOccupancy[zone.id] || 0) / ballTrackingPoints.length) * 100) : 0,
    }));

    return {
      zones: heatmapData,
      totalDistance: Math.round(totalDistance),
      averageSpeed: Math.round(averageSpeed * 10) / 10,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      timeInZones: zoneOccupancy,
      ballTrackingPoints: ballTrackingPoints.slice(0, 200), // Limit for performance
    };
  }, [ballTrackingPoints]);

  const renderHeatmapZone = (zone: any) => {
    const maxIntensity = Math.max(...flowAnalysis.zones.map(z => z.intensity));
    const opacity = maxIntensity > 0 ? zone.intensity / maxIntensity : 0;
    
    return (
      <div
        key={zone.id}
        className="absolute border border-white/30 flex items-center justify-center transition-all duration-300 hover:border-white/60 group cursor-pointer"
        style={{
          left: `${zone.x}%`,
          top: `${zone.y}%`,
          width: `${zone.width}%`,
          height: `${zone.height}%`,
          backgroundColor: zone.team === 'home' 
            ? `rgba(59, 130, 246, ${opacity * 0.6})` 
            : zone.team === 'away'
            ? `rgba(249, 115, 22, ${opacity * 0.6})`
            : `rgba(156, 163, 175, ${opacity * 0.6})`,
        }}
      >
        <div className="text-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          <div>{zone.percentage}%</div>
          <div className="text-xs font-normal">{zone.intensity} points</div>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-xl">
            <div className="font-semibold">{zone.name}</div>
            <div>Ball time: {zone.percentage}%</div>
            <div>Data points: {zone.intensity}</div>
          </div>
        </div>
      </div>
    );
  };

  if (!ballTrackingPoints || ballTrackingPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Ball Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Ball Tracking Data</h3>
            <p className="text-gray-500">Start tracking ball movement to see flow patterns and heatmaps</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Flow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Distance</p>
                <p className="text-2xl font-bold text-blue-900">{flowAnalysis.totalDistance}</p>
                <p className="text-xs text-blue-700">units traveled</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Avg Speed</p>
                <p className="text-2xl font-bold text-green-900">{flowAnalysis.averageSpeed}</p>
                <p className="text-xs text-green-700">units/second</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Max Speed</p>
                <p className="text-2xl font-bold text-purple-900">{flowAnalysis.maxSpeed}</p>
                <p className="text-xs text-purple-700">peak velocity</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Data Points</p>
                <p className="text-2xl font-bold text-amber-900">{ballTrackingPoints.length}</p>
                <p className="text-xs text-amber-700">tracking records</p>
              </div>
              <MapPin className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ball Flow Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Ball Flow Heatmap
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span>{homeTeam.name} Territory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-400 rounded"></div>
              <span>{awayTeam.name} Territory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>Neutral Zone</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 bg-gradient-to-b from-green-200 via-green-100 to-green-200 rounded-lg border-2 border-white shadow-inner overflow-hidden">
            {/* Field markings */}
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white transform -translate-x-1/2"></div>
              <div className="absolute left-1/2 top-1/2 w-20 h-20 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            
            {/* Heatmap zones */}
            {flowAnalysis.zones.map(renderHeatmapZone)}
            
            {/* Ball trail */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {flowAnalysis.ballTrackingPoints && flowAnalysis.ballTrackingPoints.map((point, index) => {
                if (index === 0 || !flowAnalysis.ballTrackingPoints) return null;
                const prevPoint = flowAnalysis.ballTrackingPoints[index - 1];
                return (
                  <line
                    key={index}
                    x1={`${(prevPoint.x / 500) * 100}%`}
                    y1={`${(prevPoint.y / 300) * 100}%`}
                    x2={`${(point.x / 500) * 100}%`}
                    y2={`${(point.y / 300) * 100}%`}
                    stroke="rgba(255, 255, 255, 0.6)"
                    strokeWidth="1"
                    opacity={Math.max(0.1, 1 - (index / flowAnalysis.ballTrackingPoints.length))}
                  />
                );
              })}
            </svg>
            
            {/* Team labels */}
            <div className="absolute left-4 top-4">
              <Badge variant="secondary" className="bg-blue-500 text-white">
                {homeTeam.name}
              </Badge>
            </div>
            <div className="absolute right-4 bottom-4">
              <Badge variant="secondary" className="bg-orange-500 text-white">
                {awayTeam.name}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Occupancy Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {flowAnalysis.zones
              .sort((a, b) => b.intensity - a.intensity)
              .map((zone, index) => (
                <div key={zone.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{zone.name}</h4>
                    <Badge variant={zone.team === 'home' ? 'default' : zone.team === 'away' ? 'secondary' : 'outline'}>
                      {zone.percentage}%
                    </Badge>
                  </div>
                  <Progress value={zone.percentage} className="h-2" />
                  <p className="text-xs text-gray-600 mt-1">{zone.intensity} data points</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBallFlow;
