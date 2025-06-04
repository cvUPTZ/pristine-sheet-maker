
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
  private offlineMode = false; // Start with database mode

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      console.log('VoiceRoomService: Checking database connection...');
      
      // Test if voice_rooms table exists by attempting a simple query
      const { data, error } = await supabase
        .from('voice_rooms')
        .select('id')
        .limit(1);

      if (error) {
        console.log('VoiceRoomService: Database tables not available, switching to offline mode:', error.message);
        this.isConnected = false;
        this.offlineMode = true;
        return false;
      }

      console.log('VoiceRoomService: Database connection successful');
      this.isConnected = true;
      this.offlineMode = false;
      return true;
    } catch (error: any) {
      console.log('VoiceRoomService: Database connection failed, using offline mode:', error);
      this.isConnected = false;
      this.offlineMode = true;
      return false;
    }
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId}`);

      // Check database connection first
      const connected = await this.checkDatabaseConnection();

      if (connected) {
        // Try to get existing rooms from database
        const { data: existingRooms, error } = await supabase
          .from('voice_rooms')
          .select('*')
          .eq('match_id', matchId)
          .eq('is_active', true);

        if (!error && existingRooms && existingRooms.length > 0) {
          console.log(`VoiceRoomService: Found ${existingRooms.length} existing rooms`);
          const rooms = existingRooms.map(room => ({
            ...room,
            permissions: room.permissions || ['all'],
            participant_count: 0
          }));
          
          rooms.forEach(room => this.roomCache.set(room.id, room));
          return rooms;
        }

        // Create template rooms in database
        console.log('VoiceRoomService: Creating template rooms in database');
        const templateRooms = await this.createTemplateRooms(matchId);
        templateRooms.forEach(room => this.roomCache.set(room.id, room));
        return templateRooms;
      } else {
        // Fallback to offline mode
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

        templateRooms.forEach(room => this.roomCache.set(room.id, room));
        return templateRooms;
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize voice rooms:', error);
      // Return a default room as fallback
      const defaultRoom: VoiceRoom = {
        id: `fallback-default`,
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

  private async createTemplateRooms(matchId: string): Promise<VoiceRoom[]> {
    const rooms: VoiceRoom[] = [];
    
    for (const [key, template] of Object.entries(VOICE_ROOM_TEMPLATES || {})) {
      try {
        const { data, error } = await supabase
          .from('voice_rooms')
          .insert({
            match_id: matchId,
            name: template.name || `Room ${key}`,
            description: template.description || 'Voice collaboration room',
            max_participants: template.maxParticipants || 25,
            priority: template.priority || 1,
            permissions: template.permissions || ['all'],
            is_private: template.isPrivate || false,
            is_active: true
          })
          .select()
          .single();

        if (!error && data) {
          rooms.push({
            ...data,
            permissions: data.permissions || ['all'],
            participant_count: 0
          });
        }
      } catch (error) {
        console.error(`Failed to create room ${key}:`, error);
      }
    }

    return rooms;
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log(`🚪 User ${userId} joining room ${roomId}`);

      if (this.offlineMode) {
        // Offline mode logic
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

        if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
          return { success: false, error: 'Insufficient permissions' };
        }

        room.participant_count = (room.participant_count || 0) + 1;
        this.roomCache.set(roomId, room);
        return { success: true, room };
      }

      // Database mode logic
      const room = this.roomCache.get(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Add participant to database
      const { error } = await supabase
        .from('voice_room_participants')
        .upsert({
          room_id: roomId,
          user_id: userId,
          user_role: userRole,
          is_muted: true,
          is_speaking: false,
          connection_quality: 'good'
        });

      if (error) {
        console.error('Failed to add participant to database:', error);
        return { success: false, error: error.message };
      }

      // Update room participant count
      room.participant_count = (room.participant_count || 0) + 1;
      this.roomCache.set(roomId, room);

      console.log(`✅ User ${userId} joined room ${room.name}`);
      return { success: true, room };

    } catch (error: any) {
      console.error(`❌ Failed to join room:`, error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🚪 User ${userId} leaving room ${roomId}`);

      if (!this.offlineMode) {
        // Remove from database
        const { error } = await supabase
          .from('voice_room_participants')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (error) {
          console.error('Failed to remove participant from database:', error);
        }
      }

      // Update local cache
      const room = this.roomCache.get(roomId);
      if (room && room.participant_count) {
        room.participant_count = Math.max(0, room.participant_count - 1);
        this.roomCache.set(roomId, room);
      }

      this.participantCache.delete(roomId);
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

      if (!this.offlineMode) {
        const { error } = await supabase
          .from('voice_room_participants')
          .update(updates)
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (error) {
          console.error('Failed to update participant status in database:', error);
          return false;
        }
      }

      // Clear cache to force refresh
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

      if (this.offlineMode) {
        return this.participantCache.get(roomId) || [];
      }

      // Get from database
      const { data, error } = await supabase
        .from('voice_room_participants')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .eq('room_id', roomId);

      if (error) {
        console.error('Failed to get participants from database:', error);
        return [];
      }

      const participants = (data || []).map(p => ({
        id: p.id,
        room_id: p.room_id,
        user_id: p.user_id,
        user_role: p.user_role,
        is_muted: p.is_muted,
        is_speaking: p.is_speaking,
        joined_at: p.joined_at,
        last_activity: p.last_activity,
        connection_quality: p.connection_quality as 'excellent' | 'good' | 'fair' | 'poor',
        user_name: p.user?.full_name,
        user_email: p.user?.email
      }));

      this.participantCache.set(roomId, participants);
      return participants;
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
      console.log('🧹 Cleaning up inactive participants');

      if (!this.offlineMode) {
        // Remove participants inactive for more than 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { error } = await supabase
          .from('voice_room_participants')
          .delete()
          .lt('last_activity', fiveMinutesAgo);

        if (error) {
          console.error('Failed to cleanup inactive participants:', error);
        }
      }

      // Clear caches
      this.participantCache.clear();
      console.log('🧹 Cleaned up inactive participants');
    } catch (error: any) {
      console.error('❌ Failed to cleanup inactive participants:', error);
    }
  }

  isDatabaseConnected(): boolean {
    return this.isConnected && !this.offlineMode;
  }

  async reconnectDatabase(): Promise<boolean> {
    return await this.checkDatabaseConnection();
  }

  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
  }
}
