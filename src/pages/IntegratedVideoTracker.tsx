
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { VoiceCollaborationProvider } from '@/context/VoiceCollaborationContext';
import { YouTubeService } from '@/services/youtubeService';
import IntegratedVideoPlayer from '@/components/video/IntegratedVideoPlayer';
import TrackerPianoInput from '@/components/TrackerPianoInput';
import VoiceCollaborationOverlay from '@/components/match/VoiceCollaborationOverlay';
import { EnhancedVoiceChat } from '@/components/voice/EnhancedVoiceChat';
import { Play, Calendar, Users, Settings, Volume2, VolumeX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
}

const IntegratedVideoTracker: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Video and match state
  const [videoUrl, setVideoUrl] = useState(searchParams.get('video') || '');
  const [matchId, setMatchId] = useState(searchParams.get('match') || '');
  const [availableMatches, setAvailableMatches] = useState<MatchData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // UI state
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activePanel, setActivePanel] = useState<'piano' | 'voice' | 'settings'>('piano');

  // Fetch available matches
  const fetchMatches = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, status')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAvailableMatches(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load matches',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Load video information
  const loadVideoInfo = useCallback(async (url: string) => {
    if (!url) return;

    setLoading(true);
    try {
      const info = await YouTubeService.getVideoInfo(url);
      setVideoInfo(info);
      toast({
        title: 'Video Loaded',
        description: `"${info.title}" is ready for tracking`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load video',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Event recording handler
  const handleRecordEvent = useCallback(async (
    eventType: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => {
    if (!matchId || !user?.id) {
      toast({
        title: 'Error',
        description: 'Please select a match first',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const eventToInsert = {
        match_id: matchId,
        event_type: eventType,
        player_id: playerId || null,
        created_by: user.id,
        timestamp: Math.floor(Date.now() / 1000),
        team: teamContext || null,
        coordinates: details?.coordinates || null,
        event_data: { 
          ...details, 
          recorded_via_integrated_player: true,
          video_url: videoUrl,
          video_title: videoInfo?.title,
          recorded_at: new Date().toISOString()
        },
      };

      const { data: newEvent, error: dbError } = await supabase
        .from('match_events')
        .insert([eventToInsert])
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: 'Event Recorded',
        description: `${eventType} event recorded successfully`,
      });

      return newEvent;
    } catch (error: any) {
      toast({
        title: 'Recording Failed',
        description: error.message || 'Failed to record event',
        variant: 'destructive',
      });
      return null;
    }
  }, [matchId, user?.id, videoUrl, videoInfo?.title, toast]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (videoUrl) {
      loadVideoInfo(videoUrl);
    }
  }, [videoUrl, loadVideoInfo]);

  useEffect(() => {
    if (matchId && availableMatches.length > 0) {
      const match = availableMatches.find(m => m.id === matchId);
      setSelectedMatch(match || null);
    }
  }, [matchId, availableMatches]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to use the video tracker.</p>
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <VoiceCollaborationProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container mx-auto p-4 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Integrated Video Tracker</h1>
                <p className="text-gray-600">Watch, track, and collaborate in one place</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant={showVoiceChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowVoiceChat(!showVoiceChat)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Voice Chat
                </Button>
              </div>
            </div>

            {/* Video and Match Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Video URL</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter YouTube video URL..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => loadVideoInfo(videoUrl)}
                      disabled={!videoUrl || loading}
                      size="sm"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Select Match</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <select
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white"
                  >
                    <option value="">Select a match...</option>
                    {availableMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`}>
            {/* Video Player */}
            <div className={isMobile ? '' : 'col-span-8'}>
              <Card className="h-full">
                <CardContent className="p-4">
                  {videoInfo ? (
                    <IntegratedVideoPlayer
                      videoInfo={videoInfo}
                      onEventRecord={handleRecordEvent}
                      matchId={matchId}
                      isMuted={isMuted}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Enter a YouTube URL to start tracking</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Control Panel */}
            <div className={isMobile ? '' : 'col-span-4'}>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={activePanel === 'piano' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivePanel('piano')}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Events
                    </Button>
                    <Button
                      variant={activePanel === 'voice' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivePanel('voice')}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Voice
                    </Button>
                    <Button
                      variant={activePanel === 'settings' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivePanel('settings')}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Info
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 h-[600px] overflow-y-auto">
                  {activePanel === 'piano' && matchId && (
                    <TrackerPianoInput 
                      matchId={matchId} 
                      onRecordEvent={handleRecordEvent}
                    />
                  )}
                  
                  {activePanel === 'voice' && matchId && user && (
                    <EnhancedVoiceChat
                      matchId={matchId}
                      userId={user.id}
                      userRole={userRole || 'tracker'}
                      userName={user.user_metadata?.full_name || 'Anonymous'}
                    />
                  )}
                  
                  {activePanel === 'settings' && (
                    <div className="space-y-4">
                      {selectedMatch && (
                        <div>
                          <h3 className="font-medium mb-2">Match Information</h3>
                          <p className="text-sm text-gray-600">
                            {selectedMatch.name || `${selectedMatch.home_team_name} vs ${selectedMatch.away_team_name}`}
                          </p>
                          <p className="text-xs text-gray-500">Status: {selectedMatch.status}</p>
                        </div>
                      )}
                      
                      {videoInfo && (
                        <div>
                          <h3 className="font-medium mb-2">Video Information</h3>
                          <p className="text-sm text-gray-600">{videoInfo.title}</p>
                          <p className="text-xs text-gray-500">Duration: {videoInfo.duration}</p>
                        </div>
                      )}
                      
                      <div>
                        <h3 className="font-medium mb-2">Tracker Information</h3>
                        <p className="text-sm text-gray-600">User: {user.user_metadata?.full_name || user.email}</p>
                        <p className="text-xs text-gray-500">Role: {userRole}</p>
                      </div>
                    </div>
                  )}
                  
                  {!matchId && activePanel === 'piano' && (
                    <div className="text-center text-gray-500 mt-8">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Please select a match to start tracking events</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Voice Collaboration Overlay */}
          {showVoiceChat && <VoiceCollaborationOverlay />}
        </div>
      </div>
    </VoiceCollaborationProvider>
  );
};

export default IntegratedVideoTracker;
