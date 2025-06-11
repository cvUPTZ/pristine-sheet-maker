
import { supabase } from '@/integrations/supabase/client';

// --- New Types for Formation Image Processing ---
export interface AIPlayerInfo {
  name: string;
  number?: number | null; // Number might be optional or null if not always detectable
  is_substitute?: boolean; // Could also be optional
  position_guess?: string | null; // Optional
}

export interface AITeamData {
  players: AIPlayerInfo[];
  // team_name_guess?: string; // Optional: if AI can guess team names
}

export interface FormationImageAIResponse {
  team_alpha_players?: AITeamData; // Using optional for safety, matching Edge Function output
  team_beta_players?: AITeamData;
  error?: string; // To carry error messages from the AI service or Edge Function
}
// --- End New Types ---

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

  // --- New Static Method for Formation Image Processing ---
  static async extractPlayersFromImage(imageData: string): Promise<FormationImageAIResponse> {
    console.log("Calling process-formation-image Supabase function...");

    if (!imageData || typeof imageData !== 'string' || imageData.length === 0) {
      console.error("imageData is invalid or empty.");
      throw new Error("Image data cannot be empty.");
    }

    // Optional: Basic check if it looks like a base64 string (very rudimentary)
    // if (imageData.length < 50 && !imageData.startsWith('data:image')) {
    //   console.warn("imageData might not be a valid base64 string:", imageData.substring(0,30));
    // }

    try {
      const { data, error } = await supabase.functions.invoke<FormationImageAIResponse>(
        'process-formation-image', // Name of the Supabase Edge Function
        {
          body: { imageData: imageData }, // Payload expected by the Edge Function
        }
      );

      if (error) {
        console.error("Error invoking process-formation-image function:", error.message);
        throw new Error(`Supabase function invocation failed: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned from process-formation-image function.");
        throw new Error("No data received from AI processing function.");
      }

      console.log("Received response from process-formation-image:", data);

      // The 'data' should already be in the FormationImageAIResponse format if the Edge Function works correctly.
      // If the Edge function returns an error within its JSON response, it will be part of 'data.error'.
      if (data.error) {
        console.error("Error reported by process-formation-image function:", data.error);
        // We might want to throw an error here or let the caller handle the error in the response object.
        // For now, returning the data object which includes the error.
      }

      return data;

    } catch (e) {
      // This catches network errors or if supabase.functions.invoke itself throws an error not related to the function's execution logic (e.g. function not found, network issue)
      console.error("Exception calling Supabase function 'process-formation-image':", e);
      if (e instanceof Error) {
        throw new Error(`Failed to extract players from image: ${e.message}`);
      }
      throw new Error("An unknown error occurred while extracting players from image.");
    }
  }
  // --- End New Static Method ---
}
