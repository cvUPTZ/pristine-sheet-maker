
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Upload, Download } from 'lucide-react';
import { Statistics, TeamDetailedStats } from '@/types';

interface VideoAnalyzerProps {
  onAnalysisComplete?: (analysis: any) => void;
}

const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({
  onAnalysisComplete
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl('');
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(event.target.value);
    setVideoFile(null);
  };

  const handleAnalyze = async () => {
    if (!videoFile && !videoUrl) {
      alert('Please upload a video file or provide a video URL');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Simulate video analysis - in real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create proper Statistics structure with home and away as TeamDetailedStats
      const homeStats: TeamDetailedStats = {
        shots: 8,
        shotsOnTarget: 5,
        goals: 0,
        assists: 0,
        passesAttempted: 400,
        passesCompleted: 350,
        foulsCommitted: 0,
        yellowCards: 0,
        redCards: 0,
        corners: 0,
        offsides: 0,
        tackles: 0,
        interceptions: 0,
        crosses: 0,
        clearances: 0,
        blocks: 0,
        possession: 0, // Or calculate based on possessionPercentage if needed
        totalXg: 0,
        supportPasses: 0,
        offensivePasses: 0,
        ballsRecovered: 0,
        ballsLost: 0,
        ballsPlayed: 0,
        contacts: 0,
        freeKicks: 0,
        sixMeterViolations: 0,
        possessionMinutes: 0,
        possessionPercentage: 55,
        dangerousFootShots: 0,
        nonDangerousFootShots: 0,
        footShotsOnTarget: 0,
        footShotsOffTarget: 0,
        footShotsPostHits: 0,
        footShotsBlocked: 0,
        dangerousHeaderShots: 0,
        nonDangerousHeaderShots: 0,
        headerShotsOnTarget: 0,
        headerShotsOffTarget: 0,
        headerShotsPostHits: 0,
        headerShotsBlocked: 0,
        duelsWon: 0,
        duelsLost: 0,
        aerialDuelsWon: 0,
        aerialDuelsLost: 0,
        decisivePasses: 0,
        successfulCrosses: 0,
        successfulDribbles: 0,
        longPasses: 0,
        forwardPasses: 0,
        backwardPasses: 0,
        lateralPasses: 0,
      };
      
      const awayStats: TeamDetailedStats = {
        shots: 6,
        shotsOnTarget: 4,
        goals: 0,
        assists: 0,
        passesAttempted: 350,
        passesCompleted: 280,
        foulsCommitted: 0,
        yellowCards: 0,
        redCards: 0,
        corners: 0,
        offsides: 0,
        tackles: 0,
        interceptions: 0,
        crosses: 0,
        clearances: 0,
        blocks: 0,
        possession: 0, // Or calculate based on possessionPercentage if needed
        totalXg: 0,
        supportPasses: 0,
        offensivePasses: 0,
        ballsRecovered: 0,
        ballsLost: 0,
        ballsPlayed: 0,
        contacts: 0,
        freeKicks: 0,
        sixMeterViolations: 0,
        possessionMinutes: 0,
        possessionPercentage: 45,
        dangerousFootShots: 0,
        nonDangerousFootShots: 0,
        footShotsOnTarget: 0,
        footShotsOffTarget: 0,
        footShotsPostHits: 0,
        footShotsBlocked: 0,
        dangerousHeaderShots: 0,
        nonDangerousHeaderShots: 0,
        headerShotsOnTarget: 0,
        headerShotsOffTarget: 0,
        headerShotsPostHits: 0,
        headerShotsBlocked: 0,
        duelsWon: 0,
        duelsLost: 0,
        aerialDuelsWon: 0,
        aerialDuelsLost: 0,
        decisivePasses: 0,
        successfulCrosses: 0,
        successfulDribbles: 0,
        longPasses: 0,
        forwardPasses: 0,
        backwardPasses: 0,
        lateralPasses: 0,
      };
      
      // Mock analysis results with correct Statistics structure
      const mockResults = {
        duration: '90:00',
        events: [
          { type: 'goal', timestamp: 1200, team: 'home', player: 'Player 9' },
          { type: 'yellowCard', timestamp: 2400, team: 'away', player: 'Player 5' },
          { type: 'goal', timestamp: 4800, team: 'away', player: 'Player 11' }
        ],
        statistics: {
          home: homeStats,
          away: awayStats
        } as Statistics,
        ballTracking: [
          { x: 50, y: 50, timestamp: 0, team: 'home' },
          { x: 60, y: 40, timestamp: 1000, team: 'home' },
          { x: 70, y: 30, timestamp: 2000, team: 'away' }
        ]
      };

      setAnalysisResults(mockResults);
      onAnalysisComplete?.(mockResults);
      
    } catch (error) {
      console.error('Error analyzing video:', error);
      alert('Error analyzing video. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportResults = () => {
    if (!analysisResults) return;
    
    const dataStr = JSON.stringify(analysisResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-analysis-results.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Video Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-file">Upload Video File</Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="mt-1"
            />
          </div>

          <div className="text-center text-gray-500">or</div>

          <div>
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://example.com/video.mp4"
              value={videoUrl}
              onChange={handleUrlChange}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!videoFile && !videoUrl)}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
          </Button>
        </CardContent>
      </Card>

      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Analysis Results
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportResults}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Match Duration</Label>
              <div className="text-lg font-semibold">{analysisResults.duration}</div>
            </div>

            <div>
              <Label>Events Detected</Label>
              <div className="space-y-2 mt-2">
                {analysisResults.events.map((event: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{event.type}</span>
                    <span className="text-sm text-gray-600">
                      {Math.floor(event.timestamp / 60)}:{(event.timestamp % 60).toString().padStart(2, '0')} - {event.team} ({event.player})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Ball Tracking Points</Label>
              <div className="text-sm text-gray-600">
                {analysisResults.ballTracking?.length || 0} tracking points detected
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoAnalyzer;
