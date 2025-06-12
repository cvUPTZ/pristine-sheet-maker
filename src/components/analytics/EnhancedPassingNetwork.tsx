
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Share2, Users, TrendingUp, Activity } from 'lucide-react';
import { PlayerStatSummary } from '@/types';

interface EnhancedPassingNetworkProps {
  playerStats: PlayerStatSummary[];
  homeTeamName: string;
  awayTeamName: string;
}

const EnhancedPassingNetwork: React.FC<EnhancedPassingNetworkProps> = ({ 
  playerStats, 
  homeTeamName, 
  awayTeamName 
}) => {
  const networkData = useMemo(() => {
    const homePlayers = playerStats.filter(p => p.team === 'home');
    const awayPlayers = playerStats.filter(p => p.team === 'away');
    
    const getPassingAccuracy = (player: PlayerStatSummary) => {
      if (!player.passesAttempted || player.passesAttempted === 0) return 0;
      return Math.round((player.passesCompleted / player.passesAttempted) * 100);
    };

    const getPlayerInfluence = (player: PlayerStatSummary) => {
      return (player.passesCompleted || 0) + (player.ballsPlayed || 0) + (player.ballsRecovered || 0);
    };

    return {
      homePlayers: homePlayers.map(p => ({
        ...p,
        accuracy: getPassingAccuracy(p),
        influence: getPlayerInfluence(p)
      })).sort((a, b) => b.influence - a.influence),
      awayPlayers: awayPlayers.map(p => ({
        ...p,
        accuracy: getPassingAccuracy(p),
        influence: getPlayerInfluence(p)
      })).sort((a, b) => b.influence - a.influence),
    };
  }, [playerStats]);

  const renderPlayerNode = (player: any, index: number, isHome: boolean) => {
    const maxInfluence = Math.max(
      ...networkData.homePlayers.map(p => p.influence),
      ...networkData.awayPlayers.map(p => p.influence)
    );
    
    const nodeSize = Math.max(20, (player.influence / maxInfluence) * 60);
    const accuracy = player.accuracy;
    
    return (
      <div
        key={player.playerId}
        className="relative group cursor-pointer transition-all duration-300 hover:scale-110"
        style={{
          width: `${nodeSize}px`,
          height: `${nodeSize}px`,
        }}
      >
        <div
          className={`w-full h-full rounded-full border-4 flex items-center justify-center font-bold text-white shadow-lg ${
            isHome
              ? accuracy >= 80
                ? 'bg-blue-600 border-blue-400 shadow-blue-500/50'
                : accuracy >= 60
                ? 'bg-blue-500 border-blue-300 shadow-blue-400/40'
                : 'bg-blue-400 border-blue-200 shadow-blue-300/30'
              : accuracy >= 80
                ? 'bg-orange-600 border-orange-400 shadow-orange-500/50'
                : accuracy >= 60
                ? 'bg-orange-500 border-orange-300 shadow-orange-400/40'
                : 'bg-orange-400 border-orange-200 shadow-orange-300/30'
          }`}
          style={{ fontSize: `${Math.max(8, nodeSize / 4)}px` }}
        >
          {player.playerId}
        </div>
        
        {/* Player info tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-xl">
            <div className="font-semibold">{player.playerName || `Player ${player.playerId}`}</div>
            <div>Passes: {player.passesCompleted}/{player.passesAttempted}</div>
            <div>Accuracy: {accuracy}%</div>
            <div>Influence: {player.influence}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamNetwork = (players: any[], isHome: boolean, teamName: string) => {
    if (players.length === 0) return null;

    return (
      <Card className={`${isHome ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
        <CardHeader>
          <CardTitle className={`text-lg ${isHome ? 'text-blue-900' : 'text-orange-900'}`}>
            {teamName} Passing Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-64 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-green-50 to-green-100">
            {/* Formation grid */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-2 p-4">
              {players.slice(0, 11).map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-center">
                  {renderPlayerNode(player, index, isHome)}
                </div>
              ))}
            </div>
            
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {players.slice(0, 11).map((player, i) => 
                players.slice(i + 1, 11).map((otherPlayer, j) => {
                  const x1 = ((i % 4) + 0.5) * (100 / 4);
                  const y1 = (Math.floor(i / 4) + 0.5) * (100 / 3);
                  const x2 = (((i + j + 1) % 4) + 0.5) * (100 / 4);
                  const y2 = (Math.floor((i + j + 1) / 4) + 0.5) * (100 / 3);
                  
                  const passConnection = Math.min(player.passesCompleted, otherPlayer.passesCompleted);
                  const opacity = Math.min(passConnection / 20, 0.8);
                  
                  return (
                    <line
                      key={`${player.playerId}-${otherPlayer.playerId}`}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke={isHome ? '#3b82f6' : '#f97316'}
                      strokeWidth="2"
                      opacity={opacity}
                      className="animate-pulse"
                    />
                  );
                })
              )}
            </svg>
          </div>
          
          {/* Team stats */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Total Passes</p>
              <p className="text-xl font-bold">
                {players.reduce((sum, p) => sum + (p.passesCompleted || 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Team Accuracy</p>
              <p className="text-xl font-bold">
                {players.length > 0 
                  ? Math.round(players.reduce((sum, p) => sum + p.accuracy, 0) / players.length)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Total Connections</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {playerStats.reduce((sum, p) => sum + (p.passesCompleted || 0), 0)}
                </p>
              </div>
              <Share2 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Network Density</p>
                <p className="text-2xl font-bold text-green-900">
                  {playerStats.length > 0 ? Math.round((playerStats.filter(p => (p.passesCompleted || 0) > 0).length / playerStats.length) * 100) : 0}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Key Players</p>
                <p className="text-2xl font-bold text-purple-900">
                  {networkData.homePlayers.filter(p => p.influence > 10).length + 
                   networkData.awayPlayers.filter(p => p.influence > 10).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Avg Accuracy</p>
                <p className="text-2xl font-bold text-amber-900">
                  {playerStats.length > 0 
                    ? Math.round(playerStats.reduce((sum, p) => {
                        const acc = p.passesAttempted > 0 ? (p.passesCompleted / p.passesAttempted) * 100 : 0;
                        return sum + acc;
                      }, 0) / playerStats.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Networks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTeamNetwork(networkData.homePlayers, true, homeTeamName)}
        {renderTeamNetwork(networkData.awayPlayers, false, awayTeamName)}
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Passers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...networkData.homePlayers, ...networkData.awayPlayers]
              .sort((a, b) => b.influence - a.influence)
              .slice(0, 8)
              .map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={player.team === 'home' ? 'default' : 'secondary'}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{player.playerName || `Player ${player.playerId}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.team === 'home' ? homeTeamName : awayTeamName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{player.passesCompleted}</p>
                    <p className="text-sm text-muted-foreground">{player.accuracy}% acc</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedPassingNetwork;
