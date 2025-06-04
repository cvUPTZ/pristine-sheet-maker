
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
    if (this.isConnected) return true;

    try {
      // Check if voice_rooms table exists by trying to query it
      // Using raw SQL since the tables aren't in TypeScript definitions
      const { data, error } = await supabase
        .rpc('get_user_role', { user_id_param: 'test' })
        .then(async () => {
          // If we can call functions, try to query voice_rooms directly
          return await (supabase as any).from('voice_rooms').select('id').limit(1);
        })
        .catch(async () => {
          // Fallback: just try to access the table directly
          return await (supabase as any).from('voice_rooms').select('id').limit(1);
        });

      if (error) {
        console.error('Voice rooms table check failed:', error.message);
        this.isConnected = false;
        return false;
      }

      this.isConnected = true;
      console.log('✅ Voice database connection verified');
      return true;
    } catch (error) {
      console.error('❌ Database connection check failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId}`);

      // Check database connection first
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        console.warn('Database not connected, returning template rooms in offline mode');
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
      }

      // Check if rooms already exist for this match
      const { data: existingRooms, error: fetchError } = await (supabase as any)
        .from('voice_rooms')
        .select('*')
        .eq('match_id', matchId)
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error fetching existing rooms:', fetchError);
        throw fetchError;
      }

      if (existingRooms && existingRooms.length > 0) {
        console.log(`✅ Found ${existingRooms.length} existing rooms`);
        const rooms = existingRooms.map(this.mapDatabaseToRoom);
        
        // Get participant counts for each room
        for (const room of rooms) {
          const { count } = await (supabase as any)
            .from('voice_room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          room.participant_count = count || 0;
        }
        
        rooms.forEach(room => this.roomCache.set(room.id, room));
        return rooms;
      }

      // Create default rooms from templates
      const roomsToCreate = Object.entries(VOICE_ROOM_TEMPLATES).map(([key, template]) => ({
        match_id: matchId,
        name: template.name,
        description: template.description,
        max_participants: template.maxParticipants,
        priority: template.priority,
        permissions: template.permissions,
        is_private: template.isPrivate || false,
        is_active: true
      }));

      console.log('Creating rooms:', roomsToCreate);

      const { data: createdRooms, error: createError } = await (supabase as any)
        .from('voice_rooms')
        .insert(roomsToCreate)
        .select('*');

      if (createError) {
        console.error('Error creating rooms:', createError);
        throw createError;
      }

      console.log(`✅ Created ${createdRooms?.length || 0} voice rooms`);

      const rooms = (createdRooms || []).map(this.mapDatabaseToRoom);
      // Initialize participant count to 0 for new rooms
      rooms.forEach(room => {
        room.participant_count = 0;
        this.roomCache.set(room.id, room);
      });
      
      return rooms;
    } catch (error: any) {
      console.error('❌ Failed to initialize voice rooms:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        return { success: false, error: 'Database not connected' };
      }

      console.log(`🚪 User ${userId} joining room ${roomId}`);

      // Get room details
      const { data: roomData, error: roomError } = await (supabase as any)
        .from('voice_rooms')
        .select('*')
        .eq('id', roomId)
        .eq('is_active', true)
        .single();

      if (roomError || !roomData) {
        return { success: false, error: 'Room not found or inactive' };
      }

      const room = this.mapDatabaseToRoom(roomData);

      // Check permissions
      if (!room.permissions.includes(userRole) && !room.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions' };
      }

      // Check room capacity
      const { count: participantCount } = await (supabase as any)
        .from('voice_room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (participantCount && participantCount >= room.max_participants) {
        return { success: false, error: 'Room is at capacity' };
      }

      // Add participant (upsert to handle reconnections)
      const { error: joinError } = await (supabase as any)
        .from('voice_room_participants')
        .upsert({
          room_id: roomId,
          user_id: userId,
          user_role: userRole,
          is_muted: true,
          is_speaking: false,
          connection_quality: 'good'
        }, {
          onConflict: 'room_id,user_id'
        });

      if (joinError) throw joinError;

      // Update room cache
      room.participant_count = (participantCount || 0) + 1;
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
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        console.error('Database not connected');
        return false;
      }

      console.log(`🚪 User ${userId} leaving room ${roomId}`);

      const { error } = await (supabase as any)
        .from('voice_room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      // Clear participant cache for this room
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
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        console.error('Database not connected');
        return false;
      }

      const { error } = await (supabase as any)
        .from('voice_room_participants')
        .update({
          ...updates,
          last_activity: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

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
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        console.warn('Database not connected, returning empty participants');
        return [];
      }

      // Check cache first
      const cached = this.participantCache.get(roomId);
      if (cached) return cached;

      const { data, error } = await (supabase as any)
        .from('voice_room_participants')
        .select(`
          *,
          profiles!voice_room_participants_user_id_fkey (
            full_name,
            email,
            role
          )
        `)
        .eq('room_id', roomId);

      if (error) {
        console.error('Error fetching participants:', error);
        return [];
      }

      const participants = (data || []).map((p: any) => ({
        id: p.id,
        room_id: p.room_id,
        user_id: p.user_id,
        user_role: p.user_role,
        is_muted: p.is_muted,
        is_speaking: p.is_speaking,
        joined_at: p.joined_at,
        last_activity: p.last_activity || p.joined_at,
        connection_quality: p.connection_quality || 'good',
        user_name: p.profiles?.full_name || 'Unknown User',
        user_email: p.profiles?.email || 'unknown@example.com'
      }));

      // Cache the result
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
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        console.warn('Database not connected, skipping cleanup');
        return;
      }

      // Remove participants inactive for more than 5 minutes
      const { error } = await (supabase as any)
        .from('voice_room_participants')
        .delete()
        .lt('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) throw error;

      // Clear caches to force refresh
      this.participantCache.clear();
      console.log('🧹 Cleaned up inactive participants');
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
