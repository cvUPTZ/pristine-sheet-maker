// Basic structure for the process-formation-image Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

console.log("process-formation-image function initializing");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Adjust as needed for security
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL_NAME = "gemini-pro-vision"; // Or the latest appropriate vision model

serve(async (req: Request) => {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    console.log("Handling POST request");
    // Ensure the request method is POST
    if (req.method !== "POST") {
      console.error("Invalid request method:", req.method);
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Get image data from the request body
    let imageDataB64: string;
    try {
      const body = await req.json();
      if (!body.imageData) {
        throw new Error("Missing imageData in request body.");
      }
      // Expecting a base64 string, potentially with a data URL prefix
      imageDataB64 = body.imageData.startsWith('data:image')
        ? body.imageData.split(',')[1]
        : body.imageData;

      if (!imageDataB64) {
        throw new Error("imageData is empty or invalid after stripping prefix.");
      }
      console.log("Successfully parsed imageData from request body.");
    } catch (e) {
      console.error("Error parsing request body:", e.message);
      return new Response(JSON.stringify({ error: `Failed to parse request body: ${e.message}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Get Gemini API Key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not found in environment variables.");
      return new Response(JSON.stringify({ error: "API key not configured." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    console.log("Retrieved GEMINI_API_KEY.");

    // Initialize Gemini Client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
    console.log("GoogleGenerativeAI client initialized.");

    // Prepare Gemini Request
    const prompt = `
      Analyze the provided image of a football team formation sheet or a similar visual representation of players.
      Identify players for two distinct teams if possible (e.g., based on shirt color, spatial separation, or labels like "Home", "Away", "Team A", "Team B").
      If two teams are clearly distinguishable, label them "team_alpha" and "team_beta". If only one group of players is visible, use "team_alpha".
      For each player identified, extract their name and jersey number if visible. Player names are the most crucial information.
      Determine if a player is part of the starting lineup or a substitute. If the image provides explicit labels like "Starters", "Substitutes", "Bench", use that.
      If not, assume the first 11 players listed for a team are starters and the rest are substitutes.

      Provide the output in the following JSON format:
      {
        "team_alpha_players": [
          { "name": "Player Name", "number": JerseyNumber, "is_substitute": boolean, "position_guess": "Position (e.g., Forward, Midfielder, Defender, Goalkeeper, or N/A)" },
          ...
        ],
        "team_beta_players": [
          { "name": "Player Name", "number": JerseyNumber, "is_substitute": boolean, "position_guess": "Position (e.g., Forward, Midfielder, Defender, Goalkeeper, or N/A)" },
          ...
        ]
      }
      If no players or teams can be identified, return empty arrays for "team_alpha_players" and "team_beta_players".
      Ensure jersey numbers are integers. If a number is not visible or clear, use null for the number.
      "position_guess" should be a string or null if not determinable.
      "is_substitute" should be true or false.
    `;

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg", // Assuming JPEG, adjust if other types are common
          data: imageDataB64,
        },
      },
    ];
    console.log("Prepared parts for Gemini request.");

    // Call Gemini API
    console.log("Calling Gemini API...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        //  maxOutputTokens: 2048, // Adjust as needed
         temperature: 0.2, // Lower temperature for more deterministic output for structured data
      },
      safetySettings: [ // Adjust safety settings as needed
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ]
    });

    console.log("Gemini API call completed.");
    const response = result.response;

    if (!response) {
        console.error("Gemini API returned no response.");
        throw new Error("Gemini API returned no response.");
    }

    const responseText = response.text();
    console.log("Gemini response text raw:", responseText);

    // Attempt to parse the response text as JSON
    let jsonData;
    try {
      // Gemini might return the JSON within a markdown block (```json ... ```)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonData = JSON.parse(jsonMatch[1]);
        console.log("Successfully parsed JSON from markdown block.");
      } else {
        // If no markdown block, try parsing directly
        jsonData = JSON.parse(responseText);
        console.log("Successfully parsed JSON directly.");
      }
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", e.message);
      console.error("Raw response that failed parsing:", responseText);
      // Return the raw text if JSON parsing fails, as it might contain useful error info from Gemini
      return new Response(JSON.stringify({ error: "Failed to parse AI response.", raw_ai_response: responseText }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully processed Gemini response.");
    // Return the structured player data
    return new Response(JSON.stringify(jsonData), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unhandled error in Edge Function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

console.log("process-formation-image function initialized and server started/listening (pending actual serve call).");
