
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PushNotificationService } from '@/services/pushNotificationService';

interface BatteryStatus {
  level: number | null;
  charging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
}

const useBatteryMonitor = (userId?: string): BatteryStatus => {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [chargingTime, setChargingTime] = useState<number | null>(null);
  const [dischargingTime, setDischargingTime] = useState<number | null>(null);
  const [lastNotificationLevel, setLastNotificationLevel] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  useEffect(() => {
    if (!userId || !('getBattery' in navigator)) {
      console.log('Battery API not supported or no user ID.');
      return;
    }

    const requestNotificationPerm = async () => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      } else {
        setNotificationPermission(Notification.permission);
      }
    };
    requestNotificationPerm();

    let battery: any = null;

    const updateBatteryInfo = async () => {
      if (!battery) return;
      
      const batteryLevel = Math.round(battery.level * 100);
      setLevel(batteryLevel);
      setCharging(battery.charging);
      setChargingTime(battery.chargingTime === Infinity ? null : battery.chargingTime);
      setDischargingTime(battery.dischargingTime === Infinity ? null : battery.dischargingTime);

      // Store battery status in notifications table
      try {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Battery Status Update',
            message: `Battery level: ${batteryLevel}%, charging: ${battery.charging}, charging time: ${battery.chargingTime === Infinity ? 'N/A' : battery.chargingTime + 's'}, discharging time: ${battery.dischargingTime === Infinity ? 'N/A' : battery.dischargingTime + 's'}`,
            type: 'battery_status'
          });

        if (error) {
          console.error('Error updating battery status:', error);
        } else {
          console.log('Battery status updated:', { level: batteryLevel, charging: battery.charging, chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime });
        }

        // Send local notification for low battery (only once per 10% threshold)
        if (batteryLevel <= 20 && !battery.charging &&
            (lastNotificationLevel === null || batteryLevel < lastNotificationLevel - 10)) {
          
          if (notificationPermission === 'granted' && navigator.serviceWorker.controller) {
            const simpleTrackerName = 'Your Device'; // Simplified tracker name

            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_LOW_BATTERY_NOTIFICATION',
              payload: {
                level: batteryLevel,
                charging: battery.charging,
                trackerName: simpleTrackerName,
                chargingTime: battery.chargingTime === Infinity ? null : battery.chargingTime,
                dischargingTime: battery.dischargingTime === Infinity ? null : battery.dischargingTime,
              }
            });
            console.log('Sent SHOW_LOW_BATTERY_NOTIFICATION to SW');
            setLastNotificationLevel(batteryLevel);
          } else {
            console.log('Notification permission not granted or SW not active, cannot send SW notification for low battery.');
            // Optionally, fall back to an in-app toast notification here if SW notification isn't possible.
            // For example, using a toast library if available:
            // toast({ title: "Low Battery", description: `Your device battery is at ${batteryLevel}%. Please connect to a power source.` });
            // For this subtask, we just log it.
            // We still update lastNotificationLevel to prevent spamming logs/fallbacks.
            setLastNotificationLevel(batteryLevel);
          }
          // Original PushNotificationService call removed/commented:
          // const { data: profile } = await supabase
          //   .from('profiles')
          //   .select('full_name, email')
          //   .eq('id', userId)
          //   .single();
          // const trackerName = profile?.full_name || profile?.email || 'Tracker';
          // await PushNotificationService.sendLocalBatteryNotification(batteryLevel, trackerName);
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
  }, [userId, lastNotificationLevel, notificationPermission]); // Added notificationPermission to dependencies

  return { level, charging, chargingTime, dischargingTime }; // notificationPermission is not returned as it's internal to the hook
};

export default useBatteryMonitor;
