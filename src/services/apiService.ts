// src/services/apiService.ts
import { VideoInfo, AnalysisResults, ApiKeyInfo, VideoSegment } from '@/types';
import { parseDurationToSeconds } from '@/utils/formatters';

// This should be the URL of your Deno Edge Function
const DENO_FUNCTION_URL = import.meta.env.VITE_DENO_FUNCTION_URL || 'YOUR_DENO_FUNCTION_DEPLOYED_URL';

// Helper function for API calls (slightly modified)
async function apiRequest<T>(
  url: string, // Full URL now
  method: string = 'POST', // Defaulting to POST as your Deno func is a single POST endpoint
  body?: any,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // If you implement user auth with Supabase JWTs for your edge function:
  // const supabaseAccessToken = (await supabase.auth.getSession())?.data.session?.access_token;
  // if (supabaseAccessToken) {
  //   headers['Authorization'] = `Bearer ${supabaseAccessToken}`;
  // }
  // headers['apikey'] = YOUR_SUPABASE_ANON_KEY; // If required by edge function security rules

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorData.details || errorMessage;
      } catch (e) { /* Ignore if error body isn't JSON */ }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`API request to ${url} failed:`, error);
    throw error;
  }
}

// --- Interface for your Deno function's expected response ---
interface DenoFunctionResponse {
  success: boolean;
  videoInfo: { // Structure from your backend's getYouTubeVideoInfo
    id: string;
    title: string;
    description: string;
    duration?: string; // YouTube API returns ISO 8601 duration string (e.g., "PT1M35S")
    thumbnail?: string; // Backend uses 'thumbnail', frontend VideoInfo uses 'thumbnail'
    url: string;
    thumbnailUrl?: string; // Duplicates thumbnail?
    formats?: { quality: string; format: string; size: string }[]; // You have a fallback for this
  };
  statistics: any; // The 'analysisResult' from Gemini, structure can be flexible
}

// --- Combined Fetch Info & Analyze (Matches your Deno function) ---
export const fetchInfoAndAnalyzeVideoAPI = async (
  youtubeUrl: string,
): Promise<{ videoInfo: VideoInfo; analysisResults: AnalysisResults }> => {
  
  // The Deno function expects `apiKey` in the body for YouTube, but this is a security risk.
  // For now, we'll pass an empty string or a placeholder.
  // IDEALLY, your Deno function should use an environment variable for the YouTube API Key.
  const requestBody = {
    videoUrl: youtubeUrl,
    apiKey: "CLIENT_SHOULD_NOT_SEND_THIS", // Placeholder - remove if backend fixed
  };

  const response = await apiRequest<DenoFunctionResponse>(DENO_FUNCTION_URL, 'POST', requestBody);

  if (!response.success) {
    throw new Error("Backend processing failed.");
  }

  // Transform backend response to frontend types
  const feVideoInfo: VideoInfo = {
    videoId: response.videoInfo.id,
    title: response.videoInfo.title,
    // Parse ISO duration string from YouTube API to seconds for frontend
    duration: response.videoInfo.duration ? parseDurationToSeconds(response.videoInfo.duration) : 0,
    thumbnail: response.videoInfo.thumbnail || response.videoInfo.thumbnailUrl || '',
    formats: response.videoInfo.formats || [], // You provide a default
  };

  // Assuming 'statistics' from backend directly maps to frontend 'AnalysisResults' structure
  const feAnalysisResults: AnalysisResults = {
    segmentId: response.videoInfo.id, // Using videoId as segmentId since no actual segments
    events: response.statistics?.events || [], // Adapt based on Gemini output
    statistics: response.statistics?.overallMatchStatistics || response.statistics || {}, // Adapt
    // heatmapUrl and playerTrackingDataUrl would come from Gemini if it provides them
  };

  return { videoInfo: feVideoInfo, analysisResults: feAnalysisResults };
};

// --- Placeholder/Hypothetical APIs for Download & Split (if you build them later) ---

// This would need a backend endpoint that uses yt-dlp or similar
// and returns a direct download URL.
export const requestVideoDownloadAPI = async (
  videoId: string,
  quality: string
): Promise<{ downloadUrl: string; fileName: string; videoInfo: VideoInfo }> => {
  console.warn("requestVideoDownloadAPI is a placeholder and needs a backend implementation.");
  // MOCK: Replace with actual API call if backend endpoint exists
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    downloadUrl: `https://example.com/downloads/${videoId}_${quality}.mp4`,
    fileName: `${videoId}_${quality}.mp4`,
    videoInfo: { videoId, title: `Video ${videoId}`, duration: 180, thumbnail: '', formats: [] },
  };
};

export const triggerBrowserDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // URL.revokeObjectURL(url); // Only if `url` was a Blob URL created on client
};

// This would need a backend endpoint that takes a video (file or URL),
// splits it (e.g., with ffmpeg), and returns metadata about the segments.
export const splitVideoAPI = async (
  // Parameters would depend on how your backend handles the source video
  sourceVideoIdentifier: { type: 'url', value: string } | { type: 'fileId', value: string }, // e.g. URL or an ID if uploaded
  segmentDurationSeconds: number,
): Promise<VideoSegment[]> => {
  console.warn("splitVideoAPI is a placeholder and needs a backend implementation.");
  // MOCK: Replace with actual API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  const mockSegments: VideoSegment[] = [
    { id: 'seg1', startTime: 0, endTime: segmentDurationSeconds, duration: segmentDurationSeconds, status: 'completed', fileName: 'segment1.mp4' },
    { id: 'seg2', startTime: segmentDurationSeconds, endTime: segmentDurationSeconds*2, duration: segmentDurationSeconds, status: 'completed', fileName: 'segment2.mp4' },
  ];
  return mockSegments;
};

// Mock implementation for processing segments with Colab API
export const processSegmentWithColabAPI = async (
  segment: VideoSegment,
  colabNotebookUrl?: string
): Promise<AnalysisResults> => {
  console.warn("processSegmentWithColabAPI is a placeholder and needs a backend implementation.");
  // MOCK: Replace with actual API call
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  // Mock analysis results
  const mockResults: AnalysisResults = {
    segmentId: segment.id,
    events: [
      { type: 'pass', timestamp: segment.startTime + 10, confidence: 0.85 },
      { type: 'shot', timestamp: segment.startTime + 25, confidence: 0.92 },
      { type: 'tackle', timestamp: segment.startTime + 40, confidence: 0.78 },
    ],
    statistics: {
      ballPossession: { home: 55 + Math.random() * 20, away: 45 + Math.random() * 20 },
      passes: { successful: Math.floor(Math.random() * 50) + 20, attempted: Math.floor(Math.random() * 70) + 40 },
      shots: Math.floor(Math.random() * 5) + 1,
    },
  };
  
  return mockResults;
};

// --- Status Check (can remain as is, if you make a simple status endpoint) ---
// This would ideally check if YOUR backend has its required keys (Gemini key)
export const checkApiKeyStatusAPI = async (): Promise<ApiKeyInfo> => {
  // If your Deno function doesn't have a dedicated status endpoint,
  // this becomes less meaningful or you might infer status from successful calls.
  // For now, let's assume it's always 'ready' if the Deno func is up.
  console.warn("checkApiKeyStatusAPI is a simplified placeholder.");
  return {
    // These flags now reflect if the *backend* can perform these actions
    hasYouTubeApiKey: true, // Assuming backend handles YouTube API calls correctly
    hasGoogleColabApiKey: true, // Representing the Gemini key status on backend
  };
  // Example if you had a status endpoint:
  // return apiRequest<ApiKeyInfo>(`${DENO_FUNCTION_URL}/status`, 'GET');
};
