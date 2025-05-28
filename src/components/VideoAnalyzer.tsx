
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Statistics } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';

interface VideoAnalyzerProps {
  onAnalysisComplete?: (statistics: Statistics) => void;
}

const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast({
        title: "File selected",
        description: `Selected: ${e.target.files[0].name}`,
      });
    }
  };

  const analyzeVideo = async () => {
    if (!videoUrl && !file) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video URL or upload a video file",
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
        body: { 
          videoUrl,
          fileUpload: file ? true : false
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
        home: data.statistics.home || {
          passes: 0,
          shots: 0,
          tackles: 0,
          fouls: 0,
          possession: 50
        },
        away: data.statistics.away || {
          passes: 0,
          shots: 0,
          tackles: 0,
          fouls: 0,
          possession: 50
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

    } catch (error: any) {
      console.error("Video analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze the video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
      setFile(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Video Analysis</CardTitle>
        <CardDescription>
          Enter a YouTube URL or upload a video file of a soccer match to analyze and extract statistics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Input
              placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={isAnalyzing || isUploading}
            />
            
            <Separator className="my-2" />
            
            <div className="grid grid-cols-1 gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Or upload a video file</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    disabled={isAnalyzing || isUploading}
                    className="flex-1"
                  />
                </div>
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected file: {file.name} ({Math.round(file.size / 1024 / 1024 * 10) / 10} MB)
                  </p>
                )}
              </div>
            </div>
            
            <Button 
              onClick={analyzeVideo} 
              disabled={isAnalyzing || isUploading || (!videoUrl && !file)}
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
