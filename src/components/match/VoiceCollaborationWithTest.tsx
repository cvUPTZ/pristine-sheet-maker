
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { EnhancedVoiceChat } from '@/components/voice/EnhancedVoiceChat';
import VoiceAudioTest from '../VoiceAudioTest';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useVoiceCollaborationContext } from '@/context/VoiceCollaborationContext'; // NEW

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
  const { user, userRole, loading: authLoading } = useAuth();
  // Pull from context to ensure singleton manager
  const voiceCollabCtx = useVoiceCollaborationContext();

  if (authLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          <span>Loading voice chat...</span>
        </CardContent>
      </Card>
    );
  }

  if (!user || !userRole) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <p>Could not authenticate for voice chat.</p>
        </CardContent>
      </Card>
    );
  }

  const participantName = user?.user_metadata?.full_name || user?.app_metadata?.full_name || 'Anonymous';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Separate Audio Test Component */}
      <VoiceAudioTest />

      {/* Main Voice Collaboration
          Hand all context props to EnhancedVoiceChat here  
       */}
      <EnhancedVoiceChat
        matchId={matchId}
        userId={userId}
        userRole={userRole}
        userName={participantName}
        voiceCollabCtx={voiceCollabCtx}
      />
    </div>
  );
};

export default VoiceCollaborationWithTest;
