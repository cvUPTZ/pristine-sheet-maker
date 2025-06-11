// src/services/aiProcessingService.ts

import { supabase } from '@/integrations/supabase/client';

export interface AIPlayerInfo {
  player_name: string | null;
  jersey_number: number | null;
  is_substitute: boolean;
}

export interface FormationImageAIResponse {
  players: AIPlayerInfo[];
  error?: string;
}

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
  private static async getGeminiApiKey(): Promise<string> {
    const { data } = await supabase.functions.invoke('get-gemini-api-key');
    if (!data?.apiKey) {
      throw new Error('Gemini API key not configured');
    }
    return data.apiKey;
  }

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

  static async submitToColabWorker(jobId: string): Promise<void> {
    console.warn("Attempting to call 'submit-to-colab' Supabase function. This function is currently missing in the repository. Colab submission will not occur.");
    const { error } = await supabase.functions.invoke('submit-to-colab', {
      body: { jobId }
    });

    if (error) {
      throw new Error(`Colab submission failed: ${error.message}`);
    }
  }

  static async extractPlayersFromImage(imageData: string): Promise<FormationImageAIResponse> {
    console.log("Calling process-formation-image Supabase function...");

    if (!imageData || typeof imageData !== 'string' || imageData.length === 0) {
      throw new Error("Image data provided to the service is empty or invalid.");
    }

    try {
      const { data, error } = await supabase.functions.invoke<FormationImageAIResponse>(
        'process-formation-image',
        { body: { imageData } }
      );

      if (error) {
        console.error("Error invoking Supabase function:", error.message);
        throw new Error(`AI processing service failed: ${error.message}`);
      }

      if (!data || !Array.isArray(data.players)) {
        console.error("Invalid data structure returned from AI service:", data);
        if (data?.error) {
             throw new Error(`AI service reported an error: ${data.error}`);
        }
        throw new Error("AI service returned an invalid or empty data format.");
      }

      console.log("Received valid response from process-formation-image:", data);
      
      return data;

    } catch (e) {
      console.error("Exception occurred while calling the Supabase function:", e);
      if (e instanceof Error) {
        throw new Error(`Failed to extract players: ${e.message}`);
      }
      throw new Error("An unknown error occurred while extracting players from the image.");
    }
  }
}