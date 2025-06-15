import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { UserRoleType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  userRole: UserRoleType | null;
  assignedEventTypes: string[] | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setAssignedEventTypes(null);
        return;
      }

      try {
        // Use the improved security definer function to get role
        const { data, error } = await supabase.rpc('get_user_role_from_auth', {
          user_id_param: user.id
        });

        if (error) {
          console.error('Error fetching user role:', error);
          // Fallback to app_metadata role
          const roleFromMetadata = user.app_metadata?.role as UserRoleType;
          setUserRole(roleFromMetadata || 'user');
        } else {
          const fetchedRole = (data as UserRoleType) || 'user';
          console.log('Fetched user role:', fetchedRole); // Debug log
          setUserRole(fetchedRole);
        }

        // Fetch assigned event types
        const { data: eventTypesData, error: eventTypesError } = await supabase
          .from('user_event_assignments')
          .select('event_type')
          .eq('user_id', user.id);

        if (eventTypesError) {
          console.error('Error fetching assigned event types:', eventTypesError);
          setAssignedEventTypes([]);
        } else {
          setAssignedEventTypes(eventTypesData?.map(item => item.event_type) || []);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setUserRole('user');
        setAssignedEventTypes([]);
      }
    };

    fetchUserRole();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Success",
      description: "Please check your email to verify your account.",
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setAssignedEventTypes(null);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, assignedEventTypes, loading, signOut, signIn, signUp }}>
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
