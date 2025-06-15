
import { useMemo } from 'react';
import { useUserPermissions, RolePermissions } from './useUserPermissions';

export const usePermissionChecker = (userId?: string) => {
  const { permissions, role, isLoading, error } = useUserPermissions(userId);

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
    
    // Combined role checks
    hasAdminAccess: () => role === 'admin',
    hasManagerAccess: () => ['admin', 'manager'].includes(role || ''),
    hasTrackerAccess: () => ['admin', 'tracker'].includes(role || ''),
    hasTeacherAccess: () => ['admin', 'manager', 'teacher'].includes(role || ''),
    
    // Data
    permissions,
    role,
    isLoading,
    error
  }), [permissions, role, isLoading, error]);

  return checker;
};
