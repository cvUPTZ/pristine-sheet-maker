
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@1.2.7'; // Ensure this version is suitable or use latest
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// TODO: User must set these in Supabase project's Edge Function environment variables
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL'); // e.g., 'https://your-livekit-instance.livekit.cloud'
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');

// Updated CORS headers to include your current domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For development - change to your specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TokenRequest {
  roomId: string;
  participantIdentity: string;
  participantName?: string;
  participantMetadata?: string; // Optional metadata
}

// Helper function to check if user can join the room
// This logic should mirror your RLS or existing permission checks
async function canUserJoinRoom(supabaseClient: any, userId: string, roomId: string): Promise<{ allowed: boolean; role?: string; userName?: string }> {
    // 1. Fetch the room details, including its match_id and permissions
    const { data: roomData, error: roomError } = await supabaseClient
        .from('voice_rooms')
        .select('match_id, permissions, is_private')
        .eq('id', roomId)
        .single();

    if (roomError || !roomData) {
        console.error('Error fetching room or room not found:', roomError?.message);
        return { allowed: false };
    }

    // 2. Fetch user's profile to get their role and name
    const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role, full_name') // Assuming 'full_name' is the display name field
        .eq('id', userId)
        .single();

    if (profileError || !profileData) {
        console.error('Error fetching user profile or profile not found:', profileError?.message);
        // Depending on rules, if a room is public and doesn't require a specific role,
        // a user might join even if their profile isn't fully set up.
        // However, current logic implies role is needed for most checks.
        // For now, if profile fetch fails, consider it a denial unless specific public room logic exists.
        // This part needs careful consideration based on actual access rules.
        // If a room is public (e.g. permissions includes 'all' and is_private is false)
        // and doesn't need a role check, this could be:
        // if (roomData.permissions && roomData.permissions.includes('all') && !roomData.is_private) {
        //   return { allowed: true }; // Name/role will be undefined
        // }
        return { allowed: false }; // Stricter: profile needed for role checks
    }
    const userRole = profileData.role;
    const userName = profileData.full_name;

    // 3. Check admin/coordinator direct access
    if (userRole === 'admin' || userRole === 'coordinator') {
        return { allowed: true, role: userRole, userName: userName };
    }

    // 4. Check room permissions array
    if (roomData.permissions && (roomData.permissions.includes('all') || roomData.permissions.includes(userRole))) {
        return { allowed: true, role: userRole, userName: userName };
    }

    // 5. Check if user is assigned to the match associated with the room (for non-admin/coordinator)
    const { data: assignmentData, error: assignmentError } = await supabaseClient
        .from('match_tracker_assignments')
        .select('id')
        .eq('match_id', roomData.match_id)
        .eq('tracker_user_id', userId)
        .maybeSingle();

    if (assignmentError) {
        console.error('Error fetching match assignment:', assignmentError.message);
        return { allowed: false };
    }

    if (assignmentData) {
        return { allowed: true, role: userRole, userName: userName };
    }

    // Default to not allowed if no other condition met
    return { allowed: false };
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

    const { roomId, participantIdentity, participantName, participantMetadata } = await req.json() as TokenRequest;

    if (!roomId || !participantIdentity) {
      return new Response(JSON.stringify({ error: 'Missing roomId or participantIdentity' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a Supabase client with the auth context of the user calling the function
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // It's crucial to get SUPABASE_URL and SUPABASE_ANON_KEY from env for the client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase URL or Anon Key for client initialization.');
        return new Response(JSON.stringify({ error: 'Server configuration error for Supabase client.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    // Extract actual user ID from JWT for permission check
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || user.id !== participantIdentity) {
          // This check ensures the identity in the token matches the authenticated user,
          // or that an admin is not trying to generate a token for someone else without specific logic for it.
        console.error('User identity mismatch or not authenticated.');
        return new Response(JSON.stringify({ error: 'User identity mismatch or not authenticated.' }), {
            status: 403, // Forbidden
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Permission Check: Ensure the authenticated user can join this roomId
    const permissionResult = await canUserJoinRoom(supabaseClient, user.id, roomId);
    if (!permissionResult.allowed) {
      return new Response(JSON.stringify({ error: 'Permission denied to join this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const fetchedUserRole = permissionResult.role;
    const fetchedUserName = permissionResult.userName;

    const displayName = participantName || fetchedUserName || participantIdentity;

    const tokenMetadata: { userRole?: string } = {};
    if (fetchedUserRole) {
        tokenMetadata.userRole = fetchedUserRole;
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      name: displayName,
      metadata: Object.keys(tokenMetadata).length > 0 ? JSON.stringify(tokenMetadata) : undefined,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      // Other grants like canPublishData, roomAdmin etc. can be added based on role
    });

    const token = await at.toJwt();

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('Error generating LiveKit token:', e);
    return new Response(JSON.stringify({ error: e.message || 'Failed to generate token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
