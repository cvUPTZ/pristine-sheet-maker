
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getAllowedOrigin = () => Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

const getCorsHeaders = (method: string) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS', // Specific to this function
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.method);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profiles and roles
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, created_at, updated_at, full_name');

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    const { data: rolesData, error: allRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    if (allRolesError) {
      throw new Error(`Error fetching user roles: ${allRolesError.message}`);
    }

    // Fetch all authenticated users to get their emails
    // Note: This can be resource-intensive for a very large number of users.
    // Consider pagination or more targeted queries if performance becomes an issue.
    const { data: { users: authUsers }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      throw new Error(`Error fetching auth users: ${listUsersError.message}`);
    }

    const usersWithRolesAndEmail = profilesData.map((profile: any) => {
      const userRole = rolesData.find((r: any) => r.user_id === profile.id);
      const authUser = authUsers.find((u: any) => u.id === profile.id);
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: authUser ? authUser.email : null, // Actual email from auth.users
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        role: userRole ? userRole.role : 'user', // Default to 'user' if no specific role found
      };
    });

    return new Response(JSON.stringify(usersWithRolesAndEmail), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-users function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
