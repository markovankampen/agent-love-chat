import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_EMAILS = [
  "florian@indebuurt.nl",
  "kristen@indebuurt.nl",
  "shakeebprogrammer@gmail.com",
  "markovankampen@gmail.com",
];

function generateReuploadEmail(firstName: string, reuploadLink: string): string {
  const name = firstName || "daar";
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vul je account aan - Matchmaker Flori</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 24px 0;">
            Hi ${name},
          </h1>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Wat een start! Sinds 5 februari hebben al 700+ singles zich aangemeld in Twente en de eerste matches worden gemaakt.
          </p>

          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Door een technisch foutje in deze betafase is bij jouw account de foto en/of geboortedatum niet opgeslagen.
          </p>

          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Om gematcht te worden, moet je account compleet zijn.
            Je foto is voor niemand zichtbaar (ook niet voor een match) en wordt alleen gebruikt om een goede match te maken. We gaan zorgvuldig met je gegevens om.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Vul hier je account aan en maak kans op een leuke match:
          </p>

          <div style="margin: 32px 0; text-align: center;">
            <a href="${reuploadLink}" 
               style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Account aanvullen
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
            Werkt de knop niet? Kopieer en plak deze link in je browser:
          </p>
          <p style="color: #6366f1; font-size: 13px; line-height: 20px; word-break: break-all;">
            ${reuploadLink}
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 24px 0 8px 0;">
            Dank je wel! Wie weet ontvang jij binnenkort dat mailtje: "Je hebt een match." 💜
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

const MAX_RETRIES = 2;

async function sendEmailWithRetry(
  resend: InstanceType<typeof Resend>,
  to: string,
  firstName: string,
  reuploadLink: string,
): Promise<{ success: boolean; resendId?: string; error?: string }> {
  const html = generateReuploadEmail(firstName, reuploadLink);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Matchmaker Flori <info@matchmakerflori.nl>",
        to: [to],
        subject: "Je account is nog niet compleet – actie nodig 💘",
        html,
      });
      if (emailError) {
        console.error(`Resend error for ${to} (attempt ${attempt + 1}):`, emailError);
        if (attempt === MAX_RETRIES) return { success: false, error: String(emailError) };
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { success: true, resendId: emailData?.id };
    } catch (e) {
      console.error(`Exception for ${to} (attempt ${attempt + 1}):`, e);
      if (attempt === MAX_RETRIES) return { success: false, error: String(e) };
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log("=== Send Photo Reupload Batch Started ===");

  try {
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

    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    // Verify admin
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

    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", adminUserId).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    let batchSize = 10;
    let statsOnly = false;
    let testMode = false;
    try {
      const body = await req.json();
      if (body.testMode === true) testMode = true;
      if (body.batchSize !== undefined && typeof body.batchSize === "number") {
        if (body.batchSize === 0) statsOnly = true;
        else if (body.batchSize > 0) batchSize = Math.min(body.batchSize, 500);
      }
    } catch { /* defaults */ }

    // --- TEST MODE ---
    if (testMode) {
      console.log("=== TEST MODE: Sending to test addresses ===");
      const resend = new Resend(resendApiKey);
      const baseUrl = "https://indebuurtontmoet.nl";
      const results: Array<{ email: string; status: string; error?: string }> = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const testEmail of TEST_EMAILS) {
        // Find user by email or use placeholder name
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id, first_name").eq("email", testEmail).maybeSingle();

        const firstName = profile?.first_name || testEmail.split("@")[0];
        const testToken = crypto.randomUUID();
        const reuploadLink = `${baseUrl}/reupload-photo?token=${testToken}`;

        // Store a test token if profile exists
        if (profile) {
          await supabaseAdmin.from("photo_reupload_tokens").insert({
            user_id: profile.id, token: testToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        const result = await sendEmailWithRetry(resend, testEmail, firstName, reuploadLink);
        if (result.success) {
          console.log(`✅ Test email sent to ${testEmail}`);
          results.push({ email: testEmail, status: "sent" });
          sentCount++;
        } else {
          console.error(`❌ Test email failed for ${testEmail}: ${result.error}`);
          results.push({ email: testEmail, status: "failed", error: result.error });
          failedCount++;
        }
        await new Promise((r) => setTimeout(r, 600));
      }

      // Audit log
      await supabaseAdmin.from("admin_audit_log").insert({
        admin_user_id: adminUserId, action: "test_photo_reupload_email",
        target_table: "photo_reupload_emails",
        details: { test_emails: TEST_EMAILS, sent: sentCount, failed: failedCount },
      });

      return new Response(JSON.stringify({
        success: true, testMode: true,
        attempted: TEST_EMAILS.length, sent: sentCount, failed: failedCount, results,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- STATS / BATCH MODE ---
    console.log(`Batch size requested: ${batchSize}`);

    const { data: eligibleProfiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, photo_url")
      .or("photo_url.is.null,photo_url.eq.");

    if (profileError) throw profileError;

    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No eligible users found",
        attempted: 0, sent: 0, failed: 0, totalMissingPhotos: 0, totalAlreadyEmailed: 0, remaining: 0,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: alreadyEmailed } = await supabaseAdmin
      .from("photo_reupload_emails").select("user_id").eq("status", "sent");
    const emailedUserIds = new Set((alreadyEmailed || []).map((r: any) => r.user_id));
    const totalAlreadyEmailed = emailedUserIds.size;
    const totalMissingPhotos = eligibleProfiles.length;
    const eligibleToEmail = eligibleProfiles.filter((p) => !emailedUserIds.has(p.id) && p.email && !p.email.endsWith('@guest.com'));
    const remaining = eligibleToEmail.length;

    if (statsOnly) {
      return new Response(JSON.stringify({
        success: true, attempted: 0, sent: 0, failed: 0,
        totalMissingPhotos, totalAlreadyEmailed, remaining,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const usersToEmail = eligibleToEmail.slice(0, batchSize);

    if (usersToEmail.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "All eligible users have already been emailed",
        attempted: 0, sent: 0, failed: 0, totalMissingPhotos, totalAlreadyEmailed, remaining: 0,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Sending to ${usersToEmail.length} users (${remaining} remaining total)`);

    const resend = new Resend(resendApiKey);
    const baseUrl = "https://indebuurtontmoet.nl";
    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ userId: string; email: string; status: string; error?: string }> = [];

    for (const user of usersToEmail) {
      const reuploadToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin.from("photo_reupload_tokens").insert({
        user_id: user.id, token: reuploadToken, expires_at: expiresAt,
      });

      const reuploadLink = `${baseUrl}/reupload-photo?token=${reuploadToken}`;
      const result = await sendEmailWithRetry(resend, user.email!, user.first_name || "", reuploadLink);

      if (result.success) {
        console.log(`✅ Email sent to ${user.email}`);
        await supabaseAdmin.from("photo_reupload_emails").insert({
          user_id: user.id, email: user.email!, status: "sent", reupload_token: reuploadToken,
        });
        results.push({ userId: user.id, email: user.email!, status: "sent" });
        sentCount++;
      } else {
        console.error(`❌ Failed for ${user.email}: ${result.error}`);
        await supabaseAdmin.from("photo_reupload_emails").insert({
          user_id: user.id, email: user.email!, status: "failed",
          error_message: result.error || "Unknown error", reupload_token: reuploadToken,
        });
        results.push({ userId: user.id, email: user.email!, status: "failed", error: result.error });
        failedCount++;

        // If batch is failing, stop early
        if (failedCount >= 3 && sentCount === 0) {
          console.error("⛔ Too many failures, stopping batch");
          break;
        }
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: adminUserId, action: "batch_photo_reupload_email",
      target_table: "photo_reupload_emails",
      details: { batch_size: batchSize, attempted: results.length, sent: sentCount, failed: failedCount },
    });

    const stoppedEarly = failedCount >= 3 && sentCount === 0;
    console.log(`=== Done: ${sentCount} sent, ${failedCount} failed${stoppedEarly ? " (stopped early)" : ""} ===`);

    return new Response(JSON.stringify({
      success: !stoppedEarly,
      stoppedEarly,
      attempted: results.length,
      sent: sentCount,
      failed: failedCount,
      totalMissingPhotos,
      totalAlreadyEmailed: totalAlreadyEmailed + sentCount,
      remaining: remaining - sentCount,
      results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
