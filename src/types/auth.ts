
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'tracker' | 'user' | 'teacher';
  created_at: string;
  email?: string;
}

export interface TrackerAssignment {
  id: string;
  tracker_id: string;
  event_category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
}
