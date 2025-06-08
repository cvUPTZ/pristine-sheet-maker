
import { supabase } from '@/integrations/supabase/client';

export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  max_participants: number;
  priority: number;
  permissions: string[];
  is_private: boolean;
  is_active: boolean;
  match_id: string;
  created_at: string;
  updated_at: string;
}

export class VoiceRoomService {
  private static instance: VoiceRoomService;

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  async testDatabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('voice_rooms')
        .select('id')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  async getRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    const { data, error } = await supabase
      .from('voice_rooms')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch rooms: ${error.message}`);
    }

    return data || [];
  }

  async createRoom(matchId: string, roomData: Partial<VoiceRoom>): Promise<VoiceRoom> {
    const { data, error } = await supabase
      .from('voice_rooms')
      .insert({
        match_id: matchId,
        name: roomData.name || 'New Room',
        description: roomData.description,
        max_participants: roomData.max_participants || 25,
        priority: roomData.priority || 1,
        permissions: roomData.permissions || ['all'],
        is_private: roomData.is_private || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create room: ${error.message}`);
    }

    return data;
  }
}
