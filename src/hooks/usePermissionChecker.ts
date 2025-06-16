
// hooks/usePermissionChecker.ts
import { useMemo } from 'react';
import { useUserPermissions, RolePermissions, UserRole } from './useUserPermissions';
import { useAuth } from '@/context/AuthContext';

export { RolePermissions, UserRole } from './useUserPermissions';

export const usePermissionChecker = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const { permissions, role, isLoading, error } = useUserPermissions(targetUserId);

  const checker = useMemo(() => ({
    // Role-based checks
    isAdmin: () => role === 'admin',
    isManager: () => role === 'manager',
    isTracker: () => role === 'tracker',
    isTeacher: () => role === 'teacher',
    isUser: () => role === 'user',
    isViewer: () => role === 'viewer',
    
    // Permission-based checks
    hasPermission: (permission: keyof RolePermissions) => {
      return permissions?.[permission] || false;
    },
    
    // Combined role checks (hierarchical access)
    hasAdminAccess: () => role === 'admin',
    hasManagerAccess: () => ['admin', 'manager'].includes(role || ''),
    hasTrackerAccess: () => ['admin', 'tracker'].includes(role || ''),
    hasTeacherAccess: () => ['admin', 'manager', 'teacher'].includes(role || ''),
    hasUserAccess: () => ['admin', 'manager', 'teacher', 'user'].includes(role || ''),
    
    // Specific permission groups
    canManageMatches: () => {
      return permissions?.canCreateMatches || permissions?.canEditMatches || permissions?.canDeleteMatches || false;
    },
    
    canViewMatchData: () => {
      return permissions?.canViewMatches || permissions?.canViewAnalytics || permissions?.canViewStatistics || false;
    },
    
    canHandleVideos: () => {
      return permissions?.canAnalyzeVideos || permissions?.canUploadVideos || permissions?.canManageVideoJobs || false;
    },
    
    canAdministrate: () => {
      return permissions?.canAccessAdmin || permissions?.canManageUsers || permissions?.canManageSettings || false;
    },
    
    // Utility functions
    getRoleDisplayName: () => {
      const roleNames: Record<UserRole, string> = {
        admin: 'Administrator',
        manager: 'Manager',
        tracker: 'Match Tracker',
        teacher: 'Teacher',
        user: 'User',
        viewer: 'Viewer'
      };
      return role ? roleNames[role] : 'Unknown';
    },
    
    getPermissionCount: () => {
      if (!permissions) return 0;
      return Object.values(permissions).filter(Boolean).length;
    },
    
    getAllowedRoutes: () => {
      const routes: string[] = ['/dashboard', '/settings'];
      
      if (!permissions) return routes;
      
      if (permissions.canViewMatches) routes.push('/matches');
      if (permissions.canCreateMatches) routes.push('/create-match');
      if (permissions.canTrackMatches) routes.push('/match', '/tracker');
      if (permissions.canViewAnalytics) routes.push('/analytics');
      if (permissions.canViewStatistics) routes.push('/statistics');
      if (permissions.canAnalyzeVideos) routes.push('/video-analysis', '/direct-analyzer');
      if (permissions.canAccessAdmin) routes.push('/admin', '/admin/profiles');
      
      return [...new Set(routes)]; // Remove duplicates
    },
    
    // Data
    permissions,
    role,
    isLoading,
    error
  }), [permissions, role, isLoading, error]);

  return checker;
};

// hooks/useMatchPermissions.ts (Specialized hook for match-related permissions)
export const useMatchPermissions = (matchId?: string) => {
  const permissions = usePermissionChecker();

  return useMemo(() => ({
    ...permissions,
    
    // Match-specific permission combinations
    canAccessMatch: (matchStatus?: string) => {
      if (permissions.hasAdminAccess()) return true;
      if (matchStatus === 'live' && permissions.hasTrackerAccess()) return true;
      return permissions.hasPermission('canViewMatches');
    },
    
    canEditMatch: () => {
      return permissions.hasAdminAccess() || permissions.hasPermission('canEditMatches');
    },
    
    canDeleteMatch: () => {
      return permissions.hasAdminAccess() || permissions.hasPermission('canDeleteMatches');
    },
    
    canTrackMatch: (matchStatus?: string) => {
      if (!permissions.hasPermission('canTrackMatches')) return false;
      return matchStatus === 'live' || matchStatus === 'pending';
    },
    
    canViewMatchAnalytics: () => {
      return permissions.hasManagerAccess() || permissions.hasPermission('canViewAnalytics');
    },
    
    canManageMatchTimer: () => {
      return permissions.hasAdminAccess() || permissions.hasPermission('canManageMatchTimer');
    },
    
    getMatchActions: (matchStatus?: string) => {
      const actions: string[] = [];
      
      if (permissions.hasPermission('canViewMatches')) actions.push('view');
      if (permissions.canEditMatch()) actions.push('edit');
      if (permissions.canDeleteMatch()) actions.push('delete');
      if (permissions.canTrackMatch(matchStatus)) actions.push('track');
      if (permissions.canViewMatchAnalytics()) actions.push('analytics');
      if (permissions.canManageMatchTimer()) actions.push('timer');
      
      return actions;
    }
  }), [permissions, matchId]);
};