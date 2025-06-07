
import { supabase } from '@/integrations/supabase/client';
import { VideoJob } from './videoJobService';

export interface WorkerStatus {
  isRunning: boolean;
  currentJob?: string;
  processedJobs: number;
  lastActivity: string;
}

export class ColabWorkerService {
  private static isRunning = false;
  private static processedJobs = 0;

  // Simulate the worker loop (this would be the Python script in Colab)
  static async startWorkerLoop(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting Colab worker simulation...');

    while (this.isRunning) {
      try {
        // Step 1: Look for pending jobs
        const pendingJob = await this.getOldestPendingJob();
        
        if (pendingJob) {
          // Step 2: Claim the job
          await this.claimJob(pendingJob.id);
          
          // Step 3: Process the job
          await this.processJob(pendingJob);
          
          this.processedJobs++;
        } else {
          // No jobs available, wait before checking again
          await this.sleep(5000); // 5 seconds
        }
      } catch (error) {
        console.error('Worker error:', error);
        await this.sleep(10000); // Wait 10 seconds on error
      }
    }
  }

  // Stop the worker loop
  static stopWorkerLoop(): void {
    this.isRunning = false;
    console.log('Stopping Colab worker...');
  }

  // Get worker status
  static getWorkerStatus(): WorkerStatus {
    return {
      isRunning: this.isRunning,
      processedJobs: this.processedJobs,
      lastActivity: new Date().toISOString()
    };
  }

  // Get oldest pending job from database
  private static async getOldestPendingJob(): Promise<VideoJob | null> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to fetch pending job: ${error.message}`);
    }

    return data as VideoJob | null;
  }

  // Claim a job by updating its status to 'processing'
  private static async claimJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('video_jobs')
      .update({ 
        status: 'processing',
        progress: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to claim job: ${error.message}`);
    }

    console.log(`Claimed job: ${jobId}`);
  }

  // Process a job (simulate the heavy AI processing)
  private static async processJob(job: VideoJob): Promise<void> {
    console.log(`Processing job: ${job.id}`);

    try {
      // Step 1: Download video from Supabase Storage
      await this.updateJobProgress(job.id, 10, 'Downloading video...');
      const videoBlob = await this.downloadVideoFromStorage(job.input_video_path);
      
      // Step 2: Initialize AI models
      await this.updateJobProgress(job.id, 20, 'Loading AI models...');
      await this.sleep(2000); // Simulate model loading
      
      // Step 3: Process video frames
      await this.updateJobProgress(job.id, 30, 'Analyzing video frames...');
      const analysisResult = await this.performVideoAnalysis(videoBlob, job);
      
      // Step 4: Generate results
      await this.updateJobProgress(job.id, 90, 'Generating results...');
      await this.sleep(1000);
      
      // Step 5: Complete job
      await this.completeJob(job.id, analysisResult);
      
      console.log(`Completed job: ${job.id}`);
      
    } catch (error: any) {
      console.error(`Job processing failed: ${error.message}`);
      await this.failJob(job.id, error.message);
    }
  }

  // Download video from Supabase Storage
  private static async downloadVideoFromStorage(videoPath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('videos')
      .download(videoPath);

    if (error) {
      throw new Error(`Failed to download video: ${error.message}`);
    }

    return data;
  }

  // Simulate AI video analysis
  private static async performVideoAnalysis(videoBlob: Blob, job: VideoJob): Promise<any> {
    // Simulate processing time based on video duration
    const processingTime = Math.min((job.video_duration || 60) * 100, 30000); // Max 30 seconds
    const steps = 10;
    const stepTime = processingTime / steps;

    for (let i = 0; i < steps; i++) {
      await this.sleep(stepTime);
      const progress = 30 + (i + 1) * 6; // Progress from 30% to 90%
      await this.updateJobProgress(job.id, progress, `Processing frame batch ${i + 1}/${steps}...`);
    }

    // Generate mock analysis results
    return {
      events: [
        { type: 'goal', timestamp: 1200, confidence: 0.95, team: 'home' },
        { type: 'pass', timestamp: 300, confidence: 0.87, team: 'away' },
        { type: 'tackle', timestamp: 1800, confidence: 0.82, team: 'home' }
      ],
      statistics: {
        ballPossession: { home: 55.2, away: 44.8 },
        passes: { successful: 342, attempted: 401 },
        shots: 8,
        fouls: 12
      },
      trackingData: [
        {
          timestamp: 0,
          players: [
            { id: 'p1', x: 50, y: 30, team: 'home' },
            { id: 'p2', x: 60, y: 40, team: 'away' }
          ],
          ball: { x: 55, y: 35 }
        }
      ]
    };
  }

  // Update job progress
  private static async updateJobProgress(jobId: string, progress: number, message?: string): Promise<void> {
    const { error } = await supabase
      .from('video_jobs')
      .update({ 
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to update job progress: ${error.message}`);
    }
  }

  // Complete a job successfully
  private static async completeJob(jobId: string, resultData: any): Promise<void> {
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result_data: resultData,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to complete job: ${error.message}`);
    }
  }

  // Mark a job as failed
  private static async failJob(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to update job status: ${error.message}`);
    }
  }

  // Utility sleep function
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
