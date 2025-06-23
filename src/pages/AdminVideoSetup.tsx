
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeService } from '@/services/youtubeService';
import { Play, Send, Users, Calendar, Trash2, Eye } from 'lucide-react';

interface MatchData {
  id: string;
  name: string | null;
  home_team_name: string;
  away_team_name: string;
  status: string;
  video_url?: string | null;
}

interface TrackerData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

const AdminVideoSetup: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [trackers, setTrackers] = useState<TrackerData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch matches and trackers
  useEffect(() => {
    fetchMatches();
    fetchTrackers();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, name, home_team_name, away_team_name, status, video_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load matches',
        variant: 'destructive',
      });
    }
  };

  const fetchTrackers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('role', 'tracker');

      if (error) throw error;
      setTrackers(data || []);
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
    if (!selectedMatch || !videoUrl) {
      toast({
        title: 'Error',
        description: 'Please select a match and enter a video URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .update({ video_url: videoUrl })
        .eq('id', selectedMatch);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Video URL saved to match',
      });

      fetchMatches(); // Refresh matches list
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save video URL',
        variant: 'destructive',
      });
    }
  };

  const sendNotificationsToTrackers = async () => {
    if (!selectedMatch || selectedTrackers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a match and at least one tracker',
        variant: 'destructive',
      });
      return;
    }

    const match = matches.find(m => m.id === selectedMatch);
    if (!match) return;

    try {
      setLoading(true);

      // Send notifications to selected trackers
      const notifications = selectedTrackers.map(trackerId => ({
        user_id: trackerId,
        match_id: selectedMatch,
        type: 'video_tracking_assignment',
        title: 'New Video Tracking Assignment',
        message: `You have been assigned to track the match: ${match.name || `${match.home_team_name} vs ${match.away_team_name}`}`,
        data: {
          video_url: match.video_url,
          match_name: match.name || `${match.home_team_name} vs ${match.away_team_name}`,
          assigned_by: user?.id,
          assignment_time: new Date().toISOString()
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast({
        title: 'Notifications Sent',
        description: `Sent tracking assignments to ${selectedTrackers.length} tracker(s)`,
      });

      // Clear selections
      setSelectedTrackers([]);
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeVideoFromMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ video_url: null })
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Video URL removed from match',
      });

      fetchMatches();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove video URL',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Tracking Setup</h1>
          <p className="text-gray-600">Assign YouTube videos to matches and notify trackers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Video Setup Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Video Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Match Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Match
                </label>
                <select
                  value={selectedMatch}
                  onChange={(e) => setSelectedMatch(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white"
                >
                  <option value="">Choose a match...</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                      {match.video_url ? ' (Has Video)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video URL Input */}
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

              {/* Video Info Display */}
              {videoInfo && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-1">{videoInfo.title}</h4>
                  <p className="text-xs text-gray-500">Duration: {videoInfo.duration}</p>
                </div>
              )}

              {/* Save Video Button */}
              <Button
                onClick={saveVideoToMatch}
                disabled={!selectedMatch || !videoUrl}
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
                disabled={!selectedMatch || selectedTrackers.length === 0 || loading}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Notifications
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Matches with Videos List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Matches with Assigned Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matches
                .filter(match => match.video_url)
                .map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">
                        {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                      </h3>
                      <p className="text-sm text-gray-500 truncate max-w-md">
                        Video: {match.video_url}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {match.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(match.video_url!, '_blank')}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeVideoFromMatch(match.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              
              {matches.filter(match => match.video_url).length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No matches with assigned videos yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminVideoSetup;
