
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { VoiceCollaborationProvider } from '@/context/VoiceCollaborationContext';
import { YouTubeService } from '@/services/youtubeService';
import IntegratedVideoPlayer from '@/components/video/IntegratedVideoPlayer';
import TrackerPianoInput from '@/components/TrackerPianoInput';
import VoiceCollaborationOverlay from '@/components/match/VoiceCollaborationOverlay';
import { EnhancedVoiceChat } from '@/components/voice/EnhancedVoiceChat';
import { Bell, Calendar, Users, Settings, Volume2, VolumeX, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  video_url: string | null;
}

interface NotificationData {
  id: string;
  match_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_data: any;
  matches: MatchData;
}

const IntegratedVideoTracker: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Video and match state
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // UI state
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activePanel, setActivePanel] = useState<'notifications' | 'piano' | 'voice' | 'settings'>('notifications');

  // Fetch tracker notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          match_id,
          title,
          message,
          is_read,
          created_at,
          notification_data
        `)
        .eq('user_id', user.id)
        .eq('type', 'video_tracking_assignment')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch match data separately and combine
      const notificationsWithMatches = await Promise.all(
        (data || []).map(async (notification) => {
          if (!notification.match_id) return null;
          
          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .select('id, name, home_team_name, away_team_name, status')
            .eq('id', notification.match_id)
            .single();

          if (matchError || !matchData) return null;

          // Extract video URL from notification_data
          let videoUrl = null;
          if (notification.notification_data && typeof notification.notification_data === 'object') {
            const notificationDataObj = notification.notification_data as any;
            videoUrl = notificationDataObj?.video_url || null;
          }

          return {
            id: notification.id,
            match_id: notification.match_id,
            title: notification.title,
            message: notification.message,
            is_read: notification.is_read || false,
            created_at: notification.created_at || new Date().toISOString(),
            notification_data: notification.notification_data || {},
            matches: {
              ...matchData,
              video_url: videoUrl
            }
          } as NotificationData;
        })
      );

      // Filter out null results
      const validNotifications = notificationsWithMatches.filter(
        (notif): notif is NotificationData => notif !== null
      );

      setNotifications(validNotifications);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
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

  // Handle notification selection
  const handleNotificationClick = async (notification: NotificationData) => {
    setSelectedNotification(notification);
    
    // Mark as read if not already
    if (!notification.is_read) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Load video if available
    if (notification.matches.video_url) {
      await loadVideoInfo(notification.matches.video_url);
    }

    setActivePanel('piano');
  };

  // Event recording handler
  const handleRecordEvent = useCallback(async (
    eventType: string,
    playerId?: number,
    teamContext?: 'home' | 'away',
    details?: Record<string, any>
  ) => {
    if (!selectedNotification || !user?.id) {
      toast({
        title: 'Error',
        description: 'Please select a notification first',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const eventToInsert = {
        match_id: selectedNotification.match_id,
        event_type: eventType,
        player_id: playerId || null,
        created_by: user.id,
        timestamp: Math.floor(Date.now() / 1000),
        team: teamContext || null,
        coordinates: details?.coordinates || null,
        event_data: { 
          ...details, 
          recorded_via_integrated_player: true,
          video_url: selectedNotification.matches.video_url,
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
  }, [selectedNotification, user?.id, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access video tracking assignments.</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Video Tracking Dashboard</h1>
                <p className="text-gray-600">Your assigned tracking notifications</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {notifications.filter(n => !n.is_read).length} unread
                </Badge>
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
          </div>

          {/* Main Content Grid */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`}>
            {/* Video Player */}
            <div className={isMobile ? '' : 'col-span-8'}>
              <Card className="h-full">
                <CardContent className="p-4">
                  {videoInfo && selectedNotification ? (
                    <IntegratedVideoPlayer
                      videoInfo={videoInfo}
                      onEventRecord={handleRecordEvent}
                      matchId={selectedNotification.match_id}
                      isMuted={isMuted}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Bell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Select a notification to start tracking</p>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant={activePanel === 'notifications' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivePanel('notifications')}
                    >
                      <Bell className="w-4 h-4 mr-1" />
                      Notifications
                    </Button>
                    <Button
                      variant={activePanel === 'piano' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivePanel('piano')}
                      disabled={!selectedNotification}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Events
                    </Button>
                    <Button
                      variant={activePanel === 'voice' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivePanel('voice')}
                      disabled={!selectedNotification}
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
                  {activePanel === 'notifications' && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm">Your Tracking Assignments</h3>
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedNotification?.id === notification.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {notification.matches.name || 
                                   `${notification.matches.home_team_name} vs ${notification.matches.away_team_name}`}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {notification.matches.status}
                                  </Badge>
                                  {notification.matches.video_url && (
                                    <Badge variant="outline" className="text-xs">
                                      Has Video
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {notification.is_read ? (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                              ) : (
                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-500 py-8">
                          No tracking assignments yet
                        </p>
                      )}
                    </div>
                  )}
                  
                  {activePanel === 'piano' && selectedNotification && (
                    <TrackerPianoInput 
                      matchId={selectedNotification.match_id} 
                      onRecordEvent={handleRecordEvent}
                    />
                  )}
                  
                  {activePanel === 'voice' && selectedNotification && user && (
                    <EnhancedVoiceChat
                      matchId={selectedNotification.match_id}
                      userId={user.id}
                      userRole={userRole || 'tracker'}
                      userName={user.user_metadata?.full_name || 'Anonymous'}
                    />
                  )}
                  
                  {activePanel === 'settings' && (
                    <div className="space-y-4">
                      {selectedNotification && (
                        <div>
                          <h3 className="font-medium mb-2">Match Information</h3>
                          <p className="text-sm text-gray-600">
                            {selectedNotification.matches.name || 
                             `${selectedNotification.matches.home_team_name} vs ${selectedNotification.matches.away_team_name}`}
                          </p>
                          <p className="text-xs text-gray-500">Status: {selectedNotification.matches.status}</p>
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
                  
                  {!selectedNotification && (activePanel === 'piano' || activePanel === 'voice') && (
                    <div className="text-center text-gray-500 mt-8">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>Please select a notification to start tracking</p>
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
