
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type UserRole = 'admin' | 'tracker' | 'teacher' | 'user' | 'manager' | 'viewer' | string;

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
    pitchView: true,
    pianoInput: true,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: true,
    liveEvents: true,
    dashboard: true,
    matchManagement: true,
    timerControl: true,
    reportGeneration: true,
  },
  manager: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: false,
    liveEvents: false,
    dashboard: true,
    matchManagement: true,
    timerControl: false,
    reportGeneration: true,
  },
  tracker: {
    pitchView: false,
    pianoInput: true,
    statistics: false,
    timeline: false,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
    dashboard: true,
    matchManagement: false,
    timerControl: false,
    reportGeneration: false,
  },
  teacher: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: false,
    liveEvents: false,
    dashboard: true,
    matchManagement: false,
    timerControl: false,
    reportGeneration: false,
  },
  user: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
    dashboard: true,
    matchManagement: false,
    timerControl: false,
    reportGeneration: false,
  },
  viewer: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
    dashboard: false,
    matchManagement: false,
    timerControl: false,
    reportGeneration: false,
  },
  default: { 
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
  }
};

interface UseUserPermissionsReturn {
  permissions: RolePermissions | null;
  role: UserRole | null;
  isLoading: boolean;
  error: Error | null;
}

export const useUserPermissions = (userId?: string): UseUserPermissionsReturn => {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;

  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!targetUserId) {
      const guestRole: UserRole = 'user';
      setRole(guestRole);
      setPermissions(defaultPermissions[guestRole] || defaultPermissions.default);
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch the user's profile, including role and custom permissions
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, custom_permissions')
          .eq('id', targetUserId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116: row not found
          console.error('Error fetching user profile for permissions:', profileError);
          throw new Error(`Failed to fetch user profile: ${profileError.message}`);
        }

        if (profile) {
          const userRole = (profile.role as UserRole) || 'user';
          setRole(userRole);

          // If custom permissions exist, use them. Otherwise, use role defaults.
          if (profile.custom_permissions) {
            const roleDefaults = defaultPermissions[userRole] || defaultPermissions.default;
            const finalPermissions = { ...roleDefaults, ...(profile.custom_permissions as unknown as RolePermissions) };
            setPermissions(finalPermissions);
          } else {
            setPermissions(defaultPermissions[userRole] || defaultPermissions.default);
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
        console.error('useUserPermissions error:', e);
        setError(e);
        setPermissions(defaultPermissions.default);
        setRole('default');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [targetUserId]);

  return { permissions, role, isLoading, error };
};
