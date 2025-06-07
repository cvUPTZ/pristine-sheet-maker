import React, { useEffect, useState } from 'react';
import { useNewVoiceCollaboration } from '@/hooks/useNewVoiceCollaboration'; // Adjust path as needed
import { Participant, ConnectionState } from 'livekit-client';

// Basic styling (inline for simplicity, consider moving to CSS modules or a UI library)
const styles = {
  container: { fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' },
  header: { fontSize: '24px', marginBottom: '20px' },
  section: { marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' },
  roomList: { listStyle: 'none', padding: '0' },
  roomItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' },
  participantList: { listStyle: 'none', padding: '0' },
  participantItem: { padding: '5px 0', color: '#555' },
  button: { padding: '8px 12px', marginRight: '10px', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#007bff', color: 'white' },
  error: { color: 'red', marginTop: '10px' },
  info: { color: 'blue', marginTop: '10px' },
  input: { padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }
};

// Mock user data - replace with actual user data from your auth context or props
// Ensure you have a way to get the current user's ID, role, and a display name.
const MOCK_USER = {
  id: `user-${Math.random().toString(36).substring(7)}`, // Replace with actual user ID
  role: 'tracker', // Replace with actual user role
  name: `User ${Math.floor(Math.random() * 1000)}` // Replace with actual user name
};

// Mock match ID - replace with actual match ID from context or props
const MOCK_MATCH_ID = 'match-123'; // Replace with actual match ID

export const NewVoiceChat: React.FC = () => {
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
    // moderateMuteParticipant, // Example for future use
  } = useNewVoiceCollaboration();

  const [userIdInput, setUserIdInput] = useState<string>(MOCK_USER.id);
  const [userRoleInput, setUserRoleInput] = useState<string>(MOCK_USER.role);
  const [userNameInput, setUserNameInput] = useState<string>(MOCK_USER.name);
  const [matchIdInput, setMatchIdInput] = useState<string>(MOCK_MATCH_ID);

  useEffect(() => {
    // Fetch rooms when component mounts, if a matchId is available
    // In a real app, matchId might come from props or context
    if (matchIdInput) {
      fetchAvailableRooms(matchIdInput);
    }
  }, [fetchAvailableRooms, matchIdInput]);

  const handleJoinRoom = async (roomId: string) => {
    if (!userIdInput || !userRoleInput) {
      alert("User ID and Role are required to join a room.");
      return;
    }
    await joinRoom(roomId, userIdInput, userRoleInput, userNameInput);
  };

  const renderConnectionState = () => {
    if (error) return <p style={styles.error}>Error: {error.message}</p>;
    if (isConnecting) return <p style={styles.info}>Connecting...</p>;
    if (isConnected) return <p style={styles.info}>Connected to room: {currentRoomId}</p>;
    if (connectionState === ConnectionState.Disconnected && currentRoomId) {
      // This case might occur if disconnected unexpectedly AFTER being in a room
      return <p style={styles.info}>Disconnected. Was in room: {currentRoomId}</p>;
    }
    if (connectionState === ConnectionState.Disconnected) return <p style={styles.info}>Disconnected</p>;
    return <p style={styles.info}>Connection State: {connectionState ?? 'Initializing...'}</p>;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>New Voice Chat</h1>

      {/* User and Match ID Inputs - For testing; replace with actual context/props */}
      <div style={styles.section}>
        <h3>Configuration (Test Only)</h3>
        <div>
          <label>Match ID: </label>
          <input type="text" value={matchIdInput} onChange={(e) => setMatchIdInput(e.target.value)} style={styles.input} />
          <button onClick={() => fetchAvailableRooms(matchIdInput)} style={styles.button} disabled={isLoadingRooms || !matchIdInput}>
            {isLoadingRooms ? 'Loading Rooms...' : 'Refresh Rooms'}
          </button>
        </div>
        <div>
          <label>User ID: </label>
          <input type="text" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label>User Role: </label>
          <input type="text" value={userRoleInput} onChange={(e) => setUserRoleInput(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label>User Name: </label>
          <input type="text" value={userNameInput} onChange={(e) => setUserNameInput(e.target.value)} style={styles.input} />
        </div>
      </div>

      {renderConnectionState()}

      {!isConnected && !isConnecting && (
        <div style={styles.section}>
          <h2>Available Rooms</h2>
          {isLoadingRooms && <p>Loading rooms...</p>}
          {!isLoadingRooms && availableRooms.length === 0 && <p>No rooms available for this match or failed to load.</p>}
          <ul style={styles.roomList}>
            {availableRooms.map(room => (
              <li key={room.id} style={styles.roomItem}>
                <span>{room.name} (ID: {room.id})</span>
                <button onClick={() => handleJoinRoom(room.id)} style={styles.button} disabled={!userIdInput || !userRoleInput}>Join</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isConnected && currentRoomId && (
        <div style={styles.section}>
          <h2>In Room: {currentRoomId}</h2>
          <button onClick={leaveRoom} style={styles.button}>Leave Room</button>
          <button onClick={toggleMuteSelf} style={styles.button}>
            {localParticipant?.isMicrophoneMuted ? 'Unmute Self' : 'Mute Self'}
          </button>

          <h3>Participants ({participants.length})</h3>
          <ul style={styles.participantList}>
            {participants.map(p => (
              <li key={p.identity} style={styles.participantItem}>
                {p.name || p.identity}
                {p.isLocal && ' (You)'}
                {p.isMicrophoneMuted && ' (Muted)'}
                {p.isSpeaking && ' (Speaking)'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// For actual usage, you would import this component and place it in your app structure.
// e.g., in a page component:
// import { NewVoiceChat } from '@/components/voice/NewVoiceChat';
// const MyPage = () => <NewVoiceChat />;
