
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Battery, BatteryLow, Zap, User, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import TrackerAbsenceNotifier from './TrackerAbsenceNotifier';

interface TrackerStatusDisplay {
  userId: string;
  identifier: string;
  email?: string;
  full_name?: string;
  batteryLevel: number | null;
  lastUpdatedAt: string | null;
}

const TrackerBatteryMonitor: React.FC = () => {
  const [trackers, setTrackers] = useState<TrackerStatusDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbsenceNotifier, setShowAbsenceNotifier] = useState(false);
  const [absentTrackerId, setAbsentTrackerId] = useState<string>('');
  const [currentMatchId, setCurrentMatchId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTrackerData();
    const interval = setInterval(fetchTrackerData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTrackerData = async () => {
    try {
      // Get tracker profiles first
      const { data: trackersData, error: trackersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'tracker');

      if (trackersError) throw trackersError;

      // Get battery status from notifications (since we're storing it there temporarily)
      const { data: batteryData, error: batteryError } = await supabase
        .from('notifications')
        .select('user_id, data, created_at')
        .eq('type', 'battery_status')
        .order('created_at', { ascending: false });

      if (batteryError) {
        console.error('Error fetching battery data:', batteryError);
      }

      // Combine the data
      const trackersWithBattery = (trackersData || []).map(tracker => {
        const latestBatteryInfo = batteryData?.find(b => b.user_id === tracker.id);
        const batteryLevel = latestBatteryInfo?.data?.battery_level || null;
        const lastUpdatedAt = latestBatteryInfo?.created_at || null;

        return {
          userId: tracker.id,
          identifier: tracker.full_name || tracker.email || tracker.id,
          email: tracker.email || undefined,
          full_name: tracker.full_name || undefined,
          batteryLevel,
          lastUpdatedAt
        };
      });

      setTrackers(trackersWithBattery);
    } catch (error) {
      console.error('Error fetching tracker data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tracker battery data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendLowBatteryNotification = async (trackerId: string, batteryLevel: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: trackerId,
          title: 'Low Battery Warning',
          message: `Your device battery is at ${batteryLevel}%. Please consider bringing a power bank or charging your device.`,
          type: 'low_battery_warning'
        });

      if (error) throw error;

      toast({
        title: "Low Battery Notification Sent",
        description: `Notification sent to tracker with ${batteryLevel}% battery`,
      });
    } catch (error) {
      console.error('Error sending low battery notification:', error);
      toast({
        title: "Error",
        description: "Failed to send low battery notification",
        variant: "destructive",
      });
    }
  };

  const markTrackerAbsent = (trackerId: string) => {
    setAbsentTrackerId(trackerId);
    // For demo purposes, we'll use a sample match ID. In production, this should come from context or props
    setCurrentMatchId('sample-match-id');
    setShowAbsenceNotifier(true);
  };

  const getBatteryIcon = (level: number | null) => {
    if (level === null) return <Battery className="h-4 w-4" />;
    if (level <= 20) return <BatteryLow className="h-4 w-4 text-red-500" />;
    return <Battery className="h-4 w-4 text-green-500" />;
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'gray';
    if (level <= 20) return 'red';
    if (level <= 50) return 'yellow';
    return 'green';
  };

  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Tracker Battery Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading tracker data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Tracker Battery Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {trackers.map((tracker) => (
              <motion.div
                key={tracker.userId}
                className="flex items-center justify-between p-4 border rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">{tracker.identifier}</div>
                    <div className="text-sm text-gray-500">
                      Last update: {formatLastUpdate(tracker.lastUpdatedAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getBatteryIcon(tracker.batteryLevel)}
                    <Badge variant={getBatteryColor(tracker.batteryLevel) as any}>
                      {tracker.batteryLevel !== null ? `${tracker.batteryLevel}%` : 'Unknown'}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {tracker.batteryLevel !== null && tracker.batteryLevel <= 20 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendLowBatteryNotification(tracker.userId, tracker.batteryLevel)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Notify Low Battery
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markTrackerAbsent(tracker.userId)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Mark Absent
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}

            {trackers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tracker data available
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <Button onClick={fetchTrackerData} variant="outline">
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAbsenceNotifier && (
        <TrackerAbsenceNotifier
          matchId={currentMatchId}
          absentTrackerId={absentTrackerId}
          onClose={() => setShowAbsenceNotifier(false)}
        />
      )}
    </div>
  );
};

export default TrackerBatteryMonitor;
