import type { TaggedEvent } from './events'; // Assuming TaggedEvent is in events.ts

export interface Playlist {
  id: string; // UUID
  name: string;
  user_id: string; // UUID, foreign key to auth.users(id)
  video_job_id: string; // UUID, foreign key to video_jobs(id)
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  items?: PlaylistItem[]; // Optional array of playlist items, if fetched together
}

export interface PlaylistItem {
  id: string; // UUID
  playlist_id: string; // UUID, foreign key to playlists(id)
  tagged_event_id: string; // UUID, foreign key to tagged_events(id)
  item_order: number; // Integer for ordering
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  tagged_event?: TaggedEvent; // Optional TaggedEvent details, if fetched together
}
