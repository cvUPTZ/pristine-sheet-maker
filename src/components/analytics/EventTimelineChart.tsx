
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { MatchEvent } from '@/types';

interface EventTimelineChartProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

const EventTimelineChart: React.FC<EventTimelineChartProps> = ({
  events,
  homeTeamName,
  awayTeamName,
}) => {
  // Group events by time intervals (5-minute segments)
  const timelineData = React.useMemo(() => {
    const intervals: { [key: number]: any } = {};
    
    events.forEach(event => {
      const minute = Math.floor(event.timestamp / 60);
      const interval = Math.floor(minute / 5) * 5; // 5-minute intervals
      
      if (!intervals[interval]) {
        intervals[interval] = {
          time: `${interval}-${interval + 5}`,
          homeEvents: 0,
          awayEvents: 0,
          homePasses: 0,
          awayPasses: 0,
          homeShots: 0,
          awayShots: 0,
          homeGoals: 0,
          awayGoals: 0,
        };
      }
      
      if (event.team === 'home') {
        intervals[interval].homeEvents++;
        if (event.type === 'pass') intervals[interval].homePasses++;
        if (event.type === 'shot') intervals[interval].homeShots++;
        if (event.type === 'goal') intervals[interval].homeGoals++;
      } else if (event.team === 'away') {
        intervals[interval].awayEvents++;
        if (event.type === 'pass') intervals[interval].awayPasses++;
        if (event.type === 'shot') intervals[interval].awayShots++;
        if (event.type === 'goal') intervals[interval].awayGoals++;
      }
    });
    
    return Object.values(intervals).sort((a: any, b: any) => 
      parseInt(a.time.split('-')[0]) - parseInt(b.time.split('-')[0])
    );
  }, [events]);

  // Create scatter plot data for event types
  const scatterData = React.useMemo(() => {
    return events.map(event => ({
      minute: Math.floor(event.timestamp / 60),
      eventType: event.type,
      team: event.team,
      intensity: event.type === 'goal' ? 5 : event.type === 'shot' ? 4 : event.type === 'foul' ? 3 : 2
    }));
  }, [events]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="homeEvents" 
                  stroke="#1f77b4" 
                  strokeWidth={2}
                  name={`${homeTeamName} Events`}
                />
                <Line 
                  type="monotone" 
                  dataKey="awayEvents" 
                  stroke="#ff7f0e" 
                  strokeWidth={2}
                  name={`${awayTeamName} Events`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shot Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="homeShots" 
                  stroke="#2ca02c" 
                  strokeWidth={2}
                  name={`${homeTeamName} Shots`}
                />
                <Line 
                  type="monotone" 
                  dataKey="awayShots" 
                  stroke="#d62728" 
                  strokeWidth={2}
                  name={`${awayTeamName} Shots`}
                />
                <Line 
                  type="monotone" 
                  dataKey="homeGoals" 
                  stroke="#9467bd" 
                  strokeWidth={3}
                  name={`${homeTeamName} Goals`}
                />
                <Line 
                  type="monotone" 
                  dataKey="awayGoals" 
                  stroke="#8c564b" 
                  strokeWidth={3}
                  name={`${awayTeamName} Goals`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Distribution Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="minute" name="Minute" />
                <YAxis dataKey="intensity" name="Event Intensity" />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${props.payload.eventType} (${props.payload.team})`,
                    'Event'
                  ]}
                />
                <Legend />
                <Scatter 
                  name="Home Team Events" 
                  dataKey="intensity" 
                  fill="#1f77b4"
                  data={scatterData.filter(d => d.team === 'home')}
                />
                <Scatter 
                  name="Away Team Events" 
                  dataKey="intensity" 
                  fill="#ff7f0e"
                  data={scatterData.filter(d => d.team === 'away')}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventTimelineChart;
