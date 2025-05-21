
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Statistics } from '@/types';

interface VideoAnalyzerProps {
  onAnalysisComplete?: (statistics: Statistics) => void;
}

const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const analyzeVideo = async () => {
    if (!videoUrl) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(10);

    try {
      // Update progress to simulate steps
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 3000);

      toast({
        title: "Analysis started",
        description: "Video analysis in progress. This might take a few minutes.",
      });

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('analyze-youtube-video', {
        body: { videoUrl },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.statistics) {
        throw new Error("No statistics returned from analysis");
      }

      // Format the received statistics to match the Statistics type
      const formattedStats: Statistics = {
        possession: data.statistics.possession || { home: 50, away: 50 },
        shots: data.statistics.shots || {
          home: { onTarget: 0, offTarget: 0 },
          away: { onTarget: 0, offTarget: 0 }
        },
        passes: data.statistics.passes || {
          home: { successful: 0, attempted: 0 },
          away: { successful: 0, attempted: 0 }
        },
        ballsPlayed: data.statistics.ballsPlayed || { home: 0, away: 0 },
        ballsLost: data.statistics.ballsLost || { home: 0, away: 0 },
        duels: data.statistics.duels || {
          home: { won: 0, lost: 0, aerial: 0 },
          away: { won: 0, lost: 0, aerial: 0 }
        },
        cards: data.statistics.cards || {
          home: { yellow: 0, red: 0 },
          away: { yellow: 0, red: 0 }
        },
        crosses: data.statistics.crosses || {
          home: { total: 0, successful: 0 },
          away: { total: 0, successful: 0 }
        },
        dribbles: data.statistics.dribbles || {
          home: { successful: 0, attempted: 0 },
          away: { successful: 0, attempted: 0 }
        },
        corners: data.statistics.corners || { home: 0, away: 0 },
        offsides: data.statistics.offsides || { home: 0, away: 0 },
        freeKicks: data.statistics.freeKicks || { home: 0, away: 0 }
      };

      toast({
        title: "Analysis complete",
        description: "Video statistics have been extracted successfully.",
        variant: "default",
      });
      
      if (onAnalysisComplete) {
        onAnalysisComplete(formattedStats);
      }

    } catch (error) {
      console.error("Video analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze the video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Video Analysis</CardTitle>
        <CardDescription>
          Enter a YouTube URL of a soccer match to analyze and extract statistics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={isAnalyzing}
            />
            <Button 
              onClick={analyzeVideo} 
              disabled={isAnalyzing || !videoUrl}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
          
          {isAnalyzing && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {progress < 30 && "Extracting video content..."}
                {progress >= 30 && progress < 60 && "Processing footage..."}
                {progress >= 60 && progress < 90 && "Analyzing match data..."}
                {progress >= 90 && "Finalizing results..."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Analysis powered by Google Gemini AI. Results may vary based on video quality and content.
      </CardFooter>
    </Card>
  );
};

export default VideoAnalyzer;
