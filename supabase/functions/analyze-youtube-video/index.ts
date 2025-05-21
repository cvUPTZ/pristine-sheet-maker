
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, startOffset = '0s', endOffset = '' } = await req.json();
    
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: "Missing videoUrl parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get video metadata from YouTube
    const videoInfo = await getYouTubeVideoInfo(videoId);
    console.log("Analyzing video:", videoInfo.title);

    // Use Gemini 2.5 Flash to analyze video content
    const analysisResult = await analyzeVideoWithGemini(videoUrl, videoInfo, startOffset, endOffset);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        videoInfo,
        statistics: analysisResult 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Extract YouTube video ID from different URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Get basic information about the YouTube video
async function getYouTubeVideoInfo(videoId: string) {
  // In a production environment, you would use the YouTube Data API
  // For this demo, we'll return basic info to avoid API key requirements
  return {
    id: videoId,
    title: `YouTube Video ${videoId}`,
    description: "Video description would appear here",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

// Use Gemini to analyze the video content using the new Gemini 2.5 Flash model
async function analyzeVideoWithGemini(
  videoUrl: string, 
  videoInfo: any, 
  startOffset: string = '0s',
  endOffset: string = ''
) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  try {
    // Create request payload for Gemini 2.5 Flash with direct video reference
    const requestBody = {
      model: "models/gemini-2.5-flash-preview-05-20",
      contents: [
        {
          parts: [
            {
              fileData: {
                fileUri: videoUrl,
                mimeType: "video/mp4"
              },
              videoMetadata: {
                startOffset: startOffset,
                endOffset: endOffset || undefined
              }
            },
            {
              text: `
                Please analyze this soccer match video and extract the following statistics as JSON:
                
                1. Overall match statistics:
                   - Possession percentages for both teams
                   - Number of shots, shots on target for both teams
                   - Number of passes and pass completion rate for both teams
                   - Number of fouls committed by both teams
                   - Number of corners for both teams
                   
                2. For each team:
                   - Top performing players 
                   - Ball recoveries
                   - Duels won
                   - Crosses attempted and completed
                   
                3. Time-segment analysis:
                   - Break down the match into 15 minute segments
                   - For each segment, track possession percentages, shots, and key events
                   - Identify momentum shifts during the match
                
                Format your response as valid JSON only, with no additional text.
              `
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        topK: 40,
        topP: 0.95
      }
    };

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract the JSON from the response
    let jsonContent = "";
    if (result.candidates && 
        result.candidates[0] && 
        result.candidates[0].content && 
        result.candidates[0].content.parts) {
      
      const textContent = result.candidates[0].content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join("");
      
      // Find JSON content between code blocks if present
      const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       textContent.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, textContent];
                       
      jsonContent = jsonMatch[1] || textContent;
    }

    // Try to parse the JSON response
    try {
      // Clean the string to ensure it's valid JSON
      jsonContent = jsonContent.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON output:", parseError);
      // If JSON parsing fails, return structured content as best as possible
      return {
        error: "Failed to parse analysis as JSON",
        rawContent: jsonContent,
        formattedAnalysis: extractStatisticsFromText(jsonContent)
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(`Failed to analyze video: ${error.message}`);
  }
}

// Fallback function to extract statistics if JSON parsing fails
function extractStatisticsFromText(text: string) {
  // This is a simplified version - in a real app, you'd want more robust parsing
  return {
    possession: {
      home: extractNumberFromText(text, /home.*?possession.*?(\d+)%/i) || 50,
      away: extractNumberFromText(text, /away.*?possession.*?(\d+)%/i) || 50,
    },
    shots: {
      home: {
        onTarget: extractNumberFromText(text, /home.*?shots on target.*?(\d+)/i) || 0,
        offTarget: extractNumberFromText(text, /home.*?shots off target.*?(\d+)/i) || 0,
      },
      away: {
        onTarget: extractNumberFromText(text, /away.*?shots on target.*?(\d+)/i) || 0,
        offTarget: extractNumberFromText(text, /away.*?shots off target.*?(\d+)/i) || 0,
      },
    },
    passes: {
      home: {
        successful: extractNumberFromText(text, /home.*?successful passes.*?(\d+)/i) || 0,
        attempted: extractNumberFromText(text, /home.*?attempted passes.*?(\d+)/i) || 0,
      },
      away: {
        successful: extractNumberFromText(text, /away.*?successful passes.*?(\d+)/i) || 0,
        attempted: extractNumberFromText(text, /away.*?attempted passes.*?(\d+)/i) || 0,
      },
    },
  };
}

function extractNumberFromText(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match && match[1] ? parseInt(match[1], 10) : null;
}
