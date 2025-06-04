
import { supabase } from '@/integrations/supabase/client';
import { VOICE_ROOM_TEMPLATES } from '@/config/voiceConfig';
import type { Database } from '@/lib/database.types';

// Use the proper types from our database schema
type VoiceRoomRow = Database['public']['Tables']['voice_rooms']['Row'];
type VoiceRoomInsert = Database['public']['Tables']['voice_rooms']['Insert'];
type VoiceRoomUpdate = Database['public']['Tables']['voice_rooms']['Update'];
type VoiceParticipantRow = Database['public']['Tables']['voice_room_participants']['Row'];
type VoiceParticipantInsert = Database['public']['Tables']['voice_room_participants']['Insert'];

export interface VoiceRoom {
  id: string;
  match_id: string;
  name: string;
  description: string | null;
  max_participants: number;
  priority: number;
  permissions: string[];
  is_private: boolean;
  is_active: boolean;
  participant_count?: number;
  created_at?: string;
  updated_at?: string | null;
}

export interface VoiceParticipant {
  id: string;
  room_id: string;
  user_id: string;
  user_role: string;
  is_muted: boolean;
  is_speaking: boolean;
  joined_at: string;
  last_activity: string;
  connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
  user_name?: string;
  user_email?: string;
}

export interface CreateRoomRequest {
  match_id: string;
  name: string;
  description?: string;
  max_participants?: number;
  priority?: number;
  permissions?: string[];
  is_private?: boolean;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  max_participants?: number;
  priority?: number;
  permissions?: string[];
  is_private?: boolean;
  is_active?: boolean;
}

export class VoiceRoomService {
  private static instance: VoiceRoomService;
  private roomCache = new Map<string, VoiceRoom>();
  private participantCache = new Map<string, VoiceParticipant[]>();

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  async testDatabaseConnection(): Promise<boolean> {
    try {
      // Use a known table for connection test
      const { data, error } = await supabase.from('matches').select('count').limit(1);
      if (error) {
        console.log('Database connection test failed:', error);
        return false;
      }
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.log('Database connection test error:', error);
      return false;
    }
  }

  async createRoom(request: CreateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🏗️ Creating new voice room:', request.name);

      const insertData: VoiceRoomInsert = {
        match_id: request.match_id,
        name: request.name,
        description: request.description || 'Custom voice room',
        max_participants: request.max_participants || 25,
        priority: request.priority || 1,
        permissions: request.permissions || ['all'],
        is_private: request.is_private || false,
        is_active: true
      };

      // Use type casting to work around Supabase client type limitations
      const { data, error } = await (supabase as any)
        .from('voice_rooms')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error creating room:', error);
        return { success: false, error: error.message };
      }

      const newRoom: VoiceRoom = {
        ...data,
        participant_count: 0
      };

      // Update cache
      this.roomCache.set(newRoom.id, newRoom);
      
      console.log('✅ Room created successfully:', newRoom.name);
      return { success: true, room: newRoom };

    } catch (error: any) {
      console.error('❌ Failed to create room:', error);
      return { success: false, error: error.message };
    }
  }

  async getRooms(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log('📋 Retrieving rooms for match:', matchId);

      const { data, error } = await (supabase as any)
        .from('voice_rooms')
        .select('*')
        .eq('match_id', matchId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        console.error('❌ Database error retrieving rooms:', error);
        return [];
      }

      // Get participant counts
      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room: VoiceRoomRow) => {
          const { count } = await (supabase as any)
            .from('voice_room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          const roomWithCount: VoiceRoom = {
            ...room,
            participant_count: count || 0
          };

          // Update cache
          this.roomCache.set(room.id, roomWithCount);
          return roomWithCount;
        })
      );

      console.log(`✅ Retrieved ${roomsWithCounts.length} rooms for match`);
      return roomsWithCounts;

    } catch (error: any) {
      console.error('❌ Failed to retrieve rooms:', error);
      return [];
    }
  }

  async updateRoom(roomId: string, updates: UpdateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🔧 Updating room:', roomId, updates);

      const { data, error } = await (supabase as any)
        .from('voice_rooms')
        .update(updates)
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error updating room:', error);
        return { success: false, error: error.message };
      }

      const updatedRoom: VoiceRoom = {
        ...data,
        participant_count: this.roomCache.get(roomId)?.participant_count || 0
      };

      // Update cache
      this.roomCache.set(roomId, updatedRoom);
      
      console.log('✅ Room updated successfully');
      return { success: true, room: updatedRoom };

    } catch (error: any) {
      console.error('❌ Failed to update room:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting room:', roomId);

      // First remove all participants
      await (supabase as any)
        .from('voice_room_participants')
        .delete()
        .eq('room_id', roomId);

      // Then delete the room
      const { error } = await (supabase as any)
        .from('voice_rooms')
        .delete()
        .eq('id', roomId);

      if (error) {
        console.error('❌ Database error deleting room:', error);
        return { success: false, error: error.message };
      }

      // Remove from cache
      this.roomCache.delete(roomId);
      this.participantCache.delete(roomId);
      
      console.log('✅ Room deleted successfully');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Failed to delete room:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId}`);

      // Check if rooms already exist for this match
      const existingRooms = await this.getRooms(matchId);
      if (existingRooms.length > 0) {
        console.log('✅ Using existing rooms for match');
        return existingRooms;
      }

      // Create template rooms
      const templateRooms: VoiceRoom[] = [];
      
      for (const [key, template] of Object.entries(VOICE_ROOM_TEMPLATES || {})) {
        const createResult = await this.createRoom({
          match_id: matchId,
          name: template.name || `Room ${key}`,
          description: template.description || 'Voice collaboration room',
          max_participants: template.maxParticipants || 25,
          priority: template.priority || 1,
          permissions: template.permissions || ['all'],
          is_private: template.isPrivate || false
        });

        if (createResult.success && createResult.room) {
          templateRooms.push(createResult.room);
        }
      }

      console.log(`✅ Initialized ${templateRooms.length} template rooms`);
      return templateRooms;

    } catch (error: any) {
      console.error('❌ Failed to initialize voice rooms:', error);
      
      // Return a fallback room
      const fallbackResult = await this.createRoom({
        match_id: matchId,
        name: 'Default Voice Room',
        description: 'Default voice collaboration room',
        max_participants: 25,
        priority: 1,
        permissions: ['all'],
        is_private: false
      });

      return fallbackResult.success && fallbackResult.room ? [fallbackResult.room] : [];
    }
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log(`🚪 User ${userId} joining room ${roomId}`);

      // Get room details
      const { data: room, error: roomError } = await (supabase as any)
        .from('voice_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        return { success: false, error: 'Room not found' };
      }

      if (!room.is_active) {
        return { success: false, error: 'Room is not active' };
      }

      if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Check current participant count
      const { count } = await (supabase as any)
        .from('voice_room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if ((count || 0) >= room.max_participants) {
        return { success: false, error: 'Room is full' };
      }

      // Add participant
      const participantData: VoiceParticipantInsert = {
        room_id: roomId,
        user_id: userId,
        user_role: userRole,
        is_muted: true,
        is_speaking: false,
        connection_quality: 'good'
      };

      const { error: participantError } = await (supabase as any)
        .from('voice_room_participants')
        .upsert(participantData);

      if (participantError) {
        console.error('❌ Error adding participant:', participantError);
        return { success: false, error: participantError.message };
      }

      const roomWithCount: VoiceRoom = {
        ...room,
        participant_count: (count || 0) + 1
      };

      // Update cache
      this.roomCache.set(roomId, roomWithCount);
      
      console.log(`✅ User ${userId} joined room ${room.name}`);
      return { success: true, room: roomWithCount };

    } catch (error: any) {
      console.error(`❌ Failed to join room:`, error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🚪 User ${userId} leaving room ${roomId}`);

      const { error } = await (supabase as any)
        .from('voice_room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing participant:', error);
        return false;
      }

      // Update cache
      const room = this.roomCache.get(roomId);
      if (room && room.participant_count) {
        room.participant_count = Math.max(0, room.participant_count - 1);
        this.roomCache.set(roomId, room);
      }

      console.log(`✅ User ${userId} left room`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to leave room:`, error);
      return false;
    }
  }

  async updateParticipantStatus(roomId: string, userId: string, updates: Partial<Pick<VoiceParticipant, 'is_muted' | 'is_speaking' | 'connection_quality'>>): Promise<boolean> {
    try {
      console.log(`📊 Updating participant status for user ${userId} in room ${roomId}`, updates);

      const { error } = await (supabase as any)
        .from('voice_room_participants')
        .update(updates)
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating participant status:', error);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update participant status:`, error);
      return false;
    }
  }

  async getRoomParticipants(roomId: string): Promise<VoiceParticipant[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('voice_room_participants')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('room_id', roomId);

      if (error) {
        console.error('❌ Error getting room participants:', error);
        return [];
      }

      const participants = (data || []).map((p: any) => ({
        ...p,
        user_name: p.profiles?.full_name,
        user_email: p.profiles?.email
      }));

      // Update cache
      this.participantCache.set(roomId, participants);
      return participants;

    } catch (error: any) {
      console.error(`❌ Failed to get room participants:`, error);
      return [];
    }
  }

  getAvailableRooms(userRole: string): VoiceRoom[] {
    return Array.from(this.roomCache.values())
      .filter(room => room.is_active && (room.permissions.includes(userRole) || room.permissions.includes('all')))
      .sort((a, b) => a.priority - b.priority);
  }

  async cleanupInactiveParticipants(): Promise<void> {
    try {
      console.log('🧹 Cleaning up inactive participants');
      
      // Remove participants inactive for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { error } = await (supabase as any)
        .from('voice_room_participants')
        .delete()
        .lt('last_activity', fiveMinutesAgo);

      if (error) {
        console.error('❌ Error cleaning up participants:', error);
      } else {
        console.log('✅ Cleaned up inactive participants');
      }
    } catch (error: any) {
      console.error('❌ Failed to cleanup inactive participants:', error);
    }
  }

  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
  }
}
