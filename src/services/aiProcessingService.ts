
import { supabase } from '@/integrations/supabase/client';

export interface AIAnalysisResult {
  events: Array<{
    type: string;
    timestamp: number;
    confidence: number;
    player?: string;
    team?: string;
    coordinates?: { x: number; y: number };
  }>;
  statistics: {
    ballPossession?: { home: number; away: number };
    passes?: { successful: number; attempted: number };
    shots?: number;
    fouls?: number;
    corners?: number;
    offsides?: number;
  };
  heatmapData?: Array<{
    x: number;
    y: number;
    intensity: number;
    player?: string;
  }>;
  trackingData?: Array<{
    timestamp: number;
    players: Array<{
      id: string;
      x: number;
      y: number;
      team: string;
    }>;
    ball?: { x: number; y: number };
  }>;
}

export class AIProcessingService {
  // Get Gemini API key from Supabase secrets
  private static async getGeminiApiKey(): Promise<string> {
    const { data } = await supabase.functions.invoke('get-gemini-api-key');
    if (!data?.apiKey) {
      throw new Error('Gemini API key not configured');
    }
    return data.apiKey;
  }

  // Process video with Gemini AI
  static async processVideoWithGemini(videoPath: string): Promise<AIAnalysisResult> {
    console.warn("Attempting to call 'process-video-gemini' Supabase function. This function is currently missing in the repository. Analysis via this path will likely fail or be incomplete.");
    const { data, error } = await supabase.functions.invoke('process-video-gemini', {
      body: { videoPath }
    });

    if (error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }

    return data.analysisResult;
  }

  // Process video segment with specific focus
  static async processVideoSegment(
    videoPath: string, 
    startTime: number, 
    endTime: number,
    focus?: 'events' | 'tracking' | 'statistics'
  ): Promise<AIAnalysisResult> {
    console.warn("Attempting to call 'process-video-segment' Supabase function. This function is currently missing in the repository. Analysis via this path will likely fail or be incomplete.");
    const { data, error } = await supabase.functions.invoke('process-video-segment', {
      body: { 
        videoPath, 
        startTime, 
        endTime, 
        focus: focus || 'events' 
      }
    });

    if (error) {
      throw new Error(`Segment processing failed: ${error.message}`);
    }

    return data.analysisResult;
  }

  // Submit analysis job to Colab worker
  static async submitToColabWorker(jobId: string): Promise<void> {
    console.warn("Attempting to call 'submit-to-colab' Supabase function. This function is currently missing in the repository. Colab submission will not occur.");
    const { error } = await supabase.functions.invoke('submit-to-colab', {
      body: { jobId }
    });

    if (error) {
      throw new Error(`Colab submission failed: ${error.message}`);
    }
  }
}
