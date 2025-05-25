import React, { createContext, useState, useContext, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client'; // Ensure this client is correctly initialized
import { useToast } from '@/components/ui/use-toast';
// SUPABASE_URL and SUPABASE_ANON_KEY are not needed here if supabase client is pre-configured

type UserRoleType = 'admin' | 'tracker' | 'viewer' | null;

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>; // Consider removing role assignment from here
  signOut: () => Promise<void>;
  userRole: UserRoleType;
  assignedEventTypes: string[] | null;
  refreshUserSession: () => Promise<void>; // New function to refresh session
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

    if (currentUser && currentUser.app_metadata) {
      // Directly get role from app_metadata
      const roleFromAppMetadata = currentUser.app_metadata.role as UserRoleType;
      console.log(`Role from app_metadata for ${currentUser.email}:`, roleFromAppMetadata);
      setUserRole(roleFromAppMetadata || null); // Ensure it's null if not a valid role or missing
      
      // Log app_metadata for debugging
      console.log('Full app_metadata:', JSON.stringify(currentUser.app_metadata, null, 2));

    } else if (currentUser) {
      console.warn(`User ${currentUser.email} has no app_metadata or role in app_metadata.`);
      setUserRole(null);
    } else {
      setUserRole(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      processSession(initialSession);
      setLoading(false);
    });

    // 2. Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('Auth state changed. Event:', _event, 'New Session User:', newSession?.user?.email);
        processSession(newSession);
        // If event is TOKEN_REFRESHED or USER_UPDATED, it might have new app_metadata
        if (_event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
            console.log('Token refreshed or user updated, re-evaluating role from new session.');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const fetchUserEventAssignments = async (userId: string) => {
    // No change needed here if it works, but ensure RLS on 'user_event_assignments' allows access
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
  }, [user]); // Only re-fetch if user object changes

  // Function to manually refresh the session, which should update app_metadata
  const refreshUserSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Error refreshing session:", error);
        toast({ title: "Session Refresh Error", description: error.message, variant: "destructive" });
      } else if (data.session) {
        console.log("Session refreshed, new app_metadata should be available.");
        processSession(data.session); // Re-process the new session
        toast({ title: "Session Refreshed", description: "Your session data has been updated." });
      } else {
        // This case might mean the refresh token was invalid or expired, leading to signed out state
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
      // onAuthStateChange will handle setting user and session
      // processSession will be called by onAuthStateChange
      toast({ title: "Signed in", description: "Welcome back!" });
    } catch (error: any) {
      console.error('Error signing in:', error.message);
      // processSession(null) might be redundant if onAuthStateChange handles error state
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // IMPORTANT: Client-side signUp CANNOT set app_metadata.role.
    // Role assignment must happen via a backend mechanism (e.g., Edge Function on user creation hook,
    // or admin creating user via admin panel which calls a 'create-user' Edge Function).
    // Default role (e.g., 'viewer') should be assigned by such a backend process.
    setLoading(true);
    try {
      const { data: { user: newUser, session: newSession }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // This sets user_metadata, not app_metadata. Useful for display name.
          data: { 
            full_name: fullName,
            // DO NOT attempt to set 'role' here, it won't go into app_metadata securely.
          }
        }
      });

      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        throw error;
      }

      if (newUser) {
        // The new user will likely NOT have app_metadata.role set yet.
        // It will be set by a backend process.
        // The onAuthStateChange listener will pick up this new user.
        console.log("User signed up. Role will be assigned by backend/hook if configured.");
        toast({ title: "Account created", description: "Please check your email for a confirmation link. Your role will be assigned shortly." });
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
      // onAuthStateChange will set user, session, and userRole to null.
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
