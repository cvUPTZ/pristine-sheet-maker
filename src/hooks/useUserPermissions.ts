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
      setPermissions(null);
      setRole(null);

      try {
        // Use the new function to get user role from auth metadata
        const { data, error: roleError } = await supabase.rpc('get_user_role_from_auth', {
          user_id_param: targetUserId
        });

        if (roleError) {
          console.error('Error fetching user role for permissions:', roleError);
          throw new Error(`Failed to fetch user role: ${roleError.message}`);
        }

        const userRole = (data as UserRole) || 'user';
        setRole(userRole);

        const roleSpecificPermissions = defaultPermissions[userRole] || defaultPermissions.default;
        setPermissions(roleSpecificPermissions);

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
