
import { supabase } from '@/integrations/supabase/client';
import { VOICE_ROOM_TEMPLATES } from '@/config/voiceConfig';

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
  private offlineMode = true; // Always use offline mode for now

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  async testDatabaseConnection(): Promise<boolean> {
    try {
      // Test basic database connectivity
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.log('Database connection test failed:', error);
        return false;
      }
      console.log('✅ Database connection successful (using offline mode for voice features)');
      return true;
    } catch (error) {
      console.log('Database connection test error:', error);
      return false;
    }
  }

  async createRoom(request: CreateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🏗️ Creating new voice room (offline mode):', request.name);

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

      // Store in cache
      this.roomCache.set(roomId, newRoom);
      
      console.log('✅ Room created successfully (offline):', newRoom.name);
      return { success: true, room: newRoom };

    } catch (error: any) {
      console.error('❌ Failed to create room:', error);
      return { success: false, error: error.message };
    }
  }

  async getRooms(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log('📋 Retrieving rooms for match (offline mode):', matchId);

      // Filter rooms by match ID from cache
      const rooms = Array.from(this.roomCache.values())
        .filter(room => room.match_id === matchId && room.is_active)
        .sort((a, b) => a.priority - b.priority);

      console.log(`✅ Retrieved ${rooms.length} rooms for match (offline)`);
      return rooms;

    } catch (error: any) {
      console.error('❌ Failed to retrieve rooms:', error);
      return [];
    }
  }

  async updateRoom(roomId: string, updates: UpdateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🔧 Updating room (offline mode):', roomId, updates);

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

    } catch (error: any) {
      console.error('❌ Failed to update room:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting room (offline mode):', roomId);

      // Remove from caches
      this.roomCache.delete(roomId);
      this.participantCache.delete(roomId);
      
      console.log('✅ Room deleted successfully (offline)');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Failed to delete room:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match (offline mode): ${matchId}`);

      // Check if rooms already exist for this match
      const existingRooms = await this.getRooms(matchId);
      if (existingRooms.length > 0) {
        console.log('✅ Using existing rooms for match (offline)');
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

      console.log(`✅ Initialized ${templateRooms.length} template rooms (offline)`);
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
      console.log(`🚪 User ${userId} joining room ${roomId} (offline mode)`);

      const room = this.roomCache.get(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!room.is_active) {
        return { success: false, error: 'Room is not active' };
      }

      if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Get current participants
      const participants = this.participantCache.get(roomId) || [];
      
      if (participants.length >= room.max_participants) {
        return { success: false, error: 'Room is full' };
      }

      // Add participant
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

      const roomWithCount: VoiceRoom = {
        ...room,
        participant_count: updatedParticipants.length
      };

      this.roomCache.set(roomId, roomWithCount);
      
      console.log(`✅ User ${userId} joined room ${room.name} (offline)`);
      return { success: true, room: roomWithCount };

    } catch (error: any) {
      console.error(`❌ Failed to join room:`, error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🚪 User ${userId} leaving room ${roomId} (offline mode)`);

      const participants = this.participantCache.get(roomId) || [];
      const updatedParticipants = participants.filter(p => p.user_id !== userId);
      this.participantCache.set(roomId, updatedParticipants);

      // Update room participant count
      const room = this.roomCache.get(roomId);
      if (room) {
        room.participant_count = updatedParticipants.length;
        this.roomCache.set(roomId, room);
      }

      console.log(`✅ User ${userId} left room (offline)`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to leave room:`, error);
      return false;
    }
  }

  async updateParticipantStatus(roomId: string, userId: string, updates: Partial<Pick<VoiceParticipant, 'is_muted' | 'is_speaking' | 'connection_quality'>>): Promise<boolean> {
    try {
      console.log(`📊 Updating participant status for user ${userId} in room ${roomId} (offline mode)`, updates);

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

      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update participant status:`, error);
      return false;
    }
  }

  async getRoomParticipants(roomId: string): Promise<VoiceParticipant[]> {
    try {
      const participants = this.participantCache.get(roomId) || [];
      console.log(`✅ Retrieved ${participants.length} participants for room (offline)`);
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
      console.log('🧹 Cleaning up inactive participants (offline mode)');
      
      // Remove participants inactive for more than 5 minutes
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

      console.log('✅ Cleaned up inactive participants (offline)');
    } catch (error: any) {
      console.error('❌ Failed to cleanup inactive participants:', error);
    }
  }

  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
  }
}
