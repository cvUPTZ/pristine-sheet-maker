
import { supabase } from '@/integrations/supabase/client';
import { VOICE_ROOM_TEMPLATES } from '@/config/voiceConfig';
import type { Database } from '@/lib/database.types';

// Use the database types for consistency
type DbVoiceRoom = Database['public']['Tables']['voice_rooms']['Row'];
type DbVoiceRoomInsert = Database['public']['Tables']['voice_rooms']['Insert'];
type DbVoiceRoomUpdate = Database['public']['Tables']['voice_rooms']['Update'];
type DbVoiceParticipant = Database['public']['Tables']['voice_room_participants']['Row'];
type DbVoiceParticipantInsert = Database['public']['Tables']['voice_room_participants']['Insert'];

export interface VoiceRoom {
  id: string;
  match_id: string;
  name: string;
  description: string;
  max_participants: number;
  priority: number;
  permissions: string[];
  is_private: boolean;
  is_active: boolean;
  participant_count?: number;
  created_at?: string;
  updated_at?: string;
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
  private databaseMode = false;

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  async testDatabaseConnection(): Promise<boolean> {
    try {
      // Test database connection with a simple query
      const { data, error } = await supabase.rpc('get_user_role', { user_id_param: 'test' });
      if (error && !error.message.includes('not found')) {
        console.log('Database connection test failed:', error.message);
        this.databaseMode = false;
        return false;
      }
      console.log('✅ Database connection successful');
      this.databaseMode = true;
      return true;
    } catch (error) {
      console.log('Database connection test error:', error);
      this.databaseMode = false;
      return false;
    }
  }

  private convertDbRoomToVoiceRoom(dbRoom: DbVoiceRoom, participantCount?: number): VoiceRoom {
    return {
      id: dbRoom.id,
      match_id: dbRoom.match_id,
      name: dbRoom.name,
      description: dbRoom.description || '',
      max_participants: dbRoom.max_participants,
      priority: dbRoom.priority,
      permissions: dbRoom.permissions,
      is_private: dbRoom.is_private,
      is_active: dbRoom.is_active,
      participant_count: participantCount || 0,
      created_at: dbRoom.created_at,
      updated_at: dbRoom.updated_at
    };
  }

  async createRoom(request: CreateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🏗️ Creating new voice room:', request.name, `(${this.databaseMode ? 'database' : 'offline'} mode)`);

      if (this.databaseMode) {
        const roomData: DbVoiceRoomInsert = {
          match_id: request.match_id,
          name: request.name,
          description: request.description || null,
          max_participants: request.max_participants || 25,
          priority: request.priority || 1,
          permissions: request.permissions || ['all'],
          is_private: request.is_private || false,
          is_active: true
        };

        // Use type casting to work around the type mismatch
        const { data, error } = await (supabase as any)
          .from('voice_rooms')
          .insert(roomData)
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        const newRoom = this.convertDbRoomToVoiceRoom(data);
        this.roomCache.set(newRoom.id, newRoom);
        
        console.log('✅ Room created successfully (database):', newRoom.name);
        return { success: true, room: newRoom };

      } else {
        // Fallback to offline mode
        const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newRoom: VoiceRoom = {
          id: roomId,
          match_id: request.match_id,
          name: request.name,
          description: request.description || 'Custom voice room',
          max_participants: request.max_participants || 25,
          priority: request.priority || 1,
          permissions: request.permissions || ['all'],
          is_private: request.is_private || false,
          is_active: true,
          participant_count: 0,
          created_at: now,
          updated_at: now
        };

        this.roomCache.set(roomId, newRoom);
        
        console.log('✅ Room created successfully (offline):', newRoom.name);
        return { success: true, room: newRoom };
      }

    } catch (error: any) {
      console.error('❌ Failed to create room:', error);
      return { success: false, error: error.message };
    }
  }

  async getRooms(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log('📋 Retrieving rooms for match:', matchId, `(${this.databaseMode ? 'database' : 'offline'} mode)`);

      if (this.databaseMode) {
        const { data: rooms, error } = await (supabase as any)
          .from('voice_rooms')
          .select('*')
          .eq('match_id', matchId)
          .eq('is_active', true)
          .order('priority');

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        // Get participant counts for each room
        const roomsWithCounts: VoiceRoom[] = [];
        for (const room of rooms || []) {
          const { count } = await (supabase as any)
            .from('voice_room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          const voiceRoom = this.convertDbRoomToVoiceRoom(room, count || 0);
          roomsWithCounts.push(voiceRoom);
          this.roomCache.set(room.id, voiceRoom);
        }

        console.log(`✅ Retrieved ${roomsWithCounts.length} rooms for match (database)`);
        return roomsWithCounts;

      } else {
        // Fallback to offline mode
        const rooms = Array.from(this.roomCache.values())
          .filter(room => room.match_id === matchId && room.is_active)
          .sort((a, b) => a.priority - b.priority);

        console.log(`✅ Retrieved ${rooms.length} rooms for match (offline)`);
        return rooms;
      }

    } catch (error: any) {
      console.error('❌ Failed to retrieve rooms:', error);
      return [];
    }
  }

  async updateRoom(roomId: string, updates: UpdateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🔧 Updating room:', roomId, `(${this.databaseMode ? 'database' : 'offline'} mode)`, updates);

      if (this.databaseMode) {
        const updateData: DbVoiceRoomUpdate = {
          ...updates,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await (supabase as any)
          .from('voice_rooms')
          .update(updateData)
          .eq('id', roomId)
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        const updatedRoom = this.convertDbRoomToVoiceRoom(data);
        this.roomCache.set(roomId, updatedRoom);
        
        console.log('✅ Room updated successfully (database)');
        return { success: true, room: updatedRoom };

      } else {
        // Fallback to offline mode
        const room = this.roomCache.get(roomId);
        if (!room) {
          return { success: false, error: 'Room not found' };
        }

        const updatedRoom: VoiceRoom = {
          ...room,
          ...updates,
          updated_at: new Date().toISOString()
        };

        this.roomCache.set(roomId, updatedRoom);
        
        console.log('✅ Room updated successfully (offline)');
        return { success: true, room: updatedRoom };
      }

    } catch (error: any) {
      console.error('❌ Failed to update room:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting room:', roomId, `(${this.databaseMode ? 'database' : 'offline'} mode)`);

      if (this.databaseMode) {
        const { error } = await (supabase as any)
          .from('voice_rooms')
          .delete()
          .eq('id', roomId);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        this.roomCache.delete(roomId);
        this.participantCache.delete(roomId);
        
        console.log('✅ Room deleted successfully (database)');
        return { success: true };

      } else {
        // Fallback to offline mode
        this.roomCache.delete(roomId);
        this.participantCache.delete(roomId);
        
        console.log('✅ Room deleted successfully (offline)');
        return { success: true };
      }

    } catch (error: any) {
      console.error('❌ Failed to delete room:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId} (${this.databaseMode ? 'database' : 'offline'} mode)`);

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
      console.log(`🚪 User ${userId} joining room ${roomId} (${this.databaseMode ? 'database' : 'offline'} mode)`);

      const room = this.roomCache.get(roomId) || (await this.getRoomById(roomId));
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!room.is_active) {
        return { success: false, error: 'Room is not active' };
      }

      if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      if (this.databaseMode) {
        // Check current participant count
        const { count } = await (supabase as any)
          .from('voice_room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId);

        if ((count || 0) >= room.max_participants) {
          return { success: false, error: 'Room is full' };
        }

        // Add participant to database
        const participantData: DbVoiceParticipantInsert = {
          room_id: roomId,
          user_id: userId,
          user_role: userRole,
          is_muted: true,
          is_speaking: false,
          connection_quality: 'good'
        };

        const { error } = await (supabase as any)
          .from('voice_room_participants')
          .upsert(participantData);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

      } else {
        // Fallback to offline mode
        const participants = this.participantCache.get(roomId) || [];
        
        if (participants.length >= room.max_participants) {
          return { success: false, error: 'Room is full' };
        }

        const newParticipant: VoiceParticipant = {
          id: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          room_id: roomId,
          user_id: userId,
          user_role: userRole,
          is_muted: true,
          is_speaking: false,
          joined_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          connection_quality: 'good'
        };

        const updatedParticipants = participants.filter(p => p.user_id !== userId);
        updatedParticipants.push(newParticipant);
        this.participantCache.set(roomId, updatedParticipants);
      }

      // Update room participant count
      const updatedRooms = await this.getRooms(room.match_id);
      const updatedRoom = updatedRooms.find(r => r.id === roomId);
      
      console.log(`✅ User ${userId} joined room ${room.name}`);
      return { success: true, room: updatedRoom || room };

    } catch (error: any) {
      console.error(`❌ Failed to join room:`, error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🚪 User ${userId} leaving room ${roomId} (${this.databaseMode ? 'database' : 'offline'} mode)`);

      if (this.databaseMode) {
        const { error } = await (supabase as any)
          .from('voice_room_participants')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

      } else {
        // Fallback to offline mode
        const participants = this.participantCache.get(roomId) || [];
        const updatedParticipants = participants.filter(p => p.user_id !== userId);
        this.participantCache.set(roomId, updatedParticipants);
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
      console.log(`📊 Updating participant status for user ${userId} in room ${roomId} (${this.databaseMode ? 'database' : 'offline'} mode)`, updates);

      if (this.databaseMode) {
        const updateData = {
          ...updates,
          last_activity: new Date().toISOString()
        };

        const { error } = await (supabase as any)
          .from('voice_room_participants')
          .update(updateData)
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

      } else {
        // Fallback to offline mode
        const participants = this.participantCache.get(roomId) || [];
        const participantIndex = participants.findIndex(p => p.user_id === userId);
        
        if (participantIndex !== -1) {
          participants[participantIndex] = {
            ...participants[participantIndex],
            ...updates,
            last_activity: new Date().toISOString()
          };
          this.participantCache.set(roomId, participants);
        }
      }

      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update participant status:`, error);
      return false;
    }
  }

  async getRoomParticipants(roomId: string): Promise<VoiceParticipant[]> {
    try {
      if (this.databaseMode) {
        const { data: participants, error } = await (supabase as any)
          .from('voice_room_participants')
          .select(`
            *,
            profiles!voice_room_participants_user_id_fkey(
              username,
              email
            )
          `)
          .eq('room_id', roomId);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        const voiceParticipants: VoiceParticipant[] = (participants || []).map((p: any) => ({
          id: p.id,
          room_id: p.room_id,
          user_id: p.user_id,
          user_role: p.user_role,
          is_muted: p.is_muted,
          is_speaking: p.is_speaking,
          joined_at: p.joined_at,
          last_activity: p.last_activity,
          connection_quality: p.connection_quality as 'excellent' | 'good' | 'fair' | 'poor',
          user_name: p.profiles?.username,
          user_email: p.profiles?.email
        }));

        console.log(`✅ Retrieved ${voiceParticipants.length} participants for room (database)`);
        return voiceParticipants;

      } else {
        // Fallback to offline mode
        const participants = this.participantCache.get(roomId) || [];
        console.log(`✅ Retrieved ${participants.length} participants for room (offline)`);
        return participants;
      }
    } catch (error: any) {
      console.error(`❌ Failed to get room participants:`, error);
      return [];
    }
  }

  private async getRoomById(roomId: string): Promise<VoiceRoom | null> {
    if (this.databaseMode) {
      try {
        const { data, error } = await (supabase as any)
          .from('voice_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (error || !data) {
          return null;
        }

        return this.convertDbRoomToVoiceRoom(data);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  getAvailableRooms(userRole: string): VoiceRoom[] {
    return Array.from(this.roomCache.values())
      .filter(room => room.is_active && (room.permissions.includes(userRole) || room.permissions.includes('all')))
      .sort((a, b) => a.priority - b.priority);
  }

  async cleanupInactiveParticipants(): Promise<void> {
    try {
      console.log(`🧹 Cleaning up inactive participants (${this.databaseMode ? 'database' : 'offline'} mode)`);
      
      if (this.databaseMode) {
        // Remove participants inactive for more than 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { error } = await (supabase as any)
          .from('voice_room_participants')
          .delete()
          .lt('last_activity', fiveMinutesAgo);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

      } else {
        // Fallback to offline mode
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        for (const [roomId, participants] of this.participantCache.entries()) {
          const activeParticipants = participants.filter(p => 
            new Date(p.last_activity) > fiveMinutesAgo
          );
          
          if (activeParticipants.length !== participants.length) {
            this.participantCache.set(roomId, activeParticipants);
            
            // Update room participant count
            const room = this.roomCache.get(roomId);
            if (room) {
              room.participant_count = activeParticipants.length;
              this.roomCache.set(roomId, room);
            }
          }
        }
      }

      console.log('✅ Cleaned up inactive participants');
    } catch (error: any) {
      console.error('❌ Failed to cleanup inactive participants:', error);
    }
  }

  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
  }
}
