import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'tracker' | 'teacher' | 'user' | 'manager' | 'viewer' | 'special' | string;

export interface RolePermissions {
  pitchView: boolean;
  pianoInput: boolean;
  statistics: boolean;
  timeline: boolean;
  analytics: boolean;
  ballTracking: boolean;
  liveEvents: boolean;
  dashboard: boolean;
  matchManagement: boolean;
  timerControl: boolean;
  reportGeneration: boolean;
  [key: string]: boolean;
}

const defaultPermissions: Record<UserRole, RolePermissions> = {
  admin: {
    pitchView: true, pianoInput: true, statistics: true, timeline: true,
    analytics: true, ballTracking: true, liveEvents: true,
    dashboard: true, matchManagement: true, timerControl: true, reportGeneration: true,
  },
  manager: {
    pitchView: true, pianoInput: false, statistics: true, timeline: true,
    analytics: true, ballTracking: false, liveEvents: false, dashboard: true,
    matchManagement: true, timerControl: false, reportGeneration: true,
  },
  tracker: {
    pitchView: false, pianoInput: true, statistics: false, timeline: false,
    analytics: false, ballTracking: false, liveEvents: false, dashboard: true,
    matchManagement: false, timerControl: false, reportGeneration: false,
  },
  teacher: {
    pitchView: true, pianoInput: false, statistics: true, timeline: true,
    analytics: true, ballTracking: false, liveEvents: false, dashboard: true,
    matchManagement: false, timerControl: false, reportGeneration: false,
  },
  user: {
    pitchView: true, pianoInput: false, statistics: true, timeline: true,
    analytics: false, ballTracking: false, liveEvents: false, dashboard: true,
    matchManagement: false, timerControl: false, reportGeneration: false,
  },
  viewer: {
    pitchView: true, pianoInput: false, statistics: true, timeline: true,
    analytics: false, ballTracking: false, liveEvents: false,
    dashboard: false, matchManagement: false, timerControl: false, reportGeneration: false,
  },
  special: {
    pitchView: false,
    pianoInput: false,
    statistics: false,
    timeline: false,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
    dashboard: false,
    matchManagement: false,
    timerControl: false,
    reportGeneration: false,
  },
  default: {
    pitchView: false, pianoInput: false, statistics: false, timeline: false,
    analytics: false, ballTracking: false, liveEvents: false, dashboard: false,
    matchManagement: false, timerControl: false, reportGeneration: false,
  }
};

interface UseUserPermissionsReturn {
  permissions: RolePermissions | null;
  role: UserRole | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useUserPermissions = (userId?: string): UseUserPermissionsReturn => {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;

  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!targetUserId) {
      const guestRole: UserRole = 'user';
      setRole(guestRole);
      setPermissions(defaultPermissions[guestRole] || defaultPermissions.default);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch the user's profile, including role and custom permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, custom_permissions')
        .eq('id', targetUserId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      if (profile) {
        const userRole = (profile.role as UserRole) || 'user';
        setRole(userRole);

        const roleDefaults = defaultPermissions[userRole] || defaultPermissions.default;

        // If custom permissions exist, merge with role defaults
        if (profile.custom_permissions) {
          const finalPermissions = { 
            ...roleDefaults, 
            ...(profile.custom_permissions as unknown as RolePermissions) 
          };
          setPermissions(finalPermissions);
        } else {
          setPermissions(roleDefaults);
        }
      } else {
        // Fallback for users that exist in auth but not in profiles table yet
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_role_from_auth', {
          user_id_param: targetUserId
        });
        
        if (rpcError) throw new Error(`Failed to fetch user role: ${rpcError.message}`);
        
        const userRole = (rpcData as UserRole) || 'user';
        setRole(userRole);
        setPermissions(defaultPermissions[userRole] || defaultPermissions.default);
      }

    } catch (e: any) {
      console.error('[useUserPermissions] Error:', e);
      setError(e);
      setPermissions(defaultPermissions.default);
      setRole('default');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    fetchPermissions();

    if (targetUserId) {
      // Subscribe to real-time updates on the user's profile
      channel = supabase
        .channel(`profile-changes-for:${targetUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${targetUserId}`,
          },
          (payload) => {
            console.log('[useUserPermissions] Profile updated in real-time. Refetching permissions.', payload.new);
            fetchPermissions();
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error('[useUserPermissions] Realtime subscription failed:', err);
          }
        });
    }

    // Cleanup subscription on component unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchPermissions, targetUserId]);

  return { permissions, role, isLoading, error, refetch: fetchPermissions };
};
