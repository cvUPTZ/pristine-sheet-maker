// TrackerBatteryMonitor.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Battery, BatteryLow, Zap, User, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import TrackerAbsenceNotifier from './TrackerAbsenceNotifier';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrackerStatusDisplay {
  userId: string;
  identifier: string;
  email?: string;
  full_name?: string;
  batteryLevel: number | null;
  isCharging: boolean | null;
  lastUpdatedAt: string | null;
  chargingTimeInSeconds?: number | null;
  dischargingTimeInSeconds?: number | null;
}

const formatSecondsToTime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  let parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0 && seconds > 0) return '<1m';
  return parts.join(' ');
};

const TrackerBatteryMonitor: React.FC = () => {
  const [trackers, setTrackers] = useState<TrackerStatusDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbsenceNotifier, setShowAbsenceNotifier] = useState(false);
  const [absentTrackerId, setAbsentTrackerId] = useState<string>('');
  const [currentMatchId, setCurrentMatchId] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchTrackerData();
    const interval = setInterval(fetchTrackerData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTrackerData = async () => {
    try {
      // Handle potential error from the profiles table query
      const { data, error: trackersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role') // Corrected columns
        .eq('role', 'tracker');

      if (trackersError) {
        console.error('Error fetching tracker profiles:', trackersError);
        // Create empty array if there's an error
        setTrackers([]);
        setLoading(false);
        return;
      }

      // Process the data if available (using optional chaining to safely handle errors)
      const trackersWithDefaults = (data || []).map(profile => ({
          userId: profile.id || '',
          identifier: profile.full_name || profile.email || profile.id || '',
          email: profile.email || undefined,
          full_name: profile.full_name || undefined,
          batteryLevel: null, // Default value
          isCharging: null,   // Default value
          lastUpdatedAt: null, // Default value
          chargingTimeInSeconds: null, // Default value
          dischargingTimeInSeconds: null // Default value
      }));

      setTrackers(trackersWithDefaults);
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
    setCurrentMatchId('sample-match-id');
    setShowAbsenceNotifier(true);
  };

  const getBatteryIcon = (level: number | null, isCharging: boolean | null) => {
    if (isCharging) return <Zap className="h-4 w-4 text-yellow-500" />;
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
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Battery className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Tracker Battery Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
            <div className={`animate-spin rounded-full ${isMobile ? 'h-6 w-6' : 'h-8 w-8'} border-b-2 border-blue-500 mx-auto mb-4`}></div>
            <p className={`${isMobile ? 'text-sm' : 'text-base'}`}>Loading tracker data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className={`${isMobile ? 'p-3' : 'p-6'}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Battery className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Tracker Battery Monitor
          </CardTitle>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
            Monitor battery levels and tracker status in real-time
          </p>
        </CardHeader>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'} ${isMobile ? 'pt-0' : 'pt-0'}`}>
          <div className="grid gap-3 sm:gap-4">
            {trackers.map((tracker) => (
              <motion.div
                key={tracker.userId}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between ${isMobile ? 'p-3' : 'p-4'} border rounded-lg gap-3 sm:gap-4`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <User className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                      {tracker.identifier}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 truncate`}>
                      Last update: {formatLastUpdate(tracker.lastUpdatedAt)}
                    </div>
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${isMobile ? 'w-full' : 'flex-shrink-0'}`}>
                  <div className="flex items-center gap-2">
                    {getBatteryIcon(tracker.batteryLevel, tracker.isCharging)}
                    <div className="flex flex-col">
                      <Badge variant={getBatteryColor(tracker.batteryLevel) as any} className={`${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {tracker.batteryLevel !== null ? `${tracker.batteryLevel}%` : 'Unknown'}
                      </Badge>
                      {(tracker.chargingTimeInSeconds || tracker.dischargingTimeInSeconds) && (
                        <div className={`text-xs text-gray-500 ${isMobile ? 'mt-0.5' : 'mt-0.5'}`}>
                          {tracker.isCharging && tracker.chargingTimeInSeconds && tracker.chargingTimeInSeconds > 0 && (
                            <span>Full: {formatSecondsToTime(tracker.chargingTimeInSeconds)}</span>
                          )}
                          {!tracker.isCharging && tracker.dischargingTimeInSeconds && tracker.dischargingTimeInSeconds > 0 && (
                            <span>Left: {formatSecondsToTime(tracker.dischargingTimeInSeconds)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`flex gap-2 ${isMobile ? 'w-full' : 'flex-shrink-0'}`}>
                    {tracker.batteryLevel !== null && tracker.batteryLevel <= 20 && !tracker.isCharging && (
                      <Button
                        size={isMobile ? "sm" : "sm"}
                        variant="outline"
                        onClick={() => sendLowBatteryNotification(tracker.userId, tracker.batteryLevel!)}
                        className={`text-orange-600 border-orange-300 hover:bg-orange-50 ${isMobile ? 'flex-1 text-xs px-2' : ''}`}
                      >
                        <AlertTriangle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-1'}`} />
                        {isMobile ? 'Notify' : 'Notify Low Battery'}
                      </Button>
                    )}
                    
                    <Button
                      size={isMobile ? "sm" : "sm"}
                      variant="outline"
                      onClick={() => markTrackerAbsent(tracker.userId)}
                      className={`text-red-600 border-red-300 hover:bg-red-50 ${isMobile ? 'flex-1 text-xs px-2' : ''}`}
                    >
                      {isMobile ? 'Absent' : 'Mark Absent'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}

            {trackers.length === 0 && (
              <div className={`text-center ${isMobile ? 'py-6' : 'py-8'} text-gray-500`}>
                <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-4`}>🔋</div>
                <p className={`${isMobile ? 'text-sm' : 'text-base'} font-medium mb-2`}>No tracker data available</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Trackers will appear here once they start reporting battery status</p>
              </div>
            )}
          </div>

          <div className={`${isMobile ? 'mt-4' : 'mt-6'} flex justify-center`}>
            <Button 
              onClick={fetchTrackerData} 
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={`${isMobile ? 'text-xs px-4' : ''}`}
            >
              <Zap className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
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
