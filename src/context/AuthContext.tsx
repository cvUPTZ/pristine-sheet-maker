import React, { createContext, useState, useContext, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

type UserRoleType = 'admin' | 'tracker' | 'viewer' | null;

// Explicit Admin Email for initial/override check
const EXPLICIT_ADMIN_EMAIL = 'adminzack@efoot.com'; // <--- YOUR ADMIN EMAIL HERE

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: UserRoleType;
  assignedEventTypes: string[] | null;
  refreshUserSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRoleType>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[] | null>(null);
  const { toast } = useToast();

  const processSession = (currentSession: Session | null) => {
    setSession(currentSession);
    const currentUser = currentSession?.user ?? null;
    setUser(currentUser);

    let determinedRole: UserRoleType = null;

    if (currentUser) {
      console.log(`Processing session for ${currentUser.email}`);
      // 1. Explicit Admin Check (use with caution, primarily for bootstrapping/dev)
      if (currentUser.email === EXPLICIT_ADMIN_EMAIL) {
        console.log(`User ${currentUser.email} matches EXPLICIT_ADMIN_EMAIL. Setting role to 'admin'.`);
        determinedRole = 'admin';
      }
      
      // 2. Check app_metadata (this should be the primary source of truth)
      // If app_metadata has a role, it can override the explicit check if it's different and not admin
      // Or, you might decide the explicit check always wins if it's an admin.
      // Current logic: app_metadata role is preferred unless explicit admin is set.
      if (currentUser.app_metadata && currentUser.app_metadata.role) {
        const roleFromAppMeta = currentUser.app_metadata.role as UserRoleType;
        console.log(`Role from app_metadata for ${currentUser.email}: ${roleFromAppMeta}`);
        
        // If explicit admin was set, keep it. Otherwise, use app_metadata.
        // This means app_metadata can define 'tracker' or 'viewer' even for the explicit admin email,
        // but if the explicit email is matched, it defaults to 'admin' if app_metadata is missing role.
        if (determinedRole === 'admin') {
            // If explicit admin is already set, and app_metadata also says admin, that's fine.
            // If app_metadata says something else, you might want to log a warning or decide which takes precedence.
            // For now, if EXPLICIT_ADMIN_EMAIL matches, 'admin' role takes high precedence.
            if (roleFromAppMeta !== 'admin') {
                 console.warn(`User ${EXPLICIT_ADMIN_EMAIL} is an explicit admin, but app_metadata.role is '${roleFromAppMeta}'. Prioritizing explicit admin for now.`);
            }
        } else {
            determinedRole = roleFromAppMeta;
        }
      } else if (determinedRole !== 'admin') { // If not explicit admin and no app_metadata role
        console.warn(`User ${currentUser.email} has no role in app_metadata.`);
      }
      
      console.log('Full app_metadata:', JSON.stringify(currentUser.app_metadata, null, 2));
    }
    
    setUserRole(determinedRole);
  };

  // ... (rest of the useEffect for auth state, signIn, signUp, signOut, fetchUserEventAssignments, refreshUserSession remains the same as my previous corrected version)

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      processSession(initialSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('Auth state changed. Event:', _event, 'New Session User:', newSession?.user?.email);
        processSession(newSession);
        if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
            console.log('Token refreshed or user updated, re-evaluating role from new session.');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);


  const fetchUserEventAssignments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_event_assignments')
        .select('event_type')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user event assignments:', error);
        setAssignedEventTypes([]);
        return;
      }
      setAssignedEventTypes(data ? data.map(item => item.event_type) : []);
    } catch (e) {
      console.error('Exception fetching user event assignments:', e);
      setAssignedEventTypes([]);
    }
  };
  
  useEffect(() => {
    if (user?.id) {
      fetchUserEventAssignments(user.id);
    } else {
      setAssignedEventTypes(null);
    }
  }, [user]);

  const refreshUserSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Error refreshing session:", error);
        toast({ title: "Session Refresh Error", description: error.message, variant: "destructive" });
      } else if (data.session) {
        console.log("Session refreshed, new app_metadata should be available.");
        processSession(data.session);
        toast({ title: "Session Refreshed", description: "Your session data has been updated." });
      } else {
        processSession(null);
      }
    } catch (e: any) {
      console.error("Exception refreshing session:", e);
      toast({ title: "Session Refresh Exception", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "Signed in", description: "Welcome back!" });
    } catch (error: any) {
      console.error('Error signing in:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          fullName,
          role: 'viewer' // Default role for public signups
        }
      });

      if (invokeError) {
        // Handle error from the function invocation itself (e.g., network, function not found)
        toast({ title: "Sign up failed", description: invokeError.message, variant: "destructive" });
        throw invokeError;
      }

      if (data && data.error) {
        // Handle error reported by the Edge Function's own logic (e.g., user already exists, validation failure)
        toast({ title: "Sign up failed", description: data.error.message || data.error, variant: "destructive" });
        throw new Error(data.error.message || data.error);
      }

      // Assuming success if no errors above
      // The create-user function is expected to handle sending the confirmation email.
      toast({ title: "Account created", description: "Please check your email for a confirmation link." });
      // Note: Unlike supabase.auth.signUp, invoking the function directly won't automatically sign the user in
      // or set the session in the client. The user will need to log in after confirming their email.
      // The onAuthStateChange listener will eventually pick up the user session once they confirm and log in.

    } catch (error: any) {
      console.error('Error signing up via Edge Function:', error.message);
      // Ensure toast is shown even for caught exceptions if not already handled by specific checks above
      // This check helps avoid double toasting if the error was already presented.
      if (!(error.message.includes("Sign up failed") || (data && data.error && (data.error.message || data.error) === error.message) )) {
         toast({ title: "Sign up error", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out", description: "You have been signed out successfully." });
    } catch (error: any)
    {
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
