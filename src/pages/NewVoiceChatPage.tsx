import React from 'react';
import { useParams } from 'react-router-dom'; // Import useParams
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { NewVoiceChat } from '@/components/voice/NewVoiceChat'; // Adjust path as needed
import { CircularProgress } from '@mui/material'; // Assuming MUI is used for progress indicators, or use a simple text

const NewVoiceChatPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, userRole, loading: authLoading } = useAuth(); // Corrected destructuring

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress /> {/* Or <p>Loading user information...</p> */}
      </div>
    );
  }

  if (!user || !userRole) {
    return <p>User not authenticated or role not available. Please log in.</p>;
  }

  if (!matchId) {
    return <p>Match ID not found in URL. Please ensure you are accessing this page via a valid match link.</p>;
  }

  // Attempt to get full_name from user_metadata, then app_metadata, then default to 'Anonymous'
  const participantName = user?.user_metadata?.full_name || user?.app_metadata?.full_name || 'Anonymous';

  return (
    <div>
      <h1>Voice Chat for Match: {matchId}</h1>
      <NewVoiceChat
        matchId={matchId}
        userId={user.id}
        userRole={userRole} // userRole from useAuth is already UserRoleType | null
        userName={participantName}
      />
    </div>
  );
};

export default NewVoiceChatPage;
