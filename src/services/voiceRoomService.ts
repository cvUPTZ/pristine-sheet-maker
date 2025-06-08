
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

export interface VoiceRoomParticipant {
  id: string;
  name: string;
  user_id: string;
  room_id: string;
  joined_at: string;
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

    return data?.map(room => ({
      ...room,
      description: room.description || undefined
    })) || [];
  }

  async createRoom(matchId: string, roomData: Partial<VoiceRoom>): Promise<VoiceRoom> {
    const { data, error } = await supabase
      .from('voice_rooms')
      .insert({
        match_id: matchId,
        name: roomData.name || 'New Room',
        description: roomData.description || null,
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

    return {
      ...data,
      description: data.description || undefined
    };
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    // Check if rooms already exist for this match
    const existingRooms = await this.getRoomsForMatch(matchId);
    if (existingRooms.length > 0) {
      return existingRooms;
    }

    // Create default rooms for the match
    const defaultRooms = [
      {
        name: 'Main Communication',
        description: 'Primary voice channel for all participants',
        max_participants: 50,
        priority: 1,
        permissions: ['all'],
        is_private: false
      },
      {
        name: 'Coordinators Only',
        description: 'Private channel for coordinators and admins',
        max_participants: 10,
        priority: 2,
        permissions: ['coordinator', 'admin'],
        is_private: true
      },
      {
        name: 'Technical Support',
        description: 'Channel for technical issues and support',
        max_participants: 20,
        priority: 3,
        permissions: ['all'],
        is_private: false
      }
    ];

    const createdRooms: VoiceRoom[] = [];
    for (const roomData of defaultRooms) {
      try {
        const room = await this.createRoom(matchId, roomData);
        createdRooms.push(room);
      } catch (error) {
        console.error('Failed to create default room:', error);
      }
    }

    return createdRooms;
  }

  async getRoomParticipants(roomId: string): Promise<VoiceRoomParticipant[]> {
    // This would require a separate participants table or real-time presence tracking
    // For now, return an empty array as this functionality needs to be implemented
    // with LiveKit's participant tracking or a custom participants table
    console.log('getRoomParticipants called for room:', roomId);
    return [];
  }

  async updateRoom(roomId: string, updates: Partial<VoiceRoom>): Promise<VoiceRoom> {
    const { data, error } = await supabase
      .from('voice_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update room: ${error.message}`);
    }

    return {
      ...data,
      description: data.description || undefined
    };
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase
      .from('voice_rooms')
      .update({ is_active: false })
      .eq('id', roomId);

    if (error) {
      throw new Error(`Failed to delete room: ${error.message}`);
    }
  }
}
