import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

interface BatteryStatus {
  level: number | null;
  charging: boolean | null;
}

// Type guard for BatteryManager
function hasBatteryAPI(nav: Navigator): nav is Navigator & { getBattery: () => Promise<BatteryManager> } {
  return 'getBattery' in nav;
}

const useBatteryMonitor = (userId: string | undefined) => {
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus>({ level: null, charging: null });
  const [batteryManager, setBatteryManager] = useState<BatteryManager | null>(null);

  const updateSupabaseBatteryStatus = useCallback(async (level: number, isCharging: boolean) => {
    if (!userId) return;

    const batteryLevelPercent = Math.round(level * 100);
    console.log(`Updating battery status for user ${userId}: ${batteryLevelPercent}%`);

    const { error } = await supabase
      .from('tracker_device_status')
      .upsert(
        {
          user_id: userId,
          battery_level: batteryLevelPercent,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error updating battery status to Supabase:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !hasBatteryAPI(navigator)) {
      console.log('Battery API not supported or no user ID.');
      return;
    }

    let currentBatteryManager: BatteryManager | null = null;

    const handleBatteryChange = () => {
      if (currentBatteryManager) {
        const newLevel = currentBatteryManager.level;
        const newCharging = currentBatteryManager.charging;
        setBatteryStatus({ level: newLevel, charging: newCharging });
        updateSupabaseBatteryStatus(newLevel, newCharging);
      }
    };

    navigator.getBattery().then((bm) => {
      currentBatteryManager = bm;
      setBatteryManager(bm);
      setBatteryStatus({ level: bm.level, charging: bm.charging });
      // Initial update
      updateSupabaseBatteryStatus(bm.level, bm.charging);

      bm.addEventListener('levelchange', handleBatteryChange);
      bm.addEventListener('chargingchange', handleBatteryChange);
    }).catch(error => {
      console.error('Error getting battery status:', error);
    });

    return () => {
      if (currentBatteryManager) {
        currentBatteryManager.removeEventListener('levelchange', handleBatteryChange);
        currentBatteryManager.removeEventListener('chargingchange', handleBatteryChange);
        console.log('Battery monitor event listeners removed.');
      }
    };
  }, [userId, updateSupabaseBatteryStatus]);

  return batteryStatus;
};

export default useBatteryMonitor;
