
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, ExternalLink, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file?: File;
}

interface ColabJob {
  id: string;
  segmentId: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  results?: any;
  colabUrl?: string;
}

interface ColabIntegrationProps {
  segments: VideoSegment[];
  onAnalysisComplete: (results: any[]) => void;
}

const ColabIntegration: React.FC<ColabIntegrationProps> = ({ 
  segments, 
  onAnalysisComplete 
}) => {
  const [colabNotebookUrl, setColabNotebookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [jobs, setJobs] = useState<ColabJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const validateColabUrl = (url: string): boolean => {
    return url.includes('colab.research.google.com') && url.includes('github');
  };

  const startColabProcessing = async () => {
    if (!colabNotebookUrl) {
      toast.error('Please provide your Colab notebook URL');
      return;
    }

    if (!validateColabUrl(colabNotebookUrl)) {
      toast.error('Please provide a valid Google Colab notebook URL');
      return;
    }

    if (segments.filter(s => s.status === 'completed').length === 0) {
      toast.error('No processed video segments available');
      return;
    }

    setProcessing(true);
    setOverallProgress(0);

    const completedSegments = segments.filter(s => s.status === 'completed');
    const newJobs: ColabJob[] = completedSegments.map(segment => ({
      id: `job-${segment.id}`,
      segmentId: segment.id,
      status: 'uploading',
      progress: 0,
      colabUrl: colabNotebookUrl
    }));

    setJobs(newJobs);

    try {
      for (let i = 0; i < newJobs.length; i++) {
        const job = newJobs[i];
        const segment = completedSegments[i];

        // Simulate upload process
        job.status = 'uploading';
        setJobs([...newJobs]);

        for (let uploadProgress = 0; uploadProgress <= 100; uploadProgress += 10) {
          job.progress = uploadProgress;
          setJobs([...newJobs]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Simulate processing in Colab
        job.status = 'processing';
        job.progress = 0;
        setJobs([...newJobs]);

        for (let processProgress = 0; processProgress <= 100; processProgress += 5) {
          job.progress = processProgress;
          setJobs([...newJobs]);
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Mock analysis results
        job.status = 'completed';
        job.results = {
          events: [
            { type: 'goal', timestamp: segment.startTime + 120, confidence: 0.95 },
            { type: 'pass', timestamp: segment.startTime + 45, confidence: 0.88 }
          ],
          statistics: {
            ballPossession: { home: 55, away: 45 },
            passes: { successful: 45, total: 52 }
          },
          heatmap: `heatmap_data_segment_${i + 1}`,
          playerTracking: `tracking_data_segment_${i + 1}`
        };
        setJobs([...newJobs]);

        const progress = ((i + 1) / newJobs.length) * 100;
        setOverallProgress(progress);
      }

      // Combine all results
      const allResults = newJobs.map(job => job.results).filter(Boolean);
      onAnalysisComplete(allResults);
      toast.success('All video segments processed successfully in Colab');

    } catch (error) {
      console.error('Error processing in Colab:', error);
      toast.error('Failed to process videos in Colab');
    } finally {
      setProcessing(false);
    }
  };

  const retryFailedJob = async (jobId: string) => {
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;

    const updatedJobs = [...jobs];
    updatedJobs[jobIndex].status = 'uploading';
    updatedJobs[jobIndex].progress = 0;
    setJobs(updatedJobs);

    // Simulate retry process
    await new Promise(resolve => setTimeout(resolve, 2000));
    updatedJobs[jobIndex].status = 'completed';
    updatedJobs[jobIndex].progress = 100;
    setJobs(updatedJobs);
    
    toast.success('Job retried successfully');
  };

  const openColabNotebook = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusColor = (status: ColabJob['status']) => {
    switch (status) {
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedSegments = segments.filter(s => s.status === 'completed');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-orange-600" />
          Google Colab Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Make sure your Google Colab notebook is set up to receive video files and has your soccer analytics pipeline ready.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="colab-url">Colab Notebook URL</Label>
            <Input
              id="colab-url"
              type="url"
              placeholder="https://colab.research.google.com/github/..."
              value={colabNotebookUrl}
              onChange={(e) => setColabNotebookUrl(e.target.value)}
            />
            <p className="text-xs text-gray-600">
              Link to your Google Colab notebook with the soccer analytics pipeline
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Colab API Key (Optional)</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Your Google API key for authentication"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Ready for Processing</p>
            <p className="text-xs text-gray-600">
              {completedSegments.length} video segments prepared
            </p>
          </div>
          <Button 
            onClick={startColabProcessing}
            disabled={processing || completedSegments.length === 0 || !colabNotebookUrl}
          >
            <Upload className="h-4 w-4 mr-2" />
            {processing ? 'Processing...' : 'Start Colab Processing'}
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

        {jobs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Processing Jobs</h4>
              <div className="text-xs text-gray-600">
                {completedJobs.length} / {jobs.length} completed
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {jobs.map((job, index) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-sm font-mono">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Segment {job.segmentId}</span>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      {(job.status === 'uploading' || job.status === 'processing') && (
                        <div className="mt-1">
                          <Progress value={job.progress} className="w-full h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryFailedJob(job.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    {job.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {colabNotebookUrl && (
          <Button
            variant="outline"
            onClick={() => openColabNotebook(colabNotebookUrl)}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Colab Notebook
          </Button>
        )}

        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Setup Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure your Colab notebook has the necessary dependencies installed</li>
              <li>Set up file upload endpoints to receive video segments</li>
              <li>Configure your analytics pipeline to process uploaded videos</li>
              <li>Return results in the expected JSON format</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColabIntegration;
