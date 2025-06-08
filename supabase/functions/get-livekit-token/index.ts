
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// You'll need to set these in your Supabase secrets
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY') || ''
const LIVEKIT_SECRET_KEY = Deno.env.get('LIVEKIT_SECRET_KEY') || ''
const LIVEKIT_SERVER_URL = Deno.env.get('LIVEKIT_SERVER_URL') || 'wss://your-livekit-server.com'

// Simple JWT token generation for LiveKit
async function generateLiveKitToken(roomId: string, participantIdentity: string, participantName: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: participantIdentity,
    iat: now,
    exp: now + (6 * 60 * 60), // 6 hours
    room: roomId,
    name: participantName,
    // Grant permissions
    video: {
      room: roomId,
      canPublish: true,
      canSubscribe: true
    }
  }
  
  const encoder = new TextEncoder()
  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(LIVEKIT_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput))
  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${signatureInput}.${signatureEncoded}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roomId, userId, userName, userRole } = await req.json()
    
    if (!roomId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to the room (optional - implement your own logic)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check if the room exists and user has permission
    const { data: room, error: roomError } = await supabaseClient
      .from('voice_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate LiveKit token
    const token = await generateLiveKitToken(roomId, userId, userName || `User ${userId}`)

    return new Response(
      JSON.stringify({ 
        token,
        serverUrl: LIVEKIT_SERVER_URL,
        roomId,
        participantIdentity: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
