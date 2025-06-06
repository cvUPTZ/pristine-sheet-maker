
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  Settings,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { VideoSegment, AnalysisResults } from '@/types';
import { 
  aiComputeService, 
  VideoSegmentAnalysisRequest, 
  convertToAnalysisResults 
} from '@/services/aiComputeService';

interface AIComputeIntegrationProps {
  segments: VideoSegment[];
  onAnalysisComplete: (results: AnalysisResults[]) => void;
}

interface ProcessingSegment extends VideoSegment {
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  processingProgress: number;
  processingTime?: number;
  error?: string;
}

interface ServiceConfig {
  serviceUrl: string;
  apiKey: string;
  enableObjectDetection: boolean;
  enablePlayerTracking: boolean;
  enableBallTracking: boolean;
  confidenceThreshold: number;
}

const AIComputeIntegration: React.FC<AIComputeIntegrationProps> = ({
  segments,
  onAnalysisComplete
}) => {
  const [processing, setProcessing] = useState(false);
  const [processedSegments, setProcessedSegments] = useState<ProcessingSegment[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>({
    serviceUrl: 'http://localhost:8000', // Default local development URL
    apiKey: '',
    enableObjectDetection: true,
    enablePlayerTracking: true,
    enableBallTracking: true,
    confidenceThreshold: 0.5,
  });

  // Initialize segments for processing
  React.useEffect(() => {
    if (segments.length > 0) {
      const initSegments: ProcessingSegment[] = segments.map(segment => ({
        ...segment,
        processingStatus: 'pending',
        processingProgress: 0,
      }));
      setProcessedSegments(initSegments);
    }
  }, [segments]);

  // Check service health
  const checkServiceHealth = useCallback(async () => {
    try {
      // Configure the service with current settings
      aiComputeService.configure(serviceConfig.serviceUrl, serviceConfig.apiKey);
      
      const isOnline = await aiComputeService.healthCheck();
      setServiceOnline(isOnline);
      
      if (isOnline) {
        try {
          const serviceInfo = await aiComputeService.getServiceInfo();
          toast.success(`AI service connected! Model: ${serviceInfo.model_name} v${serviceInfo.model_version}`);
        } catch (error) {
          toast.warning('Service is online but info unavailable');
        }
      } else {
        toast.error('AI compute service is offline or unreachable');
      }
    } catch (error) {
      console.error('Service health check failed:', error);
      setServiceOnline(false);
      toast.error('Failed to connect to AI compute service');
    }
  }, [serviceConfig.serviceUrl, serviceConfig.apiKey]);

  // Process all segments
  const processSegments = useCallback(async () => {
    if (!serviceOnline) {
      toast.error('Please check service connection first');
      return;
    }

    if (processedSegments.length === 0) {
      toast.error('No segments available for processing');
      return;
    }

    setProcessing(true);
    setOverallProgress(0);

    const allResults: AnalysisResults[] = [];
    let completedCount = 0;

    // Configure service
    aiComputeService.configure(serviceConfig.serviceUrl, serviceConfig.apiKey);

    for (let i = 0; i < processedSegments.length; i++) {
      const segment = processedSegments[i];
      
      // Skip segments without files
      if (!segment.file) {
        console.warn(`Segment ${segment.id} has no file, skipping`);
        continue;
      }

      // Update status to processing
      setProcessedSegments(prev => 
        prev.map((s, idx) => 
          idx === i 
            ? { ...s, processingStatus: 'processing', processingProgress: 0 }
            : s
        )
      );

      try {
        const startTime = Date.now();
        
        const request: VideoSegmentAnalysisRequest = {
          segmentFile: segment.file,
          segmentMetadata: {
            id: segment.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.duration,
            fileName: segment.fileName || `segment_${i + 1}.mp4`,
          },
          analysisOptions: {
            enableObjectDetection: serviceConfig.enableObjectDetection,
            enablePlayerTracking: serviceConfig.enablePlayerTracking,
            enableBallTracking: serviceConfig.enableBallTracking,
            confidence_threshold: serviceConfig.confidenceThreshold,
          },
        };

        const aiResult = await aiComputeService.analyzeVideoSegment(request);
        const processingTime = Date.now() - startTime;
        
        // Convert AI result to app format
        const analysisResult = convertToAnalysisResults(aiResult);
        allResults.push(analysisResult);

        // Update segment status
        setProcessedSegments(prev => 
          prev.map((s, idx) => 
            idx === i 
              ? { 
                  ...s, 
                  processingStatus: 'completed', 
                  processingProgress: 100,
                  processingTime 
                }
              : s
          )
        );

        completedCount++;
        setOverallProgress((completedCount / processedSegments.length) * 100);

        toast.success(`Segment ${i + 1} analyzed successfully (${(processingTime / 1000).toFixed(1)}s)`);

      } catch (error: any) {
        console.error(`Error processing segment ${segment.id}:`, error);
        
        setProcessedSegments(prev => 
          prev.map((s, idx) => 
            idx === i 
              ? { 
                  ...s, 
                  processingStatus: 'error', 
                  processingProgress: 0,
                  error: error.message 
                }
              : s
          )
        );

        toast.error(`Failed to process segment ${i + 1}: ${error.message}`);
      }
    }

    setProcessing(false);
    
    if (allResults.length > 0) {
      onAnalysisComplete(allResults);
      toast.success(`Analysis complete! Processed ${allResults.length} segments.`);
    }
  }, [processedSegments, serviceOnline, serviceConfig, onAnalysisComplete]);

  const getStatusIcon = (status: ProcessingSegment['processingStatus']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'processing': return <Zap className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: ProcessingSegment['processingStatus']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
    }
  };

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No video segments available for AI analysis.</p>
          <p className="text-sm text-gray-400">Please split your video first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Compute Service Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="process" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="process">Process</TabsTrigger>
            <TabsTrigger value="config">Configure</TabsTrigger>
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="service-url">AI Service URL</Label>
                <Input
                  id="service-url"
                  value={serviceConfig.serviceUrl}
                  onChange={(e) => setServiceConfig(prev => ({ ...prev, serviceUrl: e.target.value }))}
                  placeholder="http://your-ai-service.com:8000"
                  disabled={processing}
                />
              </div>

              <div>
                <Label htmlFor="api-key">API Key (optional)</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={serviceConfig.apiKey}
                  onChange={(e) => setServiceConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Your API key"
                  disabled={processing}
                />
              </div>

              <div className="space-y-3">
                <Label>Analysis Options</Label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Object Detection</span>
                  <Switch
                    checked={serviceConfig.enableObjectDetection}
                    onCheckedChange={(checked) => 
                      setServiceConfig(prev => ({ ...prev, enableObjectDetection: checked }))
                    }
                    disabled={processing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Player Tracking</span>
                  <Switch
                    checked={serviceConfig.enablePlayerTracking}
                    onCheckedChange={(checked) => 
                      setServiceConfig(prev => ({ ...prev, enablePlayerTracking: checked }))
                    }
                    disabled={processing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Ball Tracking</span>
                  <Switch
                    checked={serviceConfig.enableBallTracking}
                    onCheckedChange={(checked) => 
                      setServiceConfig(prev => ({ ...prev, enableBallTracking: checked }))
                    }
                    disabled={processing}
                  />
                </div>

                <div>
                  <Label htmlFor="confidence">Confidence Threshold</Label>
                  <Input
                    id="confidence"
                    type="number"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={serviceConfig.confidenceThreshold}
                    onChange={(e) => 
                      setServiceConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) || 0.5 }))
                    }
                    disabled={processing}
                  />
                </div>
              </div>

              <Button onClick={checkServiceHealth} disabled={processing} className="w-full">
                <Monitor className="h-4 w-4 mr-2" />
                Test Connection
              </Button>

              {serviceOnline !== null && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Service Status: {serviceOnline ? 'Online ✅' : 'Offline ❌'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Ready to analyze {processedSegments.length} video segments
              </p>
              <Button
                onClick={processSegments}
                disabled={processing || serviceOnline === false}
                className="flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>

            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="w-full" />
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {processedSegments.map((segment, index) => (
                <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(segment.processingStatus)}
                    <div>
                      <p className="text-sm font-medium">
                        Segment {index + 1} ({segment.duration}s)
                      </p>
                      {segment.processingTime && (
                        <p className="text-xs text-gray-500">
                          Processed in {(segment.processingTime / 1000).toFixed(1)}s
                        </p>
                      )}
                      {segment.error && (
                        <p className="text-xs text-red-500">{segment.error}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(segment.processingStatus)}>
                    {segment.processingStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm">Total Segments</h3>
                  <p className="text-2xl font-bold text-blue-600">{processedSegments.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm">Completed</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {processedSegments.filter(s => s.processingStatus === 'completed').length}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm">Failed</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {processedSegments.filter(s => s.processingStatus === 'error').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {processedSegments.some(s => s.processingTime) && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm mb-2">Performance Metrics</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      Average processing time: {' '}
                      {(processedSegments
                        .filter(s => s.processingTime)
                        .reduce((acc, s) => acc + (s.processingTime || 0), 0) / 
                        processedSegments.filter(s => s.processingTime).length / 1000
                      ).toFixed(1)}s per segment
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIComputeIntegration;
