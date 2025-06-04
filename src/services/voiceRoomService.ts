
import { supabase } from '@/integrations/supabase/client';
import { VOICE_ROOM_TEMPLATES } from '@/config/voiceConfig';

export interface VoiceRoom {
  id: string;
  name: string;
  description: string;
  matchId: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
  permissions: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface VoiceParticipant {
  userId: string;
  roomId: string;
  joinedAt: string;
  role: string;
  isMuted: boolean;
  isAdmin: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastActivity: string;
}

export class VoiceRoomService {
  private static instance: VoiceRoomService;
  private rooms = new Map<string, VoiceRoom>();
  private participants = new Map<string, VoiceParticipant[]>();

  static getInstance(): VoiceRoomService {
    if (!VoiceRoomService.instance) {
      VoiceRoomService.instance = new VoiceRoomService();
    }
    return VoiceRoomService.instance;
  }

  async initializeRoomsForMatch(matchId: string): Promise<VoiceRoom[]> {
    console.log('🏠 Initializing voice rooms for match:', matchId);
    
    const rooms: VoiceRoom[] = Object.entries(VOICE_ROOM_TEMPLATES).map(([key, template]) => ({
      id: `${matchId}_${key}`,
      name: template.name,
      description: template.description,
      matchId,
      maxParticipants: template.maxParticipants,
      currentParticipants: 0,
      isPrivate: template.isPrivate || false,
      permissions: template.permissions,
      priority: template.priority,
      isActive: true,
      createdAt: new Date().toISOString()
    }));

    // Store rooms in memory and optionally in database
    rooms.forEach(room => {
      this.rooms.set(room.id, room);
      this.participants.set(room.id, []);
    });

    console.log(`✅ Initialized ${rooms.length} voice rooms for match ${matchId}`);
    return rooms;
  }

  async joinRoom(roomId: string, userId: string, userRole: string): Promise<{ success: boolean; room?: VoiceRoom; error?: string }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.isActive) {
      return { success: false, error: 'Room is not active' };
    }

    // Check permissions
    if (room.isPrivate && !room.permissions.includes(userRole) && userRole !== 'admin') {
      return { success: false, error: 'Insufficient permissions to join this room' };
    }

    const roomParticipants = this.participants.get(roomId) || [];
    
    // Check if already in room
    if (roomParticipants.some(p => p.userId === userId)) {
      return { success: true, room };
    }

    // Check capacity
    if (roomParticipants.length >= room.maxParticipants) {
      return { success: false, error: 'Room is at maximum capacity' };
    }

    // Add participant
    const participant: VoiceParticipant = {
      userId,
      roomId,
      joinedAt: new Date().toISOString(),
      role: userRole,
      isMuted: true, // Start muted by default
      isAdmin: userRole === 'admin',
      connectionQuality: 'good',
      lastActivity: new Date().toISOString()
    };

    roomParticipants.push(participant);
    this.participants.set(roomId, roomParticipants);

    // Update room participant count
    room.currentParticipants = roomParticipants.length;
    this.rooms.set(roomId, room);

    console.log(`👤 User ${userId} joined room ${room.name} (${roomParticipants.length}/${room.maxParticipants})`);
    
    return { success: true, room };
  }

  async leaveRoom(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const roomParticipants = this.participants.get(roomId) || [];
    const updatedParticipants = roomParticipants.filter(p => p.userId !== userId);
    
    this.participants.set(roomId, updatedParticipants);

    // Update room participant count
    const room = this.rooms.get(roomId);
    if (room) {
      room.currentParticipants = updatedParticipants.length;
      this.rooms.set(roomId, room);
      console.log(`👋 User ${userId} left room ${room.name} (${updatedParticipants.length}/${room.maxParticipants})`);
    }

    return { success: true };
  }

  async updateParticipantStatus(roomId: string, userId: string, updates: Partial<VoiceParticipant>): Promise<void> {
    const roomParticipants = this.participants.get(roomId) || [];
    const participantIndex = roomParticipants.findIndex(p => p.userId === userId);
    
    if (participantIndex !== -1) {
      roomParticipants[participantIndex] = {
        ...roomParticipants[participantIndex],
        ...updates,
        lastActivity: new Date().toISOString()
      };
      this.participants.set(roomId, roomParticipants);
    }
  }

  getRoomParticipants(roomId: string): VoiceParticipant[] {
    return this.participants.get(roomId) || [];
  }

  getAvailableRooms(userRole: string): VoiceRoom[] {
    return Array.from(this.rooms.values())
      .filter(room => room.isActive)
      .filter(room => !room.isPrivate || room.permissions.includes(userRole) || userRole === 'admin')
      .sort((a, b) => a.priority - b.priority);
  }

  async cleanupInactiveParticipants(inactivityThreshold: number = 300000): Promise<void> {
    const now = Date.now();
    
    for (const [roomId, participants] of this.participants.entries()) {
      const activeParticipants = participants.filter(p => {
        const lastActivity = new Date(p.lastActivity).getTime();
        return (now - lastActivity) < inactivityThreshold;
      });
      
      if (activeParticipants.length !== participants.length) {
        console.log(`🧹 Cleaned up ${participants.length - activeParticipants.length} inactive participants from room ${roomId}`);
        this.participants.set(roomId, activeParticipants);
        
        // Update room count
        const room = this.rooms.get(roomId);
        if (room) {
          room.currentParticipants = activeParticipants.length;
          this.rooms.set(roomId, room);
        }
      }
    }
  }
}
