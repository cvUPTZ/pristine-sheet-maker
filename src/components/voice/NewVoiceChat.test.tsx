import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended DOM matchers
import { NewVoiceChat } from './NewVoiceChat';
import { useNewVoiceCollaboration, UseNewVoiceCollaborationReturn } from '@/hooks/useNewVoiceCollaboration';
import { ConnectionState, Participant } from 'livekit-client';

// Mock the custom hook
jest.mock('@/hooks/useNewVoiceCollaboration');

const mockUseNewVoiceCollaboration = useNewVoiceCollaboration as jest.MockedFunction<typeof useNewVoiceCollaboration>;

// Default mock state for the hook
const getDefaultMockHookState = (): UseNewVoiceCollaborationReturn => ({
  manager: null,
  availableRooms: [],
  currentRoomId: null,
  participants: [],
  localParticipant: null,
  connectionState: ConnectionState.Disconnected,
  isConnecting: false,
  isConnected: false,
  isLoadingRooms: false,
  error: null,
  joinRoom: jest.fn().mockResolvedValue(true),
  leaveRoom: jest.fn().mockResolvedValue(undefined),
  toggleMuteSelf: jest.fn().mockResolvedValue(true),
  fetchAvailableRooms: jest.fn().mockResolvedValue(undefined),
  moderateMuteParticipant: jest.fn().mockResolvedValue(true),
});

describe('NewVoiceChat Component', () => {
  let mockHookState: UseNewVoiceCollaborationReturn;

  beforeEach(() => {
    // Reset mocks and provide a fresh default state for each test
    mockHookState = getDefaultMockHookState();
    mockUseNewVoiceCollaboration.mockReturnValue(mockHookState);
    jest.clearAllMocks(); // Clear all mock function calls
  });

  it('should render initial state correctly (disconnected, no rooms)', () => {
    render(<NewVoiceChat />);
    expect(screen.getByText('New Voice Chat')).toBeInTheDocument();
    expect(screen.getByText(/Connection State: Disconnected/i)).toBeInTheDocument();
    expect(screen.getByText(/No rooms available/i)).toBeInTheDocument();
    // Check for input fields for user/match details (part of the test setup in the component)
    expect(screen.getByLabelText(/Match ID:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/User ID:/i)).toBeInTheDocument();
  });

  it('should display "Loading rooms..." when isLoadingRooms is true', () => {
    mockUseNewVoiceCollaboration.mockReturnValue({ ...mockHookState, isLoadingRooms: true });
    render(<NewVoiceChat />);
    expect(screen.getByText('Loading rooms...')).toBeInTheDocument();
  });

  it('should display an error message when error is present', () => {
    const testError = new Error("Failed to connect");
    mockUseNewVoiceCollaboration.mockReturnValue({ ...mockHookState, error: testError });
    render(<NewVoiceChat />);
    expect(screen.getByText(`Error: ${testError.message}`)).toBeInTheDocument();
  });

  it('should call fetchAvailableRooms on "Refresh Rooms" button click', async () => {
    render(<NewVoiceChat />);
    const matchIdInput = screen.getByLabelText(/Match ID:/i) as HTMLInputElement;
    fireEvent.change(matchIdInput, { target: { value: 'test-match-1' } });

    const refreshButton = screen.getByRole('button', { name: /Refresh Rooms/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockHookState.fetchAvailableRooms).toHaveBeenCalledWith('test-match-1');
    });
  });

  it('should list available rooms and allow joining', async () => {
    mockHookState.availableRooms = [{ id: 'room1', name: 'Test Room 1' }];
    mockUseNewVoiceCollaboration.mockReturnValue(mockHookState);

    render(<NewVoiceChat />);

    expect(screen.getByText('Test Room 1 (ID: room1)')).toBeInTheDocument();
    const joinButton = screen.getByRole('button', { name: /Join/i });

    // Set user details for joining
    const userIdInput = screen.getByLabelText(/User ID:/i) as HTMLInputElement;
    const userRoleInput = screen.getByLabelText(/User Role:/i) as HTMLInputElement;
    const userNameInput = screen.getByLabelText(/User Name:/i)as HTMLInputElement;
    fireEvent.change(userIdInput, { target: { value: 'testUser123' } });
    fireEvent.change(userRoleInput, { target: { value: 'tester' } });
    fireEvent.change(userNameInput, { target: { value: 'Test User Name' } });

    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockHookState.joinRoom).toHaveBeenCalledWith('room1', 'testUser123', 'tester', 'Test User Name');
    });
  });

  it('should show alert if user ID or role is missing when trying to join', () => {
    jest.spyOn(window, 'alert').mockImplementation(() => {}); // Mock window.alert
    mockHookState.availableRooms = [{ id: 'room1', name: 'Test Room 1' }];
    mockUseNewVoiceCollaboration.mockReturnValue(mockHookState);

    render(<NewVoiceChat />);
    const joinButton = screen.getByRole('button', { name: /Join/i });

    // Clear user ID to trigger alert
    const userIdInput = screen.getByLabelText(/User ID:/i) as HTMLInputElement;
    fireEvent.change(userIdInput, { target: { value: '' } });

    fireEvent.click(joinButton);

    expect(window.alert).toHaveBeenCalledWith("User ID and Role are required to join a room.");
    expect(mockHookState.joinRoom).not.toHaveBeenCalled();
    (window.alert as jest.Mock).mockRestore(); // Clean up mock
  });


  describe('When Connected to a Room', () => {
    beforeEach(() => {
      const localP = { identity: 'localUser', name: 'You', isLocal: true, isMicrophoneMuted: false, isSpeaking: false } as unknown as Participant;
      const remoteP = { identity: 'remoteUser1', name: 'Remote 1', isLocal: false, isMicrophoneMuted: false, isSpeaking: true } as unknown as Participant;

      mockHookState.isConnected = true;
      mockHookState.currentRoomId = 'room-alpha';
      mockHookState.participants = [localP, remoteP];
      mockHookState.localParticipant = localP;
      mockHookState.connectionState = ConnectionState.Connected;
      mockUseNewVoiceCollaboration.mockReturnValue(mockHookState);
    });

    it('should display connected state, room ID, and participants', () => {
      render(<NewVoiceChat />);
      expect(screen.getByText('In Room: room-alpha')).toBeInTheDocument();
      expect(screen.getByText('You (You)')).toBeInTheDocument();
      expect(screen.getByText('Remote 1 (Speaking)')).toBeInTheDocument(); // (Speaking) should be appended
      expect(screen.getByRole('button', { name: /Leave Room/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mute Self/i })).toBeInTheDocument();
    });

    it('should call leaveRoom when "Leave Room" is clicked', async () => {
      render(<NewVoiceChat />);
      fireEvent.click(screen.getByRole('button', { name: /Leave Room/i }));
      await waitFor(() => {
        expect(mockHookState.leaveRoom).toHaveBeenCalledTimes(1);
      });
    });

    it('should call toggleMuteSelf and update button text when "Mute Self" / "Unmute Self" is clicked', async () => {
      render(<NewVoiceChat />);
      const muteButton = screen.getByRole('button', { name: /Mute Self/i });
      fireEvent.click(muteButton);

      await waitFor(() => {
        expect(mockHookState.toggleMuteSelf).toHaveBeenCalledTimes(1);
      });

      // Simulate participant state update after toggle
      const updatedLocalParticipant = { ...mockHookState.localParticipant!, isMicrophoneMuted: true };
      mockUseNewVoiceCollaboration.mockReturnValue({
        ...mockHookState,
        localParticipant: updatedLocalParticipant,
        participants: [updatedLocalParticipant, ...mockHookState.participants.filter(p => !p.isLocal)]
      });

      // Re-render or update (testing-library handles re-renders on state change if hook behaves so)
      // For this test, we directly check the mocked function and can assume the text changes if localParticipant state updates.
      // To explicitly test text change, you'd need to re-render with new hook state.
      // Let's verify the button text would change if the localParticipant state updates:
      render(<NewVoiceChat />); // Re-render with the new state from the mock hook
      expect(screen.getByRole('button', { name: /Unmute Self/i })).toBeInTheDocument();
    });

    it('should display (Muted) next to a muted participant', () => {
      const mutedLocalP = { ...mockHookState.localParticipant!, isMicrophoneMuted: true };
      mockUseNewVoiceCollaboration.mockReturnValue({
          ...mockHookState,
          localParticipant: mutedLocalP,
          participants: [mutedLocalP, ...mockHookState.participants.filter(p => !p.isLocal)]
      });
      render(<NewVoiceChat />);
      expect(screen.getByText('You (You) (Muted)')).toBeInTheDocument();
    });
  });
});
