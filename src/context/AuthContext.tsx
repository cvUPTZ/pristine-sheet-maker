import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Define the possible user roles
type UserRoleType = 'admin' | 'tracker' | 'viewer'; // Removed null from here, role will be UserRoleType | null

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: UserRoleType | null; // Role can be one of the types or null if not authenticated/no role
  assignedEventTypes: string[] | null;
  refreshUserSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[] | null>(null);
  const { toast } = useToast();

  const processSession = useCallback((currentSession: Session | null) => {
    setSession(currentSession);
    const currentUser = currentSession?.user ?? null;
    setUser(currentUser);

    let newRole: UserRoleType | null = null;

    if (currentUser) {
      console.log(`Processing session for user: ${currentUser.email}`);
      // Roles should be stored in app_metadata, which is not client-modifiable
      if (currentUser.app_metadata && typeof currentUser.app_metadata.role === 'string') {
        const roleFromAppMeta = currentUser.app_metadata.role;
        
        // Validate the role from app_metadata against our defined UserRoleType
        if (['admin', 'tracker', 'viewer'].includes(roleFromAppMeta)) {
          newRole = roleFromAppMeta as UserRoleType;
          console.log(`User role from app_metadata: ${newRole}`);
        } else {
          console.warn(
            `User ${currentUser.email} has an unrecognized role '${roleFromAppMeta}' in app_metadata. Defaulting to no specific role.`
          );
          // newRole remains null
        }
      } else {
        console.warn(
          `User ${currentUser.email} has no 'role' property in app_metadata, or it's not a string. Defaulting to no specific role.`
        );
        // newRole remains null
      }
      console.log('Full app_metadata for user:', JSON.stringify(currentUser.app_metadata, null, 2));
    } else {
      console.log("No active user session. Role will be null.");
      // newRole is already null
    }
    
    setUserRole(newRole);
  }, []); // No dependencies, as it processes the session passed to it

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      processSession(initialSession);
      setLoading(false);
    }).catch(error => {
      console.error("Error getting initial session:", error);
      processSession(null); // Ensure state is clean on error
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('Auth state changed. Event:', _event, 'New Session User:', newSession?.user?.email);
        processSession(newSession);
        if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
            console.log('Token refreshed or user updated, re-evaluating role from new session data.');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [processSession]); // processSession is now memoized with useCallback

  const fetchUserEventAssignments = useCallback(async (userId: string) => {
    if (!userId) {
      setAssignedEventTypes(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_event_assignments')
        .select('event_type')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user event assignments:', error);
        toast({ title: "Error", description: "Could not fetch event assignments.", variant: "destructive" });
        setAssignedEventTypes([]); // Set to empty array on error to indicate fetch attempt
        return;
      }
      setAssignedEventTypes(data ? data.map(item => item.event_type) : []);
    } catch (e: any) {
      console.error('Exception fetching user event assignments:', e);
      toast({ title: "Error", description: "An exception occurred while fetching event assignments.", variant: "destructive" });
      setAssignedEventTypes([]);
    }
  }, [toast]);
  
  useEffect(() => {
    if (user?.id) {
      fetchUserEventAssignments(user.id);
    } else {
      setAssignedEventTypes(null); // Clear assignments if no user
    }
  }, [user, fetchUserEventAssignments]); // Added fetchUserEventAssignments to dependencies

  const refreshUserSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Error refreshing session:", error);
        toast({ title: "Session Refresh Error", description: error.message, variant: "destructive" });
        // Optionally, if refresh fails significantly (e.g. invalid refresh token), sign out user
        // processSession(null); 
      } else if (data.session) {
        console.log("Session refreshed successfully. New app_metadata should be available.");
        processSession(data.session); // This will re-evaluate the role
        toast({ title: "Session Refreshed", description: "Your session data has been updated." });
      } else {
        // This case means the refresh resulted in no session (e.g., user was logged out server-side)
        console.log("Session refresh resulted in no active session.");
        processSession(null);
      }
    } catch (e: any) {
      console.error("Exception refreshing session:", e);
      toast({ title: "Session Refresh Exception", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [processSession, toast]); // Added processSession and toast

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        throw error; // Re-throw to allow calling components to handle if needed
      }
      // onAuthStateChange will handle setting user and session via processSession
      toast({ title: "Signed in", description: "Welcome back!" });
    } catch (error: any) {
      console.error('Error signing in:', error.message);
      // Ensure toast is shown if not already handled by the specific error check.
      if (!error.message.toLowerCase().includes("sign in failed")) {
        toast({ title: "Sign in error", description: error.message || "An unknown error occurred.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      // The 'create-user' Edge Function is responsible for:
      // 1. Creating the user in Supabase Auth.
      // 2. Setting the initial `app_metadata.role` (e.g., to 'viewer').
      // 3. Handling any errors during this process.
      const { data: functionResponse, error: invokeError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          role: 'viewer' // Default role for new signups, managed by the Edge Function
        }
      });

      if (invokeError) {
        console.error('Error invoking create-user function:', invokeError);
        toast({ title: "Sign up failed", description: invokeError.message, variant: "destructive" });
        throw invokeError;
      }

      if (functionResponse && functionResponse.error) {
        console.error('Error from create-user function logic:', functionResponse.error);
        const errorMessage = typeof functionResponse.error === 'string' ? functionResponse.error : (functionResponse.error.message || "Sign up process failed.");
        toast({ title: "Sign up failed", description: errorMessage, variant: "destructive" });
        throw new Error(errorMessage);
      }

      // Success: The Edge Function handled user creation and role assignment.
      // Supabase Auth typically sends a confirmation email.
      toast({ title: "Account created", description: "Please check your email for a confirmation link to activate your account." });
      // The user will need to confirm their email and then sign in.
      // `onAuthStateChange` will pick up the session once they are confirmed and logged in.

    } catch (error: any) {
      console.error('Error during sign up process:', error.message);
      // Avoid double-toasting if already handled
      const knownMessages = ["Sign up failed", "Error invoking create-user function"];
      if (!knownMessages.some(msg => error.message.includes(msg))) {
         toast({ title: "Sign up error", description: error.message || "An unknown error occurred.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ title: "Sign out failed", description: error.message, variant: "destructive" });
        throw error;
      }
      // onAuthStateChange will set user and session to null via processSession
      toast({ title: "Signed out", description: "You have been signed out successfully." });
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      if (!error.message.toLowerCase().includes("sign out failed")) {
        toast({ title: "Sign out error", description: error.message || "An unknown error occurred.", variant: "destructive" });
      }
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
      refreshUserSession,
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
