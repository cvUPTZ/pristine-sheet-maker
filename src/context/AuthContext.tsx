
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRoleType } from '@/types';

interface AuthContextType {
  user: User | null;
  userRole: UserRoleType | null;
  assignedEventTypes: string[] | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [assignedEventTypes, setAssignedEventTypes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
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
        // Query the profiles table directly
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user role:', profileError);
          setUserRole('user'); // Default role
          return;
        }

        const role = profileData?.role as UserRoleType || 'user';
        setUserRole(role);

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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setAssignedEventTypes(null);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, assignedEventTypes, loading, signOut }}>
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
