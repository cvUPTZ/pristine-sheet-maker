
import { supabase } from '@/integrations/supabase/client';
import { YouTubeService } from './youtubeService';
import { AIProcessingService } from './aiProcessingService';
import { VideoJob } from './videoJobService';

export interface ProcessingPipelineConfig {
  enableYouTubeDownload: boolean;
  enableAIAnalysis: boolean;
  enableSegmentation: boolean;
  segmentDuration?: number; // in seconds
  aiProcessingFocus?: 'events' | 'tracking' | 'statistics' | 'all';
}

export class VideoProcessingPipeline {
  // Create complete processing pipeline
  static async processVideoComplete(
    source: { type: 'youtube', url: string } | { type: 'upload', file: File },
    config: ProcessingPipelineConfig
  ): Promise<VideoJob> {
    let videoPath: string;
    let videoInfo: any = {};

    // Step 1: Handle video source
    if (source.type === 'youtube') {
      if (!config.enableYouTubeDownload) {
        throw new Error('YouTube download not enabled');
      }

      // Get video info
      const ytInfo = await YouTubeService.getVideoInfo(source.url);
      videoInfo = {
        title: ytInfo.title,
        duration: this.parseDurationToSeconds(ytInfo.duration)
      };

      // Download video
      videoPath = await YouTubeService.downloadVideo(source.url);
    } else {
      // Upload file directly
      const timestamp = Date.now();
      const fileName = `${timestamp}-${source.file.name}`;
      const filePath = `public/${fileName}`;

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, source.file);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      videoPath = data.path;
      videoInfo = {
        title: source.file.name.replace(/\.[^/.]+$/, ""),
        duration: 0 // Will be determined during processing
      };
    }

    // Step 2: Create job record
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User must be authenticated');
    }

    const jobData = {
      input_video_path: videoPath,
      video_title: videoInfo.title,
      video_duration: videoInfo.duration,
      user_id: user.user.id,
      status: 'pending' as const
    };

    // Try to insert with job_config, fallback without it if column doesn't exist
    let insertResult = await supabase
      .from('video_jobs')
      .insert({
        ...jobData,
        job_config: {
          source_type: source.type,
          enableAIAnalysis: config.enableAIAnalysis,
          enableSegmentation: config.enableSegmentation,
          segmentDuration: config.segmentDuration
        }
      })
      .select('*')
      .single();

    if (insertResult.error && insertResult.error.message.includes('job_config')) {
      // Fallback: insert without job_config if column doesn't exist
      insertResult = await supabase
        .from('video_jobs')
        .insert(jobData)
        .select('*')
        .single();
    }

    if (insertResult.error) {
      throw new Error(`Failed to create job: ${insertResult.error.message}`);
    }

    let currentJobState: VideoJob = {
      ...insertResult.data,
      job_config: insertResult.data.job_config || {
        source_type: source.type,
        enableAIAnalysis: config.enableAIAnalysis,
        enableSegmentation: config.enableSegmentation,
        segmentDuration: config.segmentDuration
      }
    } as VideoJob;

    // Immediately update job status to 'processing' after creation
    const updateResult = await supabase
      .from('video_jobs')
      .update({ status: 'processing' as const })
      .eq('id', currentJobState.id)
      .select('*')
      .single();

    if (updateResult.error) {
      console.error(`Failed to update job status to 'processing' for job ${currentJobState.id}:`, updateResult.error.message);
    } else if (updateResult.data) {
      currentJobState = {
        ...updateResult.data,
        job_config: currentJobState.job_config
      } as VideoJob;
    }

    // Step 3: AI Processing with fallback
    if (config.enableAIAnalysis) {
      try {
        console.log(`Attempting primary AI processing for job ${currentJobState.id}...`);
        await AIProcessingService.submitToColabWorker(currentJobState.id);
        
        const updateAfterPrimary = await supabase
          .from('video_jobs')
          .update({ status: 'processing' as const })
          .eq('id', currentJobState.id)
          .select('*')
          .single();
        
        if (updateAfterPrimary.error) throw updateAfterPrimary.error;
        if (updateAfterPrimary.data) {
          currentJobState = {
            ...updateAfterPrimary.data,
            job_config: currentJobState.job_config
          } as VideoJob;
        }
        console.log(`Job ${currentJobState.id} status updated to 'processing'.`);

      } catch (primaryError: any) {
        console.error(`Primary AI processing failed for job ${currentJobState.id}:`, primaryError.message);
        
        const updateAfterPrimaryFail = await supabase.from('video_jobs').update({ 
          status: 'failed' as const, 
          error_message: primaryError.message 
        }).eq('id', currentJobState.id).select('*').single();
        
        if (updateAfterPrimaryFail.data) {
          currentJobState = {
            ...updateAfterPrimaryFail.data,
            job_config: currentJobState.job_config
          } as VideoJob;
        } else {
          currentJobState.status = 'failed';
          currentJobState.error_message = primaryError.message;
        }

        // Fallback logic for YouTube videos
        if (source.type === 'youtube' && config.enableAIAnalysis) {
          console.log(`Attempting fallback AI analysis for YouTube video (job ${currentJobState.id}) using 'analyze-youtube-video' function...`);
          try {
            // Fetch Gemini API Key
            const { data: apiKeyData, error: apiKeyError } = await supabase.functions.invoke('get-gemini-api-key');
            if (apiKeyError || !apiKeyData || !apiKeyData.apiKey) {
              const errorMsg = apiKeyError?.message || "Gemini API key not found or function invocation failed.";
              console.error(`Failed to retrieve Gemini API key for fallback analysis (job ${currentJobState.id}):`, errorMsg);
              
              const updateAfterFallbackFail = await supabase
                .from('video_jobs')
                .update({ 
                  status: 'failed' as const, 
                  error_message: errorMsg 
                })
                .eq('id', currentJobState.id)
                .select('*')
                .single();
              
              if (updateAfterFallbackFail.data) {
                currentJobState = {
                  ...updateAfterFallbackFail.data,
                  job_config: currentJobState.job_config
                } as VideoJob;
              }
              return currentJobState;
            }
            const retrievedApiKey = apiKeyData.apiKey;
            console.log(`Gemini API key retrieved successfully for job ${currentJobState.id}.`);

            // Call 'analyze-youtube-video'
            const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('analyze-youtube-video', {
              body: { videoUrl: source.url, apiKey: retrievedApiKey }
            });

            if (fallbackError) {
              throw fallbackError;
            }

            // Fallback succeeded
            console.log(`Fallback AI analysis successful for job ${currentJobState.id}.`);
            const updateAfterFallback = await supabase
              .from('video_jobs')
              .update({ 
                status: 'completed' as const, 
                result_data: fallbackData.analysisResult, 
                error_message: null 
              })
              .eq('id', currentJobState.id)
              .select('*')
              .single();
            
            if (updateAfterFallback.error) throw updateAfterFallback.error;
            if (updateAfterFallback.data) {
              currentJobState = {
                ...updateAfterFallback.data,
                job_config: currentJobState.job_config
              } as VideoJob;
            }

          } catch (fallbackCatchError: any) {
            console.error(`Fallback AI analysis failed for job ${currentJobState.id}:`, fallbackCatchError.message);
            const updateAfterFallbackCatch = await supabase
              .from('video_jobs')
              .update({ 
                status: 'failed' as const, 
                error_message: fallbackCatchError.message 
              })
              .eq('id', currentJobState.id)
              .select('*')
              .single();
            
            if (updateAfterFallbackCatch.data) {
              currentJobState = {
                ...updateAfterFallbackCatch.data,
                job_config: currentJobState.job_config
              } as VideoJob;
            } else {
              currentJobState.status = 'failed';
              currentJobState.error_message = fallbackCatchError.message;
            }
          }
        } else {
          // No fallback applicable
          console.log(`No fallback AI analysis applicable for job ${currentJobState.id}. Final status: 'failed'.`);
          const updateNoFallback = await supabase
            .from('video_jobs')
            .update({ 
              status: 'failed' as const, 
              error_message: primaryError.message 
            })
            .eq('id', currentJobState.id)
            .select('*')
            .single();
          
          if (updateNoFallback.data) {
            currentJobState = {
              ...updateNoFallback.data,
              job_config: currentJobState.job_config
            } as VideoJob;
          }
        }
      }
    } else {
      // AI analysis not enabled, update status accordingly
      console.log(`AI analysis not enabled for job ${currentJobState.id}.`);
      const updateNoAI = await supabase
        .from('video_jobs')
        .update({ status: 'completed' as const })
        .eq('id', currentJobState.id)
        .select('*')
        .single();
      
      if (updateNoAI.error) {
        console.error(`Failed to update job status for no AI analysis (job ${currentJobState.id}):`, updateNoAI.error.message);
      } else if (updateNoAI.data) {
        currentJobState = {
          ...updateNoAI.data,
          job_config: currentJobState.job_config
        } as VideoJob;
      }
    }
    return currentJobState;
  }

  // Split video into segments for processing
  static async splitVideoIntoSegments(
    videoPath: string, 
    segmentDuration: number = 300 // 5 minutes default
  ): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke('split-video', {
      body: { videoPath, segmentDuration }
    });

    if (error) {
      throw new Error(`Video splitting failed: ${error.message}`);
    }

    return data.segmentPaths;
  }

  // Process multiple segments in parallel
  static async processSegmentsInParallel(
    segmentPaths: string[],
    maxConcurrent: number = 3
  ): Promise<Array<{ segmentPath: string; result: any; error?: string }>> {
    const results = [];
    
    for (let i = 0; i < segmentPaths.length; i += maxConcurrent) {
      const batch = segmentPaths.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (segmentPath) => {
        try {
          const result = await AIProcessingService.processVideoWithGemini(segmentPath);
          return { segmentPath, result };
        } catch (error: any) {
          return { segmentPath, result: null, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // Monitor job progress
  static async getJobProgress(jobId: string): Promise<{
    status: string;
    progress: number;
    currentStep?: string;
    error?: string;
  }> {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('status, progress, error_message')
      .eq('id', jobId)
      .single();

    if (error) {
      throw new Error(`Failed to get job progress: ${error.message}`);
    }

    return {
      status: data.status,
      progress: data.progress || 0,
      error: data.error_message || undefined
    };
  }

  // Helper to parse ISO 8601 duration to seconds
  private static parseDurationToSeconds(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]?.replace('H', '') || '0');
    const minutes = parseInt(match[2]?.replace('M', '') || '0');
    const seconds = parseInt(match[3]?.replace('S', '') || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }
}
