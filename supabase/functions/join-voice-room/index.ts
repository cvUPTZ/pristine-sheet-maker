import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface JoinRoomRequest {
  roomId: string;
  userId: string;
  userRole: string;
}

interface VoiceRoom {
  id: string;
  name: string;
  max_participants: number;
  is_active: boolean;
  permissions: string[];
  match_id: string | null; // Added match_id
  // Add other relevant fields if needed by the client
}

interface ErrorResponse {
  error: string;
}

// TODO: Replace with your specific frontend domain(s) for production security.
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://REPLACE_WITH_YOUR_ACTUAL_DOMAIN.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Note: Supabase Edge Functions currently do not support transactions directly in the same way as PostgreSQL transactions.
// Operations will be performed sequentially with checks. For true atomicity, a database function/procedure called from the edge function would be needed.
async function handleJoinRoom(supabaseClient: SupabaseClient, roomId: string, userId: string, userRole: string) {
  console.log(`[join-voice-room] handleJoinRoom started. Room ID: ${roomId}, User ID: ${userId}, User Role: ${userRole}`);

  // 1. Fetch room details
  console.log(`[join-voice-room] Fetching room details for Room ID: ${roomId}`);
  const { data: room, error: roomError } = await supabaseClient
    .from('voice_rooms')
    .select('id, name, max_participants, is_active, permissions, match_id') // Added match_id
    .eq('id', roomId)
    .single<VoiceRoom>()

  if (roomError) {
    console.error(`[join-voice-room] Error fetching room ${roomId}:`, roomError.message);
    return { status: 500, body: { error: `Database error: ${roomError.message}` } };
  }

  if (!room) {
    console.log(`[join-voice-room] Room not found: ${roomId}`);
    return { status: 404, body: { error: 'Room not found' } };
  }
  console.log(`[join-voice-room] Fetched room details for ${roomId}:`, room);

  if (!room.is_active) {
    console.log(`[join-voice-room] Room ${roomId} is not active.`);
    return { status: 403, body: { error: 'Room is not active' } };
  }
  console.log(`[join-voice-room] Room ${roomId} is active.`);

  // 2. Perform permission check
  console.log(`[join-voice-room] Performing permission check for User ID: ${userId} (Role: ${userRole}) in Room ID: ${roomId}`);
  const adminRoles = ['admin', 'coordinator']; // Roles that grant automatic access if listed in room.permissions or generally
  let hasPermission =
    room.permissions.includes('all') ||
    room.permissions.includes(userRole) || // If user's specific role is listed
    adminRoles.includes(userRole); // Admins/Coordinators get general access if their role is in room.permissions (already checked) or by default for some configurations

  console.log(`[join-voice-room] Initial permission check result for User ID ${userId} (Role: ${userRole}): ${hasPermission}. Room permissions: ${room.permissions}`);

  // Enhanced permission check for 'tracker' role
  if (!hasPermission && userRole === 'tracker') {
    console.log(`[join-voice-room] Initial permission denied for tracker ${userId}. Checking match assignment.`);
    if (!room.match_id) {
      console.log(`[join-voice-room] Room ${roomId} does not have a match_id. Tracker ${userId} cannot be validated via match assignment.`);
    } else {
      console.log(`[join-voice-room] Checking match_tracker_assignments for tracker_user_id: ${userId} and match_id: ${room.match_id}`);
      const { data: assignment, error: assignmentError } = await supabaseClient
        .from('match_tracker_assignments')
        .select('*', { count: 'exact' })
        .eq('tracker_user_id', userId)
        .eq('match_id', room.match_id)
        .maybeSingle(); // Use maybeSingle to get one record or null, not an error if empty

      if (assignmentError) {
        console.error(`[join-voice-room] Error fetching match_tracker_assignments for tracker ${userId} in match ${room.match_id}:`, assignmentError.message);
        // Decide if this is a fatal error or just denies permission. For now, assume it denies permission.
      } else if (assignment) {
        console.log(`[join-voice-room] Tracker ${userId} IS assigned to match ${room.match_id}. Granting permission.`);
        hasPermission = true;
      } else {
        console.log(`[join-voice-room] Tracker ${userId} is NOT assigned to match ${room.match_id}. Permission remains denied based on this check.`);
      }
    }
  }

  if (!hasPermission) {
    console.log(`[join-voice-room] Final permission denied for User ID: ${userId} (Role: ${userRole}) in Room ID: ${roomId}.`);
    return { status: 403, body: { error: 'Permission denied' } };
  }
  console.log(`[join-voice-room] Final permission granted for User ID: ${userId} in Room ID: ${roomId}`);

  // 3. Fetch current participant count using RPC
  console.log(`[join-voice-room] Fetching current participant count for Room ID: ${roomId} using RPC 'get_room_participant_count'.`);
  const { data: rpcData, error: countError } = await supabaseClient.rpc('get_room_participant_count', {
    room_id_param: roomId // Ensure the parameter name matches the SQL function
  });

  if (countError) {
    console.error(`[join-voice-room] Error fetching participant count via RPC for Room ID: ${roomId}:`, countError.message);
    return { status: 500, body: { error: `Database error fetching participant count: ${countError.message}` } };
  }

  // The data returned by RPC is the count itself, not an object with a count property
  const currentParticipantCount = rpcData as number ?? 0; // Use nullish coalescing for undefined or null
  console.log(`[join-voice-room] Current participant count for Room ID: ${roomId} via RPC is ${currentParticipantCount}. Max participants: ${room.max_participants}`);

  // 4. Check if room is full
  if (currentParticipantCount >= room.max_participants) {
    console.log(`[join-voice-room] Room ${roomId} is full. Participants: ${currentParticipantCount}, Max: ${room.max_participants}`);
    return { status: 409, body: { error: 'Room is full' } };
  }
  console.log(`[join-voice-room] Room ${roomId} is not full. Proceeding with participant upsert.`);

  // 5. Insert/upsert participant
  console.log(`[join-voice-room] Attempting to upsert participant User ID: ${userId} into Room ID: ${roomId}`);
  const participantData = {
    room_id: roomId,
    user_id: userId,
    user_role: userRole,
    is_muted: true,
    is_speaking: false,
    connection_quality: 'good',
    joined_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
  }

  const { error: participantError } = await supabaseClient
    .from('voice_room_participants')
    .upsert(participantData, {
      onConflict: 'room_id,user_id',
      ignoreDuplicates: false // Ensure it updates on conflict
    });

  if (participantError) {
    console.error(`[join-voice-room] Error upserting participant User ID: ${userId} into Room ID: ${roomId}:`, participantError.message);
    return { status: 500, body: { error: `Database error: ${participantError.message}` } };
  }
  console.log(`[join-voice-room] Successfully upserted participant User ID: ${userId} into Room ID: ${roomId}`);

  // Re-fetch room to include participant_count potentially, or construct response
  // For simplicity, returning the initial room data and success.
  // A more advanced implementation might re-query the room or update participant_count.
  const responseRoomData = { ...room, participant_count: currentParticipantCount + 1 };

  console.log(`[join-voice-room] Successfully processed join request for User ID: ${userId} in Room ID: ${roomId}.`);
  return { status: 200, body: { authorized: true, message: 'Successfully joined room', room: responseRoomData } };
}

serve(async (req: Request) => {
  const functionName = 'join-voice-room';
  console.log(`[${functionName}] Function invoked. Method: ${req.method}`);

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${functionName}] Handling OPTIONS request.`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[${functionName}] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.`);
      const errorBody = { error: 'Server configuration error' };
      console.log(`[${functionName}] Sending error response: Status 500, Body:`, errorBody);
      return new Response(JSON.stringify(errorBody), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[${functionName}] Supabase URL and Anon Key retrieved.`);

    // Create Supabase client with the Auth context of the user that called the function.
    // This is important to ensure RLS policies are respected.
    console.log(`[${functionName}] Creating Supabase client with user's Auth context.`);
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      // Create client with Auth context of the user that called the function.
      // This will be the user's token from the request Authorization header.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )


    if (req.method !== 'POST') {
      console.warn(`[${functionName}] Method not allowed: ${req.method}. Required: POST.`);
      const errorBody = { error: 'Method not allowed' };
      console.log(`[${functionName}] Sending error response: Status 405, Body:`, errorBody);
      return new Response(JSON.stringify(errorBody), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[${functionName}] Request method is POST. Proceeding to parse body.`);

    let body;
    try {
      body = await req.json() as JoinRoomRequest;
      console.log(`[${functionName}] Request body parsed successfully:`, body);
    } catch (e) {
      console.error(`[${functionName}] Error parsing request body:`, e.message);
      const errorBody = { error: 'Invalid JSON body' };
      console.log(`[${functionName}] Sending error response: Status 400, Body:`, errorBody);
      return new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Note: userRole is client-provided. For critical permission logic within this function
    // that isn't already covered by RLS based on auth.uid(), consider fetching the user's
    // role from the database using auth.uid() for enhanced security.
    // RLS policies on table access are the primary security layer.
    const { roomId, userId, userRole } = body;
    console.log(`[${functionName}] Extracted from body - Room ID: ${roomId}, User ID: ${userId}, User Role: ${userRole}`);

    if (!roomId || !userId || !userRole) {
      console.warn(`[${functionName}] Missing required fields: roomId=${roomId}, userId=${userId}, userRole=${userRole}`);
      const errorBody = { error: 'Missing required fields: roomId, userId, userRole' };
      console.log(`[${functionName}] Sending error response: Status 400, Body:`, errorBody);
      return new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[${functionName}] All required fields are present.`);

    // console.log(`join-voice-room function invoked: roomId=${roomId}, userId=${userId}, userRole=${userRole}`) // Original log, now covered by the line above.

    const { status, body: responseBody } = await handleJoinRoom(supabaseClient, roomId, userId, userRole);
    console.log(`[${functionName}] handleJoinRoom returned: Status ${status}, Body:`, responseBody);

    console.log(`[${functionName}] Sending final response: Status ${status}, Body:`, responseBody);
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${functionName}] General error in Edge Function:`, error.message, error.stack);
    const errorBody = { error: `Unexpected error: ${error.message}` };
    console.log(`[${functionName}] Sending error response due to caught exception: Status 500, Body:`, errorBody);
    return new Response(JSON.stringify(errorBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
