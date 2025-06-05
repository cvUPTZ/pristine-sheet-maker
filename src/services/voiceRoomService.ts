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
  private roomSubscription: any = null;
  private participantSubscription: any = null;

  private async withRetry<T>(
    operation: () => Promise<{ data?: T; error?: any; count?: number | null }>,
    operationName: string,
    maxAttempts = 2,
    delayMs = 1000
  ): Promise<{ data?: T; error?: any; count?: number | null }> {
    let attempts = 0;
    let lastError: any = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[VoiceRoomService.withRetry] Attempt ${attempts}/${maxAttempts} for ${operationName}`);
        const result = await operation();
        if (result.error) {
          throw result.error;
        }
        console.log(`[VoiceRoomService.withRetry] ${operationName} successful on attempt ${attempts}`);
        return result;
      } catch (error: unknown) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[VoiceRoomService.withRetry] Attempt ${attempts}/${maxAttempts} for ${operationName} failed:`, errorMessage);
        
        // If it's a network/connection error, mark database as unavailable
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
          console.warn('[VoiceRoomService.withRetry] Network error detected, switching to offline mode');
          this.databaseAvailable = false;
          break;
        }
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    console.error(`[VoiceRoomService.withRetry] All ${maxAttempts} attempts for ${operationName} failed. Last error:`, lastError);
    return { error: lastError };
  }

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
      VoiceRoomService.instance.initializeService();
    }
    return VoiceRoomService.instance;
  }

  private async initializeService(): Promise<void> {
    console.log('[VoiceRoomService.initializeService] Initializing service and testing database connection.');
    await this.testDatabaseConnection();
  }

  async testDatabaseConnection(): Promise<boolean> {
    if (this.databaseAvailable !== null) {
      if (this.databaseAvailable && !this.roomSubscription && !this.participantSubscription) {
        console.log('[VoiceRoomService.testDatabaseConnection] Database was available, ensuring subscriptions are active.');
        this.subscribeToRoomChanges();
        this.subscribeToParticipantChanges();
      }
      return this.databaseAvailable;
    }

    try {
      console.log('[VoiceRoomService.testDatabaseConnection] Testing database connection...');
      
      // Test connection with a simple query
      const { error } = await Promise.race([
        (supabase as any).from('voice_rooms').select('id').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      if (error) {
        console.warn('[VoiceRoomService.testDatabaseConnection] Database not available, using demo mode:', error.message);
        this.databaseAvailable = false;
        await this.cleanupSubscriptions();
        return false;
      }
      
      console.log('✅ [VoiceRoomService.testDatabaseConnection] Database connection successful');
      this.databaseAvailable = true;
      this.subscribeToRoomChanges();
      this.subscribeToParticipantChanges();
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[VoiceRoomService.testDatabaseConnection] Database connection failed, using demo mode:', errorMessage);
      this.databaseAvailable = false;
      await this.cleanupSubscriptions();
      return false;
    }
  }

  subscribeToRoomChanges(): void {
    if (this.roomSubscription) {
      console.log('[VoiceRoomService.subscribeToRoomChanges] Already subscribed to room changes. Unsubscribing before re-subscribing.');
      supabase.removeChannel(this.roomSubscription);
      this.roomSubscription = null;
    }

    console.log('[VoiceRoomService.subscribeToRoomChanges] Subscribing to voice_rooms changes...');
    this.roomSubscription = supabase
      .channel('public:voice_rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voice_rooms' },
        (payload: any) => {
          console.log('[VoiceRoomService.subscribeToRoomChanges] Received real-time event for voice_rooms:', payload);
          switch (payload.eventType) {
            case 'INSERT':
              const newRoom = payload.new as VoiceRoom;
              // Ensure participant_count is initialized if not provided by the event
              if (newRoom.participant_count === undefined) newRoom.participant_count = 0;
              this.roomCache.set(newRoom.id, newRoom);
              console.log(`[VoiceRoomService.subscribeToRoomChanges] INSERT: Room ${newRoom.id} added to cache.`);
              break;
            case 'UPDATE':
              const updatedRoom = payload.new as VoiceRoom;
              const existingRoom = this.roomCache.get(updatedRoom.id);
              // Preserve participant_count from cache if not in payload, as room updates might not include it
              const participantCount = updatedRoom.participant_count ?? existingRoom?.participant_count ?? 0;
              this.roomCache.set(updatedRoom.id, { ...existingRoom, ...updatedRoom, participant_count: participantCount });
              console.log(`[VoiceRoomService.subscribeToRoomChanges] UPDATE: Room ${updatedRoom.id} updated in cache.`);
              break;
            case 'DELETE':
              const deletedRoom = payload.old as { id: string };
              if (deletedRoom && deletedRoom.id) {
                this.roomCache.delete(deletedRoom.id);
                this.participantCache.delete(deletedRoom.id); // Also clear participants for this room
                console.log(`[VoiceRoomService.subscribeToRoomChanges] DELETE: Room ${deletedRoom.id} removed from cache.`);
              } else {
                 console.warn('[VoiceRoomService.subscribeToRoomChanges] DELETE event without old.id:', payload);
              }
              break;
            default:
              console.log('[VoiceRoomService.subscribeToRoomChanges] Unhandled event type:', payload.eventType);
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [VoiceRoomService.subscribeToRoomChanges] Successfully subscribed to voice_rooms changes!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          console.error(`[VoiceRoomService.subscribeToRoomChanges] Subscription error to voice_rooms: ${status}`, err);
          // Optionally, set databaseAvailable to false or attempt resubscribe after a delay
          // this.databaseAvailable = false; // This might be too aggressive
        } else {
          console.log(`[VoiceRoomService.subscribeToRoomChanges] voice_rooms subscription status: ${status}`);
        }
      });
  }

  subscribeToParticipantChanges(): void {
    if (this.participantSubscription) {
      console.log('[VoiceRoomService.subscribeToParticipantChanges] Already subscribed to participant changes. Unsubscribing before re-subscribing.');
      supabase.removeChannel(this.participantSubscription);
      this.participantSubscription = null;
    }

    console.log('[VoiceRoomService.subscribeToParticipantChanges] Subscribing to voice_room_participants changes...');
    this.participantSubscription = supabase
      .channel('public:voice_room_participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voice_room_participants' },
        (payload: any) => {
          console.log('[VoiceRoomService.subscribeToParticipantChanges] Received real-time event for voice_room_participants:', payload);
          let roomId: string | undefined;
          switch (payload.eventType) {
            case 'INSERT':
              roomId = payload.new?.room_id;
              if (roomId) {
                const room = this.roomCache.get(roomId);
                if (room) {
                  room.participant_count = (room.participant_count || 0) + 1;
                  this.roomCache.set(roomId, room);
                  console.log(`[VoiceRoomService.subscribeToParticipantChanges] INSERT: Incremented participant_count for room ${roomId}. New count: ${room.participant_count}`);
                }
                this.participantCache.delete(roomId); // Invalidate participant list for this room
                console.log(`[VoiceRoomService.subscribeToParticipantChanges] Cleared participant cache for room ${roomId} due to INSERT.`);
              }
              break;
            case 'DELETE':
              roomId = payload.old?.room_id;
              if (roomId) {
                const room = this.roomCache.get(roomId);
                if (room && room.participant_count && room.participant_count > 0) {
                  room.participant_count -= 1;
                  this.roomCache.set(roomId, room);
                  console.log(`[VoiceRoomService.subscribeToParticipantChanges] DELETE: Decremented participant_count for room ${roomId}. New count: ${room.participant_count}`);
                }
                this.participantCache.delete(roomId); // Invalidate participant list for this room
                console.log(`[VoiceRoomService.subscribeToParticipantChanges] Cleared participant cache for room ${roomId} due to DELETE.`);
              }
              break;
            default:
              console.log('[VoiceRoomService.subscribeToParticipantChanges] Unhandled event type:', payload.eventType);
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
         if (status === 'SUBSCRIBED') {
          console.log('✅ [VoiceRoomService.subscribeToParticipantChanges] Successfully subscribed to voice_room_participants changes!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          console.error(`[VoiceRoomService.subscribeToParticipantChanges] Subscription error to voice_room_participants: ${status}`, err);
          // Optionally, set databaseAvailable to false or attempt resubscribe after a delay
        } else {
          console.log(`[VoiceRoomService.subscribeToParticipantChanges] voice_room_participants subscription status: ${status}`);
        }
      });
  }

  async cleanupSubscriptions(): Promise<void> {
    console.log('[VoiceRoomService.cleanupSubscriptions] Cleaning up real-time subscriptions...');
    if (this.roomSubscription) {
      try {
        await supabase.removeChannel(this.roomSubscription);
        console.log('[VoiceRoomService.cleanupSubscriptions] Removed room subscription.');
      } catch (error) {
        console.error('[VoiceRoomService.cleanupSubscriptions] Error removing room subscription:', error);
      } finally {
        this.roomSubscription = null;
      }
    }
    if (this.participantSubscription) {
      try {
        await supabase.removeChannel(this.participantSubscription);
        console.log('[VoiceRoomService.cleanupSubscriptions] Removed participant subscription.');
      } catch (error) {
        console.error('[VoiceRoomService.cleanupSubscriptions] Error removing participant subscription:', error);
      } finally {
        this.participantSubscription = null;
      }
    }
    console.log('[VoiceRoomService.cleanupSubscriptions] Finished cleaning up subscriptions.');
  }

  async createRoom(request: CreateRoomRequest): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    try {
      console.log('🏗️ Creating new voice room:', request.name);

      const isDatabaseAvailable = await this.testDatabaseConnection();
      
      if (!isDatabaseAvailable) {
        // Create mock room for demo mode
        const mockRoom: VoiceRoom = {
          id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          match_id: request.match_id,
          name: request.name,
          description: request.description || 'Voice collaboration room (Demo Mode)',
          max_participants: request.max_participants || 25,
          priority: request.priority || 1,
          permissions: request.permissions || ['all'],
          is_private: request.is_private || false,
          is_active: true,
          participant_count: 0,
          created_at: new Date().toISOString()
        };

        this.roomCache.set(mockRoom.id, mockRoom);
        console.log('✅ Demo room created:', mockRoom.name);
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

      const result = await this.withRetry(
        () => (supabase as any)
          .from('voice_rooms')
          .insert(insertData)
          .select()
          .single(),
        'createRoom'
      );

      if (result.error) {
        console.error('❌ Database error creating room, falling back to demo mode:', result.error);
        // Fall back to demo mode
        return this.createRoom(request);
      }

      const newRoom: VoiceRoom = {
        ...result.data,
        participant_count: 0
      };

      this.roomCache.set(newRoom.id, newRoom);
      
      console.log('✅ Room created successfully:', newRoom.name);
      return { success: true, room: newRoom };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to create room:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async getRooms(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log('📋 Retrieving rooms for match:', matchId);

      const isDatabaseAvailable = await this.testDatabaseConnection();
      
      if (!isDatabaseAvailable) {
        const cachedRooms = Array.from(this.roomCache.values())
          .filter(room => room.match_id === matchId && room.is_active);
        console.log(`✅ Retrieved ${cachedRooms.length} cached rooms (Demo Mode)`);
        return cachedRooms;
      }

      const result = await this.withRetry(
        () => (supabase as any)
          .from('voice_rooms')
          .select('*')
          .eq('match_id', matchId)
          .eq('is_active', true)
          .order('priority', { ascending: true }),
        'getRooms'
      );

      if (result.error) {
        console.error('❌ Database error retrieving rooms, using cached data:', result.error);
        const cachedRooms = Array.from(this.roomCache.values())
          .filter(room => room.match_id === matchId && room.is_active);
        return cachedRooms;
      }

      // Get participant counts - Fix: ensure data is an array
      const roomsData = Array.isArray(result.data) ? result.data : [];
      const roomsWithCounts = await Promise.all(
        roomsData.map(async (room: any) => {
          const countResult = await this.withRetry(
            () => (supabase as any)
              .from('voice_room_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id),
            'getParticipantCount'
          );

          const roomWithCount: VoiceRoom = {
            ...room,
            participant_count: countResult.count || 0
          };

          this.roomCache.set(room.id, roomWithCount);
          return roomWithCount;
        })
      );

      console.log(`✅ Retrieved ${roomsWithCounts.length} rooms for match`);
      return roomsWithCounts;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to retrieve rooms:', errorMessage);
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

      // Fix: ensure data exists and is an object before spreading
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'No valid data returned from update' };
      }

      const updatedRoom: VoiceRoom = {
        ...data,
        participant_count: this.roomCache.get(roomId)?.participant_count || 0
      };

      // Update cache
      this.roomCache.set(roomId, updatedRoom);
      
      console.log('✅ Room updated successfully');
      return { success: true, room: updatedRoom };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to update room:', errorMessage);
      return { success: false, error: errorMessage };
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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to delete room:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    try {
      console.log(`🏗️ Initializing voice rooms for match: ${matchId}`);

      const existingRooms = await this.getRooms(matchId);
      if (existingRooms.length > 0) {
        console.log('✅ Using existing rooms for match');
        return existingRooms;
      }

      const isDatabaseAvailable = await this.testDatabaseConnection();
      const modeText = isDatabaseAvailable ? 'Database' : 'Demo';
      
      const templateRooms: VoiceRoom[] = [];
      
      const defaultTemplates = {
        main: {
          name: `Main Voice Room (${modeText})`,
          description: `Main voice collaboration room - ${modeText} Mode`,
          maxParticipants: 50,
          priority: 1,
          permissions: ['all'],
          isPrivate: false
        },
        tracker: {
          name: `Tracker Discussion (${modeText})`,
          description: `Voice room for tracker coordination - ${modeText} Mode`,
          maxParticipants: 25,
          priority: 2,
          permissions: ['all'],
          isPrivate: false
        }
      };

      const templatesToUse = VOICE_ROOM_TEMPLATES || defaultTemplates;
      
      for (const [key, template] of Object.entries(templatesToUse)) {
        const createResult = await this.createRoom({
          match_id: matchId,
          name: template.name || `Room ${key} (${modeText})`,
          description: template.description || `Voice collaboration room - ${modeText} Mode`,
          max_participants: template.maxParticipants || 25,
          priority: template.priority || 1,
          permissions: ['all'],
          is_private: template.isPrivate || false
        });

        if (createResult.success && createResult.room) {
          templateRooms.push(createResult.room);
        }
      }

      console.log(`✅ Initialized ${templateRooms.length} template rooms (${modeText} mode)`);
      return templateRooms;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to initialize voice rooms:', errorMessage);
      
      const fallbackResult = await this.createRoom({
        match_id: matchId,
        name: 'Default Voice Room (Demo)',
        description: 'Default voice collaboration room - Demo Mode',
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
      console.log(`[VoiceRoomService.joinRoom] Attempting to join room. Room ID: ${roomId}, User ID: ${userId}, User Role: ${userRole}`);

      const isDatabaseAvailable = await this.testDatabaseConnection();
      console.log(`[VoiceRoomService.joinRoom] Database availability: ${isDatabaseAvailable}`);

      if (isDatabaseAvailable) {
        try {
          console.log(`[VoiceRoomService.joinRoom] Using Edge Function 'join-voice-room'. Room ID: ${roomId}, User ID: ${userId}`);
          
          const functionResult = await Promise.race([
            supabase.functions.invoke('join-voice-room', {
              body: { roomId, userId, userRole },
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Edge function timeout')), 10000)
            )
          ]);

          const { data: functionResponse, error: functionError } = functionResult as any;

          if (functionError) {
            throw functionError;
          }

          if (functionResponse && functionResponse.error) {
            throw new Error(functionResponse.error);
          }

          if (!functionResponse || !functionResponse.room) {
            throw new Error("Edge function returned invalid response.");
          }

          const roomFromFunction = functionResponse.room as VoiceRoom;
          this.roomCache.set(roomId, roomFromFunction);
          
          console.log(`[VoiceRoomService.joinRoom] User ${userId} joined room ${roomFromFunction.name} successfully via Edge Function. Room ID: ${roomId}`);
          return { success: true, room: roomFromFunction };

        } catch (edgeFunctionError: unknown) {
          const errorMessage = edgeFunctionError instanceof Error ? edgeFunctionError.message : String(edgeFunctionError);
          console.warn(`[VoiceRoomService.joinRoom] Edge Function failed, falling back to demo mode:`, errorMessage);
          // Fall through to demo mode
        }
      }

      // Demo mode
      console.log(`[VoiceRoomService.joinRoom] Demo mode: Simulating room join. Room ID: ${roomId}, User ID: ${userId}`);

      let room = this.roomCache.get(roomId);
      if (!room) {
        console.error(`[VoiceRoomService.joinRoom] Demo mode: Room not found in cache. Room ID: ${roomId}`);
        return { success: false, error: 'Room not found. System is in demo mode.' };
      }
      
      if (!room.is_active) {
        console.warn(`[VoiceRoomService.joinRoom] Demo mode: Room is not active. Room ID: ${roomId}`);
        return { success: false, error: 'Room is not active' };
      }

      if (!this.participantCache.has(roomId)) {
        this.participantCache.set(roomId, []);
      }
      
      const participants = this.participantCache.get(roomId)!;
      let currentParticipantCount = participants.length;

      if (currentParticipantCount >= room.max_participants) {
        console.warn(`[VoiceRoomService.joinRoom] Demo mode: Room is full. Current: ${currentParticipantCount}, Max: ${room.max_participants}. Room ID: ${roomId}`);
        return { success: false, error: 'Room is full' };
      }

      const existingParticipant = participants.find(p => p.user_id === userId);
      
      if (!existingParticipant) {
        participants.push({
          id: `demo-${Date.now()}`,
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
      
      const updatedRoom = { ...room, participant_count: currentParticipantCount };
      this.roomCache.set(roomId, updatedRoom);

      console.log(`[VoiceRoomService.joinRoom] User ${userId} joined room ${room.name} successfully (Demo Mode). Room ID: ${roomId}`);
      return { success: true, room: updatedRoom };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[VoiceRoomService.joinRoom] Failed to join room. Room ID: ${roomId}, User ID: ${userId}`, errorMessage);
      return { success: false, error: `Failed to join room: ${errorMessage}. System may be in demo mode.` };
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to leave room:`, errorMessage);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to update participant status:`, errorMessage);
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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to get room participants:`, errorMessage);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to cleanup inactive participants:', errorMessage);
    }
  }

  clearCaches(): void {
    this.roomCache.clear();
    this.participantCache.clear();
    console.log('[VoiceRoomService.clearCaches] All caches cleared.');
  }

  // Example of how to explicitly re-initialize if needed, e.g., after manual logout/login
  async reinitializeService(): Promise<void> {
    console.log('[VoiceRoomService.reinitializeService] Re-initializing service...');
    this.databaseAvailable = null; // Force re-check
    await this.cleanupSubscriptions();
    await this.initializeService();
  }
}
