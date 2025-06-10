
import React, { useEffect, useRef } from 'react';
import { useNewVoiceCollaboration } from '@/hooks/useNewVoiceCollaboration';
import { Participant, ConnectionState, LocalParticipant } from 'livekit-client';
import { toast } from '@/components/ui/sonner';

// Compact styling
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    background: '#fff',
  },
  section: {
    marginBottom: '16px',
    padding: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    background: '#f9f9f9',
  },
  compactSection: {
    marginBottom: '12px',
    padding: '8px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    background: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: '1em',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    borderBottom: '1px solid #eee',
    paddingBottom: '4px',
  },
  roomList: {
    listStyle: 'none',
    padding: '0'
  },
  roomItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderBottom: '1px solid #e8e8e8',
    fontSize: '0.9em',
  },
  participantList: {
    listStyle: 'none',
    padding: '0'
  },
  participantItem: {
    padding: '6px 4px',
    color: '#444',
    borderBottom: '1px dashed #eee',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85em',
  },
  participantName: {
    flexGrow: 1,
  },
  speakingIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'green',
    marginLeft: '8px',
    display: 'inline-block',
    animation: 'pulse 1s infinite',
  },
  mutedIndicator: {
    marginLeft: '8px',
    fontSize: '0.75em',
    color: '#777',
  },
  localUserIndicator: {
    fontSize: '0.75em',
    color: '#007bff',
    marginLeft: '4px',
  },
  button: {
    padding: '6px 12px',
    marginRight: '8px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    fontSize: '0.8em',
    transition: 'background-color 0.2s ease',
  },
  smallButton: {
    padding: '4px 8px',
    marginLeft: '8px',
    fontSize: '0.75em',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
  },
  leaveButton: {
    backgroundColor: '#dc3545',
  },
  statusMessage: {
    padding: '8px',
    margin: '8px 0',
    borderRadius: '4px',
    textAlign: 'center' as const,
    fontSize: '0.85em',
  },
  error: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    padding: '8px',
    margin: '8px 0',
    borderRadius: '4px',
    textAlign: 'center' as const,
    fontSize: '0.85em',
  },
  info: {
    color: '#004085',
    backgroundColor: '#cce5ff',
    borderColor: '#b8daff',
    padding: '8px',
    margin: '8px 0',
    borderRadius: '4px',
    textAlign: 'center' as const,
    fontSize: '0.85em',
  },
  loadingText: {
    textAlign: 'center' as const,
    padding: '16px',
    fontSize: '0.9em',
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
    audioLevels,
    joinRoom,
    leaveRoom,
    toggleMuteSelf,
    fetchAvailableRooms,
    moderateMuteParticipant,
    getAudioLevel,
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
    if (isConnecting) return <p style={{...styles.statusMessage, ...styles.info}}>Connecting...</p>;
    if (isConnected) return <p style={{...styles.statusMessage, ...styles.info}}>Connected: {currentRoomId}</p>;
    if (connectionState === ConnectionState.Disconnected && currentRoomId) {
      return <p style={{...styles.statusMessage, ...styles.info}}>Disconnected from {currentRoomId}</p>;
    }
    return null;
  };

  const canModerate = userRole === 'admin' || userRole === 'coordinator';

  const isParticipantMuted = (participant: Participant): boolean => {
    if (participant.isLocal && localParticipant) {
      const localP = localParticipant as LocalParticipant;
      return !localP.isMicrophoneEnabled;
    }
    const audioTrackPublications = Array.from(participant.audioTrackPublications.values());
    return audioTrackPublications.length === 0 || audioTrackPublications.some(pub => pub.isMuted);
  };

  const isParticipantSpeaking = (participant: Participant): boolean => {
    const audioLevel = getAudioLevel(participant.identity);
    return audioLevel > 0.1 && !isParticipantMuted(participant);
  };

  return (
    <>
      <style>{keyframesStyle}</style>
      <div style={styles.container}>
        {renderConnectionState()}

        {!isConnected && !isConnecting && (
          <div style={styles.compactSection}>
            <h3 style={styles.sectionTitle}>Voice Rooms</h3>
            {isLoadingRooms && <p style={styles.loadingText}>Loading...</p>}
            {!isLoadingRooms && availableRooms.length === 0 && (
              <p style={{fontSize: '0.85em'}}>No rooms available.</p>
            )}
            {!isLoadingRooms && availableRooms.length > 0 && (
              <ul style={styles.roomList}>
                {availableRooms.map(room => (
                  <li key={room.id} style={styles.roomItem}>
                    <span>{room.name}</span>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      style={isConnecting ? {...styles.button, ...styles.buttonDisabled} : styles.button}
                      disabled={isConnecting}
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isConnected && currentRoomId && (
          <div style={styles.compactSection}>
            <h3 style={styles.sectionTitle}>Room: {currentRoomId}</h3>
            <div style={{marginBottom: '12px'}}>
              <button
                onClick={leaveRoom}
                style={{...styles.button, ...styles.leaveButton}}
              >
                Leave
              </button>
              <button
                onClick={toggleMuteSelf}
                style={localParticipant ? styles.button : {...styles.button, ...styles.buttonDisabled}}
                disabled={!localParticipant}
              >
                {isParticipantMuted(localParticipant!) ? 'Unmute' : 'Mute'}
              </button>
            </div>

            <h4 style={{...styles.sectionTitle, marginTop: '12px', fontSize: '0.9em'}}>
              Participants ({participants.length})
            </h4>
            <ul style={styles.participantList}>
              {participants.map(p => {
                const isMuted = isParticipantMuted(p);
                const isSpeaking = isParticipantSpeaking(p);
                const audioLevel = getAudioLevel(p.identity);
                
                return (
                  <li key={p.identity} style={styles.participantItem}>
                    <span style={styles.participantName}>{p.name || p.identity}</span>
                    {p.isLocal && <span style={styles.localUserIndicator}>(You)</span>}
                    {isMuted && <span style={styles.mutedIndicator}>(Muted)</span>}
                    {isSpeaking && !isMuted && <span style={styles.speakingIndicator} title="Speaking"></span>}
                    
                    {/* Compact audio level indicator */}
                    {!isMuted && (
                      <div style={{
                        marginLeft: '8px',
                        width: '20px',
                        height: '3px',
                        backgroundColor: '#eee',
                        borderRadius: '1px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.max(audioLevel * 100, 2)}%`,
                          height: '100%',
                          backgroundColor: isSpeaking ? '#22c55e' : '#94a3b8',
                          transition: 'width 0.1s ease-out'
                        }} />
                      </div>
                    )}

                    {canModerate && !p.isLocal && (
                      <button
                        onClick={async () => {
                          const success = await moderateMuteParticipant(p.identity, !isMuted);
                          if (!success) {
                            toast.error('Failed to moderate participant.');
                          }
                        }}
                        style={{...styles.button, ...styles.smallButton}}
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
