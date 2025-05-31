import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress'; // Added for visual battery level
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react'; // Icon for refresh button

interface TrackerStatusDisplay {
  userId: string;
  identifier: string; // Email or User ID
  batteryLevel: number | null;
  lastUpdatedAt: string | null;
}

// Define a type for the user data we expect from 'profiles' or 'users' table
interface UserProfile {
  id: string;
  email?: string; // Email is optional
  username?: string; // Add other potential identifiers
  // Add other fields if necessary, e.g., full_name
}

const TrackerBatteryMonitor: React.FC = () => {
  const [trackerStatusList, setTrackerStatusList] = useState<TrackerStatusDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackerStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('tracker_device_status')
        .select('user_id, battery_level, last_updated_at'); // Select specific columns

      if (statusError) throw statusError;

      if (!statusData || statusData.length === 0) {
        setTrackerStatusList([]);
        setLoading(false);
        return;
      }

      const userIds = statusData.map(s => s.user_id);
      let userProfiles: UserProfile[] = [];

      // Try fetching from 'profiles' table first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles') // Common practice for public user data
        .select('id, email, username') // Adjust selectable fields as needed
        .in('id', userIds);

      if (profilesError) {
        console.warn("Failed to fetch from 'profiles' table:", profilesError.message, "Ensure RLS is configured if the table exists.");
        // Fallback: If 'profiles' doesn't exist or fails, you might try 'users'
        // ONLY if 'users' is a custom public table, NOT auth.users.
        // For this example, we'll rely on 'profiles' or just use user_id.
        // If 'profiles' fails, userProfiles will remain empty, and we'll use user_id as identifier.
      } else {
        userProfiles = profilesData || [];
      }

      const combinedData = statusData.map(status => {
        const userProfile = userProfiles.find(p => p.id === status.user_id);
        const identifier = userProfile?.email || userProfile?.username || status.user_id; // Use email, then username, then ID
        return {
          userId: status.user_id,
          identifier: identifier,
          batteryLevel: status.battery_level,
          lastUpdatedAt: status.last_updated_at,
        };
      });

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
    if (level < 20) return 'destructive'; // Critical
    if (level < 50) return 'secondary';   // Warning (often yellow, using secondary for available)
    return 'default'; // Good (often green, using default for available)
  };

  if (loading && trackerStatusList.length === 0) { // Show initial loading message
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
        {trackerStatusList.length === 0 && !loading ? ( // Ensure not loading before showing "no data"
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
