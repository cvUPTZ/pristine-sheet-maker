// src/components/VideoAnalysisWorkflow.tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { VideoJobMonitor } from './VideoJobMonitor';
import { Loader2, Upload, Youtube } from 'lucide-react';
import { toast } from 'sonner';

export const VideoAnalysisWorkflow: React.FC = () => {
  const { jobs, loading, submitting, submitJob, deleteJob, updateJob } = useVideoJobs();
  const [activeTab, setActiveTab] = useState('submit');

  // State for the submission form
  const [sourceType, setSourceType] = useState<'upload' | 'youtube'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [segmentDuration, setSegmentDuration] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let jobSource;
    if (sourceType === 'upload') {
      if (!selectedFile) { toast.error("Please select a file."); return; }
      jobSource = { type: 'upload' as const, file: selectedFile };
    } else {
      if (!youtubeUrl) { toast.error("Please enter a YouTube URL."); return; }
      jobSource = { type: 'youtube' as const, url: youtubeUrl };
    }
    
    const jobConfig = {
      title: title || (selectedFile?.name ?? 'YouTube Video'),
      segmentDuration: segmentDuration,
    };
    
    const newJob = await submitJob(jobSource, jobConfig);
    if (newJob) {
      setActiveTab('monitor');
      // Reset form
      setSelectedFile(null);
      setYoutubeUrl('');
      setTitle('');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit">1. Submit Job</TabsTrigger>
          <TabsTrigger value="monitor">2. Monitor Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Submit New Analysis Job</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="upload" onValueChange={(v) => setSourceType(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2"/>Upload File</TabsTrigger>
                    <TabsTrigger value="youtube"><Youtube className="h-4 w-4 mr-2"/>YouTube URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="pt-4">
                    <Label htmlFor="video-file">Video File</Label>
                    <Input id="video-file" type="file" accept="video/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                  </TabsContent>
                  <TabsContent value="youtube" className="pt-4">
                    <Label htmlFor="youtube-url">YouTube Video URL</Label>
                    <Input id="youtube-url" type="url" placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
                  </TabsContent>
                </Tabs>
                
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" placeholder="e.g., 'Game Highlights Q1'" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                
                <div>
                  <Label htmlFor="segment">Segment Duration (in seconds)</Label>
                  <Input id="segment" type="number" placeholder="Enter 0 to process the full video" value={segmentDuration} onChange={e => setSegmentDuration(Number(e.target.value) || 0)} />
                  <p className="text-xs text-gray-500 mt-1">Enter 0 or leave empty to analyze the full video without splitting.</p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Upload className="h-4 w-4 mr-2" />}
                  Submit Job
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <div className="space-y-4">
            {loading ? (
              <p>Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No jobs found.</div>
            ) : (
              jobs.map((job) => (
                <VideoJobMonitor key={job.id} job={job} onJobUpdate={updateJob} onJobDelete={deleteJob} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};