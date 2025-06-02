
import React from 'react';
import VoiceCollaboration from './VoiceCollaboration';
import VoiceAudioTest from '../VoiceAudioTest';

interface VoiceCollaborationWithTestProps {
  matchId: string;
  userId: string;
  className?: string;
}

const VoiceCollaborationWithTest: React.FC<VoiceCollaborationWithTestProps> = ({
  matchId,
  userId,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Separate Audio Test Component */}
      <VoiceAudioTest />
      
      {/* Main Voice Collaboration */}
      <VoiceCollaboration
        matchId={matchId}
        userId={userId}
      />
    </div>
  );
};

export default VoiceCollaborationWithTest;
