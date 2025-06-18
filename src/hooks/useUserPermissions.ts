
// hooks/useUserPermissions.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RolePermissions {
  // Match Management
  canCreateMatches: boolean;
  canEditMatches: boolean;
  canDeleteMatches: boolean;
  canViewMatches: boolean;
  canTrackMatches: boolean;
  canManageMatchTimer: boolean;
  
  // Analytics & Statistics
  canViewAnalytics: boolean;
  canViewStatistics: boolean;
  canExportData: boolean;
  canViewReports: boolean;
  
  // Video Analysis
  canAnalyzeVideos: boolean;
  canUploadVideos: boolean;
  canDeleteVideos: boolean;
  canManageVideoJobs: boolean;
  
  // User Management
  canManageUsers: boolean;
  canViewUserProfiles: boolean;
  canAssignRoles: boolean;
  canDeleteUsers: boolean;
  
  // Administrative
  canAccessAdmin: boolean;
  canManageSettings: boolean;
  canViewSystemLogs: boolean;
  canManageDatabase: boolean;
  
  // Communication
  canUseVoiceChat: boolean;
  canModerateChat: boolean;
  
  // General Access
  canViewDashboard: boolean;
  canViewOwnProfile: boolean;
  canEditOwnProfile: boolean;
}

export type UserRole = 'admin' | 'manager' | 'tracker' | 'teacher' | 'user' | 'viewer';

// CHANGED: Export this constant so it can be used in the admin panel
export const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // ... (all true)
    canCreateMatches: true, canEditMatches: true, canDeleteMatches: true, canViewMatches: true, canTrackMatches: true, canManageMatchTimer: true,
    canViewAnalytics: true, canViewStatistics: true, canExportData: true, canViewReports: true,
    canAnalyzeVideos: true, canUploadVideos: true, canDeleteVideos: true, canManageVideoJobs: true,
    canManageUsers: true, canViewUserProfiles: true, canAssignRoles: true, canDeleteUsers: true,
    canAccessAdmin: true, canManageSettings: true, canViewSystemLogs: true, canManageDatabase: true,
    canUseVoiceChat: true, canModerateChat: true,
    canViewDashboard: true, canViewOwnProfile: true, canEditOwnProfile: true,
  },
  manager: {
    canCreateMatches: true, canEditMatches: true, canDeleteMatches: false, canViewMatches: true, canTrackMatches: false, canManageMatchTimer: false,
    canViewAnalytics: true, canViewStatistics: true, canExportData: true, canViewReports: true,
    canAnalyzeVideos: true, canUploadVideos: true, canDeleteVideos: false, canManageVideoJobs: true,
    canManageUsers: false, canViewUserProfiles: true, canAssignRoles: false, canDeleteUsers: false,
    canAccessAdmin: false, canManageSettings: false, canViewSystemLogs: false, canManageDatabase: false,
    canUseVoiceChat: true, canModerateChat: true,
    canViewDashboard: true, canViewOwnProfile: true, canEditOwnProfile: true,
  },
  tracker: {
    canCreateMatches: false, canEditMatches: false, canDeleteMatches: false, canViewMatches: true, canTrackMatches: true, canManageMatchTimer: false,
    canViewAnalytics: true, canViewStatistics: true, // FIXED: Now trackers can view analytics by default
    canExportData: false, canViewReports: false,
    canAnalyzeVideos: false, canUploadVideos: false, canDeleteVideos: false, canManageVideoJobs: false,
    canManageUsers: false, canViewUserProfiles: false, canAssignRoles: false, canDeleteUsers: false,
    canAccessAdmin: false, canManageSettings: false, canViewSystemLogs: false, canManageDatabase: false,
    canUseVoiceChat: true, canModerateChat: false,
    canViewDashboard: true, canViewOwnProfile: true, canEditOwnProfile: true,
  },
  teacher: {
    canCreateMatches: false, canEditMatches: false, canDeleteMatches: false, canViewMatches: true, canTrackMatches: false, canManageMatchTimer: false,
    canViewAnalytics: true, canViewStatistics: true, canExportData: false, canViewReports: true,
    canAnalyzeVideos: true, canUploadVideos: true, canDeleteVideos: false, canManageVideoJobs: false,
    canManageUsers: false, canViewUserProfiles: false, canAssignRoles: false, canDeleteUsers: false,
    canAccessAdmin: false, canManageSettings: false, canViewSystemLogs: false, canManageDatabase: false,
    canUseVoiceChat: true, canModerateChat: false,
    canViewDashboard: true, canViewOwnProfile: true, canEditOwnProfile: true,
  },
  user: {
    canCreateMatches: false, canEditMatches: false, canDeleteMatches: false, canViewMatches: false, canTrackMatches: false, canManageMatchTimer: false,
    canViewAnalytics: false, canViewStatistics: false, canExportData: false, canViewReports: false,
    canAnalyzeVideos: false, canUploadVideos: false, canDeleteVideos: false, canManageVideoJobs: false,
    canManageUsers: false, canViewUserProfiles: false, canAssignRoles: false, canDeleteUsers: false,
    canAccessAdmin: false, canManageSettings: false, canViewSystemLogs: false, canManageDatabase: false,
    canUseVoiceChat: false, canModerateChat: false,
    canViewDashboard: true, canViewOwnProfile: true, canEditOwnProfile: true,
  },
  viewer: {
    canCreateMatches: false, canEditMatches: false, canDeleteMatches: false, canViewMatches: false, canTrackMatches: false, canManageMatchTimer: false,
    canViewAnalytics: false, canViewStatistics: false, canExportData: false, canViewReports: false,
    canAnalyzeVideos: false, canUploadVideos: false, canDeleteVideos: false, canManageVideoJobs: false,
    canManageUsers: false, canViewUserProfiles: false, canAssignRoles: false, canDeleteUsers: false,
    canAccessAdmin: false, canManageSettings: false, canViewSystemLogs: false, canManageDatabase: false,
    canUseVoiceChat: false, canModerateChat: false,
    canViewDashboard: true, canViewOwnProfile: true, canEditOwnProfile: false,
  },
};

export const useUserPermissions = (userId?: string) => {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // CHANGED: Fetch custom_permissions along with the role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, custom_permissions')
          .eq('id', userId)
          .single();

        if (profileError) {
          throw new Error(`Failed to fetch user profile: ${profileError.message}`);
        }

        const userRole = profile?.role as UserRole;
        
        if (!userRole || !DEFAULT_PERMISSIONS[userRole]) {
          throw new Error(`Invalid or missing role: ${userRole}`);
        }

        setRole(userRole);

        // CHANGED: Merge role defaults with custom overrides from the database
        const roleDefaults = DEFAULT_PERMISSIONS[userRole];
        const customPermissions = (profile.custom_permissions as Partial<RolePermissions>) || {};
        const finalPermissions = { ...roleDefaults, ...customPermissions };

        setPermissions(finalPermissions);

      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        
        setPermissions({
          ...DEFAULT_PERMISSIONS.viewer,
          canViewDashboard: true,
          canViewOwnProfile: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPermissions();
  }, [userId]);

  return {
    permissions,
    role,
    isLoading,
    error,
  };
};
