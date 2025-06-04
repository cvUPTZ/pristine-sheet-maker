
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

export class VoiceRoomService {
  private static instance: VoiceRoomService;
  private roomCache = new Map<string, VoiceRoom>();
  private participantCache = new Map<string, VoiceParticipant[]>();
  private isConnected = false;

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    // Disable database connection since voice room tables don't exist in current schema
    console.warn('Voice room tables not available in current database schema');
    this.isConnected = false;
    return false;
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId}`);

      // Since database tables don't exist, return template rooms in offline mode
      console.warn('Database tables not available, returning template rooms in offline mode');
      
      // Return template rooms for UI testing
      return Object.entries(VOICE_ROOM_TEMPLATES).map(([key, template]) => ({
        id: `offline-${key}`,
        match_id: matchId,
        name: template.name,
        description: template.description,
        max_participants: template.maxParticipants,
        priority: template.priority,
        permissions: template.permissions,
        is_private: template.isPrivate || false,
        is_active: true,
        participant_count: 0
      }));
    } catch (error: any) {
      console.error('❌ Failed to initialize voice rooms:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log(`🚪 User ${userId} joining room ${roomId}`);

      // Since database is not connected, simulate joining
      console.warn('Database not connected, simulating room join');

      // Get room from cache or create a mock room
      let room = this.roomCache.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          match_id: 'mock-match',
          name: 'Mock Voice Room',
          description: 'Simulated voice room',
          max_participants: 25,
          priority: 1,
          permissions: ['all'],
          is_private: false,
          is_active: true,
          participant_count: 0
        };
        this.roomCache.set(roomId, room);
      }

      // Check permissions
      if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Simulate successful join
      room.participant_count = (room.participant_count || 0) + 1;
      this.roomCache.set(roomId, room);

      console.log(`✅ User ${userId} joined room ${room.name} (simulated)`);
      return { success: true, room };

    } catch (error: any) {
      console.error(`❌ Failed to join room:`, error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🚪 User ${userId} leaving room ${roomId}`);

      // Since database is not connected, simulate leaving
      console.warn('Database not connected, simulating room leave');

      // Clear participant cache for this room
      this.participantCache.delete(roomId);

      console.log(`✅ User ${userId} left room (simulated)`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to leave room:`, error);
      return false;
    }
  }

  async updateParticipantStatus(roomId: string, userId: string, updates: Partial<Pick<VoiceParticipant, 'is_muted' | 'is_speaking' | 'connection_quality'>>): Promise<boolean> {
    try {
      console.log(`📊 Updating participant status for user ${userId} in room ${roomId}`, updates);

      // Since database is not connected, simulate update
      console.warn('Database not connected, simulating participant status update');

      // Clear participant cache to force refresh
      this.participantCache.delete(roomId);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update participant status:`, error);
      return false;
    }
  }

  async getRoomParticipants(roomId: string): Promise<VoiceParticipant[]> {
    try {
      console.log(`👥 Getting participants for room ${roomId}`);

      // Since database is not connected, return empty participants
      console.warn('Database not connected, returning empty participants');
      return [];
    } catch (error: any) {
      console.error(`❌ Failed to get room participants:`, error);
      return [];
    }
  }

  getAvailableRooms(userRole: string): VoiceRoom[] {
    return Array.from(this.roomCache.values())
      .filter(room => room.permissions.includes(userRole) || room.permissions.includes('all'))
      .sort((a, b) => a.priority - b.priority);
  }

  async cleanupInactiveParticipants(): Promise<void> {
    try {
      console.log('🧹 Cleaning up inactive participants (simulated)');

      // Since database is not connected, just clear caches
      console.warn('Database not connected, skipping cleanup');

      // Clear caches to force refresh
      this.participantCache.clear();
      console.log('🧹 Cleaned up inactive participants (simulated)');
    } catch (error: any) {
      console.error('❌ Failed to cleanup inactive participants:', error);
    }
  }

  private mapDatabaseToRoom(dbRoom: any): VoiceRoom {
    return {
      id: dbRoom.id,
      match_id: dbRoom.match_id,
      name: dbRoom.name,
      description: dbRoom.description || '',
      max_participants: dbRoom.max_participants || 25,
      priority: dbRoom.priority || 1,
      permissions: Array.isArray(dbRoom.permissions) ? dbRoom.permissions : [],
      is_private: dbRoom.is_private || false,
      is_active: dbRoom.is_active || false,
      created_at: dbRoom.created_at,
      updated_at: dbRoom.updated_at
    };
  }

  // Check if service is connected to database
  isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  // Force reconnection check
  async reconnectDatabase(): Promise<boolean> {
    this.isConnected = false;
    return await this.checkDatabaseConnection();
  }

  // Clear caches - useful for testing and cleanup
  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
  }
}
