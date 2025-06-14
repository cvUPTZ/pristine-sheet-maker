import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { EnhancedVoiceChat } from '@/components/voice/EnhancedVoiceChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const NewVoiceChatPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, userRole, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex justify-center items-center">
        <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="flex items-center space-x-2 p-6">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-slate-700">Loading user information...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex justify-center items-center">
        <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <p className="text-center text-slate-600">
              User not authenticated or role not available. Please log in.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex justify-center items-center">
        <Card className="shadow-xl border-slate-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <p className="text-center text-slate-600">
              Match ID not found in URL. Please ensure you are accessing this page via a valid match link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const participantName = user?.user_metadata?.full_name || user?.app_metadata?.full_name || 'Anonymous';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Voice Chat for Match: {matchId}
        </h1>
        <EnhancedVoiceChat
          matchId={matchId}
          userId={user.id}
          userRole={userRole}
          userName={participantName}
        />
      </div>
    </div>
  );
};

export default NewVoiceChatPage;
