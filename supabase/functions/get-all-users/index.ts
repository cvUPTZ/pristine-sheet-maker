import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS', // Specify allowed methods
};

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is GET
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    // Authenticate the user making the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(JSON.stringify({ error: userError?.message || 'Authentication failed' }), {
        status: 401, // Unauthorized
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorize: Check if the authenticated user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('Role fetch error:', roleError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user role for authorization.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin.' }), {
        status: 403, // Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If authorized, proceed to fetch all profiles and roles
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, created_at, full_name'); // Assuming email is not in profiles, using full_name as per existing Admin.tsx

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    const { data: rolesData, error: allRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (allRolesError) {
      console.error('All roles fetch error:', allRolesError);
      throw new Error(`Error fetching user roles: ${allRolesError.message}`);
    }

    // Combine profiles and roles data
    const usersWithRoles = profilesData.map((profile: any) => {
      const userRole = rolesData.find((r: any) => r.user_id === profile.id);
      return {
        id: profile.id,
        // 'email' field in Admin.tsx was using profile.full_name. Replicating that logic.
        // If actual email is needed, it would require fetching from auth.users table for all users,
        // which is a more complex operation for an admin client.
        // Sticking to current Admin.tsx behavior where 'email' displays 'full_name'.
        email: profile.full_name, 
        created_at: profile.created_at,
        role: userRole ? userRole.role : null,
      };
    });

    return new Response(JSON.stringify({ usersWithRoles }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Overall error in get-all-users function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
