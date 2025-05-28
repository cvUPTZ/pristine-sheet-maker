import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers - adjust origin for production
const getAllowedOrigin = () => Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

const getCorsHeaders = (method: string) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify allowed methods for this function
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.method);
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, fullName, role } = await req.json();

    // Basic validation
    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, fullName, and role are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate role (optional, but good practice)
    const allowedRoles = ['admin', 'teacher', 'user', 'tracker']; // Updated roles
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role specified.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase admin client - this client will be used for administrative actions
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

    // Authenticate the user making the request to ensure they are an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header. Only admins can create users.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: callingUserError } = await supabaseAdmin.auth.getUser(token);

    if (callingUserError || !callingUser) {
      return new Response(JSON.stringify({ error: callingUserError?.message || 'Authentication failed for calling user.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorize: Check if the authenticated user is an admin
    const { data: roleData, error: roleFetchError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleFetchError) {
      console.error('Calling user role fetch error:', roleFetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch calling user role for authorization.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Calling user is not an admin.' }), {
        status: 403, // Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If authorized, proceed with creating the new user (Step 1)
    // Step 1: Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName, role: role }, // Including role in user_metadata can be useful
      email_confirm: true, // Set to true to send a confirmation email
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      throw new Error(`Auth error: ${authError.message}`);
    }
    if (!authData.user) {
      console.error('User creation failed to return user data.');
      throw new Error('User creation did not return user data.');
    }

    const userId = authData.user.id;

    // Step 2: Insert into public.profiles table
    // Assumes 'profiles' table has 'id' (UUID, FK to auth.users.id) and 'full_name' (text)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId, full_name: fullName }); // created_at should be handled by default value or trigger
    
    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Attempt to clean up the auth user if profile insertion fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log(`Attempted to delete auth user ${userId} due to profile insertion failure.`);
      throw new Error(`Profile error: ${profileError.message}`);
    }

    // Step 3: Insert into public.user_roles table
    // Assumes 'user_roles' table has 'user_id' (UUID, FK to auth.users.id) and 'role' (text)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: role });

    if (roleError) {
      console.error('User role creation error:', roleError);
      // Attempt to clean up the auth user and profile if role insertion fails
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.error(`Failed to delete auth user ${userId} after role insertion failure:`, deleteUserError.message);
        // Depending on policy, you might want to throw a more complex error indicating partial cleanup
      } else {
        console.log(`Deleted auth user ${userId} due to role insertion failure.`);
      }
      
      // Attempt to delete the profile entry
      const { error: deleteProfileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (deleteProfileError) {
        console.error(`Failed to delete profile for user ${userId} after role insertion failure:`, deleteProfileError.message);
        // Again, consider how to report this. The user is likely gone from auth, but profile might be orphaned.
      } else {
        console.log(`Deleted profile for user ${userId} due to role insertion failure.`);
      }
      
      throw new Error(`Role error: ${roleError.message}. Cleanup of auth user and profile attempted.`);
    }

    return new Response(JSON.stringify({ message: 'User created successfully', userId }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Overall error in create-user function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      status: error.message.startsWith('Auth error:') || error.message.startsWith('Profile error:') || error.message.startsWith('Role error:') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
