
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, BarChart3, Video } from 'lucide-react';
import YouTubeDownloader from './YouTubeDownloader';
import VideoSplitter from './VideoSplitter';
import ColabIntegration from './ColabIntegration';
import { toast } from 'sonner';

interface VideoInfo {
  title: string;
  duration: string;
  thumbnail: string;
  formats: any[];
}

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
}

interface AnalysisResults {
  events: any[];
  statistics: any;
  heatmap: string;
  playerTracking: string;
}

const VideoAnalysisWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [downloadedVideo, setDownloadedVideo] = useState<File | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults[]>([]);

  const steps = [
    { id: 'download', title: 'Download Video', icon: Video },
    { id: 'split', title: 'Split Video', icon: FileText },
    { id: 'process', title: 'Process in Colab', icon: BarChart3 },
    { id: 'results', title: 'View Results', icon: Download }
  ];

  const handleVideoDownloaded = (videoFile: File, info: VideoInfo) => {
    setDownloadedVideo(videoFile);
    setVideoInfo(info);
    setCurrentStep(1);
    toast.success('Video downloaded! Proceed to split the video.');
  };

  const handleSegmentsReady = (segments: VideoSegment[]) => {
    setVideoSegments(segments);
    setCurrentStep(2);
    toast.success('Video segments ready! Proceed to Colab processing.');
  };

  const handleAnalysisComplete = (results: AnalysisResults[]) => {
    setAnalysisResults(results);
    setCurrentStep(3);
    toast.success('Analysis complete! View your results.');
  };

  const downloadCombinedResults = () => {
    const combinedResults = {
      videoInfo,
      segments: videoSegments.length,
      analysisResults,
      summary: {
        totalEvents: analysisResults.reduce((sum, result) => sum + result.events.length, 0),
        averagePossession: analysisResults.reduce((sum, result) => 
          sum + (result.statistics?.ballPossession?.home || 0), 0) / analysisResults.length
      }
    };

    const dataStr = JSON.stringify(combinedResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoInfo?.title || 'video'}_analysis_results.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Results downloaded successfully');
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Analysis Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const IconComponent = step.icon;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStepColor(status)}`}>
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-300 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
          
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
        </CardContent>
      </Card>

      <Tabs value={steps[currentStep]?.id} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <TabsTrigger 
                key={step.id} 
                value={step.id}
                disabled={index > currentStep}
                className="flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                {step.title}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="download" className="space-y-4">
          <YouTubeDownloader onVideoDownloaded={handleVideoDownloaded} />
        </TabsContent>

        <TabsContent value="split" className="space-y-4">
          {downloadedVideo && videoInfo ? (
            <VideoSplitter 
              videoFile={downloadedVideo}
              videoInfo={videoInfo}
              onSegmentsReady={handleSegmentsReady}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Please download a video first</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          {videoSegments.length > 0 ? (
            <ColabIntegration 
              segments={videoSegments}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Please split the video into segments first</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {analysisResults.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Analysis Results
                  <Button onClick={downloadCombinedResults}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Results
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900">Total Events</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {analysisResults.reduce((sum, result) => sum + result.events.length, 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-900">Segments Processed</h3>
                    <p className="text-2xl font-bold text-green-600">{analysisResults.length}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-medium text-purple-900">Video Duration</h3>
                    <p className="text-2xl font-bold text-purple-600">{videoInfo?.duration}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Segment Results</h3>
                  {analysisResults.map((result, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Segment {index + 1}</span>
                        <Badge>
                          {result.events.length} events detected
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Ball Possession: Home {result.statistics?.ballPossession?.home || 0}% - Away {result.statistics?.ballPossession?.away || 0}%</p>
                        <p>Successful Passes: {result.statistics?.passes?.successful || 0} / {result.statistics?.passes?.total || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No analysis results available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VideoAnalysisWorkflow;
