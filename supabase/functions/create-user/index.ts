import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers - adjust origin for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific frontend domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify allowed methods
};

serve(async (req) => {
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
    const allowedRoles = ['admin', 'tracker', 'viewer']; // Example roles
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role specified.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Initialize Supabase admin client
    // IMPORTANT: Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your Edge Function's environment variables
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          // It's generally a good practice to explicitly state autoRefreshToken, persistSession, detectSessionInUrl
          // For admin client, these might not be strictly necessary but good to be aware of.
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

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
      await supabaseAdmin.auth.admin.deleteUser(userId);
      // No direct Supabase method to delete profile by user_id easily without another query,
      // but if profiles.id is FK to auth.users.id with ON DELETE CASCADE, it might be handled.
      // Otherwise, manual deletion or a trigger is needed for full cleanup.
      console.log(`Attempted to delete auth user ${userId} due to role insertion failure.`);
      throw new Error(`Role error: ${roleError.message}`);
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
