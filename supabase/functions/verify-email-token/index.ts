import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('=== Verify Email Token Function ===');

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      throw new Error('Token and userId are required');
    }

    console.log('Verifying token for user:', userId);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Get user and check token
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      console.error('User not found:', userError);
      throw new Error('User not found');
    }

    const storedToken = userData.user.user_metadata?.verification_token;
    const expiresAt = userData.user.user_metadata?.verification_token_expires;

    if (!storedToken || storedToken !== token) {
      console.error('Invalid token');
      throw new Error('Invalid verification token');
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      console.error('Token expired');
      throw new Error('Verification token has expired');
    }

    // Mark email as verified in profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    // Clear the verification token from user metadata
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        verification_token: null,
        verification_token_expires: null,
      }
    });

    console.log('✅ Email verified successfully!');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email verified successfully'
    }), {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify email';

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
