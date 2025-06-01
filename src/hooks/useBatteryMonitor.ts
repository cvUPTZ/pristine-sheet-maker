
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PushNotificationService } from '@/services/pushNotificationService';

interface BatteryStatus {
  level: number | null;
  charging: boolean | null;
}

const useBatteryMonitor = (userId?: string): BatteryStatus => {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [lastNotificationLevel, setLastNotificationLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !('getBattery' in navigator)) {
      console.log('Battery API not supported or no user ID.');
      return;
    }

    let battery: any = null;

    const updateBatteryInfo = async () => {
      if (!battery) return;
      
      const batteryLevel = Math.round(battery.level * 100);
      setLevel(batteryLevel);
      setCharging(battery.charging);

      // Store battery status in notifications table
      try {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Battery Status Update',
            message: `Battery level: ${batteryLevel}%, charging: ${battery.charging}`,
            type: 'battery_status'
          });

        if (error) {
          console.error('Error updating battery status:', error);
        } else {
          console.log('Battery status updated:', { level: batteryLevel, charging: battery.charging });
        }

        // Send local notification for low battery (only once per 10% threshold)
        if (batteryLevel <= 20 && !battery.charging && 
            (lastNotificationLevel === null || batteryLevel < lastNotificationLevel - 10)) {
          
          // Get user profile for notification
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();

          const trackerName = profile?.full_name || profile?.email || 'Tracker';
          
          await PushNotificationService.sendLocalBatteryNotification(batteryLevel, trackerName);
          setLastNotificationLevel(batteryLevel);
        }

      } catch (error) {
        console.error('Error updating battery status:', error);
      }
    };

    const initBattery = async () => {
      try {
        // @ts-ignore - getBattery is not in standard TypeScript definitions
        battery = await navigator.getBattery();
        
        updateBatteryInfo();

        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
      } catch (error) {
        console.error('Error getting battery status:', error);
      }
    };

    initBattery();

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBatteryInfo);
        battery.removeEventListener('chargingchange', updateBatteryInfo);
        console.log('Battery monitor event listeners removed.');
      }
    };
  }, [userId, lastNotificationLevel]);

  return { level, charging };
};

export default useBatteryMonitor;
