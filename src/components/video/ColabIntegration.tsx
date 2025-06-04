
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, Upload, Brain, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: string;
  file?: File;
}

interface AnalysisJob {
  id: string;
  segmentId: string;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: any;
  error?: string;
  colabUrl?: string;
}

interface AnalysisResults {
  events: any[];
  statistics: any;
  heatmap: string;
  playerTracking: string;
}

interface ColabIntegrationProps {
  segments: VideoSegment[];
  onAnalysisComplete: (results: AnalysisResults[]) => void;
}

const ColabIntegration: React.FC<ColabIntegrationProps> = ({ segments, onAnalysisComplete }) => {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const [colabNotebookUrl, setColabNotebookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [batchSize, setBatchSize] = useState(3);
  const [processingMode, setProcessingMode] = useState<'sequential' | 'parallel'>('parallel');
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);

  useEffect(() => {
    // Initialize jobs from segments
    const initialJobs = segments.map(segment => ({
      id: `job-${segment.id}`,
      segmentId: segment.id,
      status: 'queued' as const,
      progress: 0
    }));
    setJobs(initialJobs);
  }, [segments]);

  const validateColabUrl = (url: string): boolean => {
    return url.includes('colab.research.google.com') && url.includes('/notebooks/');
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadSegmentToColab = async (segment: VideoSegment, jobId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const uploadDuration = Math.max(2000, segment.duration * 50); // Minimum 2 seconds
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        
        setJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { ...job, progress: Math.min(progress, 95) }
            : job
        ));
        
        if (progress >= 95) {
          clearInterval(interval);
          
          // Simulate successful upload
          setTimeout(() => {
            setJobs(prev => prev.map(job => 
              job.id === jobId 
                ? { 
                    ...job, 
                    status: 'processing',
                    progress: 100,
                    colabUrl: `${colabNotebookUrl}#cell=${Math.floor(Math.random() * 10)}`
                  }
                : job
            ));
            
            resolve({
              uploadId: `upload-${Date.now()}`,
              colabPath: `/content/segments/${segment.file?.name}`,
              estimatedProcessingTime: segment.duration * 2
            });
          }, 500);
        }
      }, uploadDuration / 20);
    });
  };

  const processSegmentInColab = async (segment: VideoSegment, jobId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const processingDuration = Math.max(3000, segment.duration * 100);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        
        setJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { ...job, progress: Math.min(progress, 95) }
            : job
        ));
        
        if (progress >= 95) {
          clearInterval(interval);
          
          setTimeout(() => {
            const mockResults = {
              events: [
                { type: 'pass', timestamp: segment.startTime + Math.random() * segment.duration, confidence: 0.85 + Math.random() * 0.15 },
                { type: 'shot', timestamp: segment.startTime + Math.random() * segment.duration, confidence: 0.75 + Math.random() * 0.25 },
                { type: 'tackle', timestamp: segment.startTime + Math.random() * segment.duration, confidence: 0.65 + Math.random() * 0.35 }
              ],
              statistics: {
                ballPossession: {
                  home: 45 + Math.random() * 20,
                  away: 35 + Math.random() * 20
                },
                passes: {
                  successful: Math.floor(Math.random() * 50 + 20),
                  total: Math.floor(Math.random() * 70 + 40)
                },
                shots: Math.floor(Math.random() * 5 + 1)
              },
              heatmap: `data:image/png;base64,mockHeatmapData${Date.now()}`,
              playerTracking: `data:json;base64,mockTrackingData${Date.now()}`
            };
            
            setJobs(prev => prev.map(job => 
              job.id === jobId 
                ? { 
                    ...job, 
                    status: 'completed',
                    progress: 100,
                    results: mockResults
                  }
                : job
            ));
            
            resolve(mockResults);
          }, 1000);
        }
      }, processingDuration / 20);
    });
  };

  const processBatch = async (batch: AnalysisJob[]) => {
    const batchPromises = batch.map(async (job) => {
      const segment = segments.find(s => s.id === job.segmentId);
      if (!segment) return;

      try {
        // Update job status to uploading
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'uploading' } : j
        ));

        // Upload segment to Colab
        await uploadSegmentToColab(segment, job.id);
        
        // Process in Colab
        const results = await processSegmentInColab(segment, job.id);
        
        return results;
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        setJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { ...j, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
            : j
        ));
        throw error;
      }
    });

    return Promise.allSettled(batchPromises);
  };

  const startProcessing = async () => {
    if (!colabNotebookUrl) {
      toast.error('Please provide a valid Google Colab notebook URL');
      return;
    }

    if (!validateColabUrl(colabNotebookUrl)) {
      toast.error('Please provide a valid Google Colab notebook URL');
      return;
    }

    if (jobs.length === 0) {
      toast.error('No video segments to process');
      return;
    }

    setProcessing(true);
    setCurrentBatch(0);
    setTotalProgress(0);

    try {
      const allResults: AnalysisResults[] = [];
      
      if (processingMode === 'sequential') {
        // Process one at a time
        for (let i = 0; i < jobs.length; i++) {
          setCurrentBatch(i + 1);
          await processBatch([jobs[i]]);
          setTotalProgress(((i + 1) / jobs.length) * 100);
        }
      } else {
        // Process in batches
        const batches = [];
        for (let i = 0; i < jobs.length; i += batchSize) {
          batches.push(jobs.slice(i, i + batchSize));
        }

        for (let i = 0; i < batches.length; i++) {
          setCurrentBatch(i + 1);
          await processBatch(batches[i]);
          setTotalProgress(((i + 1) / batches.length) * 100);
        }
      }

      // Collect all results
      const completedJobs = jobs.filter(job => job.status === 'completed' && job.results);
      const results = completedJobs.map(job => job.results);
      
      onAnalysisComplete(results);
      toast.success(`Successfully processed ${completedJobs.length} video segments!`);
      
    } catch (error) {
      console.error('Error during batch processing:', error);
      toast.error('Some segments failed to process. Check individual segment status.');
    } finally {
      setProcessing(false);
    }
  };

  const retryFailedJobs = async () => {
    const failedJobs = jobs.filter(job => job.status === 'failed');
    if (failedJobs.length === 0) {
      toast.info('No failed jobs to retry');
      return;
    }

    // Reset failed jobs to queued
    setJobs(prev => prev.map(job => 
      job.status === 'failed' 
        ? { ...job, status: 'queued', progress: 0, error: undefined }
        : job
    ));

    toast.info(`Retrying ${failedJobs.length} failed jobs...`);
  };

  const getStatusIcon = (status: AnalysisJob['status']) => {
    switch (status) {
      case 'queued': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'uploading': return <Upload className="h-4 w-4 text-blue-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AnalysisJob['status']) => {
    switch (status) {
      case 'queued': return 'bg-gray-100 text-gray-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const failedJobs = jobs.filter(job => job.status === 'failed').length;
  const totalJobs = jobs.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          Google Colab Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="colab-url">Google Colab Notebook URL</Label>
                <Input
                  id="colab-url"
                  type="url"
                  placeholder="https://colab.research.google.com/drive/your-notebook-id"
                  value={colabNotebookUrl}
                  onChange={(e) => setColabNotebookUrl(e.target.value)}
                  disabled={processing}
                />
                <p className="text-xs text-gray-600">
                  Make sure your Colab notebook is set to accept file uploads and has the soccer analysis model loaded
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Processing Mode</Label>
                  <select 
                    value={processingMode} 
                    onChange={(e) => setProcessingMode(e.target.value as 'sequential' | 'parallel')}
                    className="w-full p-2 border rounded"
                    disabled={processing}
                  >
                    <option value="parallel">Parallel (Faster)</option>
                    <option value="sequential">Sequential (Safer)</option>
                  </select>
                </div>
                
                {processingMode === 'parallel' && (
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value))}
                      disabled={processing}
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">Ready to process:</p>
                <p className="text-sm text-blue-700">
                  {totalJobs} video segments • Estimated processing time: {Math.ceil(totalJobs * 2 / (processingMode === 'parallel' ? batchSize : 1))} minutes
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={startProcessing}
                disabled={processing || !colabNotebookUrl || totalJobs === 0}
                className="flex-1"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {processing ? 'Processing...' : `Process ${totalJobs} Segments`}
              </Button>
              
              {failedJobs > 0 && !processing && (
                <Button onClick={retryFailedJobs} variant="outline">
                  Retry Failed ({failedJobs})
                </Button>
              )}
            </div>

            {processing && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>
                    {processingMode === 'parallel' 
                      ? `Processing batch ${currentBatch} of ${Math.ceil(totalJobs / batchSize)}`
                      : `Processing segment ${currentBatch} of ${totalJobs}`
                    }
                  </span>
                  <span>{Math.round(totalProgress)}%</span>
                </div>
                <Progress value={totalProgress} className="w-full" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Processing Status</h4>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600">✓ {completedJobs}</span>
                  <span className="text-red-600">✗ {failedJobs}</span>
                  <span className="text-gray-600">Total: {totalJobs}</span>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-2">
                {jobs.map((job, index) => {
                  const segment = segments.find(s => s.id === job.segmentId);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <div className="text-sm font-medium">
                            Segment {index + 1}
                            {segment && ` (${formatTime(segment.startTime)} - ${formatTime(segment.endTime)})`}
                          </div>
                          {job.status === 'processing' && (
                            <div className="text-xs text-gray-600">
                              Progress: {Math.round(job.progress)}%
                            </div>
                          )}
                          {job.error && (
                            <div className="text-xs text-red-600">
                              Error: {job.error}
                            </div>
                          )}
                          {job.colabUrl && job.status !== 'failed' && (
                            <a 
                              href={job.colabUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              View in Colab <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {completedJobs > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{completedJobs}</div>
                    <div className="text-sm text-green-800">Segments Completed</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {jobs.filter(j => j.results?.events).reduce((sum, j) => sum + j.results.events.length, 0)}
                    </div>
                    <div className="text-sm text-blue-800">Events Detected</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(jobs.filter(j => j.results?.statistics?.ballPossession).reduce((sum, j) => sum + j.results.statistics.ballPossession.home, 0) / completedJobs)}%
                    </div>
                    <div className="text-sm text-purple-800">Avg. Home Possession</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Segment Analysis Results</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {jobs.filter(job => job.status === 'completed').map((job, index) => {
                      const segment = segments.find(s => s.id === job.segmentId);
                      return (
                        <div key={job.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">
                              Segment {index + 1}
                              {segment && ` (${formatTime(segment.startTime)} - ${formatTime(segment.endTime)})`}
                            </span>
                            <Badge variant="secondary">
                              {job.results?.events?.length || 0} events
                            </Badge>
                          </div>
                          {job.results?.statistics && (
                            <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                              <span>Possession: {Math.round(job.results.statistics.ballPossession?.home || 0)}% - {Math.round(job.results.statistics.ballPossession?.away || 0)}%</span>
                              <span>Passes: {job.results.statistics.passes?.successful || 0}/{job.results.statistics.passes?.total || 0}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No analysis results yet</p>
                <p className="text-sm">Process video segments to see results here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-medium">Google Colab Requirements:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Ensure your Colab runtime has sufficient GPU allocation</li>
              <li>Your notebook should accept file uploads via API</li>
              <li>Install required soccer analysis libraries in your environment</li>
              <li>Set appropriate timeout limits for long video processing</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColabIntegration;
