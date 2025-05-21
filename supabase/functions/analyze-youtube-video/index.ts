import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

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
    const { videoUrl, fileUpload = false } = await req.json();
    
    if (!videoUrl && !fileUpload) {
      return new Response(
        JSON.stringify({ error: "Missing videoUrl parameter or file upload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Received videoUrl: ${videoUrl || 'None, using file upload'}`);
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    let videoId = null;
    let videoInfo = null;

    if (videoUrl) {
      videoId = extractYouTubeVideoId(videoUrl);
      if (!videoId) {
        return new Response(
          JSON.stringify({ error: "Invalid YouTube URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get video metadata from YouTube
      videoInfo = await getYouTubeVideoInfo(videoId);
      console.log("Analyzing video:", videoInfo.title);
    } else {
      videoInfo = {
        id: "uploaded-file",
        title: "Uploaded Video File",
        description: "User uploaded video file for analysis",
        url: "file://uploaded-video",
        thumbnailUrl: "",
      };
    }

    // Use the new API endpoint for analysis
    const analysisResult = await analyzeVideoWithCustomEndpoint(videoUrl, videoInfo);
    
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
    description: "Video description placeholder",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

// Use the custom endpoint to analyze the video content
async function analyzeVideoWithCustomEndpoint(
  videoUrl: string, 
  videoInfo: any
) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  try {
    console.log(`Sending analysis request to custom Google API endpoint.`);

    const prompt = `
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
    `;

    // Construct request body based on type
    let requestBody;
    const endpoint = "https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/GenerateContent";
    
    if (videoUrl) {
      console.log("Using YouTube URL in analysis request:", videoUrl);
      requestBody = JSON.stringify({
        model: "models/gemini-2.5-flash-preview-05-20",
        contents: [
          {
            role: "user",
            parts: [
              { text: `Analyze this soccer match video: ${videoUrl}\n\n${prompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      });
    } else {
      console.log("Using generic file upload analysis");
      requestBody = JSON.stringify({
        model: "models/gemini-2.5-flash-preview-05-20",
        contents: [
          {
            role: "user",
            parts: [
              { text: `I've uploaded a soccer match video for analysis. ${prompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      });
    }

    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-goog-api-key': apiKey
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response:", errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Received API response:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Extract the content from the response
    let textContent = "";
    try {
      textContent = data.candidates[0].content.parts[0].text;
    } catch (err) {
      console.error("Error extracting text from response:", err);
      throw new Error("Failed to extract content from API response");
    }
    
    // Try to extract JSON from the response
    try {
      // Look for JSON content
      const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                      textContent.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, textContent];
                      
      const jsonContent = jsonMatch[1] || textContent;
      const cleanJson = jsonContent.replace(/```json|```/g, "").trim();
      
      console.log("Successfully parsed response");
      
      // Parse the JSON
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse JSON output:", parseError);
      
      // If JSON parsing fails, return structured content as best as possible
      return {
        error: "Failed to parse analysis as JSON",
        rawContent: textContent,
        formattedAnalysis: extractStatisticsFromText(textContent)
      };
    }

  } catch (error) {
    console.error("Error calling API:", error);
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
