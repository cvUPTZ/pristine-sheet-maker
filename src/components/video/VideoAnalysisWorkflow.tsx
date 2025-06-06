
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoJobSubmitter } from './VideoJobSubmitter';
import { VideoJobMonitor } from './VideoJobMonitor';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { VideoJob } from '@/services/videoJobService';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const VideoAnalysisWorkflow: React.FC = () => {
  const { jobs, loading, updateJob, deleteJob } = useVideoJobs();
  const [selectedTab, setSelectedTab] = useState('submit');

  const handleJobSubmitted = (jobId: string) => {
    setSelectedTab('monitor');
  };

  const handleViewResults = (job: VideoJob) => {
    // TODO: Implement results viewer
    console.log('View results for job:', job);
  };

  const getJobCounts = () => {
    const pending = jobs.filter(job => job.status === 'pending').length;
    const processing = jobs.filter(job => job.status === 'processing').length;
    const completed = jobs.filter(job => job.status === 'completed').length;
    const failed = jobs.filter(job => job.status === 'failed').length;
    
    return { pending, processing, completed, failed };
  };

  const counts = getJobCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading video jobs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit">Submit Video</TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            Monitor Jobs
            {(counts.pending + counts.processing) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {counts.pending + counts.processing}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-6">
          <VideoJobSubmitter onJobSubmitted={handleJobSubmitted} />
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No video analysis jobs yet. Submit a video to get started!
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  {counts.pending > 0 && (
                    <Badge variant="outline" className="bg-yellow-50">
                      {counts.pending} Pending
                    </Badge>
                  )}
                  {counts.processing > 0 && (
                    <Badge variant="outline" className="bg-blue-50">
                      {counts.processing} Processing
                    </Badge>
                  )}
                  {counts.completed > 0 && (
                    <Badge variant="outline" className="bg-green-50">
                      {counts.completed} Completed
                    </Badge>
                  )}
                  {counts.failed > 0 && (
                    <Badge variant="outline" className="bg-red-50">
                      {counts.failed} Failed
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4">
                  {jobs.map((job) => (
                    <VideoJobMonitor
                      key={job.id}
                      job={job}
                      onJobUpdate={updateJob}
                      onJobDelete={deleteJob}
                      onViewResults={handleViewResults}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VideoAnalysisWorkflow;
