import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js'; // Renamed to avoid conflict
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Define a clear type for User, including expected custom metadata
export type UserRole = 'admin' | 'tracker' | 'viewer' | 'user'; // Added 'user' as a common default

export interface User extends SupabaseUser {
  app_metadata: {
    role?: UserRole; // This is where the role (from user_roles table) should be reflected
    // other app_metadata fields...
  };
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: UserRole | null;
  assignedEventTypes: string[] | null;
  refreshUserSessionAndRole: () => Promise<void>; // Renamed for clarity
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[] | null>(null);
  const { toast } = useToast();

  const processUserSession = useCallback((currentSession: Session | null) => {
    setSession(currentSession);
    const currentUser = currentSession?.user as User | null; // Cast to our extended User type
    setUser(currentUser);

    if (currentUser) {
      // The role should be directly available in app_metadata,
      // ideally set by a backend trigger/function when the user_roles table is updated.
      const roleFromAppMeta = currentUser.app_metadata?.role;
      console.log(`Processing session for ${currentUser.email}. Role from app_metadata: ${roleFromAppMeta}`);

      if (roleFromAppMeta && ['admin', 'tracker', 'viewer', 'user'].includes(roleFromAppMeta)) {
        setUserRole(roleFromAppMeta);
      } else {
        // If role is missing or invalid in app_metadata, default to 'user' or null
        // and log a warning. This indicates a potential sync issue.
        console.warn(
          `User ${currentUser.email} has an invalid or missing role in app_metadata ('${roleFromAppMeta}'). Defaulting to 'user'. Ensure app_metadata.role is correctly set from user_roles table.`
        );
        setUserRole('user'); // Or null, depending on your desired default behavior
      }
    } else {
      setUserRole(null);
    }
  }, []);


  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      processUserSession(initialSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('Auth state changed. Event:', _event, 'New Session User:', newSession?.user?.email);
        processUserSession(newSession);
        // TOKEN_REFRESHED or USER_UPDATED events are good times to re-check,
        // as app_metadata might have been updated by the backend.
      }
    );
    return () => subscription.unsubscribe();
  }, [processUserSession]);

  const fetchUserEventAssignments = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_event_assignments')
        .select('event_type')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user event assignments:', error);
        setAssignedEventTypes([]); // Default to empty array on error
        return;
      }
      setAssignedEventTypes(data ? data.map(item => item.event_type) : []);
    } catch (e) {
      console.error('Exception fetching user event assignments:', e);
      setAssignedEventTypes([]);
    }
  }, []);
  
  useEffect(() => {
    if (user?.id) {
      fetchUserEventAssignments(user.id);
    } else {
      setAssignedEventTypes(null);
    }
  }, [user, fetchUserEventAssignments]);

  // This function is crucial for ensuring the client has the latest user data, including app_metadata.role
  const refreshUserSessionAndRole = useCallback(async () => {
    setLoading(true);
    try {
      // First, ensure the local session object is up-to-date with the server.
      // This doesn't necessarily re-fetch the user object itself with all metadata from DB.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Error refreshing session before fetching user:", refreshError);
        // Potentially sign out user if refresh fails critically
        // toast({ title: "Session Refresh Error", description: refreshError.message, variant: "destructive" });
        // processUserSession(null); // Clear session
        // setLoading(false);
        // return;
      }

      // Second, explicitly re-fetch the user object from the server.
      // This is the step that gets the latest app_metadata.
      const { data: { user: updatedUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) {
        console.error("Error re-fetching user after session refresh:", getUserError);
        toast({ title: "User Data Refresh Error", description: getUserError.message, variant: "destructive" });
        // Don't necessarily clear session here, might be a temporary issue
      } else if (updatedUser) {
        console.log("User data re-fetched. New app_metadata should be available:", updatedUser.app_metadata);
         // supabase.auth.getUser() returns a fresh user object, but not a full session object.
         // We need to get the full current session to pass to processUserSession.
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        processUserSession(currentSession); // This will update user and userRole state based on new app_metadata
        toast({ title: "User Data Refreshed", description: "Your user information has been updated." });
      } else {
        // This case might occur if the user was deleted or session truly invalidated
        processUserSession(null);
      }
    } catch (e: any) {
      console.error("Exception refreshing user session and role:", e);
      toast({ title: "Session Refresh Exception", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [processUserSession, toast]);


  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        throw error; // Re-throw to allow caller to handle
      }
      // onAuthStateChange will handle processing the new session
      toast({ title: "Signed in", description: "Welcome back!" });
    } catch (error: any) {
      console.error('Error signing in:', error.message);
      // No need to re-throw if already handled by toast and caller doesn't need it
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      // On sign-up, app_metadata.role won't be set yet by default.
      // This needs to be handled by a backend mechanism (trigger or function).
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName /* other initial user_metadata */ }
          // We cannot set app_metadata directly here.
        }
      });

      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        throw error;
      }
      if (signUpData.user) {
        toast({ title: "Account created", description: "Please check your email for a confirmation link. Your role will be assigned shortly." });
        // The role will be null/default until the backend process updates app_metadata
        // and the user's session is refreshed or they log in again.
      }
    } catch (error: any) {
      console.error('Error signing up:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      // onAuthStateChange will set user and session to null.
      toast({ title: "Signed out", description: "You have been signed out successfully." });
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast({ title: "Sign out failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      userRole,
      assignedEventTypes,
      refreshUserSessionAndRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
