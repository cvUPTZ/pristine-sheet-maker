
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Zap } from 'lucide-react';
import { MatchEvent } from '@/types';

interface EnhancedShotMapProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

const EnhancedShotMap: React.FC<EnhancedShotMapProps> = ({ events, homeTeamName, awayTeamName }) => {
  const shotData = useMemo(() => {
    const shots = events.filter(event => 
      event.type === 'shot' || 
      event.type === 'goal' ||
      (event.event_data && (
        (event.event_data as any).subtype === 'shot' || 
        (event.event_data as any).subtype === 'goal'
      ))
    );

    const homeShots = shots.filter(shot => shot.team === 'home');
    const awayShots = shots.filter(shot => shot.team === 'away');

    return {
      homeShots,
      awayShots,
      totalShots: shots.length,
      homeGoals: homeShots.filter(shot => 
        shot.type === 'goal' || 
        (shot.event_data && (shot.event_data as any).subtype === 'goal')
      ).length,
      awayGoals: awayShots.filter(shot => 
        shot.type === 'goal' || 
        (shot.event_data && (shot.event_data as any).subtype === 'goal')
      ).length,
    };
  }, [events]);

  const renderShot = (shot: MatchEvent, index: number, isHome: boolean) => {
    const isGoal = shot.type === 'goal' || 
      (shot.event_data && (shot.event_data as any).subtype === 'goal');
    
    const coordinates = shot.coordinates as any;
    const x = coordinates?.x || Math.random() * 400;
    const y = coordinates?.y || Math.random() * 300;
    
    return (
      <div
        key={`${shot.id}-${index}`}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-125 ${
          isGoal ? 'animate-pulse' : ''
        }`}
        style={{
          left: `${Math.min(Math.max(x / 500 * 100, 5), 95)}%`,
          top: `${Math.min(Math.max(y / 300 * 100, 5), 95)}%`,
        }}
        title={`${isGoal ? 'Goal' : 'Shot'} by Player ${shot.player_id || 'Unknown'} at ${Math.floor((shot.timestamp || 0) / 60)}:${((shot.timestamp || 0) % 60).toString().padStart(2, '0')}`}
      >
        <div className={`w-4 h-4 rounded-full border-2 ${
          isGoal 
            ? isHome 
              ? 'bg-green-500 border-green-700 shadow-lg shadow-green-500/50' 
              : 'bg-red-500 border-red-700 shadow-lg shadow-red-500/50'
            : isHome
              ? 'bg-blue-400 border-blue-600 shadow-md shadow-blue-400/30'
              : 'bg-orange-400 border-orange-600 shadow-md shadow-orange-400/30'
        }`}>
          {isGoal && (
            <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-30"></div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Shot Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Shots</p>
                <p className="text-2xl font-bold text-blue-900">{shotData.totalShots}</p>
                <p className="text-xs text-blue-700">
                  {homeTeamName}: {shotData.homeShots.length} • {awayTeamName}: {shotData.awayShots.length}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Goals Scored</p>
                <p className="text-2xl font-bold text-green-900">{shotData.homeGoals + shotData.awayGoals}</p>
                <p className="text-xs text-green-700">
                  {homeTeamName}: {shotData.homeGoals} • {awayTeamName}: {shotData.awayGoals}
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-900">
                  {shotData.totalShots > 0 ? Math.round(((shotData.homeGoals + shotData.awayGoals) / shotData.totalShots) * 100) : 0}%
                </p>
                <p className="text-xs text-purple-700">Goals per shot</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shot Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Shot Map
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 border border-blue-600 rounded-full"></div>
              <span>{homeTeamName} Shots</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-400 border border-orange-600 rounded-full"></div>
              <span>{awayTeamName} Shots</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 border border-green-700 rounded-full"></div>
              <span>Goals</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 bg-gradient-to-b from-green-100 to-green-200 rounded-lg border-2 border-white shadow-inner overflow-hidden">
            {/* Field markings */}
            <div className="absolute inset-0">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/70 transform -translate-x-1/2"></div>
              {/* Center circle */}
              <div className="absolute left-1/2 top-1/2 w-20 h-20 border-2 border-white/70 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
              {/* Goal areas */}
              <div className="absolute left-0 top-1/2 w-16 h-24 border-2 border-white/70 transform -translate-y-1/2"></div>
              <div className="absolute right-0 top-1/2 w-16 h-24 border-2 border-white/70 transform -translate-y-1/2"></div>
              {/* Penalty areas */}
              <div className="absolute left-0 top-1/2 w-24 h-40 border-2 border-white/70 transform -translate-y-1/2"></div>
              <div className="absolute right-0 top-1/2 w-24 h-40 border-2 border-white/70 transform -translate-y-1/2"></div>
            </div>
            
            {/* Shot markers */}
            {shotData.homeShots.map((shot, index) => renderShot(shot, index, true))}
            {shotData.awayShots.map((shot, index) => renderShot(shot, index, false))}
            
            {/* Team labels */}
            <div className="absolute left-4 top-4">
              <Badge variant="secondary" className="bg-blue-500 text-white">
                {homeTeamName}
              </Badge>
            </div>
            <div className="absolute right-4 top-4">
              <Badge variant="secondary" className="bg-orange-500 text-white">
                {awayTeamName}
              </Badge>
            </div>
          </div>
          
          {shotData.totalShots === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No shots recorded yet</p>
                <p className="text-sm text-gray-500">Shots will appear here during the match</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedShotMap;
