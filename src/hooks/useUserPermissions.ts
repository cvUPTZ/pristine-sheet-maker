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

const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // Match Management
    canCreateMatches: true,
    canEditMatches: true,
    canDeleteMatches: true,
    canViewMatches: true,
    canTrackMatches: true,
    canManageMatchTimer: true,
    
    // Analytics & Statistics
    canViewAnalytics: true,
    canViewStatistics: true,
    canExportData: true,
    canViewReports: true,
    
    // Video Analysis
    canAnalyzeVideos: true,
    canUploadVideos: true,
    canDeleteVideos: true,
    canManageVideoJobs: true,
    
    // User Management
    canManageUsers: true,
    canViewUserProfiles: true,
    canAssignRoles: true,
    canDeleteUsers: true,
    
    // Administrative
    canAccessAdmin: true,
    canManageSettings: true,
    canViewSystemLogs: true,
    canManageDatabase: true,
    
    // Communication
    canUseVoiceChat: true,
    canModerateChat: true,
    
    // General Access
    canViewDashboard: true,
    canViewOwnProfile: true,
    canEditOwnProfile: true,
  },
  
  manager: {
    // Match Management
    canCreateMatches: true,
    canEditMatches: true,
    canDeleteMatches: false,
    canViewMatches: true,
    canTrackMatches: false,
    canManageMatchTimer: false,
    
    // Analytics & Statistics
    canViewAnalytics: true,
    canViewStatistics: true,
    canExportData: true,
    canViewReports: true,
    
    // Video Analysis
    canAnalyzeVideos: true,
    canUploadVideos: true,
    canDeleteVideos: false,
    canManageVideoJobs: true,
    
    // User Management
    canManageUsers: false,
    canViewUserProfiles: true,
    canAssignRoles: false,
    canDeleteUsers: false,
    
    // Administrative
    canAccessAdmin: false,
    canManageSettings: false,
    canViewSystemLogs: false,
    canManageDatabase: false,
    
    // Communication
    canUseVoiceChat: true,
    canModerateChat: true,
    
    // General Access
    canViewDashboard: true,
    canViewOwnProfile: true,
    canEditOwnProfile: true,
  },
  
  tracker: {
    // Match Management
    canCreateMatches: false,
    canEditMatches: false,
    canDeleteMatches: false,
    canViewMatches: true,
    canTrackMatches: true,
    canManageMatchTimer: false,
    
    // Analytics & Statistics
    canViewAnalytics: false,
    canViewStatistics: true,
    canExportData: false,
    canViewReports: false,
    
    // Video Analysis
    canAnalyzeVideos: false,
    canUploadVideos: false,
    canDeleteVideos: false,
    canManageVideoJobs: false,
    
    // User Management
    canManageUsers: false,
    canViewUserProfiles: false,
    canAssignRoles: false,
    canDeleteUsers: false,
    
    // Administrative
    canAccessAdmin: false,
    canManageSettings: false,
    canViewSystemLogs: false,
    canManageDatabase: false,
    
    // Communication
    canUseVoiceChat: true,
    canModerateChat: false,
    
    // General Access
    canViewDashboard: true,
    canViewOwnProfile: true,
    canEditOwnProfile: true,
  },
  
  teacher: {
    // Match Management
    canCreateMatches: false,
    canEditMatches: false,
    canDeleteMatches: false,
    canViewMatches: true,
    canTrackMatches: false,
    canManageMatchTimer: false,
    
    // Analytics & Statistics
    canViewAnalytics: true,
    canViewStatistics: true,
    canExportData: false,
    canViewReports: true,
    
    // Video Analysis
    canAnalyzeVideos: true,
    canUploadVideos: true,
    canDeleteVideos: false,
    canManageVideoJobs: false,
    
    // User Management
    canManageUsers: false,
    canViewUserProfiles: false,
    canAssignRoles: false,
    canDeleteUsers: false,
    
    // Administrative
    canAccessAdmin: false,
    canManageSettings: false,
    canViewSystemLogs: false,
    canManageDatabase: false,
    
    // Communication
    canUseVoiceChat: true,
    canModerateChat: false,
    
    // General Access
    canViewDashboard: true,
    canViewOwnProfile: true,
    canEditOwnProfile: true,
  },
  
  user: {
    // Match Management
    canCreateMatches: false,
    canEditMatches: false,
    canDeleteMatches: false,
    canViewMatches: false,
    canTrackMatches: false,
    canManageMatchTimer: false,
    
    // Analytics & Statistics
    canViewAnalytics: false,
    canViewStatistics: false,
    canExportData: false,
    canViewReports: false,
    
    // Video Analysis
    canAnalyzeVideos: false,
    canUploadVideos: false,
    canDeleteVideos: false,
    canManageVideoJobs: false,
    
    // User Management
    canManageUsers: false,
    canViewUserProfiles: false,
    canAssignRoles: false,
    canDeleteUsers: false,
    
    // Administrative
    canAccessAdmin: false,
    canManageSettings: false,
    canViewSystemLogs: false,
    canManageDatabase: false,
    
    // Communication
    canUseVoiceChat: false,
    canModerateChat: false,
    
    // General Access
    canViewDashboard: true,
    canViewOwnProfile: true,
    canEditOwnProfile: true,
  },
  
  viewer: {
    // Match Management
    canCreateMatches: false,
    canEditMatches: false,
    canDeleteMatches: false,
    canViewMatches: false,
    canTrackMatches: false,
    canManageMatchTimer: false,
    
    // Analytics & Statistics
    canViewAnalytics: false,
    canViewStatistics: false,
    canExportData: false,
    canViewReports: false,
    
    // Video Analysis
    canAnalyzeVideos: false,
    canUploadVideos: false,
    canDeleteVideos: false,
    canManageVideoJobs: false,
    
    // User Management
    canManageUsers: false,
    canViewUserProfiles: false,
    canAssignRoles: false,
    canDeleteUsers: false,
    
    // Administrative
    canAccessAdmin: false,
    canManageSettings: false,
    canViewSystemLogs: false,
    canManageDatabase: false,
    
    // Communication
    canUseVoiceChat: false,
    canModerateChat: false,
    
    // General Access
    canViewDashboard: true,
    canViewOwnProfile: true,
    canEditOwnProfile: false,
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

        // First, get the user's profile to get their role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
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

        // Check if there are custom permissions in the database
        const { data: customPermissions, error: permError } = await supabase
          .from('user_permissions')
          .select('permission_key, granted')
          .eq('user_id', userId);

        if (permError && permError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.warn('Failed to fetch custom permissions:', permError.message);
        }

        // Start with default permissions for the role
        let finalPermissions = { ...DEFAULT_PERMISSIONS[userRole] };

        // Apply any custom permissions if they exist
        if (customPermissions && customPermissions.length > 0) {
          customPermissions.forEach(customPerm => {
            if (customPerm.permission_key in finalPermissions) {
              finalPermissions[customPerm.permission_key as keyof RolePermissions] = customPerm.granted;
            }
          });
        }

        setPermissions(finalPermissions);
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        
        // Set minimal permissions on error
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
