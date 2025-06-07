// Supabase Edge Function: moderate-webrtc-participant
// Purpose: Allows an admin/coordinator to send a mute/unmute command to a participant.
// Inputs:
//   - Authorization header: Bearer <SUPABASE_JWT> (of an admin/coordinator)
//   - JSON body: { "roomId": "string", "targetUserId": "string", "mute": boolean }
// Outputs:
//   - Success (200 OK): { "message": "Moderation command sent" }
//   - Failure (40x/500): { "error": "string" }
// Key Operations:
//   1. Validates request and admin authentication.
//   2. Inserts an 'admin-set-mute-request' message into the 'realtime_transient_messages' table,
//      targeted at the `targetUserId`.
//   3. The target client's WebRTCManager is expected to handle this message and apply the mute state.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// TODO: Replace with your specific frontend domain(s) for production security.
// It's good practice to limit this to your actual frontend URL.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Example: 'https://your-app.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ModerateRequest {
  roomId: string;
  targetUserId: string; // Changed from targetIdentity
  mute: boolean;       // true to mute, false to unmute
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
    console.error('Error fetching profile or profile not found for user:', user.id, profileError?.message);
    return false;
  }

  return profile.role === 'admin' || profile.role === 'coordinator';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // Or service_role key if preferred for admin actions

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase URL or Anon Key not set in environment variables.');
        return new Response(JSON.stringify({ error: 'Server configuration error for Supabase.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { roomId, targetUserId, mute } = await req.json() as ModerateRequest;

    if (!roomId || !targetUserId || typeof mute !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing required fields: roomId, targetUserId, mute (boolean)' }), {
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

    // Initialize Supabase client with the user's JWT to check their permissions
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const isAdmin = await checkAdminPermission(supabaseUserClient);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Permission denied. Caller is not an admin or coordinator.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If using RLS for insert with user's JWT is fine, use supabaseUserClient.
    // If this function needs to bypass RLS or act as a service role for inserts,
    // initialize a new client with the service_role key.
    // For inserting into realtime_transient_messages, user's own auth context is fine
    // as RLS policy `Enable insert for authorized users` checks `auth.uid() = sender_id`.
    // The `sender_id` column in `realtime_transient_messages` has `DEFAULT auth.uid()`.

    const messageToInsert = {
      room_id: roomId,
      to_user_id: targetUserId,
      message_type: 'admin-set-mute-request',
      payload: { muted: mute, moderatorId: supabaseUserClient.auth.getUser() ? (await supabaseUserClient.auth.getUser()).data.user?.id : null } // Add moderatorId for audit/client verification
      // sender_id will be automatically set to the authenticated user's ID (the admin/coordinator) by table default + RLS policy
    };

    const { error: insertError } = await supabaseUserClient // or supabaseServiceRoleClient if needed
      .from('realtime_transient_messages')
      .insert([messageToInsert]);

    if (insertError) {
      console.error(`Error inserting moderation message into realtime_transient_messages:`, insertError);
      return new Response(JSON.stringify({ error: `Failed to send moderation command: ${insertError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: `Moderation command (mute: ${mute}) sent to user ${targetUserId} in room ${roomId}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('Error in moderate-webrtc-participant function:', e);
    return new Response(JSON.stringify({ error: e.message || 'Failed to process request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
