import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateReuploadEmail(firstName: string, reuploadLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upload je selfie - Matchmaker Flori</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 24px 0;">
            Hoi ${firstName || "daar"} 👋
          </h1>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            We zijn bezig met het vinden van de perfecte match voor jou! Maar we missen nog een belangrijk onderdeel: <strong>een duidelijke selfie</strong>.
          </p>

          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Met een goede foto kunnen we je veel beter matchen. Het hoeft geen professionele foto te zijn — gewoon een duidelijke selfie waarbij je gezicht goed zichtbaar is.
          </p>
          
          <div style="margin: 32px 0; text-align: center;">
            <a href="${reuploadLink}" 
               style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              📸 Selfie uploaden
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
            Werkt de knop niet? Kopieer en plak deze link in je browser:
          </p>
          <p style="color: #6366f1; font-size: 13px; line-height: 20px; word-break: break-all;">
            ${reuploadLink}
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 24px 0 8px 0;">
            Alvast bedankt! 💜
          </p>

          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0;">
            — Team Matchmaker Flori
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          
          <p style="color: #ababab; font-size: 12px; line-height: 18px;">
            Je ontvangt deze e-mail omdat je bent geregistreerd bij Matchmaker Flori. 
            Als je geen account hebt aangemaakt, kun je deze e-mail negeren.
          </p>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log("=== Send Photo Reupload Batch Started ===");

  try {
    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Verify user is admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminUserId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let batchSize = 10;
    let statsOnly = false;
    try {
      const body = await req.json();
      if (body.batchSize !== undefined && typeof body.batchSize === "number") {
        if (body.batchSize === 0) {
          statsOnly = true;
        } else if (body.batchSize > 0) {
          batchSize = Math.min(body.batchSize, 500);
        }
      }
    } catch {
      // Use default batch size
    }

    console.log(`Batch size requested: ${batchSize}`);

    // Fetch users missing photos who are email-verified and haven't been emailed yet
    // Step 1: Get all profiles with custom_email_verified=true and no photo
    const { data: eligibleProfiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, photo_url, custom_email_verified")
      .eq("custom_email_verified", true)
      .or("photo_url.is.null,photo_url.eq.");

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No eligible users found",
          attempted: 0, sent: 0, failed: 0,
          totalMissingPhotos: 0, totalAlreadyEmailed: 0, remaining: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get already-emailed user IDs
    const { data: alreadyEmailed, error: emailedError } = await supabaseAdmin
      .from("photo_reupload_emails")
      .select("user_id")
      .eq("status", "sent");

    if (emailedError) {
      console.error("Error fetching emailed users:", emailedError);
      throw emailedError;
    }

    const emailedUserIds = new Set((alreadyEmailed || []).map((r: any) => r.user_id));
    const totalAlreadyEmailed = emailedUserIds.size;

    // Step 3: Filter out already-emailed users
    const usersToEmail = eligibleProfiles
      .filter((p) => !emailedUserIds.has(p.id) && p.email)
      .slice(0, batchSize);

    const totalMissingPhotos = eligibleProfiles.length;
    const remaining = eligibleProfiles.filter((p) => !emailedUserIds.has(p.id) && p.email).length;

    // Stats-only mode (batchSize=0)
    if (statsOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          attempted: 0, sent: 0, failed: 0,
          totalMissingPhotos, totalAlreadyEmailed, remaining,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (usersToEmail.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All eligible users have already been emailed",
          attempted: 0, sent: 0, failed: 0,
          totalMissingPhotos, totalAlreadyEmailed, remaining: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending to ${usersToEmail.length} users (${remaining} remaining total)`);

    const resend = new Resend(resendApiKey);
    const baseUrl = "https://agent-love-chat.lovable.app";
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ userId: string; email: string; status: string; error?: string }> = [];

    for (const user of usersToEmail) {
      try {
        // Generate a reupload token
        const reuploadToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        // Store token
        const { error: tokenError } = await supabaseAdmin
          .from("photo_reupload_tokens")
          .insert({
            user_id: user.id,
            token: reuploadToken,
            expires_at: expiresAt,
          });

        if (tokenError) {
          console.error(`Token creation error for ${user.email}:`, tokenError);
          // Continue anyway, might be duplicate token
        }

        const reuploadLink = `${baseUrl}/reupload-photo?token=${reuploadToken}`;
        const html = generateReuploadEmail(user.first_name || "", reuploadLink);

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Matchmaker Flori <info@matchmakerflori.nl>",
          to: [user.email!],
          subject: "📸 Upload je selfie om je profiel te activeren — Matchmaker Flori",
          html,
        });

        if (emailError) {
          console.error(`Resend error for ${user.email}:`, emailError);

          // Log failure
          await supabaseAdmin.from("photo_reupload_emails").insert({
            user_id: user.id,
            email: user.email!,
            status: "failed",
            error_message: String(emailError),
            reupload_token: reuploadToken,
          });

          results.push({ userId: user.id, email: user.email!, status: "failed", error: String(emailError) });
          failedCount++;
          continue;
        }

        console.log(`✅ Email sent to ${user.email}, Resend ID: ${emailData?.id}`);

        // Log success
        await supabaseAdmin.from("photo_reupload_emails").insert({
          user_id: user.id,
          email: user.email!,
          status: "sent",
          reupload_token: reuploadToken,
        });

        results.push({ userId: user.id, email: user.email!, status: "sent" });
        sentCount++;

        // Rate limit: 600ms between sends
        await delay(600);
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.push({ userId: user.id, email: user.email!, status: "failed", error: String(userError) });
        failedCount++;
      }
    }

    // Audit log
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action: "batch_photo_reupload_email",
      target_table: "photo_reupload_emails",
      details: {
        batch_size: batchSize,
        attempted: usersToEmail.length,
        sent: sentCount,
        failed: failedCount,
      },
    });

    console.log(`=== Done: ${sentCount} sent, ${failedCount} failed ===`);

    return new Response(
      JSON.stringify({
        success: true,
        attempted: usersToEmail.length,
        sent: sentCount,
        failed: failedCount,
        totalMissingPhotos,
        totalAlreadyEmailed: totalAlreadyEmailed + sentCount,
        remaining: remaining - sentCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
