import { NewVoiceChatManager } from './NewVoiceChatManager';
import { SupabaseClient } from '@supabase/supabase-js';
import { Room, ConnectionState, RoomEvent, LocalParticipant, RemoteParticipant } from 'livekit-client';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'fake-access-token' } },
        error: null,
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    functions: {
      invoke: jest.fn(),
    },
  };
  return {
    createClient: jest.fn(() => mockSupabaseClient),
  };
});

// Mock LiveKit Room
jest.mock('livekit-client', () => {
  const originalModule = jest.requireActual('livekit-client');
  return {
    ...originalModule,
    Room: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      removeAllListeners: jest.fn(),
      localParticipant: {
        setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
        isMicrophoneMuted: false,
        identity: 'local-user-identity',
        name: 'Local User',
      } as unknown as LocalParticipant, // Cast to satisfy type, add more props if needed
      remoteParticipants: new Map<string, RemoteParticipant>(),
      state: ConnectionState.Disconnected,
    })),
  };
});


describe('NewVoiceChatManager', () => {
  let voiceManager: NewVoiceChatManager;
  let mockSupabaseInstance: any; // Type properly if you have a mock type
  let mockLiveKitRoomInstance: jest.Mocked<Room>;

  beforeEach(() => {
    // Reset mocks for Supabase client before each test
    const { createClient } = require('@supabase/supabase-js');
    mockSupabaseInstance = createClient(); // Get the mocked instance

    // Reset specific function mocks on the Supabase instance
    mockSupabaseInstance.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'fake-access-token' } },
        error: null,
    });
    mockSupabaseInstance.from.mockReturnThis(); // Ensure chaining works
    mockSupabaseInstance.select.mockReturnThis();
    mockSupabaseInstance.eq.mockReturnThis();
    mockSupabaseInstance.order.mockReturnThis();
    mockSupabaseInstance.functions.invoke.mockReset(); // Reset invoke specifically

    voiceManager = new NewVoiceChatManager();

    // Get the latest mock LiveKit Room instance after manager instantiation (if needed)
    // This assumes NewVoiceChatManager creates a Room instance internally upon certain actions.
    // For now, we'll mock the constructor, so any `new Room()` will use the mock.
    const { Room: MockedRoom } = require('livekit-client');
    // If the Room is created on join, this might need to be accessed after joinRoom is called
    // For now, we assume the mock setup for `new Room()` is sufficient.
  });

  afterEach(() => {
    jest.clearAllMocks();
    voiceManager.dispose(); // Clean up manager resources
  });

  describe('Constructor and Initialization', () => {
    it('should initialize Supabase client', () => {
      const { createClient } = require('@supabase/supabase-js');
      expect(createClient).toHaveBeenCalledWith(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    });
  });

  describe('listAvailableRooms', () => {
    it('should fetch and return available rooms for a matchId', async () => {
      const mockRooms = [{ id: 'room1', name: 'Room 1', match_id: 'match1', is_active: true }];
      mockSupabaseInstance.from('voice_rooms').select('*').eq('match_id', 'match1').eq('is_active', true).order('priority').mockResolvedValueOnce({ data: mockRooms, error: null });

      const rooms = await voiceManager.listAvailableRooms('match1');
      expect(rooms).toEqual(mockRooms);
      expect(mockSupabaseInstance.from).toHaveBeenCalledWith('voice_rooms');
      expect(mockSupabaseInstance.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseInstance.eq).toHaveBeenCalledWith('match_id', 'match1');
      expect(mockSupabaseInstance.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return empty array on error when fetching rooms', async () => {
      mockSupabaseInstance.from('voice_rooms').select('*').eq('match_id', 'match1').eq('is_active', true).order('priority').mockResolvedValueOnce({ data: null, error: new Error('DB Error') });
      const onErrorCallback = jest.fn();
      voiceManager.onError = onErrorCallback;

      const rooms = await voiceManager.listAvailableRooms('match1');
      expect(rooms).toEqual([]);
      expect(onErrorCallback).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('joinRoom', () => {
    beforeEach(() => {
      // Setup default successful responses for dependent functions
      mockSupabaseInstance.functions.invoke
        .mockResolvedValueOnce({ data: { authorized: true, message: 'Joined' }, error: null }) // for join-voice-room
        .mockResolvedValueOnce({ data: { token: 'fake-livekit-token' }, error: null }); // for generate-livekit-token

      // Ensure VITE_LIVEKIT_URL is set for tests
      process.env.VITE_LIVEKIT_URL = 'wss://fake-livekit-url.com';
    });

    it('should successfully join a room, connect to LiveKit and enable microphone', async () => {
      const result = await voiceManager.joinRoom('room1', 'user1', 'tracker', 'User One');

      expect(result).toBe(true);
      expect(mockSupabaseInstance.functions.invoke).toHaveBeenCalledWith('join-voice-room', {
        body: { roomId: 'room1', userId: 'user1', userRole: 'tracker' },
        headers: { Authorization: 'Bearer fake-access-token' },
      });
      expect(mockSupabaseInstance.functions.invoke).toHaveBeenCalledWith('generate-livekit-token', {
        body: { roomId: 'room1', participantIdentity: 'user1', participantName: 'User One' },
        headers: { Authorization: 'Bearer fake-access-token' },
      });

      // Access the actual mock instance created by `new Room()`
      // This requires the mock for `livekit-client`'s Room constructor to be effective.
      // The instance is created inside joinRoom. We need to check the mock on the `Room` constructor.
      const { Room: MockedRoomConstructor } = require('livekit-client');
      const mockRoomInstance = MockedRoomConstructor.mock.results[0]?.value; // Get the first instance created

      expect(MockedRoomConstructor).toHaveBeenCalledTimes(1);
      expect(mockRoomInstance.connect).toHaveBeenCalledWith('wss://fake-livekit-url.com', 'fake-livekit-token', { autoSubscribe: true });
      expect(mockRoomInstance.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
      expect(voiceManager.getCurrentRoomId()).toBe('room1');
    });

    it('should return false if join-voice-room fails', async () => {
      mockSupabaseInstance.functions.invoke
        .mockReset() // Reset previous mock setup for this specific test
        .mockResolvedValueOnce({ data: { authorized: false, error: 'Not allowed' }, error: null }); // join-voice-room fails

      const onErrorCallback = jest.fn();
      voiceManager.onError = onErrorCallback;

      const result = await voiceManager.joinRoom('room1', 'user1', 'tracker');
      expect(result).toBe(false);
      expect(onErrorCallback).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Join room authorization step failed: Not allowed') }));
      expect(voiceManager.getCurrentRoomId()).toBeNull();
    });

    it('should return false if generate-livekit-token fails', async () => {
      mockSupabaseInstance.functions.invoke
        .mockReset()
        .mockResolvedValueOnce({ data: { authorized: true }, error: null }) // join-voice-room success
        .mockResolvedValueOnce({ data: { token: null, error: 'Token gen error' }, error: null }); // generate-livekit-token fails

      const onErrorCallback = jest.fn();
      voiceManager.onError = onErrorCallback;

      const result = await voiceManager.joinRoom('room1', 'user1', 'tracker');
      expect(result).toBe(false);
      expect(onErrorCallback).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('LiveKit token generation failed: Token gen error') }));
      expect(voiceManager.getCurrentRoomId()).toBeNull();
    });

    it('should return false if LiveKit URL is not configured', async () => {
      delete process.env.VITE_LIVEKIT_URL; // Simulate missing env var
      const onErrorCallback = jest.fn();
      voiceManager.onError = onErrorCallback;

      const result = await voiceManager.joinRoom('room1', 'user1', 'tracker');
      expect(result).toBe(false);
      expect(onErrorCallback).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('LiveKit URL is not configured')}));
    });

  });

  describe('leaveRoom', () => {
    it('should disconnect from LiveKit room and clean up', async () => {
      // First, join a room to have a liveKitRoom instance
      mockSupabaseInstance.functions.invoke
        .mockResolvedValueOnce({ data: { authorized: true }, error: null })
        .mockResolvedValueOnce({ data: { token: 'fake-livekit-token' }, error: null });
      process.env.VITE_LIVEKIT_URL = 'wss://fake-livekit-url.com';
      await voiceManager.joinRoom('room1', 'user1', 'tracker');

      const { Room: MockedRoomConstructor } = require('livekit-client');
      const mockRoomInstance = MockedRoomConstructor.mock.results[0]?.value;

      const onConnStateChange = jest.fn();
      voiceManager.onConnectionStateChanged = onConnStateChange;

      await voiceManager.leaveRoom();

      expect(mockRoomInstance.disconnect).toHaveBeenCalled();
      expect(mockRoomInstance.removeAllListeners).toHaveBeenCalled();
      expect(voiceManager.getCurrentRoomId()).toBeNull();
      // Check if onConnectionStateChanged was called with Disconnected
      // This depends on exact implementation, might be called from within leaveRoom or by LiveKit events
      // For this test, let's assume leaveRoom calls it directly or indirectly
      expect(onConnStateChange).toHaveBeenCalledWith(ConnectionState.Disconnected);
    });
  });

  describe('toggleMuteSelf', () => {
    it('should toggle microphone state if connected', async () => {
      // Join room first
      mockSupabaseInstance.functions.invoke
        .mockResolvedValueOnce({ data: { authorized: true }, error: null })
        .mockResolvedValueOnce({ data: { token: 'fake-livekit-token' }, error: null });
      process.env.VITE_LIVEKIT_URL = 'wss://fake-livekit-url.com';
      await voiceManager.joinRoom('room1', 'user1', 'tracker');

      const { Room: MockedRoomConstructor } = require('livekit-client');
      const mockRoomInstance = MockedRoomConstructor.mock.results[0]?.value;

      // Assume starts unmuted (false)
      mockRoomInstance.localParticipant.isMicrophoneMuted = false;
      let mutedState = await voiceManager.toggleMuteSelf();
      expect(mutedState).toBe(true); // Should now be muted
      expect(mockRoomInstance.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false); // Enabled(false) means muted

      mockRoomInstance.localParticipant.isMicrophoneMuted = true; // Simulate it's now muted
      mutedState = await voiceManager.toggleMuteSelf();
      expect(mutedState).toBe(false); // Should now be unmuted
      expect(mockRoomInstance.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true); // Enabled(true) means unmuted
    });

    it('should return undefined if not connected', async () => {
      const result = await voiceManager.toggleMuteSelf();
      expect(result).toBeUndefined();
    });
  });

  // TODO: Add tests for moderateMuteParticipant, dispose, and event handlers (onParticipantsChanged, etc.)
  // For event handlers, you would need to simulate LiveKit emitting events on the mocked Room instance.
});
