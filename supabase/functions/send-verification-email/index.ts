import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const generateVerificationEmail = (email: string, verificationLink: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifieer je e-mailadres</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <h1 style="color: #333; font-size: 28px; font-weight: bold; margin: 0 0 24px 0;">Welkom!</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 24px; margin: 16px 0;">
            Bedankt voor je registratie. Klik op onderstaande knop om je e-mailadres te verifiëren:
          </p>
          
          <div style="margin: 32px 0;">
            <a href="${verificationLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log("=== Send Verification Email Function Started ===");

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { email, redirectUrl } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log("Processing verification email for:", email);

    // Create admin client to generate magic link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") as string,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
    );

    // Generate a verification link for the user
    // Try "signup" first, fall back to "magiclink" if user already exists
    let otpData;
    let otpError;

    const result = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: redirectUrl || "https://indebuurtontmoet.nl/api-verify",
      },
    });

    otpData = result.data;
    otpError = result.error;

    if (otpError) {
      console.error("Link generation error:", otpError);
      throw otpError;
    }

    console.log("Link generated, hashed_token available:", !!otpData?.properties?.hashed_token);

    // Extract the token_hash from the action link
    const actionLink = otpData?.properties?.action_link;
    if (!actionLink) {
      throw new Error("Failed to generate verification link");
    }

    // Parse the action link to get token_hash
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get("token") || actionUrl.hash?.match(/token=([^&]+)/)?.[1];

    // Build our custom verification link pointing to /api-verify
    const baseUrl = redirectUrl ? new URL(redirectUrl).origin : "https://indebuurtontmoet.nl";
    const verificationLink = `${baseUrl}/api-verify?token_hash=${encodeURIComponent(otpData.properties.hashed_token)}&type=signup`;

    console.log("Verification link:", verificationLink);

    const html = generateVerificationEmail(email, verificationLink);

    console.log("Sending email via Resend...");
    const { data, error } = await resend.emails.send({
      from: "Matchmaker Flori <noreply@matchmakerflori.nl>",
      to: [email],
      subject: "Verifieer je e-mailadres - indebuurt ontmoet",
      html,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw error;
    }

    console.log("✅ Email sent successfully! ID:", data?.id);

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";

    return new Response(
      JSON.stringify({ error: { message: errorMessage } }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
