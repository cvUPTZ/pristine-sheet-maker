// src/hooks/useBatteryMonitor.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const isCharging = battery.charging;
      const chargeTime = battery.chargingTime === Infinity ? null : battery.chargingTime;
      const dischargeTime = battery.dischargingTime === Infinity ? null : battery.dischargingTime;

      setLevel(batteryLevel);
      setCharging(isCharging);
      setChargingTime(chargeTime);
      setDischargingTime(dischargeTime);

      // The Supabase update call to 'profiles' has been removed as it was causing errors
      // due to attempting to write to non-existent fields.
      // The hook will now only handle client-side battery monitoring and local notifications.
      try {
        // Send local notification for low battery (only once per 10% threshold)
        if (batteryLevel <= 20 && !isCharging &&
            (lastNotificationLevel === null || batteryLevel < lastNotificationLevel - 10)) {
          
          if (notificationPermission === 'granted' && navigator.serviceWorker.controller) {
            const simpleTrackerName = 'Your Device'; // Simplified tracker name

            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_LOW_BATTERY_NOTIFICATION',
              payload: {
                level: batteryLevel,
                charging: isCharging,
                trackerName: simpleTrackerName,
                chargingTime: chargeTime,
                dischargingTime: dischargeTime,
              }
            });
            console.log('Sent SHOW_LOW_BATTERY_NOTIFICATION to SW');
            setLastNotificationLevel(batteryLevel);
          } else {
            console.log('Notification permission not granted or SW not active, cannot send SW notification for low battery.');
            // Still set lastNotificationLevel to prevent repeated checks even if notification not sent
            setLastNotificationLevel(batteryLevel);
          }
        }
      } catch (error) {
        console.error('Error in battery update logic (local notifications):', error);
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
  }, [userId, lastNotificationLevel, notificationPermission]);

  return { level, charging, chargingTime, dischargingTime };
};

export default useBatteryMonitor;