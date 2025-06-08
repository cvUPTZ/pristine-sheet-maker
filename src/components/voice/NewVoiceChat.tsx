
import React, { useEffect, useRef } from 'react';
import { useNewVoiceCollaboration } from '@/hooks/useNewVoiceCollaboration';
// Participant and LocalParticipant might not be needed if VoiceParticipant is comprehensive
import { ConnectionState } from 'livekit-client';
import { VoiceParticipant } from '@/types'; // Import VoiceParticipant
import { toast } from '@/components/ui/sonner';

// Enhanced styling
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    maxWidth: '700px',
    margin: '20px auto',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    background: '#fff',
  },
  section: {
    marginBottom: '25px',
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    background: '#f9f9f9',
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
    padding: '10px',
    borderBottom: '1px solid #e8e8e8',
    transition: 'background-color 0.2s ease',
  },
  roomItemHover: {
    backgroundColor: '#f0f0f0',
  },
  participantList: {
    listStyle: 'none',
    padding: '0'
  },
  participantItem: {
    padding: '8px 5px',
    color: '#444',
    borderBottom: '1px dashed #eee',
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
    animation: 'pulse 1s infinite',
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
    padding: '10px 15px',
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
  leaveButton: {
    backgroundColor: '#dc3545',
  },
  statusMessage: {
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    textAlign: 'center' as const,
  },
  error: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    textAlign: 'center' as const,
  },
  info: {
    color: '#004085',
    backgroundColor: '#cce5ff',
    borderColor: '#b8daff',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    textAlign: 'center' as const,
  },
  loadingText: {
    textAlign: 'center' as const,
    padding: '20px',
    fontSize: '1em',
    color: '#555',
  }
};

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
    moderateMuteParticipant,
  } = useNewVoiceCollaboration();

  const lastShownErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      toast.error(error.message || 'An unknown error occurred.', {
        id: error.message,
      });
      lastShownErrorRef.current = error;
    }
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
    if (isConnecting) return <p style={{...styles.statusMessage, ...styles.info}}>Connecting to room...</p>;
    if (isConnected) return <p style={{...styles.statusMessage, ...styles.info}}>Connected to room: {currentRoomId}</p>;
    if (connectionState === ConnectionState.Disconnected && currentRoomId) {
      return <p style={{...styles.statusMessage, ...styles.info}}>Disconnected from {currentRoomId}.</p>;
    }
    if (connectionState === ConnectionState.Disconnected) return <p style={{...styles.statusMessage, ...styles.info}}>Disconnected</p>;
    return <p style={{...styles.statusMessage, ...styles.info}}>Connection: {connectionState ?? 'Initializing...'}</p>;
  };

  const canModerate = userRole === 'admin' || userRole === 'coordinator';

  // Updated to use VoiceParticipant and its isMuted property
  const isParticipantMuted = (participant: VoiceParticipant): boolean => {
    return !!participant.isMuted;
  };

  return (
    <>
      <style>{keyframesStyle}</style>
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
                      disabled={isConnecting}
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
              {/* localParticipant is now VoiceParticipant, so isParticipantMuted works directly */}
              {localParticipant && isParticipantMuted(localParticipant) ? 'Unmute Self' : 'Mute Self'}
            </button>

            <h3 style={{...styles.sectionTitle, marginTop: '20px'}}>Participants ({participants.length})</h3>
            <ul style={styles.participantList}>
              {participants.map(p => { // p is now VoiceParticipant
                const isMuted = isParticipantMuted(p);
                
                return (
                  // key, p.name, p.identity, p.isLocal, p.isSpeaking are all valid for VoiceParticipant
                  <li key={p.identity} style={styles.participantItem}>
                    <span style={styles.participantName}>{p.name || p.identity}</span>
                    {p.isLocal && <span style={styles.localUserIndicator}>(You)</span>}
                    {isMuted && <span style={styles.mutedIndicator}>(Muted)</span>}
                    {p.isSpeaking && !isMuted && <span style={styles.speakingIndicator} title="Speaking"></span>}

                    {canModerate && !p.isLocal && (
                      <button
                        onClick={async () => {
                          // p.identity is correct
                          const success = await moderateMuteParticipant(p.identity, !isMuted);
                          if (!success) {
                            // Error handling via toast is done in the hook
                          }
                        }}
                        style={{...styles.button, marginLeft: '10px', fontSize: '0.8em', padding: '5px 8px'}}
                        title={isMuted ? `Unmute ${p.name || p.identity}` : `Mute ${p.name || p.identity}`}
                      >
                        {isMuted ? 'Unmute' : 'Mute'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};
