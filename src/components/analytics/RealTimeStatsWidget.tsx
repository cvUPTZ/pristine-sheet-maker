
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  Zap, 
  Clock,
  PlayCircle,
  PauseCircle,
  Target
} from 'lucide-react';
import { Statistics, MatchEvent } from '@/types';
import { motion } from 'framer-motion';

interface RealTimeStatsWidgetProps {
  statistics: Statistics;
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  isLive?: boolean;
}

const RealTimeStatsWidget: React.FC<RealTimeStatsWidgetProps> = ({
  statistics,
  events,
  homeTeamName,
  awayTeamName,
  isLive = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recentEvents, setRecentEvents] = useState<MatchEvent[]>([]);

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  useEffect(() => {
    // Get the 5 most recent events
    const sortedEvents = [...events]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    setRecentEvents(sortedEvents);
  }, [events]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal': return '⚽';
      case 'shot': return '🎯';
      case 'pass': return '⚡';
      case 'tackle': return '🛡️';
      case 'foul': return '⚠️';
      case 'yellowCard': return '🟡';
      case 'redCard': return '🔴';
      default: return '📊';
    }
  };

  const liveMetrics = [
    {
      label: 'Ball Possession',
      home: statistics.home?.possessionPercentage || 0,
      away: statistics.away?.possessionPercentage || 0,
      icon: Activity,
      color: 'blue'
    },
    {
      label: 'Shots on Target',
      home: statistics.home?.shotsOnTarget || 0,
      away: statistics.away?.shotsOnTarget || 0,
      icon: Target,
      color: 'red'
    },
    {
      label: 'Pass Accuracy',
      home: statistics.home?.passesAttempted ? 
        Math.round((statistics.home.passesCompleted / statistics.home.passesAttempted) * 100) : 0,
      away: statistics.away?.passesAttempted ? 
        Math.round((statistics.away.passesCompleted / statistics.away.passesAttempted) * 100) : 0,
      icon: Zap,
      color: 'green'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Live Status Header */}
      <Card className={`${isLive ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' : 'bg-gray-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLive ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <PlayCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">LIVE</span>
                </>
              ) : (
                <>
                  <PauseCircle className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">ENDED</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 gap-3">
        {liveMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const total = metric.home + metric.away;
          const homePercentage = total > 0 ? (metric.home / total) * 100 : 50;
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-${metric.color}-100`}>
                      <IconComponent className={`h-4 w-4 text-${metric.color}-600`} />
                    </div>
                    <span className="font-medium text-sm">{metric.label}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-center">
                      <div className="text-lg font-bold">{metric.home}</div>
                      <Badge variant="outline" className="text-xs">{homeTeamName}</Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{metric.away}</div>
                      <Badge variant="secondary" className="text-xs">{awayTeamName}</Badge>
                    </div>
                  </div>
                  
                  <Progress value={homePercentage} className="h-2" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEvents.length > 0 ? (
            recentEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getEventIcon(event.type)}</span>
                  <div>
                    <p className="text-sm font-medium capitalize">{event.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.team === 'home' ? homeTeamName : awayTeamName}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.floor(event.timestamp / 60)}'
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent events
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {events.filter(e => e.team === 'home').length}
              </div>
              <p className="text-xs text-purple-700">{homeTeamName} Events</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {events.filter(e => e.team === 'away').length}
              </div>
              <p className="text-xs text-blue-700">{awayTeamName} Events</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-200">
            <div className="flex items-center justify-center gap-2 text-sm text-purple-800">
              <TrendingUp className="h-4 w-4" />
              <span>Total Events: {events.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeStatsWidget;
