// Supabase Edge Function: custom-webrtc-signaling
// Purpose: Authorizes a user's request to join a specific WebRTC voice room.
// Inputs:
//   - Authorization header: Bearer <SUPABASE_JWT>
//   - JSON body: { "roomId": "string" }
// Outputs:
//   - Success (200 OK): { "authorized": true, "roomId": "string" }
//   - Failure (40x/500): { "authorized": false, "error": "string" }
// Key Operations:
//   1. Validates request and authentication.
//   2. Calls `canUserAccessRoomChannel` to check permissions against `voice_rooms`, `profiles`, and `match_tracker_assignments`.
//   3. Returns an authorization status. This function acts as a pre-flight check before client attempts Realtime subscriptions.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SignalingAuthRequest {
  roomId: string;
}

// Adapted from generate-livekit-token/index.ts
async function canUserAccessRoomChannel(supabaseClient: any, userId: string, roomId: string): Promise<{ authorized: boolean; error?: string }> {
    // 1. Fetch the room details
    const { data: roomData, error: roomError } = await supabaseClient
        .from('voice_rooms')
        .select('match_id, permissions, is_private, is_active')
        .eq('id', roomId)
        .single();

    if (roomError || !roomData) {
        console.error(`Error fetching room ${roomId} or room not found:`, roomError?.message);
        return { authorized: false, error: 'Room not found or error fetching room details.' };
    }

    if (!roomData.is_active) {
        return { authorized: false, error: 'The selected voice room is not active.' };
    }

    // 2. Fetch user's profile
    const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .single();

    if (profileError || !profileData) {
        console.error(`Error fetching profile for user ${userId}:`, profileError?.message);
        // If room is public and doesn't require specific role, could allow.
        // For now, strict: profile needed.
        return { authorized: false, error: 'User profile not found or error fetching profile.' };
    }
    const userRole = profileData.role;

    // 3. Check admin/coordinator direct access
    if (userRole === 'admin' || userRole === 'coordinator') {
        return { authorized: true };
    }

    // 4. Check room permissions array (e.g., for roles like 'tracker', 'player')
    //    and also if room allows 'all' authenticated users.
    if (roomData.permissions && (roomData.permissions.includes('all') || roomData.permissions.includes(userRole))) {
        // Further check if user is part of the match if the room is not 'all' access for their role explicitly
        // This part might need refinement based on how `permissions` array is used.
        // If 'tracker' is in permissions, does it mean ANY tracker, or a tracker assigned to this match?
        // Assuming for now that if userRole is in permissions, they are allowed.
        return { authorized: true };
    }

    // 5. Check if user is assigned to the match associated with the room
    if (!roomData.match_id) {
        // This case should ideally not happen if room is properly configured and not public via 'all'
        console.error(`Room ${roomId} is not associated with any match.`);
        return { authorized: false, error: 'Room configuration error: no associated match.' };
    }

    const { data: assignmentData, error: assignmentError } = await supabaseClient
        .from('match_tracker_assignments') // Assuming this table links users to matches
        .select('id')
        .eq('match_id', roomData.match_id)
        .eq('tracker_user_id', userId) // Assuming 'tracker_user_id' is the column for user_id
        .maybeSingle();

    if (assignmentError) {
        console.error(`Error fetching match assignment for user ${userId} in match ${roomData.match_id}:`, assignmentError.message);
        return { authorized: false, error: 'Error checking match assignment.' };
    }

    if (assignmentData) {
        return { authorized: true };
    }

    // Default to not authorized
    return { authorized: false, error: 'Access to this room channel is denied based on your current assignments and permissions.' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { roomId } = await req.json() as SignalingAuthRequest;

    if (!roomId) {
      return new Response(JSON.stringify({ authorized: false, error: 'Missing roomId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ authorized: false, error: 'Missing authorization header' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase URL or Anon Key for client initialization.');
        return new Response(JSON.stringify({ authorized: false, error: 'Server configuration error for Supabase client.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return new Response(JSON.stringify({ authorized: false, error: 'User not authenticated.' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const permissionResult = await canUserAccessRoomChannel(supabaseClient, user.id, roomId);

    if (!permissionResult.authorized) {
      return new Response(JSON.stringify({ authorized: false, error: permissionResult.error, roomId }), {
        status: 403, // Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ authorized: true, roomId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('Error in custom-webrtc-signaling function:', e);
    return new Response(JSON.stringify({ authorized: false, error: e.message || 'Failed to process request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
