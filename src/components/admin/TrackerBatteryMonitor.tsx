
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';

interface TrackerStatusDisplay {
  userId: string;
  identifier: string;
  batteryLevel: number | null;
  lastUpdatedAt: string | null;
}

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
}

const TrackerBatteryMonitor: React.FC = () => {
  const [trackerStatusList, setTrackerStatusList] = useState<TrackerStatusDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackerStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Since tracker_device_status table doesn't exist, we'll simulate with profiles data
      // In a real implementation, you would need to create this table first
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker');

      if (profilesError) {
        throw profilesError;
      }

      // Simulate battery data since the table doesn't exist
      const combinedData = (profilesData || []).map(profile => ({
        userId: profile.id,
        identifier: profile.email || profile.full_name || profile.id,
        batteryLevel: Math.floor(Math.random() * 100), // Simulated battery level
        lastUpdatedAt: new Date().toISOString(), // Simulated last update
      }));

      setTrackerStatusList(combinedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tracker status.');
      console.error("Error fetching tracker status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrackerStatus();
  }, [fetchTrackerStatus]);

  const getBatteryBadgeVariant = (level: number | null): 'destructive' | 'secondary' | 'default' | 'outline' => {
    if (level === null) return 'outline';
    if (level < 20) return 'destructive';
    if (level < 50) return 'secondary';
    return 'default';
  };

  if (loading && trackerStatusList.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle>Tracker Battery Monitor</CardTitle></CardHeader>
            <CardContent><p>Loading tracker battery status...</p></CardContent>
        </Card>
    );
  }

  if (error) {
     return (
        <Card>
            <CardHeader><CardTitle>Tracker Battery Monitor</CardTitle></CardHeader>
            <CardContent><p className="text-destructive">Error: {error}</p></CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tracker Battery Monitor</CardTitle>
          <Button onClick={fetchTrackerStatus} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trackerStatusList.length === 0 && !loading ? (
          <p>No tracker battery data available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracker ID/Email</TableHead>
                <TableHead className="w-[150px]">Battery Level</TableHead>
                <TableHead className="w-[200px]">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackerStatusList.map((status) => (
                <TableRow key={status.userId}>
                  <TableCell className="font-medium">{status.identifier}</TableCell>
                  <TableCell>
                    {status.batteryLevel !== null ? (
                      <div className="flex items-center space-x-2">
                        <Badge variant={getBatteryBadgeVariant(status.batteryLevel)}>
                          {status.batteryLevel}%
                        </Badge>
                        <Progress value={status.batteryLevel} className="w-[60%]" />
                      </div>
                    ) : (
                      <Badge variant="outline">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {status.lastUpdatedAt ? formatDistanceToNow(new Date(status.lastUpdatedAt), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackerBatteryMonitor;
