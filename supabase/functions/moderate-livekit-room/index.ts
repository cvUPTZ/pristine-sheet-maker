
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface ModerationRequest {
  roomId: string;
  targetIdentity: string;
  mute: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { roomId, targetIdentity, mute } = await req.json() as ModerationRequest;

    const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');
    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit credentials not configured');
    }

    // Create basic auth header
    const credentials = btoa(`${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}`);
    
    const response = await fetch(`${LIVEKIT_URL}/twirp/livekit.RoomService/MutePublishedTrack`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room: roomId,
        identity: targetIdentity,
        track_sid: '', // Will mute all audio tracks
        muted: mute,
      }),
    });

    if (!response.ok) {
      throw new Error(`LiveKit API error: ${response.statusText}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Participant ${mute ? 'muted' : 'unmuted'} successfully` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error moderating participant:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
