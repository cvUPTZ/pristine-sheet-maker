import { renderHook, act } from '@testing-library/react-hooks'; // Or @testing-library/react
import { useNewVoiceCollaboration } from './useNewVoiceCollaboration';
import { NewVoiceChatManager } from '@/services/NewVoiceChatManager';
import { ConnectionState, Participant } from 'livekit-client';

// Mock the NewVoiceChatManager service
jest.mock('@/services/NewVoiceChatManager');

const mockManagerInstance = {
  listAvailableRooms: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  toggleMuteSelf: jest.fn(),
  moderateMuteParticipant: jest.fn(),
  dispose: jest.fn(),
  getLocalParticipant: jest.fn(),
  getCurrentRoomId: jest.fn(),
  // Mocked callback setters
  onParticipantsChanged: null as ((participants: Participant[]) => void) | null,
  onConnectionStateChanged: null as ((state: ConnectionState) => void) | null,
  onError: null as ((error: Error) => void) | null,
};

describe('useNewVoiceCollaboration Hook', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Configure the NewVoiceChatManager mock constructor to return our controlled instance
    (NewVoiceChatManager as jest.Mock).mockImplementation(() => {
      // Assign callbacks to the mock instance so we can simulate them
      // This part is tricky as the hook assigns these. We need to capture them.
      // A better way might be to have the mockManagerInstance itself have properties for these callbacks
      // that the hook's effect then sets.
      // For this test, we'll assume the hook correctly sets these on the instance it creates.
      // The mock instance will store the callbacks passed to it by the hook.
      const instance = { ...mockManagerInstance };
      Object.defineProperty(instance, 'onParticipantsChanged', {
        configurable: true, writable: true, value: null,
      });
      Object.defineProperty(instance, 'onConnectionStateChanged', {
        configurable: true, writable: true, value: null,
      });
      Object.defineProperty(instance, 'onError', {
        configurable: true, writable: true, value: null,
      });
      return instance;
    });
  });

  it('should initialize NewVoiceChatManager and set up callbacks', () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    expect(NewVoiceChatManager).toHaveBeenCalledTimes(1);
    expect(result.current.manager).toBeDefined();

    // Check if callbacks were set up (i.e., the manager's setters were called by the hook)
    // This requires the mockManagerInstance to have been returned by the NewVoiceChatManager mock constructor
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    expect(typeof managerInstanceInHook.onParticipantsChanged).toBe('function');
    expect(typeof managerInstanceInHook.onConnectionStateChanged).toBe('function');
    expect(typeof managerInstanceInHook.onError).toBe('function');
  });

  it('should call manager.dispose on unmount', () => {
    const { unmount } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;

    unmount();
    expect(managerInstanceInHook.dispose).toHaveBeenCalledTimes(1);
  });

  it('should update participants when onParticipantsChanged is called', () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;

    const mockParticipants = [{ identity: 'user1' } as Participant];
    act(() => {
      managerInstanceInHook.onParticipantsChanged(mockParticipants);
    });
    expect(result.current.participants).toEqual(mockParticipants);
  });

  it('should update connectionState when onConnectionStateChanged is called', () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;

    managerInstanceInHook.getCurrentRoomId.mockReturnValue('room-123'); // Simulate manager has a room ID

    act(() => {
      managerInstanceInHook.onConnectionStateChanged(ConnectionState.Connected);
    });
    expect(result.current.connectionState).toBe(ConnectionState.Connected);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.currentRoomId).toBe('room-123'); // Also check if currentRoomId is updated
  });

  it('should clear error when connected', () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;

    act(() => {
        managerInstanceInHook.onError(new Error("Initial error"));
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      managerInstanceInHook.onConnectionStateChanged(ConnectionState.Connected);
    });
    expect(result.current.error).toBeNull();
  });


  it('should update error when onError is called', () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    const mockError = new Error('Test Error');

    act(() => {
      managerInstanceInHook.onError(mockError);
    });
    expect(result.current.error).toBe(mockError);
  });

  it('fetchAvailableRooms should call manager.listAvailableRooms and update state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;

    const mockRoomsData = [{ id: 'room1', name: 'Room 1' }];
    managerInstanceInHook.listAvailableRooms.mockResolvedValue(mockRoomsData);

    await act(async () => {
      result.current.fetchAvailableRooms('match1');
    });

    expect(managerInstanceInHook.listAvailableRooms).toHaveBeenCalledWith('match1');
    expect(result.current.availableRooms).toEqual(mockRoomsData);
    expect(result.current.isLoadingRooms).toBe(false);
  });

  it('fetchAvailableRooms should handle errors', async () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    const mockError = new Error("Failed to fetch rooms");
    managerInstanceInHook.listAvailableRooms.mockRejectedValue(mockError);

    await act(async () => {
      await result.current.fetchAvailableRooms('match1');
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.isLoadingRooms).toBe(false);
    expect(result.current.availableRooms).toEqual([]);
  });


  it('joinRoom should call manager.joinRoom and update state on success', async () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    managerInstanceInHook.joinRoom.mockResolvedValue(true);
    managerInstanceInHook.getLocalParticipant.mockReturnValue({ identity: 'local-user' } as Participant);

    let success = false;
    await act(async () => {
      success = await result.current.joinRoom('room1', 'user1', 'role1', 'User One');
    });

    expect(managerInstanceInHook.joinRoom).toHaveBeenCalledWith('room1', 'user1', 'role1', 'User One');
    expect(success).toBe(true);
    expect(result.current.currentRoomId).toBe('room1');
    expect(result.current.localParticipant).toEqual({ identity: 'local-user' });
  });

  it('joinRoom should handle failure from manager.joinRoom', async () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    managerInstanceInHook.joinRoom.mockResolvedValue(false);
    // Simulate onError being called by the manager upon failure
    const testError = new Error("Join failed in manager");
    // This requires manager to call its own onError callback
    // For this test, we assume the manager handles setting its own error state that the hook then picks up
    // Or, the hook's joinRoom could explicitly set an error if manager.joinRoom returns false and manager.onError wasn't called.
    // The current hook implementation relies on manager's onError. So, we need to simulate that.

    let success = true;
    await act(async () => {
      // Simulate manager calling its onError callback if joinRoom returns false
      managerInstanceInHook.joinRoom.mockImplementation(async () => {
        act(() => {
            managerInstanceInHook.onError(testError);
        });
        return false;
      });
      success = await result.current.joinRoom('room1', 'user1', 'role1', 'User One');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe(testError); // Check if error state is updated in the hook
  });


  it('leaveRoom should call manager.leaveRoom and reset state', async () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    managerInstanceInHook.leaveRoom.mockResolvedValue(undefined);

    // Simulate being in a room first
    // For this test, we need to call the hook's internal state setters.
    // This is not ideal but `renderHook` doesn't easily allow setting initial state for useState *within* the hook
    // when that state is derived from effects.
    // A more robust way would be to simulate the joinRoom sequence that sets these states.
    // However, for focused testing of leaveRoom's reset logic:
    act(() => {
      // Simulate the state after a successful join
      // This relies on the manager's callbacks being set up correctly by the hook's useEffect
      managerInstanceInHook.onConnectionStateChanged(ConnectionState.Connected);
      managerInstanceInHook.getCurrentRoomId.mockReturnValue('room1'); // Simulate manager state
      managerInstanceInHook.getLocalParticipant.mockReturnValue({identity: 'local'} as Participant);
      managerInstanceInHook.onParticipantsChanged([{identity: 'p1'}] as Participant[]);
    });

    // Verify state before leaving
    expect(result.current.currentRoomId).toBe('room1');
    expect(result.current.participants.length).toBe(1);
    expect(result.current.localParticipant).not.toBeNull();


    await act(async () => {
      await result.current.leaveRoom();
    });

    expect(managerInstanceInHook.leaveRoom).toHaveBeenCalledTimes(1);
    expect(result.current.currentRoomId).toBeNull();
    expect(result.current.participants).toEqual([]);
    expect(result.current.localParticipant).toBeNull();
  });

  it('toggleMuteSelf should call manager.toggleMuteSelf', async () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    managerInstanceInHook.toggleMuteSelf.mockResolvedValue(true);

    let muteResult;
    await act(async () => {
      muteResult = await result.current.toggleMuteSelf();
    });

    expect(managerInstanceInHook.toggleMuteSelf).toHaveBeenCalledTimes(1);
    expect(muteResult).toBe(true);
  });

  it('moderateMuteParticipant should call manager.moderateMuteParticipant', async () => {
    const { result } = renderHook(() => useNewVoiceCollaboration());
    const managerInstanceInHook = (NewVoiceChatManager as jest.Mock).mock.results[0].value;
    managerInstanceInHook.moderateMuteParticipant.mockResolvedValue(true);

    let moderateResult = false;
    await act(async () => {
      moderateResult = await result.current.moderateMuteParticipant('targetUser', true);
    });

    expect(managerInstanceInHook.moderateMuteParticipant).toHaveBeenCalledWith('targetUser', true);
    expect(moderateResult).toBe(true);
  });

});
