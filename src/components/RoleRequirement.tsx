
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RoleRequirementProps {
  requiredRole: 'admin' | 'tracker' | 'user' | 'authenticated' | 'any';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleRequirement: React.FC<RoleRequirementProps> = ({ 
  requiredRole, 
  children,
  fallback = null
}) => {
  const { user, isAdmin, isTracker } = useAuth();
  
  // If requiredRole is 'any', show content regardless of role
  if (requiredRole === 'any') {
    return <>{children}</>;
  }
  
  // Check if user is authenticated when that's the requirement
  if (requiredRole === 'authenticated') {
    return user ? <>{children}</> : fallback;
  }
  
  // Check for specific roles
  if (requiredRole === 'admin' && isAdmin) {
    return <>{children}</>;
  }
  
  if (requiredRole === 'tracker' && isTracker) {
    return <>{children}</>;
  }
  
  if (requiredRole === 'user' && user && !isAdmin && !isTracker) {
    return <>{children}</>;
  }
  
  // If none of the conditions are met, return fallback or null
  return fallback;
};

export default RoleRequirement;
