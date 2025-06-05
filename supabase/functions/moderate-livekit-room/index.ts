import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { RoomServiceClient, Track } from 'https://esm.sh/livekit-server-sdk@1.2.7';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// TODO: User must set these in Supabase project's Edge Function environment variables
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL'); // e.g., 'https://your-livekit-instance.livekit.cloud'
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

// TODO: Replace with your specific frontend domain(s) for production security.
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://REPLACE_WITH_YOUR_ACTUAL_DOMAIN.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ModerateRequest {
  roomId: string;
  targetIdentity: string;
  mute: boolean; // true to mute, false to unmute
}

async function checkAdminPermission(supabaseClient: SupabaseClient): Promise<boolean> {
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    console.error('Authentication error:', authError?.message);
    return false;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile or profile not found:', profileError?.message);
    return false;
  }

  return profile.role === 'admin' || profile.role === 'coordinator';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.error('LiveKit environment variables not set.');
      return new Response(JSON.stringify({ error: 'Server configuration error for LiveKit.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase URL or Anon Key not set.');
        return new Response(JSON.stringify({ error: 'Server configuration error for Supabase.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { roomId, targetIdentity, mute } = await req.json() as ModerateRequest;

    if (!roomId || !targetIdentity || typeof mute !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing required fields: roomId, targetIdentity, mute (boolean)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const isAdmin = await checkAdminPermission(supabaseClient);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Permission denied. Caller is not an admin or coordinator.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    let participantInfo;
    try {
        participantInfo = await roomService.getParticipant(roomId, targetIdentity);
    } catch (e: any) {
        // LiveKit throws an error if participant is not found, which might have a specific code.
        // For simplicity, treating "not found" like errors as a 404 for the participant.
        if (e.message && e.message.includes("could not find participant")) {
             return new Response(JSON.stringify({ error: `Participant ${targetIdentity} not found in room ${roomId}` }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        console.error(`Error fetching participant ${targetIdentity} in room ${roomId}:`, e.message);
        return new Response(JSON.stringify({ error: `Failed to fetch participant: ${e.message}` }), {
            status: 500, // Or more specific error based on LiveKit error
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const audioTrack = participantInfo.tracks.find(t => t.source === Track.Source.Microphone && t.type === Track.Type.AUDIO);

    if (!audioTrack || !audioTrack.sid) {
      return new Response(JSON.stringify({ error: `Audio track not found for participant ${targetIdentity}` }), {
        status: 404, // Or 400 if it's considered a bad request (e.g., trying to mute someone without an audio track)
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await roomService.mutePublishedTrack(roomId, targetIdentity, audioTrack.sid, mute);

    return new Response(JSON.stringify({ message: `Participant ${targetIdentity} audio track ${audioTrack.sid} ${mute ? 'muted' : 'unmuted'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('Error in moderate-livekit-room function:', e);
    return new Response(JSON.stringify({ error: e.message || 'Failed to process request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
