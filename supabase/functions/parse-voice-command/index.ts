
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface Player {
  id: number;
  name: string;
  jersey_number: number | null;
}

interface AssignedPlayers {
  home: Player[];
  away: Player[];
}

interface AssignedEventType {
  key: string;
  label: string;
}

interface RequestPayload {
  transcript: string;
  assignedEventTypes: AssignedEventType[];
  // assignedPlayers: AssignedPlayers; // Add later if needed for more complex parsing
}

interface ParsedCommand {
  eventType?: AssignedEventType;
  playerId?: number;
  teamId?: 'home' | 'away';
  confidence: number;
  reasoning: string;
  transcript: string;
  // Include other fields from the original ParsedCommand if necessary
  [key: string]: any;
}

console.log('Initializing parse-voice-command function');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Request received for parse-voice-command');

  if (req.method !== 'POST') {
    console.log('Invalid request method:', req.method);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    })
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
    console.log('Payload received:', payload);
  } catch (e) {
    console.error('Error parsing JSON payload:', e);
    return new Response(JSON.stringify({ error: 'Bad Request: Could not parse JSON' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    })
  }

  const { transcript, assignedEventTypes } = payload;

  if (!transcript || !assignedEventTypes || !Array.isArray(assignedEventTypes)) {
    console.log('Missing required fields in payload:', { transcript, assignedEventTypes });
    return new Response(JSON.stringify({ error: 'Bad Request: Missing transcript or assignedEventTypes' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    })
  }

  let foundEventType: AssignedEventType | undefined = undefined;
  const lowerTranscript = transcript.toLowerCase();

  // Simple keyword matching for event types
  // This is a basic implementation. More sophisticated NLP/parsing might be needed.
  for (const et of assignedEventTypes) {
    if (lowerTranscript.includes(et.label.toLowerCase())) {
      foundEventType = et;
      break;
    }
    // Also check for key if label is multi-word and key is simpler
    if (lowerTranscript.includes(et.key.toLowerCase())) {
      foundEventType = et;
      break;
    }
  }

  const response: ParsedCommand = {
    transcript: transcript,
    confidence: foundEventType ? 0.85 : 0.3, // Assign arbitrary confidence
    reasoning: foundEventType ? 'Event type found by keyword match in Edge Function.' : 'No matching event type found in Edge Function.',
  };

  if (foundEventType) {
    response.eventType = foundEventType;
    // Placeholder for player/team parsing - to be implemented
    // For now, we'll just pass the event_only flag as in the original component
    response.event_only = true;
    console.log('Event type found:', foundEventType);
  } else {
    console.log('No event type found for transcript:', transcript);
  }

  console.log('Sending response:', response);
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
})

console.log('parse-voice-command function listener started');
