import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client'; // Ensure this path is correct
import { useToast } from '@/components/ui/use-toast'; // Ensure this path is correct

// Define the possible user roles
type UserRoleType = 'admin' | 'tracker' | 'viewer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: UserRoleType | null; // Role can be one of the types or null
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
      console.log(`AuthProvider: Processing session for user: ${currentUser.email}`);
      // --- DEBUGGING: Log the entire app_metadata ---
      console.log(`AuthProvider: currentUser.app_metadata:`, JSON.stringify(currentUser.app_metadata, null, 2)); 
      // --- END DEBUGGING ---

      // Roles should be stored in app_metadata, which is not client-modifiable
      if (currentUser.app_metadata && typeof currentUser.app_metadata.role === 'string') {
        const roleFromAppMeta = currentUser.app_metadata.role;
        
        // Validate the role from app_metadata against our defined UserRoleType
        if (['admin', 'tracker', 'viewer'].includes(roleFromAppMeta)) {
          newRole = roleFromAppMeta as UserRoleType;
          console.log(`AuthProvider: User role determined from app_metadata: ${newRole}`);
        } else {
          console.warn(
            `AuthProvider: User ${currentUser.email} has an UNRECOGNIZED role '${roleFromAppMeta}' in app_metadata. Defaulting to no specific role.`
          );
          // newRole remains null
        }
      } else {
        console.warn(
          `AuthProvider: User ${currentUser.email} has NO 'role' property in app_metadata, or it's not a string. Defaulting to no specific role.`
        );
        // newRole remains null
      }
    } else {
      console.log("AuthProvider: No active user session. Role will be null.");
      // newRole is already null
    }
    
    setUserRole(newRole);
  }, []); // No external dependencies needed for processSession itself

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      processSession(initialSession);
      setLoading(false);
    }).catch(error => {
      console.error("AuthProvider: Error getting initial session:", error);
      processSession(null); // Ensure state is clean on error
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('AuthProvider: Auth state changed. Event:', _event, 'New Session User:', newSession?.user?.email);
        processSession(newSession);
        if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
            console.log('AuthProvider: Token refreshed or user updated, re-evaluating role from new session data.');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [processSession]); // processSession is memoized with useCallback

  const fetchUserEventAssignments = useCallback(async (userId: string) => {
    if (!userId) {
      setAssignedEventTypes(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_event_assignments') // Make sure this table name is correct
        .select('event_type')
        .eq('user_id', userId);

      if (error) {
        console.error('AuthProvider: Error fetching user event assignments:', error);
        toast({ title: "Error", description: "Could not fetch event assignments.", variant: "destructive" });
        setAssignedEventTypes([]); // Set to empty array on error
        return;
      }
      setAssignedEventTypes(data ? data.map(item => item.event_type) : []);
      console.log('AuthProvider: Fetched event assignments:', assignedEventTypes);
    } catch (e: any) {
      console.error('AuthProvider: Exception fetching user event assignments:', e);
      toast({ title: "Error", description: "An exception occurred while fetching event assignments.", variant: "destructive" });
      setAssignedEventTypes([]);
    }
  }, [toast]); // Removed assignedEventTypes from here as it was causing potential issues if used directly from state
  
  useEffect(() => {
    if (user?.id) {
      fetchUserEventAssignments(user.id);
    } else {
      setAssignedEventTypes(null); // Clear assignments if no user
    }
  }, [user, fetchUserEventAssignments]);

  const refreshUserSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("AuthProvider: Error refreshing session:", error);
        toast({ title: "Session Refresh Error", description: error.message, variant: "destructive" });
      } else if (data.session) {
        console.log("AuthProvider: Session refreshed successfully. New app_metadata should be available.");
        processSession(data.session); // This will re-evaluate the role
        toast({ title: "Session Refreshed", description: "Your session data has been updated." });
      } else {
        console.log("AuthProvider: Session refresh resulted in no active session.");
        processSession(null);
      }
    } catch (e: any) {
      console.error("AuthProvider: Exception refreshing session:", e);
      toast({ title: "Session Refresh Exception", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [processSession, toast]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "Signed in", description: "Welcome back!" });
      // onAuthStateChange will handle setting user, session, and role via processSession
    } catch (error: any) {
      console.error('AuthProvider: Error signing in:', error.message);
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
      const { data: functionResponse, error: invokeError } = await supabase.functions.invoke('create-user', { // Ensure 'create-user' is the correct function name
        body: {
          email,
          password,
          fullName,
          role: 'viewer' // Default role, ensure your Edge Function sets this in app_metadata
        }
      });

      if (invokeError) {
        console.error('AuthProvider: Error invoking create-user function:', invokeError);
        toast({ title: "Sign up failed", description: invokeError.message, variant: "destructive" });
        throw invokeError;
      }

      if (functionResponse && functionResponse.error) {
        console.error('AuthProvider: Error from create-user function logic:', functionResponse.error);
        const errorMessage = typeof functionResponse.error === 'string' ? functionResponse.error : (functionResponse.error.message || "Sign up process failed.");
        toast({ title: "Sign up failed", description: errorMessage, variant: "destructive" });
        throw new Error(errorMessage);
      }

      toast({ title: "Account created", description: "Please check your email for a confirmation link to activate your account." });
    } catch (error: any) {
      console.error('AuthProvider: Error during sign up process:', error.message);
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
      toast({ title: "Signed out", description: "You have been signed out successfully." });
      // onAuthStateChange will set user, session, and role to null via processSession
    } catch (error: any) {
      console.error('AuthProvider: Error signing out:', error.message);
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
