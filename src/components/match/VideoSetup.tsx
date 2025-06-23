
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeService } from '@/services/youtubeService';
import { Play, Send, Users, Eye } from 'lucide-react';

interface TrackerData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface VideoSetupProps {
  matchId: string;
}

const VideoSetup: React.FC<VideoSetupProps> = ({ matchId }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [trackers, setTrackers] = useState<TrackerData[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrackers();
  }, []);

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('role', 'tracker');

      if (error) throw error;
      
      const trackersData: TrackerData[] = (data || [])
        .filter(profile => profile.email)
        .map(profile => ({
          id: profile.id,
          email: profile.email!,
          full_name: profile.full_name,
          role: profile.role || 'tracker'
        }));
      
      setTrackers(trackersData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load trackers',
        variant: 'destructive',
      });
    }
  };

  const loadVideoInfo = async () => {
    if (!videoUrl) return;

    setLoading(true);
    try {
      const info = await YouTubeService.getVideoInfo(videoUrl);
      setVideoInfo(info);
      toast({
        title: 'Video Loaded',
        description: `"${info.title}" ready for assignment`,
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
  };

  const saveVideoToMatch = async () => {
    if (!videoUrl || !user?.id) {
      toast({
        title: 'Error',
        description: 'Please enter a video URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .upsert({
          match_id: matchId,
          user_id: user.id,
          type: 'video_setup',
          title: 'Video URL Updated',
          message: 'Video URL has been assigned to match',
          notification_data: { video_url: videoUrl }
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Video URL saved to match',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save video URL',
        variant: 'destructive',
      });
    }
  };

  const sendNotificationsToTrackers = async () => {
    if (selectedTrackers.length === 0 || !user?.id) {
      toast({
        title: 'Error',
        description: 'Please select at least one tracker',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const notificationsToInsert = selectedTrackers.map(trackerId => ({
        user_id: trackerId,
        match_id: matchId,
        type: 'video_tracking_assignment',
        title: 'New Video Tracking Assignment',
        message: `You have been assigned to track a match`,
        notification_data: {
          video_url: videoUrl,
          assigned_by: user.id,
          assignment_time: new Date().toISOString()
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (error) throw error;

      toast({
        title: 'Notifications Sent',
        description: `Sent tracking assignments to ${selectedTrackers.length} tracker(s)`,
      });

      setSelectedTrackers([]);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send notifications: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Video Setup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Video Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              YouTube Video URL
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter YouTube video URL..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={loadVideoInfo}
                disabled={!videoUrl || loading}
                size="sm"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {videoInfo && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-1">{videoInfo.title}</h4>
              <p className="text-xs text-gray-500">Duration: {videoInfo.duration}</p>
            </div>
          )}

          <Button
            onClick={saveVideoToMatch}
            disabled={!videoUrl}
            className="w-full"
          >
            Save Video to Match
          </Button>
        </CardContent>
      </Card>

      {/* Tracker Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tracker Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Trackers to Notify
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {trackers.map((tracker) => (
                <label key={tracker.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTrackers.includes(tracker.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTrackers([...selectedTrackers, tracker.id]);
                      } else {
                        setSelectedTrackers(selectedTrackers.filter(id => id !== tracker.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {tracker.full_name || tracker.email}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Selected: {selectedTrackers.length} tracker(s)
          </div>

          <Button
            onClick={sendNotificationsToTrackers}
            disabled={selectedTrackers.length === 0 || loading}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoSetup;
