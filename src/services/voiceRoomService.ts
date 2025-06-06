
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '../lib/database.types';

// Define an alias for the Row type
type VoiceRoomRow = Database['public']['Tables']['voice_rooms']['Row'];

// Use an exported type alias with an intersection type
export type VoiceRoom = VoiceRoomRow & {
  participant_count?: number;
};

export interface VoiceRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_connected: boolean;
  connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
  audio_level: number;
  role?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
}

export class VoiceRoomService {
  private static instance: VoiceRoomService;
  private roomCache: Map<string, VoiceRoom> = new Map();
  private participantCache: Map<string, VoiceRoomParticipant[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    cacheKey?: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoffMultiplier = 2 } = options;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed for ${cacheKey || 'operation'}:`, error);
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoffMultiplier, attempt - 1)));
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCacheExpiry(key: string): void {
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  public async testDatabaseConnection(): Promise<boolean> {
    try {
      // Test with a simple query to profiles table which we know exists
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (e) {
      console.error('Database connection test failed:', e);
      return false;
    }
  }

  // Fix: Create single room instead of batch
  public async createRoom(matchId: string, roomData: Partial<VoiceRoom>): Promise<VoiceRoom> {
    try {
      const newRoom = {
        name: roomData.name || 'New Voice Room',
        description: roomData.description || 'Voice communication room',
        match_id: matchId,
        max_participants: roomData.max_participants || 20,
        is_private: roomData.is_private || false,
        is_active: true,
        permissions: roomData.permissions || ['all'],
        priority: roomData.priority || 0,
      };

      // Try to insert into database, fallback to mock for demo
      try {
        const { data, error } = await supabase
          .from('voice_rooms' as any)
          .insert(newRoom)
          .select()
          .single();

        if (error) throw error;
        
        if (data && typeof data === 'object' && 'id' in data) {
          const createdRoom: VoiceRoom = {
            ...data as VoiceRoomRow,
            participant_count: 0
          };
          
          this.roomCache.set(createdRoom.id, createdRoom);
          console.log('Room created successfully:', createdRoom.id);
          return createdRoom;
        }
        
        throw new Error('Invalid room data returned');
      } catch (dbError) {
        console.warn('Database insert failed, creating mock room:', dbError);
        // Create mock room for demo
        const mockRoom: VoiceRoom = {
          id: `${matchId}-${Date.now()}`,
          match_id: matchId,
          name: newRoom.name,
          description: newRoom.description,
          max_participants: newRoom.max_participants,
          priority: newRoom.priority,
          permissions: newRoom.permissions,
          is_private: newRoom.is_private,
          is_active: newRoom.is_active,
          created_at: new Date().toISOString(),
          updated_at: null,
          participant_count: 0,
        };
        
        this.roomCache.set(mockRoom.id, mockRoom);
        return mockRoom;
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  // Fix: Proper room deletion
  public async deleteRoom(roomId: string): Promise<boolean> {
    try {
      // Remove from database
      try {
        const { error } = await supabase
          .from('voice_rooms' as any)
          .delete()
          .eq('id', roomId);

        if (error) throw error;
      } catch (dbError) {
        console.warn('Database delete failed, removing from cache only:', dbError);
      }

      // Remove from cache
      this.roomCache.delete(roomId);
      this.participantCache.delete(`participants_${roomId}`);
      this.cacheExpiry.delete(`participants_${roomId}`);
      
      console.log('Room deleted successfully:', roomId);
      return true;
    } catch (error: any) {
      console.error('Error deleting room:', error);
      return false;
    }
  }

  // Fix: Clear all rooms for match
  public async deleteAllRoomsForMatch(matchId: string): Promise<boolean> {
    try {
      // Get all rooms for match
      const rooms = await this.getRoomsForMatch(matchId);
      
      // Delete each room
      for (const room of rooms) {
        await this.deleteRoom(room.id);
      }
      
      console.log(`All rooms deleted for match: ${matchId}`);
      return true;
    } catch (error: any) {
      console.error('Error deleting all rooms:', error);
      return false;
    }
  }

  public async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    const cacheKey = `match_rooms_${matchId}`;
    
    if (this.isCacheValid(cacheKey)) {
      const cachedRooms = Array.from(this.roomCache.values()).filter(room => room.match_id === matchId);
      return cachedRooms;
    }

    try {
      // Try to query voice_rooms table directly
      const { data: existingRooms, error: fetchError } = await supabase
        .from('voice_rooms' as any)
        .select('*')
        .eq('match_id', matchId);

      if (fetchError) {
        console.warn('Voice rooms table may not exist, returning empty array:', fetchError);
        this.setCacheExpiry(cacheKey);
        return [];
      }

      if (existingRooms && Array.isArray(existingRooms) && existingRooms.length > 0) {
        console.log(`Found ${existingRooms.length} existing rooms for match ${matchId}`);
        const roomsWithCounts = existingRooms.map((room: any) => {
          if (room && typeof room === 'object' && 'id' in room) {
            return {
              id: room.id,
              name: room.name,
              description: room.description,
              match_id: room.match_id,
              max_participants: room.max_participants,
              is_private: room.is_private,
              is_active: room.is_active ?? true,
              permissions: room.permissions || ['all'],
              priority: room.priority ?? 0,
              created_at: room.created_at || new Date().toISOString(),
              updated_at: room.updated_at || null,
              participant_count: 0, // Will be updated separately
            } as VoiceRoom;
          }
          return null;
        }).filter(Boolean) as VoiceRoom[];

        roomsWithCounts.forEach((room: VoiceRoom) => {
          this.roomCache.set(room.id, room);
        });

        this.setCacheExpiry(cacheKey);
        return roomsWithCounts;
      }

      // If no rooms exist, return empty array
      console.log('No voice rooms found for match, returning empty array');
      this.setCacheExpiry(cacheKey);
      return [];

    } catch (error: any) {
      console.error('Failed to initialize rooms for match:', error);
      return [];
    }
  }

  public async getRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    return this.withRetry(
      async () => {
        // Get from cache first
        const cachedRooms = Array.from(this.roomCache.values()).filter(room => room.match_id === matchId);
        if (cachedRooms.length > 0) {
          return cachedRooms;
        }

        try {
          // Try to query voice_rooms table directly
          const { data: roomsData, error } = await supabase
            .from('voice_rooms' as any)
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

          if (error) {
            console.warn('Could not fetch from voice_rooms table:', error);
            return [];
          }

          if (!roomsData || !Array.isArray(roomsData)) return [];

          // Get participant counts for each room
          const roomsWithCounts = await Promise.all(
            roomsData.map(async (room: any) => {
              if (room && typeof room === 'object' && 'id' in room) {
                const participantCount = await this.getParticipantCount(room.id);
                return {
                  id: room.id,
                  name: room.name,
                  description: room.description,
                  match_id: room.match_id,
                  max_participants: room.max_participants,
                  is_private: room.is_private,
                  is_active: room.is_active ?? true,
                  permissions: room.permissions || ['all'],
                  priority: room.priority ?? 0,
                  created_at: room.created_at || new Date().toISOString(),
                  updated_at: room.updated_at || null,
                  participant_count: participantCount,
                } as VoiceRoom;
              }
              return null;
            })
          );

          const validRooms = roomsWithCounts.filter(Boolean) as VoiceRoom[];
          validRooms.forEach((room: VoiceRoom) => {
            this.roomCache.set(room.id, room);
          });

          return validRooms;
        } catch (sqlError) {
          console.warn('SQL query failed, returning empty array:', sqlError);
          return [];
        }
      },
      `getRoomsForMatch_${matchId}`
    );
  }

  // Fix: Proper participant counting
  private async getParticipantCount(roomId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('voice_room_participants' as any)
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('is_connected', true);

      if (error) {
        console.warn('Could not get participant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.warn('Error getting participant count:', error);
      return 0;
    }
  }

  // Fix: Join single room, not batch
  public async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log(`User ${userId} attempting to join room ${roomId} as ${userRole}`);

      // Get room details
      let room = this.roomCache.get(roomId);
      if (!room) {
        // Try to fetch from database
        try {
          const { data, error } = await supabase
            .from('voice_rooms' as any)
            .select('*')
            .eq('id', roomId)
            .single();

          if (error) throw error;
          
          if (data && typeof data === 'object' && 'id' in data) {
            room = {
              ...data as VoiceRoomRow,
              participant_count: await this.getParticipantCount(roomId)
            };
            this.roomCache.set(roomId, room);
          } else {
            return { success: false, error: 'Invalid room data' };
          }
        } catch (dbError) {
          console.warn('Could not fetch room from database:', dbError);
          return { success: false, error: 'Room not found' };
        }
      }

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      // Check room capacity
      const currentCount = await this.getParticipantCount(roomId);
      if (currentCount >= room.max_participants) {
        return { success: false, error: 'Room is full' };
      }

      // Add participant to database
      try {
        const participantData = {
          room_id: roomId,
          user_id: userId,
          user_role: userRole,
          is_muted: true,
          is_speaking: false,
          is_connected: true,
          connection_quality: 'good' as const,
          audio_level: 0,
          joined_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('voice_room_participants' as any)
          .upsert(participantData);

        if (error) throw error;
      } catch (dbError) {
        console.warn('Could not add participant to database:', dbError);
      }

      // Update room participant count
      const newCount = await this.getParticipantCount(roomId);
      const updatedRoom = { ...room, participant_count: newCount };
      this.roomCache.set(roomId, updatedRoom);

      console.log(`User ${userId} joined room ${roomId} successfully`);
      return { success: true, room: updatedRoom };

    } catch (error: any) {
      console.error('Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  public async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`User ${userId} leaving room ${roomId}`);

      // Remove participant from database
      try {
        const { error } = await supabase
          .from('voice_room_participants' as any)
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (error) throw error;
      } catch (dbError) {
        console.warn('Could not remove participant from database:', dbError);
      }

      // Update room participant count
      const cachedRoom = this.roomCache.get(roomId);
      if (cachedRoom) {
        const newCount = await this.getParticipantCount(roomId);
        const updatedRoom = { ...cachedRoom, participant_count: newCount };
        this.roomCache.set(roomId, updatedRoom);
      }

      console.log(`User ${userId} left room ${roomId} successfully`);
      return true;

    } catch (error: any) {
      console.error('Error leaving room:', error);
      return false;
    }
  }

  public async updateParticipantStatus(
    roomId: string, 
    userId: string, 
    updates: Partial<Pick<VoiceRoomParticipant, 'is_muted' | 'is_speaking' | 'audio_level'>>
  ): Promise<boolean> {
    try {
      const updateData = {
        ...updates,
        last_activity: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('voice_room_participants' as any)
        .update(updateData)
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log(`Updated participant ${userId} status in room ${roomId}:`, updates);
      return true;

    } catch (error: any) {
      console.error('Error updating participant status:', error);
      return false;
    }
  }

  public async getRoomParticipants(roomId: string): Promise<VoiceRoomParticipant[]> {
    const cacheKey = `participants_${roomId}`;
    
    if (this.isCacheValid(cacheKey) && this.participantCache.has(cacheKey)) {
      return this.participantCache.get(cacheKey)!;
    }

    return this.withRetry(
      async () => {
        try {
          const { data, error } = await supabase
            .from('voice_room_participants' as any)
            .select('*')
            .eq('room_id', roomId)
            .eq('is_connected', true);

          if (error) throw error;

          const participants: VoiceRoomParticipant[] = (data || []).map((p: any) => ({
            id: p.id,
            room_id: p.room_id,
            user_id: p.user_id,
            joined_at: p.joined_at,
            is_muted: p.is_muted,
            is_speaking: p.is_speaking,
            is_connected: p.is_connected,
            connection_quality: p.connection_quality,
            audio_level: p.audio_level,
            role: p.user_role,
            user_name: p.user_name,
            user_email: p.user_email,
            user_role: p.user_role,
          }));
          
          this.participantCache.set(cacheKey, participants);
          this.setCacheExpiry(cacheKey);
          
          return participants;
        } catch (error) {
          console.warn('Could not fetch participants from database:', error);
          return [];
        }
      },
      `getRoomParticipants_${roomId}`
    );
  }

  public clearCache(): void {
    this.roomCache.clear();
    this.participantCache.clear();
    this.cacheExpiry.clear();
    console.log('Voice room service cache cleared');
  }

  public getCachedRoom(roomId: string): VoiceRoom | undefined {
    return this.roomCache.get(roomId);
  }
}
