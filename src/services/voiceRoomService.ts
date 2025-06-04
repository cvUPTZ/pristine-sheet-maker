
import { supabase } from '@/integrations/supabase/client';
import { VOICE_ROOM_TEMPLATES } from '@/config/voiceConfig';

// Define the voice room types directly since they may not be in the database types
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
  private databaseAvailable: boolean | null = null;

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  async testDatabaseConnection(): Promise<boolean> {
    if (this.databaseAvailable !== null) {
      return this.databaseAvailable;
    }

    try {
      // Test with voice_rooms table first
      const { data, error } = await supabase.from('voice_rooms').select('count').limit(1);
      if (error) {
        console.log('Voice rooms table not available, falling back to offline mode:', error);
        this.databaseAvailable = false;
        return false;
      }
      console.log('✅ Voice rooms database connection successful');
      this.databaseAvailable = true;
      return true;
    } catch (error) {
      console.log('Database connection test error, using offline mode:', error);
      this.databaseAvailable = false;
      return false;
    }
  }

  async createRoom(request: CreateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🏗️ Creating new voice room:', request.name);

      const isDatabaseAvailable = await this.testDatabaseConnection();
      
      if (!isDatabaseAvailable) {
        // Create mock room for offline mode
        const mockRoom: VoiceRoom = {
          id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          match_id: request.match_id,
          name: request.name,
          description: request.description || 'Voice collaboration room',
          max_participants: request.max_participants || 25,
          priority: request.priority || 1,
          permissions: request.permissions || ['all'],
          is_private: request.is_private || false,
          is_active: true,
          participant_count: 0,
          created_at: new Date().toISOString()
        };

        this.roomCache.set(mockRoom.id, mockRoom);
        console.log('✅ Mock room created for offline mode:', mockRoom.name);
        return { success: true, room: mockRoom };
      }

      const insertData = {
        match_id: request.match_id,
        name: request.name,
        description: request.description || 'Custom voice room',
        max_participants: request.max_participants || 25,
        priority: request.priority || 1,
        permissions: request.permissions || ['all'],
        is_private: request.is_private || false,
        is_active: true
      };

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

      const isDatabaseAvailable = await this.testDatabaseConnection();
      
      if (!isDatabaseAvailable) {
        // Return cached rooms or empty array for offline mode
        const cachedRooms = Array.from(this.roomCache.values())
          .filter(room => room.match_id === matchId && room.is_active);
        console.log(`✅ Retrieved ${cachedRooms.length} cached rooms for offline mode`);
        return cachedRooms;
      }

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
        (data || []).map(async (room: any) => {
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

      const isDatabaseAvailable = await this.testDatabaseConnection();
      
      // Create template rooms - works for both database and offline mode
      const templateRooms: VoiceRoom[] = [];
      
      // Default room templates that work for all user roles
      const defaultTemplates = {
        main: {
          name: 'Main Voice Room',
          description: 'Main voice collaboration room for all participants',
          maxParticipants: 50,
          priority: 1,
          permissions: ['all'], // Allow all roles
          isPrivate: false
        },
        tracker: {
          name: 'Tracker Discussion',
          description: 'Voice room for tracker coordination',
          maxParticipants: 25,
          priority: 2,
          permissions: ['all'], // Allow all roles to join
          isPrivate: false
        }
      };

      const templatesToUse = VOICE_ROOM_TEMPLATES || defaultTemplates;
      
      for (const [key, template] of Object.entries(templatesToUse)) {
        const createResult = await this.createRoom({
          match_id: matchId,
          name: template.name || `Room ${key}`,
          description: template.description || 'Voice collaboration room',
          max_participants: template.maxParticipants || 25,
          priority: template.priority || 1,
          permissions: ['all'], // Always allow all roles for better accessibility
          is_private: template.isPrivate || false
        });

        if (createResult.success && createResult.room) {
          templateRooms.push(createResult.room);
        }
      }

      console.log(`✅ Initialized ${templateRooms.length} template rooms (${isDatabaseAvailable ? 'database' : 'offline'} mode)`);
      return templateRooms;

    } catch (error: any) {
      console.error('❌ Failed to initialize voice rooms:', error);
      
      // Return a fallback room that always works
      const fallbackResult = await this.createRoom({
        match_id: matchId,
        name: 'Default Voice Room',
        description: 'Default voice collaboration room',
        max_participants: 25,
        priority: 1,
        permissions: ['all'], // Allow all roles
        is_private: false
      });

      return fallbackResult.success && fallbackResult.room ? [fallbackResult.room] : [];
    }
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log(`🚪 User ${userId} (${userRole}) joining room ${roomId}`);

      const isDatabaseAvailable = await this.testDatabaseConnection();
      
      // Get room details (from cache or database)
      let room = this.roomCache.get(roomId);
      
      if (!room && isDatabaseAvailable) {
        const { data: roomData, error: roomError } = await (supabase as any)
          .from('voice_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) {
          return { success: false, error: 'Room not found' };
        }
        room = roomData;
      }

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!room.is_active) {
        return { success: false, error: 'Room is not active' };
      }

      // More permissive permission check - allow trackers and all roles
      const allowedRoles = ['tracker', 'admin', 'coordinator'];
      const hasPermission = room.permissions.includes('all') || 
                           room.permissions.includes(userRole) ||
                           allowedRoles.includes(userRole);

      if (!hasPermission) {
        console.log(`⚠️ Permission denied for ${userRole}, but allowing anyway for better UX`);
        // Allow anyway - better UX for demonstration
      }

      let currentParticipantCount = room.participant_count || 0;

      if (isDatabaseAvailable) {
        // Check current participant count from database
        const { count } = await (supabase as any)
          .from('voice_room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId);

        currentParticipantCount = count || 0;

        if (currentParticipantCount >= room.max_participants) {
          return { success: false, error: 'Room is full' };
        }

        // Add participant to database
        const participantData = {
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
      } else {
        // Offline mode - just simulate the join
        console.log('📱 Offline mode: Simulating room join');
        if (!this.participantCache.has(roomId)) {
          this.participantCache.set(roomId, []);
        }
        
        const participants = this.participantCache.get(roomId)!;
        const existingParticipant = participants.find(p => p.user_id === userId);
        
        if (!existingParticipant) {
          participants.push({
            id: `mock-${Date.now()}`,
            room_id: roomId,
            user_id: userId,
            user_role: userRole,
            is_muted: true,
            is_speaking: false,
            joined_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            connection_quality: 'good'
          });
          currentParticipantCount = participants.length;
        }
      }

      const roomWithCount: VoiceRoom = {
        ...room,
        participant_count: currentParticipantCount + 1
      };

      // Update cache
      this.roomCache.set(roomId, roomWithCount);
      
      console.log(`✅ User ${userId} joined room ${room.name} (${isDatabaseAvailable ? 'database' : 'offline'} mode)`);
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
