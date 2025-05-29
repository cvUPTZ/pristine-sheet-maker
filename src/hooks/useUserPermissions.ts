import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Adjust path if needed
import { useAuth } from '@/context/AuthContext'; // To get current user if no userId is passed

// Define types copied from AccessManagement.tsx or from a shared types file
export type UserRole = 'admin' | 'tracker' | 'teacher' | 'user' | string; // Allow string for flexibility if roles can be dynamic

export interface RolePermissions {
  pitchView: boolean;
  pianoInput: boolean;
  statistics: boolean;
  timeline: boolean;
  analytics: boolean;
  ballTracking: boolean;
  liveEvents: boolean;
  // Add any other permissions that might be defined
  [key: string]: boolean; // Allow additional dynamic permissions
}

// Default permissions structure (can be imported from AccessManagement or defined here)
// For now, let's redefine it here to make the hook self-contained,
// but ideally, this would come from a shared source if used in multiple places.
const defaultPermissions: Record<UserRole, RolePermissions> = {
  admin: {
    pitchView: true,
    pianoInput: true,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: true,
    liveEvents: true,
  },
  tracker: {
    pitchView: false,
    pianoInput: true,
    statistics: false,
    timeline: false,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
  },
  teacher: {
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: true,
    ballTracking: false,
    liveEvents: false,
  },
  user: { // Default for 'user' role
    pitchView: true,
    pianoInput: false,
    statistics: true,
    timeline: true,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
  },
  // Fallback for any other role not explicitly defined, provide minimal permissions
  default: { 
    pitchView: false,
    pianoInput: false,
    statistics: false,
    timeline: false,
    analytics: false,
    ballTracking: false,
    liveEvents: false,
  }
};

interface UseUserPermissionsReturn {
  permissions: RolePermissions | null;
  role: UserRole | null;
  isLoading: boolean;
  error: Error | null;
}

export const useUserPermissions = (userId?: string): UseUserPermissionsReturn => {
  const { user: currentUser } = useAuth(); // Get the currently authenticated user
  const targetUserId = userId || currentUser?.id;

  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!targetUserId) {
      // If no targetUserId (and no logged-in user if userId wasn't provided),
      // set to default non-permissive state or handle as an error/guest.
      // For now, let's assume a guest/default role if no user.
      // Or, if a user MUST be logged in, setError('User not found or not authenticated.');
      const guestRole: UserRole = 'user'; // Or a specific 'guest' role if defined
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
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles_with_role') // Change to this view
          .select('role') // Assuming the 'role' column exists in this view
          .eq('id', targetUserId) // Assuming 'id' is still the correct column for matching user ID
          .single();

        if (profileError) {
          console.error('Error fetching user profile for permissions:', profileError);
          throw new Error(`Failed to fetch user role: ${profileError.message}`);
        }

        if (!profile || !profile.role) {
          throw new Error('User profile or role not found.');
        }

        const userRole = profile.role as UserRole;
        setRole(userRole);

        // Determine permissions:
        // Placeholder: In a real scenario, you might fetch permissions assigned to the role from a 'role_permissions' table.
        // For now, we use the hardcoded defaultPermissions object.
        // If a role has specific overrides in 'profiles.permissions' column, that should take precedence.
        // This example assumes 'defaultPermissions' is the source of truth based on role.
        const roleSpecificPermissions = defaultPermissions[userRole] || defaultPermissions.default;
        setPermissions(roleSpecificPermissions);

      } catch (e: any) {
        console.error('useUserPermissions error:', e);
        setError(e);
        setPermissions(defaultPermissions.default); // Fallback to default non-permissive on error
        setRole('default'); // Fallback role
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [targetUserId]);

  return { permissions, role, isLoading, error };
};
