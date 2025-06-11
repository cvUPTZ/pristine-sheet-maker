export interface EventType {
  id: string; // UUID
  user_id: string; // UUID, foreign key to auth.users(id)
  name: string;
  color?: string | null; // Optional color
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface TaggedEvent {
  id: string; // UUID
  video_job_id: string; // UUID, foreign key to video_jobs(id)
  event_type_id: string; // Foreign key to EventType (id)
  timestamp: number; // Float, seconds in the video
  notes?: string | null; // Optional notes
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  annotations?: CanvasPath[] | null; // For react-sketch-canvas paths
  // Potentially include event_type details if fetched together
  event_types?: EventType | null; // Based on Supabase conventions for joined data
}

// Ensure CanvasPath is imported or defined. If react-sketch-canvas provides it directly and resolves:
import type { CanvasPath } from 'react-sketch-canvas';
