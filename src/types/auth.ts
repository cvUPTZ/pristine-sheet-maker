
import { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  role: 'admin' | 'tracker' | 'user' | 'teacher';
}

export interface TrackerAssignment {
  id: string;
  tracker_id: string;
  event_category: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export type AuthAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_SESSION"; payload: any }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROFILE"; payload: UserProfile | null };
