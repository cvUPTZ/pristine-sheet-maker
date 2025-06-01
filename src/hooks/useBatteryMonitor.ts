
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BatteryStatus {
  level: number | null;
  charging: boolean | null;
}

const useBatteryMonitor = (userId?: string): BatteryStatus => {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);

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
  }, [userId]);

  return { level, charging };
};

export default useBatteryMonitor;
