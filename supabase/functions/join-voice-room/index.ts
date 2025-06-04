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
  // Add other relevant fields if needed by the client
}

interface ErrorResponse {
  error: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust as needed for security
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Note: Supabase Edge Functions currently do not support transactions directly in the same way as PostgreSQL transactions.
// Operations will be performed sequentially with checks. For true atomicity, a database function/procedure called from the edge function would be needed.
async function handleJoinRoom(supabaseClient: SupabaseClient, roomId: string, userId: string, userRole: string) {
  // 1. Fetch room details
  const { data: room, error: roomError } = await supabaseClient
    .from('voice_rooms')
    .select('id, name, max_participants, is_active, permissions')
    .eq('id', roomId)
    .single<VoiceRoom>()

  if (roomError) {
    console.error('Error fetching room:', roomError.message)
    return { status: 500, body: { error: `Database error: ${roomError.message}` } }
  }

  if (!room) {
    return { status: 404, body: { error: 'Room not found' } }
  }

  if (!room.is_active) {
    return { status: 403, body: { error: 'Room is not active' } }
  }

  // 2. Perform permission check
  const allowedRoles = ['tracker', 'admin', 'coordinator']
  const hasPermission =
    room.permissions.includes('all') ||
    room.permissions.includes(userRole) ||
    allowedRoles.includes(userRole)

  if (!hasPermission) {
    // For now, we log a warning but allow, as per original VoiceRoomService logic for better UX in demo.
    // In a production scenario, this should strictly return an error.
    console.warn(`Permission denied for user ${userId} (role: ${userRole}) in room ${roomId}, but allowing for demo purposes.`)
    // return { status: 403, body: { error: 'Permission denied' } };
  }

  // 3. Fetch current participant count
  const { count, error: countError } = await supabaseClient
    .from('voice_room_participants')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)

  if (countError) {
    console.error('Error fetching participant count:', countError.message)
    return { status: 500, body: { error: `Database error: ${countError.message}` } }
  }

  const currentParticipantCount = count || 0

  // 4. Check if room is full
  if (currentParticipantCount >= room.max_participants) {
    return { status: 409, body: { error: 'Room is full' } }
  }

  // 5. Insert/upsert participant
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
    .upsert(participantData) // Use upsert to handle re-joining

  if (participantError) {
    console.error('Error upserting participant:', participantError.message)
    return { status: 500, body: { error: `Database error: ${participantError.message}` } }
  }

  // Re-fetch room to include participant_count potentially, or construct response
  // For simplicity, returning the initial room data and success.
  // A more advanced implementation might re-query the room or update participant_count.
  const responseRoomData = { ...room, participant_count: currentParticipantCount + 1 };


  return { status: 200, body: { message: 'Successfully joined room', room: responseRoomData } }
}

serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with the Auth context of the user that called the function.
    // This is important to ensure RLS policies are respected.
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      // Create client with Auth context of the user that called the function.
      // This will be the user's token from the request Authorization header.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )


    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as JoinRoomRequest
    const { roomId, userId, userRole } = body

    if (!roomId || !userId || !userRole) {
      return new Response(JSON.stringify({ error: 'Missing required fields: roomId, userId, userRole' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`join-voice-room function invoked: roomId=${roomId}, userId=${userId}, userRole=${userRole}`)

    const { status, body: responseBody } = await handleJoinRoom(supabaseClient, roomId, userId, userRole)

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('General error in Edge Function:', error.message)
    return new Response(JSON.stringify({ error: `Unexpected error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
