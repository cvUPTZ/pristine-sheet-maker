
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
  private offlineMode = true; // Force offline mode since tables don't exist

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    // Force offline mode since voice room tables don't exist in current schema
    console.log('VoiceRoomService: Operating in offline mode - voice room tables not available');
    this.isConnected = false;
    this.offlineMode = true;
    return false;
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId} (offline mode)`);

      // Always return template rooms in offline mode
      console.log('VoiceRoomService: Creating template rooms for offline operation');
      
      const templateRooms = Object.entries(VOICE_ROOM_TEMPLATES || {}).map(([key, template]) => ({
        id: `offline-${key}`,
        match_id: matchId,
        name: template.name || `Room ${key}`,
        description: template.description || 'Voice collaboration room',
        max_participants: template.maxParticipants || 25,
        priority: template.priority || 1,
        permissions: template.permissions || ['all'],
        is_private: template.isPrivate || false,
        is_active: true,
        participant_count: 0
      }));

      // Cache the rooms
      templateRooms.forEach(room => {
        this.roomCache.set(room.id, room);
      });

      console.log(`VoiceRoomService: Created ${templateRooms.length} template rooms`);
      return templateRooms;
    } catch (error: any) {
      console.error('❌ Failed to initialize voice rooms:', error);
      // Return a default room even if templates fail
      const defaultRoom: VoiceRoom = {
        id: `offline-default`,
        match_id: matchId,
        name: 'Default Voice Room',
        description: 'Default voice collaboration room',
        max_participants: 25,
        priority: 1,
        permissions: ['all'],
        is_private: false,
        is_active: true,
        participant_count: 0
      };
      this.roomCache.set(defaultRoom.id, defaultRoom);
      return [defaultRoom];
    }
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log(`🚪 User ${userId} joining room ${roomId} (offline mode)`);

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

      console.log(`✅ User ${userId} joined room ${room.name} (offline mode)`);
      return { success: true, room };

    } catch (error: any) {
      console.error(`❌ Failed to join room:`, error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🚪 User ${userId} leaving room ${roomId} (offline mode)`);

      // Update participant count
      const room = this.roomCache.get(roomId);
      if (room && room.participant_count) {
        room.participant_count = Math.max(0, room.participant_count - 1);
        this.roomCache.set(roomId, room);
      }

      // Clear participant cache for this room
      this.participantCache.delete(roomId);

      console.log(`✅ User ${userId} left room (offline mode)`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to leave room:`, error);
      return false;
    }
  }

  async updateParticipantStatus(roomId: string, userId: string, updates: Partial<Pick<VoiceParticipant, 'is_muted' | 'is_speaking' | 'connection_quality'>>): Promise<boolean> {
    try {
      console.log(`📊 Updating participant status for user ${userId} in room ${roomId} (offline mode)`, updates);

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
      console.log(`👥 Getting participants for room ${roomId} (offline mode)`);

      // Return cached participants or empty array
      return this.participantCache.get(roomId) || [];
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
      console.log('🧹 Cleaning up inactive participants (offline mode)');

      // Clear caches to force refresh
      this.participantCache.clear();
      console.log('🧹 Cleaned up inactive participants (offline mode)');
    } catch (error: any) {
      console.error('❌ Failed to cleanup inactive participants:', error);
    }
  }

  // Check if service is connected to database
  isDatabaseConnected(): boolean {
    return false; // Always false since we're in offline mode
  }

  // Force reconnection check
  async reconnectDatabase(): Promise<boolean> {
    return await this.checkDatabaseConnection();
  }

  // Clear caches - useful for testing and cleanup
  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
  }
}
