
import { supabase } from '@/integrations/supabase/client';

export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  match_id: string;
  max_participants: number;
  is_private: boolean;
  permissions: string[];
  participant_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VoiceRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_muted: boolean;
  role?: string;
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
      const { error } = await supabase
        .from('voice_rooms')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (e) {
      console.error('Database connection test failed:', e);
      return false;
    }
  }

  public async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    const cacheKey = `match_rooms_${matchId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.roomCache.get(cacheKey) as any || [];
    }

    try {
      // First, check if rooms already exist for this match
      const { data: existingRooms, error: fetchError } = await supabase
        .from('voice_rooms')
        .select('*')
        .eq('match_id', matchId);

      if (fetchError) throw fetchError;

      if (existingRooms && existingRooms.length > 0) {
        console.log(`Found ${existingRooms.length} existing rooms for match ${matchId}`);
        this.setCacheExpiry(cacheKey);
        return existingRooms;
      }

      // If no rooms exist, create default rooms for the match
      const defaultRooms = [
        {
          name: 'Main Communication',
          description: 'Primary coordination channel for all trackers',
          match_id: matchId,
          max_participants: 20,
          is_private: false,
          permissions: ['all']
        },
        {
          name: 'Coordinators Only',
          description: 'Private channel for match coordinators and admins',
          match_id: matchId,
          max_participants: 10,
          is_private: true,
          permissions: ['admin', 'coordinator']
        },
        {
          name: 'Technical Support',
          description: 'Channel for technical issues and troubleshooting',
          match_id: matchId,
          max_participants: 15,
          is_private: false,
          permissions: ['admin', 'coordinator', 'tracker']
        }
      ];

      const { data: createdRooms, error: createError } = await supabase
        .from('voice_rooms')
        .insert(defaultRooms)
        .select();

      if (createError) throw createError;

      console.log(`Created ${createdRooms?.length || 0} rooms for match ${matchId}`);
      this.setCacheExpiry(cacheKey);
      return createdRooms || [];

    } catch (error: any) {
      console.error('Failed to initialize rooms for match:', error);
      throw new Error(`Failed to initialize voice rooms: ${error.message}`);
    }
  }

  public async getRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    return this.withRetry(
      async () => {
        const { data: roomsData, error } = await supabase
          .from('voice_rooms')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!roomsData) return [];

        // Get participant counts for each room
        const roomsWithCounts = await Promise.all(
          roomsData.map(async (room: VoiceRoom) => {
            const countResult = await this.withRetry(
              async () => {
                const response = await supabase
                  .from('voice_room_participants')
                  .select('id', { count: 'exact' })
                  .eq('room_id', room.id);
                
                return { 
                  data: response.data, 
                  error: response.error, 
                  count: response.count 
                };
              },
              `getParticipantCountForRoom_${room.id}`
            );

            const roomWithCount: VoiceRoom = {
              ...room,
              participant_count: typeof countResult.count === 'number' ? countResult.count : (room.participant_count ?? 0)
            };

            this.roomCache.set(room.id, roomWithCount);
            return roomWithCount;
          })
        );

        return roomsWithCounts;
      },
      `getRoomsForMatch_${matchId}`
    );
  }

  public async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      // Check if user is already in the room
      const { data: existingParticipant } = await supabase
        .from('voice_room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (existingParticipant) {
        console.log('User already in room, fetching room details');
        const { data: room, error: roomError } = await supabase
          .from('voice_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        return { success: true, room };
      }

      // Get room details and check capacity
      const { data: room, error: roomError } = await supabase
        .from('voice_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      if (!room) throw new Error('Room not found');

      // Check current participant count
      const { count, error: countError } = await supabase
        .from('voice_room_participants')
        .select('id', { count: 'exact' })
        .eq('room_id', roomId);

      if (countError) throw countError;

      const currentParticipants = count || 0;
      if (currentParticipants >= room.max_participants) {
        return { success: false, error: 'Room is at maximum capacity' };
      }

      // Add user to room
      const { error: joinError } = await supabase
        .from('voice_room_participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          role: userRole,
          is_muted: true // Start muted by default
        });

      if (joinError) throw joinError;

      // Update room cache
      const updatedRoom = { ...room, participant_count: currentParticipants + 1 };
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
      const { error } = await supabase
        .from('voice_room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update cache
      const cachedRoom = this.roomCache.get(roomId);
      if (cachedRoom && cachedRoom.participant_count) {
        const updatedRoom = { ...cachedRoom, participant_count: cachedRoom.participant_count - 1 };
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
    updates: Partial<Pick<VoiceRoomParticipant, 'is_muted'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('voice_room_participants')
        .update(updates)
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
        const { data, error } = await supabase
          .from('voice_room_participants')
          .select(`
            *,
            profiles!inner(full_name, role)
          `)
          .eq('room_id', roomId);

        if (error) throw error;

        const participants = data || [];
        this.participantCache.set(cacheKey, participants);
        this.setCacheExpiry(cacheKey);
        
        return participants;
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
