
// External AI Compute Service integration
// This service handles communication with your deployed GPU-powered Python script

export interface VideoSegmentAnalysisRequest {
  segmentFile: File;
  segmentMetadata: {
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
    fileName: string;
  };
  analysisOptions?: {
    enableObjectDetection?: boolean;
    enablePlayerTracking?: boolean;
    enableBallTracking?: boolean;
    confidence_threshold?: number;
  };
}

export interface PlayerDetection {
  player_id: string;
  team: 'home' | 'away';
  jersey_number?: number;
  confidence: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position: {
    x: number; // field coordinates (0-100)
    y: number; // field coordinates (0-100)
  };
}

export interface BallDetection {
  confidence: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position: {
    x: number; // field coordinates (0-100)
    y: number; // field coordinates (0-100)
  };
}

export interface DetectedEvent {
  type: 'pass' | 'shot' | 'tackle' | 'goal' | 'foul' | 'card' | 'substitution' | 'corner' | 'throw_in' | 'offside';
  timestamp: number; // seconds from segment start
  confidence: number;
  players_involved: string[]; // player IDs
  team: 'home' | 'away' | null;
  coordinates: {
    x: number; // field coordinates (0-100)
    y: number; // field coordinates (0-100)
  };
  additional_data?: Record<string, any>;
}

export interface VideoSegmentAnalysisResult {
  segment_id: string;
  processing_time: number;
  frame_count: number;
  
  // Detections per frame
  detections: Array<{
    frame_number: number;
    timestamp: number; // seconds from segment start
    players: PlayerDetection[];
    ball: BallDetection | null;
  }>;
  
  // Aggregated events detected
  events: DetectedEvent[];
  
  // Match statistics for this segment
  statistics: {
    ball_possession: {
      home_percentage: number;
      away_percentage: number;
    };
    player_movements: Array<{
      player_id: string;
      team: 'home' | 'away';
      distance_covered: number; // meters
      avg_speed: number; // m/s
      max_speed: number; // m/s
      heat_map_data: Array<{ x: number; y: number; intensity: number }>;
    }>;
    passes: {
      total: number;
      successful: number;
      by_team: {
        home: { total: number; successful: number };
        away: { total: number; successful: number };
      };
    };
    shots: {
      total: number;
      on_target: number;
      by_team: {
        home: { total: number; on_target: number };
        away: { total: number; on_target: number };
      };
    };
  };
  
  // Optional: URLs to generated visualizations
  visualizations?: {
    heatmap_url?: string;
    tracking_overlay_url?: string;
    events_timeline_url?: string;
  };
}

class AIComputeService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    // Your deployed service URL - could be Railway, Render, AWS, etc.
    this.baseUrl = baseUrl || import.meta.env.VITE_AI_COMPUTE_SERVICE_URL || 'http://localhost:8000';
    this.apiKey = apiKey || import.meta.env.VITE_AI_COMPUTE_API_KEY;
  }

  // Set the service URL and API key (useful for dynamic configuration)
  configure(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Check if the AI compute service is available
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('AI Compute Service health check failed:', error);
      return false;
    }
  }

  // Get service capabilities and model information
  async getServiceInfo(): Promise<{
    model_name: string;
    model_version: string;
    supported_formats: string[];
    max_file_size_mb: number;
    estimated_processing_time_per_minute: number;
  }> {
    const response = await fetch(`${this.baseUrl}/info`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Service info request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Process a single video segment
  async analyzeVideoSegment(request: VideoSegmentAnalysisRequest): Promise<VideoSegmentAnalysisResult> {
    const formData = new FormData();
    
    // Add the video file
    formData.append('video_file', request.segmentFile);
    
    // Add metadata as JSON
    formData.append('metadata', JSON.stringify(request.segmentMetadata));
    
    // Add analysis options if provided
    if (request.analysisOptions) {
      formData.append('options', JSON.stringify(request.analysisOptions));
    }

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - let browser set it with boundary
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Analysis failed: ${response.statusText}. ${errorData}`);
    }

    return response.json();
  }

  // Process multiple segments in batch (if your service supports it)
  async analyzeBatch(requests: VideoSegmentAnalysisRequest[]): Promise<VideoSegmentAnalysisResult[]> {
    const formData = new FormData();
    
    // Add all video files with indexed names
    requests.forEach((request, index) => {
      formData.append(`video_file_${index}`, request.segmentFile);
      formData.append(`metadata_${index}`, JSON.stringify(request.segmentMetadata));
      if (request.analysisOptions) {
        formData.append(`options_${index}`, JSON.stringify(request.analysisOptions));
      }
    });

    const response = await fetch(`${this.baseUrl}/analyze-batch`, {
      method: 'POST',
      headers: {
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Batch analysis failed: ${response.statusText}. ${errorData}`);
    }

    return response.json();
  }

  // Get analysis status for long-running jobs (if supported)
  async getAnalysisStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    estimated_completion_time?: string;
    result?: VideoSegmentAnalysisResult;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

// Export a singleton instance
export const aiComputeService = new AIComputeService();

// Helper function to convert AI service results to your app's format
export function convertToAnalysisResults(
  aiResult: VideoSegmentAnalysisResult
): import('@/types').AnalysisResults {
  return {
    segmentId: aiResult.segment_id,
    events: aiResult.events.map(event => ({
      type: event.type,
      timestamp: event.timestamp,
      confidence: event.confidence,
      team: event.team,
      coordinates: event.coordinates,
      players: event.players_involved,
      additionalData: event.additional_data,
    })),
    statistics: {
      ballPossession: {
        home: aiResult.statistics.ball_possession.home_percentage,
        away: aiResult.statistics.ball_possession.away_percentage,
      },
      passes: {
        successful: aiResult.statistics.passes.successful,
        attempted: aiResult.statistics.passes.total,
      },
      shots: aiResult.statistics.shots.total,
      // Add other statistics as needed based on your AnalysisResults type
    },
    heatmapUrl: aiResult.visualizations?.heatmap_url,
    playerTrackingDataUrl: aiResult.visualizations?.tracking_overlay_url,
  };
}
