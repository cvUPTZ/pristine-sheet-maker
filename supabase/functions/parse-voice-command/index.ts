
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Interfaces (should match client-side types)
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
  assignedPlayers: AssignedPlayers; // Now used for parsing
}

interface ParsedCommand {
  eventType?: AssignedEventType;
  player?: Player;
  teamContext?: 'home' | 'away';
  confidence: number;
  reasoning: string;
  transcript: string;
  event_only?: boolean;
  [key: string]: any;
}

console.log('Initializing parse-voice-command function (v2)');

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

  const { transcript, assignedEventTypes, assignedPlayers } = payload;

  if (!transcript || !assignedEventTypes || !Array.isArray(assignedEventTypes) || !assignedPlayers) {
    console.log('Missing required fields in payload:', { transcript, assignedEventTypes, assignedPlayers });
    return new Response(JSON.stringify({ error: 'Bad Request: Missing transcript, assignedEventTypes, or assignedPlayers' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json', 
        ...corsHeaders 
      },
    })
  }

  const lowerTranscript = transcript.toLowerCase();
  let foundEventType: AssignedEventType | undefined = undefined;
  let foundPlayer: Player & { team: 'home' | 'away' } | undefined = undefined;

  // 1. Find Event Type
  for (const et of assignedEventTypes) {
    if (lowerTranscript.includes(et.label.toLowerCase())) {
      foundEventType = et;
      break;
    }
    if (lowerTranscript.includes(et.key.toLowerCase())) {
      foundEventType = et;
      break;
    }
  }

  // 2. Find Player (if event type is found)
  if (foundEventType) {
    const allPlayers = [
      ...(assignedPlayers.home || []).map(p => ({ ...p, team: 'home' as const })),
      ...(assignedPlayers.away || []).map(p => ({ ...p, team: 'away' as const }))
    ];

    for (const player of allPlayers) {
      // Match by full name
      if (player.name && lowerTranscript.includes(player.name.toLowerCase())) {
        foundPlayer = player;
        break;
      }
      // Match by jersey number (with word boundary to avoid partial matches)
      if (player.jersey_number) {
        const numRegex = new RegExp(`\\b${player.jersey_number}\\b`);
        if (numRegex.test(lowerTranscript)) {
          foundPlayer = player;
          break;
        }
      }
    }
  }

  const response: ParsedCommand = {
    transcript: transcript,
    confidence: 0.3, // Start with low confidence
    reasoning: 'No event type found.',
  };

  if (foundEventType) {
    response.eventType = foundEventType;
    response.confidence = 0.85;
    response.reasoning = 'Event type found by keyword match.';
    
    if (foundPlayer) {
      response.player = {
        id: foundPlayer.id,
        name: foundPlayer.name,
        jersey_number: foundPlayer.jersey_number,
      };
      response.teamContext = foundPlayer.team;
      response.confidence = 0.95; // Higher confidence with player
      response.reasoning = 'Event type and player found by keyword match.';
    } else {
      // If event type is found but player is not, it could be an event_only type
      response.event_only = true;
    }
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
