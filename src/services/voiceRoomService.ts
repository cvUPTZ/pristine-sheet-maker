
import { supabase } from '@/integrations/supabase/client';

export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  match_id: string;
  max_participants: number;
  is_private: boolean;
  is_active: boolean;
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

  public async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    const cacheKey = `match_rooms_${matchId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.roomCache.get(cacheKey) as any || [];
    }

    try {
      // Try to query voice_rooms table directly
      const { data: existingRooms, error: fetchError } = await supabase
        .from('voice_rooms' as any)
        .select('*')
        .eq('match_id', matchId);

      if (fetchError) {
        console.warn('Voice rooms table may not exist, creating mock data:', fetchError);
        // Return mock data for development
        const mockRooms: VoiceRoom[] = [
          {
            id: `${matchId}-main`,
            name: 'Main Communication',
            description: 'Primary coordination channel for all trackers',
            match_id: matchId,
            max_participants: 20,
            is_private: false,
            is_active: true,
            permissions: ['all'],
            participant_count: 0
          },
          {
            id: `${matchId}-coordinators`,
            name: 'Coordinators Only',
            description: 'Private channel for match coordinators and admins',
            match_id: matchId,
            max_participants: 10,
            is_private: true,
            is_active: true,
            permissions: ['admin', 'coordinator'],
            participant_count: 0
          },
          {
            id: `${matchId}-technical`,
            name: 'Technical Support',
            description: 'Channel for technical issues and troubleshooting',
            match_id: matchId,
            max_participants: 15,
            is_private: false,
            is_active: true,
            permissions: ['admin', 'coordinator', 'tracker'],
            participant_count: 0
          }
        ];
        
        this.setCacheExpiry(cacheKey);
        return mockRooms;
      }

      if (existingRooms && Array.isArray(existingRooms) && existingRooms.length > 0) {
        console.log(`Found ${existingRooms.length} existing rooms for match ${matchId}`);
        this.setCacheExpiry(cacheKey);
        return existingRooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          description: room.description,
          match_id: room.match_id,
          max_participants: room.max_participants,
          is_private: room.is_private,
          is_active: room.is_active ?? true,
          permissions: room.permissions || ['all'],
          participant_count: room.participant_count ?? 0,
          created_at: room.created_at,
          updated_at: room.updated_at
        }));
      }

      // If no rooms exist, return empty array for now
      console.log('No voice rooms found for match, returning empty array');
      return [];

    } catch (error: any) {
      console.error('Failed to initialize rooms for match:', error);
      // Return mock data as fallback
      const mockRooms: VoiceRoom[] = [
        {
          id: `${matchId}-main`,
          name: 'Main Communication',
          description: 'Primary coordination channel for all trackers',
          match_id: matchId,
          max_participants: 20,
          is_private: false,
          is_active: true,
          permissions: ['all'],
          participant_count: 0
        }
      ];
      return mockRooms;
    }
  }

  public async getRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    return this.withRetry(
      async () => {
        try {
          // Try to query voice_rooms table directly
          const { data: roomsData, error } = await supabase
            .from('voice_rooms' as any)
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

          if (error) {
            console.warn('Could not fetch from voice_rooms table:', error);
            // Return cached or mock data
            return this.initializeRoomsForMatch(matchId);
          }

          if (!roomsData || !Array.isArray(roomsData)) return [];

          // Get participant counts for each room (simulated for now)
          const roomsWithCounts = roomsData.map((room: any) => ({
            id: room.id,
            name: room.name,
            description: room.description,
            match_id: room.match_id,
            max_participants: room.max_participants,
            is_private: room.is_private,
            is_active: room.is_active ?? true,
            permissions: room.permissions || ['all'],
            participant_count: room.participant_count ?? 0,
            created_at: room.created_at,
            updated_at: room.updated_at
          }));

          roomsWithCounts.forEach((room: VoiceRoom) => {
            this.roomCache.set(room.id, room);
          });

          return roomsWithCounts;
        } catch (sqlError) {
          console.warn('SQL query failed, using fallback:', sqlError);
          return this.initializeRoomsForMatch(matchId);
        }
      },
      `getRoomsForMatch_${matchId}`
    );
  }

  public async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      // Check if user is already in the room (simulated for now)
      console.log(`User ${userId} attempting to join room ${roomId} as ${userRole}`);

      // Get room details from cache or create mock room
      let room = this.roomCache.get(roomId);
      if (!room) {
        // Create a mock room if not found
        room = {
          id: roomId,
          name: 'Voice Room',
          match_id: roomId.split('-')[0] || 'unknown',
          max_participants: 20,
          is_private: false,
          is_active: true,
          permissions: ['all'],
          participant_count: 0
        };
        this.roomCache.set(roomId, room);
      }

      // Simulate successful join
      const updatedRoom = { ...room, participant_count: (room.participant_count || 0) + 1 };
      this.roomCache.set(roomId, updatedRoom);

      console.log(`User ${userId} joined room ${roomId} successfully (simulated)`);
      return { success: true, room: updatedRoom };

    } catch (error: any) {
      console.error('Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  public async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`User ${userId} leaving room ${roomId} (simulated)`);

      // Update cache
      const cachedRoom = this.roomCache.get(roomId);
      if (cachedRoom && cachedRoom.participant_count) {
        const updatedRoom = { ...cachedRoom, participant_count: Math.max(0, cachedRoom.participant_count - 1) };
        this.roomCache.set(roomId, updatedRoom);
      }

      console.log(`User ${userId} left room ${roomId} successfully (simulated)`);
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
      console.log(`Updated participant ${userId} status in room ${roomId} (simulated):`, updates);
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
        // Simulate participants for now
        const participants: VoiceRoomParticipant[] = [];
        
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
