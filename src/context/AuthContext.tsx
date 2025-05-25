
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/utils/supabaseConfig';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: 'admin' | 'tracker' | 'viewer' | null;
  assignedEventTypes: string[] | null; // Renamed
};

// Define interfaces for custom tables not in the auto-generated types
interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'tracker' | 'viewer';
  created_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'tracker' | 'viewer' | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[] | null>(null); // Renamed
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Fetch user role if authenticated
        if (newSession?.user) {
          setTimeout(() => {
            fetchUserRoleFromDB(newSession);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        fetchUserRoleFromDB(initialSession).then(() => { // Role fetching will trigger event assignment fetching
          // No explicit call to fetchUserEventAssignments here, handled by useEffect [user, userRole]
        });
      } else {
        setAssignedEventTypes(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchUserEventAssignments = async (userId: string) => { // Renamed and updated
    try {
      const { data, error } = await supabase
        .from('user_event_assignments') // Updated table name
        .select('event_type') // Updated column name
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user event assignments:', error);
        toast({
          title: "Error",
          description: "Could not fetch user event assignments.",
          variant: "destructive",
        });
        setAssignedEventTypes([]); // Default to empty or handle appropriately
        return;
      }
      setAssignedEventTypes(data ? data.map(item => item.event_type) : []);
    } catch (e) {
      console.error('Exception fetching user event assignments:', e);
      setAssignedEventTypes([]);
       toast({
          title: "Error",
          description: "An exception occurred while fetching user event assignments.",
          variant: "destructive",
        });
    }
  };
  
  // Effect to fetch assignments when user or role changes (for any role, not just tracker)
  useEffect(() => {
    if (user) { // Fetch assignments if there's a user, regardless of role for now
      fetchUserEventAssignments(user.id);
    } else {
      setAssignedEventTypes(null); // Clear assignments if no user
    }
  }, [user, userRole]); // Re-fetch if user or role changes. Role change might be redundant if user ID is the key.

  // First method: Use Supabase client with session token
  const fetchUserRoleWithSupabase = async (currentSession: Session) => {
    try {
      // Use Supabase client which already has the auth token
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentSession.user.id)
        .single();
      
      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }
      
      console.log('Role data from Supabase client:', data);
      return data?.role as 'admin' | 'tracker' | 'viewer' | null;
    } catch (error) {
      console.error('Error in fetchUserRoleWithSupabase:', error);
      return null;
    }
  };

  // Second method: Direct fetch API
  const fetchUserRoleWithFetch = async (currentSession: Session) => {
    try {
      // Use direct fetch with the session token
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${currentSession.user.id}&select=role`, 
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${currentSession.access_token}`
          }
        }
      );
      
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      console.log('Role data from fetch API:', data);
      
      if (data && data.length > 0) {
        return data[0].role as 'admin' | 'tracker' | 'viewer';
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchUserRoleWithFetch:', error);
      return null;
    }
  };

  // Third method: Temporary hard-coded role for admin@efoot.com
  const getHardcodedRole = (email: string) => {
    if (email === 'admin@efoot.com') {
      console.log('Setting hardcoded admin role for admin@efoot.com');
      return 'admin' as const;
    }
    return null;
  };

  // Try all methods to get the role
  const fetchUserRoleFromDB = async (currentSession: Session): Promise<'admin' | 'tracker' | 'viewer' | null> => {
    if (!currentSession?.user) {
      console.log('No user in session');
      setUserRole(null);
      return null;
    }
    
    console.log('Attempting to fetch role for user:', currentSession.user.email);
    
    try {
      const hardcodedRole = getHardcodedRole(currentSession.user.email || '');
      if (hardcodedRole) {
        setUserRole(hardcodedRole);
        return hardcodedRole;
      }
      
      const roleFromSupabase = await fetchUserRoleWithSupabase(currentSession);
      if (roleFromSupabase) {
        console.log('Setting user role from Supabase client:', roleFromSupabase);
        setUserRole(roleFromSupabase);
        return roleFromSupabase;
      }
      
      const roleFromFetch = await fetchUserRoleWithFetch(currentSession);
      if (roleFromFetch) {
        console.log('Setting user role from fetch API:', roleFromFetch);
        setUserRole(roleFromFetch);
        return roleFromFetch;
      }
      
      console.log('No role found after trying all methods');
      setUserRole(null);
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Signed in",
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error('Error signing in:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Account created",
        description: "Please check your email for a confirmation link.",
      });
    } catch (error: any) {
      console.error('Error signing up:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUserRole(null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      });
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
      assignedEventTypes, // Renamed
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
