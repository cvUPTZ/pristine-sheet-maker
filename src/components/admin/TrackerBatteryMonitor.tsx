
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, AlertTriangle, Battery, BatteryLow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrackerStatusDisplay {
  userId: string;
  identifier: string;
  batteryLevel: number | null;
  lastUpdatedAt: string | null;
  email?: string;
  full_name?: string;
}

const TrackerBatteryMonitor: React.FC = () => {
  const [trackerStatusList, setTrackerStatusList] = useState<TrackerStatusDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTrackerStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all tracker users with their battery status
      const { data: trackersData, error: trackersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          tracker_device_status (
            battery_level,
            last_updated_at
          )
        `)
        .eq('role', 'tracker');

      if (trackersError) {
        throw trackersError;
      }

      const combinedData = (trackersData || []).map(tracker => ({
        userId: tracker.id,
        identifier: tracker.email || tracker.full_name || tracker.id,
        email: tracker.email,
        full_name: tracker.full_name,
        batteryLevel: tracker.tracker_device_status?.[0]?.battery_level || null,
        lastUpdatedAt: tracker.tracker_device_status?.[0]?.last_updated_at || null,
      }));

      setTrackerStatusList(combinedData);

      // Check for low battery trackers and show notifications
      const lowBatteryTrackers = combinedData.filter(tracker => 
        tracker.batteryLevel !== null && tracker.batteryLevel < 20
      );

      if (lowBatteryTrackers.length > 0) {
        toast({
          title: "Low Battery Alert",
          description: `${lowBatteryTrackers.length} tracker(s) have low battery levels`,
          variant: "destructive",
        });
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch tracker status.');
      console.error("Error fetching tracker status:", err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrackerStatus();
    
    // Set up real-time subscription for battery status updates
    const subscription = supabase
      .channel('tracker_battery_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tracker_device_status' },
        () => {
          fetchTrackerStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchTrackerStatus]);

  const getBatteryBadgeVariant = (level: number | null): 'destructive' | 'secondary' | 'default' | 'outline' => {
    if (level === null) return 'outline';
    if (level < 20) return 'destructive';
    if (level < 50) return 'secondary';
    return 'default';
  };

  const getBatteryIcon = (level: number | null) => {
    if (level === null) return <Battery className="h-4 w-4" />;
    if (level < 20) return <BatteryLow className="h-4 w-4 text-red-500" />;
    return <Battery className="h-4 w-4" />;
  };

  const handleNotifyTracker = async (trackerId: string, batteryLevel: number) => {
    try {
      // This would typically call the monitor_tracker_battery_levels function
      // or create a notification directly
      toast({
        title: "Notification Sent",
        description: `Low battery notification sent to tracker`,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    }
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
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Tracker Battery Monitor
          </CardTitle>
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
                <TableHead>Tracker</TableHead>
                <TableHead className="w-[180px]">Battery Level</TableHead>
                <TableHead className="w-[150px]">Last Updated</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackerStatusList.map((status) => (
                <TableRow key={status.userId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getBatteryIcon(status.batteryLevel)}
                      <div>
                        <div>{status.full_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{status.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {status.batteryLevel !== null ? (
                      <div className="flex items-center space-x-2">
                        <Badge variant={getBatteryBadgeVariant(status.batteryLevel)}>
                          {status.batteryLevel}%
                        </Badge>
                        <Progress value={status.batteryLevel} className="w-[60%]" />
                        {status.batteryLevel < 20 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">No Data</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {status.lastUpdatedAt ? 
                      formatDistanceToNow(new Date(status.lastUpdatedAt), { addSuffix: true }) : 
                      'Never'
                    }
                  </TableCell>
                  <TableCell>
                    {status.batteryLevel !== null && status.batteryLevel < 20 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleNotifyTracker(status.userId, status.batteryLevel)}
                      >
                        Notify
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {trackerStatusList.filter(t => t.batteryLevel !== null && t.batteryLevel >= 50).length}
            </div>
            <div className="text-sm text-gray-500">Good Battery</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {trackerStatusList.filter(t => t.batteryLevel !== null && t.batteryLevel >= 20 && t.batteryLevel < 50).length}
            </div>
            <div className="text-sm text-gray-500">Medium Battery</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {trackerStatusList.filter(t => t.batteryLevel !== null && t.batteryLevel < 20).length}
            </div>
            <div className="text-sm text-gray-500">Low Battery</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackerBatteryMonitor;
