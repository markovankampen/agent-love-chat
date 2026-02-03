import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

// Generate a simple verification token
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const generateVerificationEmail = (verificationLink: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifieer je e-mailadres</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <h1 style="color: #333; font-size: 28px; font-weight: bold; margin: 0 0 24px 0;">Welkom bij Matchmaker Flori! 💕</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 24px; margin: 16px 0;">
            Bedankt voor je registratie. Klik op onderstaande knop om je e-mailadres te verifiëren:
          </p>
          
          <div style="margin: 32px 0; text-align: center;">
            <a href="${verificationLink}" 
               style="display: inline-block; padding: 14px 32px; background-color: #e11d48; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Verifieer E-mailadres
            </a>
          </div>
          
          <p style="color: #333; font-size: 14px; line-height: 20px; margin: 24px 0 8px 0;">
            Of kopieer en plak deze link in je browser:
          </p>
          
          <div style="padding: 12px; background-color: #f4f4f4; border-radius: 5px; border: 1px solid #eee; word-break: break-all;">
            <code style="color: #333; font-size: 12px;">${verificationLink}</code>
          </div>
          
          <p style="color: #ababab; font-size: 12px; line-height: 18px; margin-top: 24px;">
            Als je geen account hebt aangemaakt, kun je deze e-mail negeren.
          </p>
        </div>
      </body>
    </html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('=== Send Verification Email Function ===');

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { email, userId, baseUrl } = await req.json();

    if (!email || !userId) {
      throw new Error('Email and userId are required');
    }

    console.log('Generating verification token for:', email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Generate verification token
    const verificationToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store token in user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        verification_token: verificationToken,
        verification_token_expires: expiresAt,
      }
    });

    if (updateError) {
      console.error('Error storing verification token:', updateError);
      throw updateError;
    }

    // Build verification link
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}&user_id=${userId}`;
    
    console.log('Verification link generated');

    // Check Resend API key
    if (!Deno.env.get('RESEND_API_KEY')) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const html = generateVerificationEmail(verificationLink);

    console.log('Sending email via Resend...');
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Matchmaker Flori <onboarding@resend.dev>',
      to: [email],
      subject: 'Verifieer je e-mailadres - Matchmaker Flori',
      html,
    });

    if (emailError) {
      console.error('Resend API error:', emailError);
      throw emailError;
    }

    console.log('✅ Verification email sent successfully!');
    console.log('Email ID:', emailData?.id);

    return new Response(JSON.stringify({ 
      success: true,
      email_id: emailData?.id 
    }), {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';

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
