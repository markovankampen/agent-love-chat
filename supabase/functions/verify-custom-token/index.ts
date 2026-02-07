import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERSION = "v1.0.0";

serve(async (req) => {
  console.log(`[${VERSION}] Verify custom token function called`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const { token } = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }

    console.log(`[${VERSION}] Verifying token...`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the token
    const { data: tokenRecord, error: findError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (findError) {
      console.error(`[${VERSION}] Error finding token:`, findError);
      throw new Error("Failed to verify token");
    }

    if (!tokenRecord) {
      console.log(`[${VERSION}] Token not found`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token",
          _version: VERSION,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already verified
    if (tokenRecord.verified_at) {
      console.log(`[${VERSION}] Token already verified`);
      return new Response(
        JSON.stringify({
          success: true,
          already_verified: true,
          user_id: tokenRecord.user_id,
          _version: VERSION,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if expired
    const expiresAt = new Date(tokenRecord.expires_at);
    if (expiresAt < new Date()) {
      console.log(`[${VERSION}] Token expired`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token has expired",
          _version: VERSION,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark token as verified
    const { error: updateTokenError } = await supabase
      .from("email_verification_tokens")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    if (updateTokenError) {
      console.error(`[${VERSION}] Error updating token:`, updateTokenError);
      throw new Error("Failed to verify token");
    }

    // Update profile to mark email as verified
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ 
        custom_email_verified: true,
        email_verified: true 
      })
      .eq("id", tokenRecord.user_id);

    if (updateProfileError) {
      console.error(`[${VERSION}] Error updating profile:`, updateProfileError);
      // Don't fail - token is already verified
    }

    console.log(`[${VERSION}] Email verified successfully for user: ${tokenRecord.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: tokenRecord.user_id,
        email: tokenRecord.email,
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
