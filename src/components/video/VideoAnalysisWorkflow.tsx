import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, BarChart3, Video as VideoIconLucide } from 'lucide-react';
import YouTubeDownloader from './YouTubeDownloader';
import VideoSplitter from './VideoSplitter';
import ColabIntegration from './ColabIntegration';
import { toast } from 'sonner';
import { VideoInfo, VideoSegment, AnalysisResults } from '@/types';
import { formatTime, formatFileSize } from '@/utils/formatters';

// Define a local interface that matches what YouTubeDownloader expects
interface LocalVideoInfo {
  title: string;
  duration: string; // YouTubeDownloader expects string
}

const VideoAnalysisWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [downloadedVideoFile, setDownloadedVideoFile] = useState<File | null>(null);
  const [mainVideoInfo, setMainVideoInfo] = useState<VideoInfo | null>(null);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [allAnalysisResults, setAllAnalysisResults] = useState<AnalysisResults[]>([]);

  const steps = [
    { id: 'download', title: 'Download Video', icon: VideoIconLucide },
    { id: 'split', title: 'Split Video', icon: FileText },
    { id: 'process', title: 'Analyze Segments', icon: BarChart3 },
    { id: 'results', title: 'View Results', icon: Download }
  ];

  const handleVideoDownloaded = (videoFile: File, videoInfo: LocalVideoInfo) => {
    // Convert the local VideoInfo to our standardized VideoInfo
    const standardVideoInfo: VideoInfo = {
      videoId: 'downloaded_video', // Generate or extract proper ID
      title: videoInfo.title,
      duration: parseInt(videoInfo.duration) || 0, // Convert string to number
      thumbnail: '',
      formats: []
    };
    
    setDownloadedVideoFile(videoFile);
    setMainVideoInfo(standardVideoInfo);
    setVideoSegments([]);
    setAllAnalysisResults([]);
    setCurrentStep(1);
    toast.success(`Video "${standardVideoInfo.title}" ready! Proceed to split.`);
  };

  const handleSegmentsReady = (segments: VideoSegment[]) => {
    setVideoSegments(segments);
    setAllAnalysisResults([]);
    setCurrentStep(2);
    toast.success(`${segments.length} video segments ready for analysis.`);
  };

  const handleAnalysisComplete = (results: AnalysisResults[]) => {
    setAllAnalysisResults(results);
    setCurrentStep(3);
    toast.success(`Analysis complete for ${results.length} segments! View your results.`);
  };

  const downloadCombinedResults = () => {
    if (!mainVideoInfo) {
        toast.error("No video information available to download.");
        return;
    }

    const summaryStats = {
        totalEvents: allAnalysisResults.reduce((sum, result) => sum + result.events.length, 0),
        averageHomePossession: allAnalysisResults.length > 0 ?
            allAnalysisResults.reduce((sum, result) => sum + (result.statistics?.ballPossession?.home || 0), 0) / allAnalysisResults.filter(r => r.statistics?.ballPossession).length
            : 0,
    };

    const combinedData = {
      videoInfo: {
        title: mainVideoInfo.title,
        originalDuration: formatTime(mainVideoInfo.duration),
        videoId: mainVideoInfo.videoId,
      },
      numberOfSegments: videoSegments.length,
      segments: videoSegments.map(seg => ({
        id: seg.id,
        startTime: formatTime(seg.startTime),
        endTime: formatTime(seg.endTime),
        duration: formatTime(seg.duration),
        fileName: seg.fileName,
        size: seg.size ? formatFileSize(seg.size) : 'N/A',
      })),
      analysisSummary: summaryStats,
      detailedAnalysis: allAnalysisResults.map(result => ({
        segmentId: result.segmentId,
        eventCount: result.events.length,
        events: result.events.map(e => ({...e, timestamp: formatTime(e.timestamp)})),
        statistics: result.statistics,
        heatmapUrl: result.heatmapUrl,
        playerTrackingDataUrl: result.playerTrackingDataUrl,
      })),
    };

    const dataStr = JSON.stringify(combinedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mainVideoInfo.title.replace(/[^a-zA-Z0-9]/g, '_') || 'video'}_analysis.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Combined analysis results downloaded.');
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

  const activeTabId = steps[currentStep]?.id || 'download';
  
  const totalEventsDetected = allAnalysisResults.reduce((sum, result) => sum + result.events.length, 0);
  const segmentsSuccessfullyAnalyzed = allAnalysisResults.length;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Advanced Video Analysis Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-4 sm:space-y-0 sm:space-x-2">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const IconComponent = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs sm:text-sm ${getStepColor(status)}`}>
                    <IconComponent className="h-4 w-4" />
                    <span className="font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden sm:block w-8 h-0.5 bg-gray-300 mx-1" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full h-2" />
        </CardContent>
      </Card>

      <Tabs value={activeTabId} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          {steps.map((step, index) => (
            <TabsTrigger
              key={step.id}
              value={step.id}
              disabled={index > currentStep}
              onClick={() => setCurrentStep(index)}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <step.icon className="h-4 w-4" />
              {step.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="download" className="mt-6">
          <YouTubeDownloader onVideoDownloaded={handleVideoDownloaded} />
        </TabsContent>

        <TabsContent value="split" className="mt-6">
          {downloadedVideoFile && mainVideoInfo ? (
            <VideoSplitter
              videoFile={downloadedVideoFile}
              videoInfo={mainVideoInfo}
              onSegmentsReady={handleSegmentsReady}
            />
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Please download a video first to enable splitting.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="process" className="mt-6">
          {videoSegments.length > 0 ? (
            <ColabIntegration
              segments={videoSegments}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Please split the video into segments to enable analysis.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {allAnalysisResults.length > 0 && mainVideoInfo ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  Analysis Results for "{mainVideoInfo.title}"
                  <Button onClick={downloadCombinedResults} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-1">Total Events</h3>
                    <p className="text-3xl font-bold text-blue-600">{totalEventsDetected}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-1">Segments Analyzed</h3>
                    <p className="text-3xl font-bold text-green-600">{segmentsSuccessfullyAnalyzed} / {videoSegments.length}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-medium text-purple-900 mb-1">Original Duration</h3>
                    <p className="text-3xl font-bold text-purple-600">{formatTime(mainVideoInfo.duration)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Segment Details</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {allAnalysisResults.map((result, index) => {
                      const segmentMeta = videoSegments.find(s => s.id === result.segmentId);
                      return(
                        <div key={result.segmentId || index} className="p-4 border rounded-lg shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                            <h4 className="font-semibold text-md">
                              Segment {videoSegments.findIndex(s => s.id === result.segmentId) + 1}
                              {segmentMeta && ` (${formatTime(segmentMeta.startTime)} - ${formatTime(segmentMeta.endTime)})`}
                            </h4>
                            <Badge variant="outline">{result.events.length} events detected</Badge>
                          </div>
                          {result.statistics && (
                            <div className="text-sm text-gray-700 space-y-1">
                              {result.statistics.ballPossession && 
                                <p>Possession: <span className="font-medium">H: {result.statistics.ballPossession.home.toFixed(1)}%</span> - <span className="font-medium">A: {result.statistics.ballPossession.away.toFixed(1)}%</span></p>
                              }
                              {result.statistics.passes &&
                                <p>Passes: <span className="font-medium">{result.statistics.passes.successful} / {result.statistics.passes.attempted}</span> successful</p>
                              }
                               {result.statistics.shots !== undefined &&
                                <p>Shots: <span className="font-medium">{result.statistics.shots}</span></p>
                              }
                            </div>
                          )}
                           {(result.heatmapUrl || result.playerTrackingDataUrl) && (
                            <div className="mt-2 text-xs space-x-2">
                                {result.heatmapUrl && <a href={result.heatmapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Heatmap</a>}
                                {result.playerTrackingDataUrl && <a href={result.playerTrackingDataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Tracking Data</a>}
                            </div>
                           )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
             <Card className="text-center py-12">
              <CardContent>
                <Download className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No analysis results available yet.</p>
                <p className="text-sm text-gray-400">Complete the previous steps to generate and view results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VideoAnalysisWorkflow;
