
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Upload, Brain, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Settings, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { VideoSegment, AnalysisResults, AnalysisJob, ApiKeyInfo } from '@/types';
import { formatTime } from '@/utils/formatters';
import { processSegmentWithColabAPI, checkApiKeyStatusAPI } from '@/services/apiService';

interface ColabIntegrationProps {
  segments: VideoSegment[];
  onAnalysisComplete: (allResults: AnalysisResults[]) => void;
}

const ColabIntegration: React.FC<ColabIntegrationProps> = ({ segments, onAnalysisComplete }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [isProcessingOverall, setIsProcessingOverall] = useState(false);
  const [colabNotebookUrl, setColabNotebookUrl] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('setup');
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyInfo | null>(null);

  useEffect(() => {
    const fetchKeyStatus = async () => {
        try {
            const status = await checkApiKeyStatusAPI();
            setApiKeyStatus(status);
        } catch (error) {
            console.error("Failed to fetch API key status:", error);
            toast.error("Could not verify AI processing API key status.");
            setApiKeyStatus({ hasYouTubeApiKey: false, hasGoogleColabApiKey: false });
        }
    };
    fetchKeyStatus();
  }, []);

  useEffect(() => {
    // Initialize jobs when segments change
    const initialJobs: AnalysisJob[] = segments.map(segment => ({
      id: segment.id,
      segmentId: segment.id,
      status: 'queued',
      progress: 0,
    }));
    setJobs(initialJobs);
    setOverallProgress(0);
    setIsProcessingOverall(false);
  }, [segments]);

  const handleStartProcessing = async () => {
    if (!apiKeyStatus?.hasGoogleColabApiKey) {
        toast.error('AI Processing is not available. Please check App Settings or contact support.');
        return;
    }
    if (jobs.length === 0) {
      toast.error('No segments to process.');
      return;
    }

    setIsProcessingOverall(true);
    setOverallProgress(0);
    setActiveTab('processing');

    const allResults: AnalysisResults[] = [];
    const updatedJobs = [...jobs];

    for (let i = 0; i < updatedJobs.length; i++) {
      const job = updatedJobs[i];
      const segment = segments.find(s => s.id === job.segmentId);

      if (!segment || job.status === 'completed') continue;

      updatedJobs[i] = { ...job, status: 'processing', progress: 0 };
      setJobs([...updatedJobs]);

      try {
        // Simulate progress for individual job
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
            currentProgress = Math.min(currentProgress + 10, 95);
            updatedJobs[i] = { ...updatedJobs[i], progress: currentProgress };
            setJobs([...updatedJobs]);
        }, (segment.duration * 150) / 10);

        const result = await processSegmentWithColabAPI(segment, colabNotebookUrl);
        
        clearInterval(progressInterval);
        updatedJobs[i] = { ...job, status: 'completed', progress: 100, results: result };
        allResults.push(result);
      } catch (error: any) {
        updatedJobs[i] = { ...job, status: 'failed', progress: 0, error: error.message || 'Processing failed' };
        toast.error(`Failed to process segment ${i + 1}: ${error.message}`);
      }
      setJobs([...updatedJobs]);
      setOverallProgress(((i + 1) / updatedJobs.length) * 100);
    }

    onAnalysisComplete(allResults);
    setIsProcessingOverall(false);
    if (allResults.length === updatedJobs.length) {
      toast.success('All segments processed successfully!');
      setActiveTab('results');
    } else {
      toast.warning('Some segments failed to process. Check status.');
       setActiveTab('results');
    }
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
  
  const completedJobCount = jobs.filter(j => j.status === 'completed').length;
  const failedJobCount = jobs.filter(j => j.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600" />
            AI Video Analysis
          </div>
           <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            App Settings
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {apiKeyStatus && !apiKeyStatus.hasGoogleColabApiKey && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded border border-yellow-200">
            <Key className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">AI Processing Functionality Limited</p>
              <p>The application's AI video analysis may be limited or unavailable. Please check App Settings or contact support.</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" disabled={isProcessingOverall}>Setup</TabsTrigger>
            <TabsTrigger value="processing">Processing Status</TabsTrigger>
            <TabsTrigger value="results">View Results</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 pt-4">
            <p className="text-sm text-gray-700">
              Ready to process <span className="font-semibold">{segments.length}</span> video segment(s).
            </p>
            <Button 
                onClick={handleStartProcessing} 
                disabled={isProcessingOverall || segments.length === 0 || !apiKeyStatus?.hasGoogleColabApiKey}
                className="w-full"
            >
              {isProcessingOverall ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Start Analysis on {segments.length} Segment(s)
            </Button>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4 pt-4">
            {jobs.length === 0 && !isProcessingOverall && (
                <p className="text-center text-gray-500 py-4">No segments are currently being processed.</p>
            )}
            {isProcessingOverall && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="w-full" />
              </div>
            )}
            <div className="max-h-72 overflow-y-auto space-y-2 border rounded p-2">
              {jobs.map((job, index) => {
                const segment = segments.find(s => s.id === job.segmentId);
                return (
                  <div key={job.id} className="flex items-center justify-between p-2 border rounded-lg bg-white">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="text-sm font-medium">
                          Segment {index + 1} 
                          {segment && ` (${formatTime(segment.startTime)}-${formatTime(segment.endTime)})`}
                        </p>
                        {job.status === 'processing' && <p className="text-xs text-gray-500">Progress: {job.progress}%</p>}
                        {job.error && <p className="text-xs text-red-500 truncate" title={job.error}>Error: {job.error}</p>}
                      </div>
                    </div>
                    <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                  </div>
                );
              })}
            </div>
             <div className="text-xs text-gray-600">
                Completed: {completedJobCount} | Failed: {failedJobCount} | Total: {jobs.length}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4 pt-4">
            {completedJobCount === 0 && !isProcessingOverall && (
                <div className="text-center py-8 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No analysis results available yet.</p>
                    <p className="text-sm">Process video segments to see results here.</p>
                </div>
            )}
            {completedJobCount > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium">Analysis Summary</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-2xl font-bold text-green-600">{completedJobCount}</p>
                            <p className="text-sm text-green-800">Segments Analyzed</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-2xl font-bold text-blue-600">
                            {jobs.reduce((sum, job) => sum + (job.results?.events?.length || 0), 0)}
                            </p>
                            <p className="text-sm text-blue-800">Total Events Detected</p>
                        </div>
                    </div>
                    <h4 className="font-medium pt-2">Detailed Segment Results</h4>
                    <div className="max-h-72 overflow-y-auto space-y-2 border rounded p-2">
                    {jobs.filter(job => job.status === 'completed' && job.results).map((job) => {
                        const segment = segments.find(s => s.id === job.segmentId);
                        return(
                        <div key={job.id} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">
                                Segment {segments.findIndex(s => s.id === job.segmentId) + 1}
                                {segment && ` (${formatTime(segment.startTime)}-${formatTime(segment.endTime)})`}
                            </span>
                            <Badge variant="secondary">{job.results?.events?.length || 0} events</Badge>
                            </div>
                            {job.results?.statistics && (
                            <div className="text-xs text-gray-600 space-y-0.5">
                                {job.results.statistics.ballPossession &&
                                <p>Possession: Home {job.results.statistics.ballPossession.home.toFixed(1)}% - Away {job.results.statistics.ballPossession.away.toFixed(1)}%</p>}
                                {job.results.statistics.passes &&
                                <p>Passes: {job.results.statistics.passes.successful}/{job.results.statistics.passes.total}</p>}
                            </div>
                            )}
                        </div>
                        );
                    })}
                    </div>
                </div>
            )}
          </TabsContent>
        </Tabs>
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800">
                <p className="font-medium">AI Processing Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                <li>AI analysis is computationally intensive and performed on our backend servers.</li>
                <li>Results depend on the quality of the video and the AI model's capabilities.</li>
                <li>Processing times can vary based on segment length and server load.</li>
                </ul>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColabIntegration;
