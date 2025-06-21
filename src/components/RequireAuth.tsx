
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissionChecker, type RolePermissions } from '@/hooks/usePermissionChecker';
import { Loader2 } from 'lucide-react';

export const RequireAuth: React.FC<{ 
  children: React.ReactNode;
  requiredRoles?: Array<'admin' | 'tracker' | 'viewer' | 'user' | 'manager' | 'teacher'>;
  requiredPermissions?: Array<keyof RolePermissions>;
}> = ({ 
  children, 
  requiredRoles,
  requiredPermissions
}) => {
  const { user, loading } = useAuth();
  const { role, hasPermission, isLoading: permissionsLoading } = usePermissionChecker();
  const location = useLocation();

  const isLoading = loading || permissionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">Loading...</span>
      </div>
    );
  }

  // If user is not logged in, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If specific roles are required, check user's role
  if (requiredRoles && requiredRoles.length > 0) {
    if (!role || !requiredRoles.includes(role as any)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If specific permissions are required, check user's permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
};

// Helper components for specific access levels
export const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RequireAuth requiredRoles={['admin']}>
      {children}
    </RequireAuth>
  );
};

export const ManagerAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RequireAuth requiredRoles={['admin', 'manager']}>
      {children}
    </RequireAuth>
  );
};

export const TrackerAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RequireAuth requiredRoles={['admin', 'tracker']}>
      {children}
    </RequireAuth>
  );
};
