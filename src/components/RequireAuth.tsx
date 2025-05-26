import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// Define the props interface
interface RequireAuthProps {
  children: React.ReactNode;
  requiredRoles?: Array<'admin' | 'tracker' | 'viewer'>;
}

// Define and export the component
const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requiredRoles 
}) => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
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
    if (!userRole || !requiredRoles.includes(userRole)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-gray-600">Required roles: {requiredRoles.join(', ')}</p>
          <p className="text-gray-600">Your role: {userRole || 'none'}</p>
        </div>
      );
    }
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
};

export default RequireAuth;
