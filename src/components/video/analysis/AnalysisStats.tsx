import React, { useEffect, useState } from 'react';
import { TaggedEvent } from '@/types/events';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type definitions for statistics
type EventCountStat = { name: string; count: number; color?: string | null };
type EventDistributionStat = { intervalName: string; [eventType: string]: number | string };

interface AnalysisStatsProps {
  taggedEvents: TaggedEvent[];
  videoDuration: number | null | undefined;
}

export const AnalysisStats: React.FC<AnalysisStatsProps> = ({ taggedEvents, videoDuration }) => {
  const [eventCountStats, setEventCountStats] = useState<EventCountStat[]>([]);
  const [eventDistributionStats, setEventDistributionStats] = useState<EventDistributionStat[]>([]);

  useEffect(() => {
    if (taggedEvents && taggedEvents.length > 0 && videoDuration) {
      const intervalLengthSec = Math.max(60, Math.ceil(videoDuration / 12)); // Aim for up to 12 intervals, min 60s

      // Event Counts
      const counts: { [key: string]: EventCountStat } = {};
      taggedEvents.forEach(event => {
        const typeName = event.event_types?.name || 'Unknown Event';
        const typeColor = event.event_types?.color;
        if (!counts[typeName]) {
          counts[typeName] = { name: typeName, count: 0, color: typeColor };
        }
        counts[typeName].count++;
      });
      setEventCountStats(Object.values(counts).sort((a,b) => b.count - a.count));

      // Event Distribution
      const numIntervals = Math.ceil(videoDuration / intervalLengthSec);
      const uniqueEventTypeNames = Object.values(counts).map(c => c.name);

      const distributionData: EventDistributionStat[] = Array(numIntervals).fill(null).map((_, i) => {
        const intervalStartMin = Math.floor((i * intervalLengthSec) / 60);
        const intervalEndMin = Math.floor(((i + 1) * intervalLengthSec) / 60);
        // Ensure interval names are distinct and make sense, e.g., by using seconds for precision if needed
        const intervalName = `${intervalStartMin}m - ${intervalEndMin}m`;
        const intervalStat: EventDistributionStat = { intervalName };
        uniqueEventTypeNames.forEach(name => {
          intervalStat[name] = 0; // Initialize all event types with 0 for this interval
        });
        return intervalStat;
      });

      taggedEvents.forEach(event => {
        const intervalIndex = Math.min(numIntervals - 1, Math.floor(event.timestamp / intervalLengthSec));
        const typeName = event.event_types?.name || 'Unknown Event';
        if (distributionData[intervalIndex] && typeof distributionData[intervalIndex][typeName] === 'number') {
           (distributionData[intervalIndex][typeName] as number)++;
        }
      });
      setEventDistributionStats(distributionData);

    } else {
      setEventCountStats([]);
      setEventDistributionStats([]);
    }
  }, [taggedEvents, videoDuration]);

  if (eventCountStats.length === 0 && eventDistributionStats.length === 0) {
    return <p className="text-sm text-gray-500">No tagged events to generate statistics yet.</p>;
  }

  return (
    <div className="mt-6 pt-4 border-t">
      <h3 className="text-lg font-semibold mb-3">Statistics & Reports</h3>
      {eventCountStats.length > 0 && (
        <div className="mb-6 p-3 border rounded-md">
          <h4 className="font-medium text-sm mb-2">Event Counts</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-1 border-b">Color</th>
                <th className="p-1 border-b">Event Type</th>
                <th className="p-1 border-b text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {eventCountStats.map(stat => (
                <tr key={stat.name}>
                  <td className="p-1 border-b">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: stat.color || 'transparent', border: stat.color ? '' : '1px solid #ccc' }}></div>
                  </td>
                  <td className="p-1 border-b">{stat.name}</td>
                  <td className="p-1 border-b text-right">{stat.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {eventDistributionStats.length > 0 && (
         <div className="p-3 border rounded-md">
          <h4 className="font-medium text-sm mb-2">Event Distribution Over Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventDistributionStats} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="intervalName" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {eventCountStats.map(stat => ( // Use eventCountStats to get all unique types and their colors
                <Bar key={stat.name} dataKey={stat.name} fill={stat.color || '#8884d8'} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
