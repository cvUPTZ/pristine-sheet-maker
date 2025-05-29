
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user's session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Role check error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Failed to check user permissions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const isAdmin = userRoles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get tracker users from user_roles table
    const { data: trackerRoles, error: trackerRolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'tracker')

    if (trackerRolesError) {
      console.error('Error fetching tracker roles:', trackerRolesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tracker roles' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!trackerRoles || trackerRoles.length === 0) {
      return new Response(
        JSON.stringify([]),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get tracker user IDs
    const trackerUserIds = trackerRoles.map(tr => tr.user_id)

    // Fetch profiles for tracker users
    const { data: trackerProfiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name')
      .in('id', trackerUserIds)

    if (profilesError) {
      console.error('Error fetching tracker profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tracker profiles' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get emails from auth.users for these tracker users
    const { data: { users: authUsers }, error: authUsersError } = await supabaseClient.auth.admin.listUsers()

    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user emails' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Combine profile and auth data
    const trackersWithEmails = trackerProfiles?.map(profile => {
      const authUser = authUsers?.find(au => au.id === profile.id)
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: authUser?.email || 'No email'
      }
    }) || []

    console.log(`Found ${trackersWithEmails.length} tracker users`)

    return new Response(
      JSON.stringify(trackersWithEmails),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-tracker-users function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
