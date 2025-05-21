
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'tracker' | 'user' | 'teacher';
  created_at: string;
  updated_at: string;
}

export interface TrackerAssignment {
  id: string;
  tracker_id: string;
  event_category: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
