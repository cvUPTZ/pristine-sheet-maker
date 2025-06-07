import React, { useEffect, useRef } from 'react'; // Added useRef
import { useNewVoiceCollaboration } from '@/hooks/useNewVoiceCollaboration';
import { Participant, ConnectionState } from 'livekit-client';
import { toast } from '@/components/ui/sonner'; // Assuming this path is correct from project root

// Enhanced styling - consider moving to CSS Modules or a styled-components approach for a larger app
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    maxWidth: '700px', // Slightly wider for better layout
    margin: '20px auto', // Add some top/bottom margin
    boxShadow: '0 0 10px rgba(0,0,0,0.1)', // Add subtle shadow for better separation
    borderRadius: '8px',
    background: '#fff', // Add a background color
  },
  section: {
    marginBottom: '25px',
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    background: '#f9f9f9', // Light background for sections
  },
  sectionTitle: {
    fontSize: '1.2em',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
    borderBottom: '1px solid #eee',
    paddingBottom: '5px',
  },
  roomList: {
    listStyle: 'none',
    padding: '0'
  },
  roomItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px', // Increased padding
    borderBottom: '1px solid #e8e8e8',
    transition: 'background-color 0.2s ease', // Hover effect
  },
  roomItemHover: { // Example: style for hover (would need JS or CSS :hover)
    backgroundColor: '#f0f0f0',
  },
  participantList: {
    listStyle: 'none',
    padding: '0'
  },
  participantItem: {
    padding: '8px 5px',
    color: '#444',
    borderBottom: '1px dashed #eee', // Lighter separator for participants
    display: 'flex',
    alignItems: 'center',
  },
  participantName: {
    flexGrow: 1,
  },
  speakingIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'green',
    marginLeft: '10px',
    display: 'inline-block',
    animation: 'pulse 1s infinite', // Simple pulse, better with CSS keyframes
  },
  mutedIndicator: {
    marginLeft: '10px',
    fontSize: '0.8em',
    color: '#777',
  },
  localUserIndicator: {
    fontSize: '0.8em',
    color: '#007bff',
    marginLeft: '5px',
  },
  button: {
    padding: '10px 15px', // Slightly larger buttons
    marginRight: '10px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '0.9em',
    transition: 'background-color 0.2s ease',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
  },
  leaveButton: { // Specific style for leave button if needed
    backgroundColor: '#dc3545', // Red for leave/destructive actions
  },
  statusMessage: { // Base for info, error, loading
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    textAlign: 'center',
  },
  error: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  info: {
    color: '#004085',
    backgroundColor: '#cce5ff',
    borderColor: '#b8daff',
  },
  loadingText: {
    textAlign: 'center',
    padding: '20px',
    fontSize: '1em',
    color: '#555',
  }
};

// CSS Keyframes for speaking animation (would typically be in a CSS file)
const keyframesStyle = `
  @keyframes pulse {
    0% { transform: scale(0.9); opacity: 0.7; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.7; }
  }
`;


interface NewVoiceChatProps {
  matchId: string;
  userId: string;
  userRole: string;
  userName: string;
}

export const NewVoiceChat: React.FC<NewVoiceChatProps> = ({ matchId, userId, userRole, userName }) => {
  const {
    availableRooms,
    currentRoomId,
    participants,
    localParticipant,
    connectionState,
    isConnecting,
    isConnected,
    isLoadingRooms,
    error,
    joinRoom,
    leaveRoom,
    toggleMuteSelf,
    fetchAvailableRooms,
    moderateMuteParticipant, // Ensure this is destructured from the hook
  } = useNewVoiceCollaboration();

  // To keep track of the last shown error to prevent duplicate toasts for the same error instance
  const lastShownErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      toast.error(error.message || 'An unknown error occurred.', {
        id: error.message, // Optional: use message as ID to prevent duplicates of same message
      });
      lastShownErrorRef.current = error;
    }
    // Clear ref if error is gone, so a new instance of a similar error can be shown later
    if (!error && lastShownErrorRef.current) {
        lastShownErrorRef.current = null;
    }
  }, [error]);

  useEffect(() => {
    if (matchId) {
      fetchAvailableRooms(matchId);
    }
  }, [fetchAvailableRooms, matchId]);

  const handleJoinRoom = async (roomId: string) => {
    await joinRoom(roomId, userId, userRole, userName);
  };

  const renderConnectionState = () => {
    // Error rendering is now handled by the useEffect and toast
    if (isConnecting) return <p style={{...styles.statusMessage, ...styles.info}}>Connecting to room...</p>;
    if (isConnected) return <p style={{...styles.statusMessage, ...styles.info}}>Connected to room: {currentRoomId}</p>;
    if (connectionState === ConnectionState.Disconnected && currentRoomId) {
      return <p style={{...styles.statusMessage, ...styles.info}}>Disconnected from {currentRoomId}.</p>;
    }
    if (connectionState === ConnectionState.Disconnected) return <p style={{...styles.statusMessage, ...styles.info}}>Disconnected</p>;
    return <p style={{...styles.statusMessage, ...styles.info}}>Connection: {connectionState ?? 'Initializing...'}</p>;
  };

  const canModerate = userRole === 'admin' || userRole === 'coordinator';

  return (
    <>
      <style>{keyframesStyle}</style> {/* Inject keyframes - not ideal for prod, but works for now */}
      <div style={styles.container}>
        {renderConnectionState()}

        {!isConnected && !isConnecting && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Available Rooms for Match: {matchId}</h2>
            {isLoadingRooms && <p style={styles.loadingText}>Loading rooms...</p>}
            {!isLoadingRooms && availableRooms.length === 0 && (
              <p>No voice rooms currently available for this match.</p>
            )}
            {!isLoadingRooms && availableRooms.length > 0 && (
              <ul style={styles.roomList}>
                {availableRooms.map(room => (
                  <li key={room.id} style={styles.roomItem}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = styles.roomItemHover.backgroundColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span>{room.name} <small>(ID: {room.id})</small></span>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      style={isConnecting ? {...styles.button, ...styles.buttonDisabled} : styles.button}
                      disabled={isConnecting} // Disable join if already trying to connect
                    >
                      Join Room
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isConnected && currentRoomId && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>In Room: {currentRoomId}</h2>
            <button
              onClick={leaveRoom}
              style={{...styles.button, ...styles.leaveButton}}
            >
              Leave Room
            </button>
            <button
              onClick={toggleMuteSelf}
              style={localParticipant ? styles.button : {...styles.button, ...styles.buttonDisabled}}
              disabled={!localParticipant}
            >
              {localParticipant?.isMicrophoneMuted ? 'Unmute Self' : 'Mute Self'}
            </button>

            <h3 style={{...styles.sectionTitle, marginTop: '20px'}}>Participants ({participants.length})</h3>
            <ul style={styles.participantList}>
              {participants.map(p => (
                <li key={p.identity} style={styles.participantItem}>
                  <span style={styles.participantName}>{p.name || p.identity}</span>
                  {p.isLocal && <span style={styles.localUserIndicator}>(You)</span>}
                  {p.isMicrophoneMuted && <span style={styles.mutedIndicator}>(Muted)</span>}
                  {p.isSpeaking && !p.isMicrophoneMuted && <span style={styles.speakingIndicator} title="Speaking"></span>}

                  {/* Moderation Button */}
                  {canModerate && !p.isLocal && (
                    <button
                      onClick={async () => {
                        // Add a confirmation dialog for better UX before moderation action
                        // For now, direct action:
                        const success = await moderateMuteParticipant(p.identity, !p.isMicrophoneMuted);
                        if (!success) {
                          // Error should be handled by toast via the hook's error state.
                          // Optionally, show a specific toast here if moderateMuteParticipant itself returns detailed error.
                          // toast.error(`Failed to ${p.isMicrophoneMuted ? 'unmute' : 'mute'} ${p.name || p.identity}`);
                        }
                        // Participant list should re-render with updated mute state via LiveKit events
                      }}
                      style={{...styles.button, marginLeft: '10px', fontSize: '0.8em', padding: '5px 8px'}}
                      title={p.isMicrophoneMuted ? `Unmute ${p.name || p.identity}` : `Mute ${p.name || p.identity}`}
                    >
                      {p.isMicrophoneMuted ? 'Unmute' : 'Mute'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};
