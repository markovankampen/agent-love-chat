import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERSION = "v1.0.0";

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  console.log(`[${VERSION}] Custom verification email function called`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      console.error(`[${VERSION}] RESEND_API_KEY not configured`);
      throw new Error("RESEND_API_KEY not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[${VERSION}] Supabase credentials not configured`);
      throw new Error("Supabase credentials not configured");
    }

    const { user_id, email, redirect_url } = await req.json();

    if (!user_id || !email) {
      throw new Error("user_id and email are required");
    }

    console.log(`[${VERSION}] Processing verification for: ${email}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    // Generate a unique verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store the token in the database
    const { error: insertError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id,
        email,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error(`[${VERSION}] Failed to store token:`, insertError);
      throw new Error("Failed to create verification token");
    }

    // Build verification link
    const baseUrl = redirect_url || "https://agent-love-chat.lovable.app";
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;

    console.log(`[${VERSION}] Verification link: ${verificationLink}`);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Matchmaker Flori <noreply@matchmakerflori.nl>",
      to: [email],
      subject: "Verifieer je e-mailadres - Matchmaker Flori",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifieer je e-mailadres</title>
          </head>
          <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f6f6f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #e11d48; margin-bottom: 10px;">❤️ Welkom bij Matchmaker Flori!</h1>
              </div>
              
              <p style="color: #333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Bedankt voor je registratie. Klik op onderstaande knop om je e-mailadres te verifiëren:
              </p>
              
              <div style="margin: 32px 0; text-align: center;">
                <a href="${verificationLink}" 
                   style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #e11d48 0%, #be185d 100%); color: #ffffff; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px;">
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
                Als je geen account hebt aangemaakt, kun je deze e-mail negeren. Deze link verloopt over 24 uur.
              </p>
              
              <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">
                Dit is een automatisch gegenereerde e-mail van Matchmaker Flori.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error(`[${VERSION}] Resend error:`, emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log(`[${VERSION}] Email sent successfully:`, emailData?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification email sent",
        email_id: emailData?.id,
        _version: VERSION,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${VERSION}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        _version: VERSION,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
