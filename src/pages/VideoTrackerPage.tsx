import React, { useEffect, useState } from 'react';
import TrackerVideoInterface from '@/components/video/TrackerVideoInterface';
import { useLocation } from 'react-router-dom';
import { YouTubeService } from '@/services/youtubeService'; // To fetch video URL if only matchId is provided
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

// Helper to parse query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VideoTrackerPage: React.FC = () => {
  const query = useQuery();
  const { user } = useAuth();
  const [matchId, setMatchId] = useState<string | null>(query.get('matchId'));
  const [videoId, setVideoId] = useState<string | null>(query.get('videoId')); // Can be direct videoId or extracted
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVideoInfo = async () => {
      setLoading(true);
      setError(null);
      let currentMatchId = query.get('matchId');
      let currentVideoId = query.get('videoId'); // This might be a full URL or just an ID

      if (!currentMatchId && !currentVideoId) {
         // Scenario: No parameters, maybe fetch user's latest video assignment?
         // For now, require at least one.
        setError("Match ID or Video ID is required to load the video tracker.");
        setLoading(false);
        return;
      }

      setMatchId(currentMatchId); // Set matchId if present

      if (currentVideoId) {
        const extractedId = YouTubeService.extractVideoId(currentVideoId);
        if (extractedId) {
          setVideoId(extractedId);
        } else {
          // If it's not a URL, assume it's an ID already
          // Add more robust validation if necessary
          if (currentVideoId.length === 11) { // Basic check for YouTube ID length
             setVideoId(currentVideoId);
          } else {
            setError(`Invalid YouTube Video ID or URL format: ${currentVideoId}`);
            setVideoId(null);
            setLoading(false);
            return;
          }
        }
      } else if (currentMatchId) {
        // If only matchId is provided, try to fetch the video URL/ID associated with this match
        // This requires the database schema and service methods to be implemented (Step 4)
        try {
          // Placeholder: In a real scenario, you'd fetch this from your backend/Supabase
          // For example: const videoConfig = await YouTubeService.getVideoMatchSetup(currentMatchId);
          // if (videoConfig && videoConfig.videoUrl) {
          //   const extracted = YouTubeService.extractVideoId(videoConfig.videoUrl);
          //   setVideoId(extracted);
          // } else {
          //   setError(`No video configured for match ID: ${currentMatchId}`);
          // }
          console.warn("Video ID not provided directly, fetching from match config is not yet implemented. Using placeholder.");
          // Fallback to a placeholder or error if not implemented
           setError(`Video ID not provided and fetching by Match ID (${currentMatchId}) is not fully implemented yet.`);
           setVideoId(null);
        } catch (e: any) {
          setError(`Failed to fetch video for match ${currentMatchId}: ${e.message}`);
          setVideoId(null);
        }
      }
      setLoading(false);
    };

    if (user) { // Ensure user is loaded before trying to fetch anything that might be user-specific
        loadVideoInfo();
    } else {
        // Handle case where user is not yet available, might show loading or redirect
        // For now, assume user context will eventually provide the user
        // setLoading(true); // Keep loading until user is available
    }

  }, [query, user]);


  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Loading Video Tracker</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Preparing your tracking interface...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-destructive">
        <Card className="w-full max-w-md p-8 shadow-xl border-destructive">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 mr-2" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>{error}</p>
            <p className="mt-4 text-sm text-muted-foreground">Please check the URL or contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!videoId || !matchId) {
    // This case should ideally be caught by the error state, but as a fallback:
     return (
      <div className="flex items-center justify-center h-screen bg-background text-destructive">
         <Card className="w-full max-w-md p-8 shadow-xl border-destructive">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 mr-2" /> Configuration Missing
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>Video ID or Match ID is missing. Cannot load the tracker.</p>
             <p className="mt-4 text-sm text-muted-foreground">Ensure the link includes necessary parameters.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TrackerVideoInterface
      initialVideoId={videoId}
      matchId={matchId}
    />
  );
};

export default VideoTrackerPage;
