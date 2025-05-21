
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Statistics } from '@/types';
import { Separator } from '@/components/ui/separator';

interface VideoAnalyzerProps {
  onAnalysisComplete?: (statistics: Statistics) => void;
}

const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const formatTimeToSeconds = (time: string): string => {
    // Convert time formats like "1:30" or "1:30:45" to seconds for Gemini
    if (!time) return '';
    
    const parts = time.split(':').map(Number);
    if (parts.length === 1) {
      return `${parts[0]}s`;
    } else if (parts.length === 2) {
      return `${parts[0] * 60 + parts[1]}s`;
    } else if (parts.length === 3) {
      return `${parts[0] * 3600 + parts[1] * 60 + parts[2]}s`;
    }
    return '';
  };

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

      // Convert time inputs to seconds format for Gemini
      const startOffset = formatTimeToSeconds(startTime);
      const endOffset = formatTimeToSeconds(endTime);
      
      // Make sure time values end with 's' as required by Gemini API
      console.log(`Sending startOffset: ${startOffset}, endOffset: ${endOffset}`);

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('analyze-youtube-video', {
        body: { 
          videoUrl,
          startOffset,
          endOffset
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        console.error("Analysis error:", error);
        throw new Error(error.message);
      }

      if (!data?.statistics) {
        console.error("Missing statistics in response:", data);
        throw new Error("No statistics returned from analysis");
      }

      console.log("Analysis result:", data);

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
      
      // Make sure to call the callback with the formatted statistics
      if (onAnalysisComplete) {
        console.log("Passing statistics to parent component:", formattedStats);
        onAnalysisComplete(formattedStats);
      } else {
        console.warn("No onAnalysisComplete callback provided");
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
          <div className="flex flex-col space-y-2">
            <Input
              placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={isAnalyzing}
            />
            
            <Separator className="my-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Start time (optional)</p>
                <Input
                  placeholder="e.g., 1:30 or 1:30:45"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">End time (optional)</p>
                <Input
                  placeholder="e.g., 10:30 or 1:30:45"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
            </div>
            
            <Button 
              onClick={analyzeVideo} 
              disabled={isAnalyzing || !videoUrl}
              className="w-full mt-2"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Video"}
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
        Analysis powered by Google Gemini 2.5 Flash. Results may vary based on video quality and content.
      </CardFooter>
    </Card>
  );
};

export default VideoAnalyzer;
