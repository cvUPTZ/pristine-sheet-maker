
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { NewVoiceChat } from '@/components/voice/NewVoiceChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const NewVoiceChatPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, userRole, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="flex items-center space-x-2 p-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading user information...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !userRole) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              User not authenticated or role not available. Please log in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matchId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Match ID not found in URL. Please ensure you are accessing this page via a valid match link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const participantName = user?.user_metadata?.full_name || user?.app_metadata?.full_name || 'Anonymous';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Voice Chat for Match: {matchId}</h1>
      <NewVoiceChat
        matchId={matchId}
        userId={user.id}
        userRole={userRole}
        userName={participantName}
      />
    </div>
  );
};

export default NewVoiceChatPage;
