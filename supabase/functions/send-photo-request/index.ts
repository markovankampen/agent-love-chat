import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generatePhotoRequestEmail(firstName: string, magicLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Foto verzoek - Matchmaker Flori</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background-color: #f6f6f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 24px 0;">
            Hoi ${firstName || 'daar'} 👋
          </h1>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            We zijn bezig met het vinden van de perfecte match voor jou! Maar we missen nog een belangrijk onderdeel: <strong>een duidelijke selfie</strong>.
          </p>

          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Met een goede foto kunnen we je veel beter matchen. Het hoeft geen professionele foto te zijn — gewoon een duidelijke selfie waarbij je gezicht goed zichtbaar is.
          </p>
          
          <div style="margin: 32px 0; text-align: center;">
            <a href="${magicLink}" 
               style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              📸 Selfie uploaden
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
            Klik op de knop hierboven om direct in te loggen en je selfie te uploaden. De link is eenmalig geldig.
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

  console.log("=== Send Photo Request Function Started ===");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Parse optional body for targeting specific users
    let targetUserIds: string[] | null = null;
    try {
      const body = await req.json();
      if (body.userIds && Array.isArray(body.userIds)) {
        targetUserIds = body.userIds;
      }
    } catch {
      // No body or invalid JSON — send to all users without permanent photos
    }

    // Find all profiles
    let profileQuery = supabaseAdmin
      .from("profiles")
      .select("id, email, first_name");

    if (targetUserIds) {
      profileQuery = profileQuery.in("id", targetUserIds);
    }

    const { data: allProfiles, error: profileError } = await profileQuery;

    if (profileError) {
      console.error("Error querying profiles:", profileError);
      throw profileError;
    }

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No profiles found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all face_analysis records with a permanent_photo_url
    const { data: faceRecords, error: faceError } = await supabaseAdmin
      .from("face_analysis")
      .select("user_id, permanent_photo_url")
      .not("permanent_photo_url", "is", null);

    if (faceError) {
      console.error("Error querying face_analysis:", faceError);
      throw faceError;
    }

    // Build set of user IDs that already have a permanent photo
    const usersWithPhoto = new Set(
      (faceRecords || [])
        .filter((r) => r.permanent_photo_url)
        .map((r) => r.user_id)
    );

    // Filter to users WITHOUT a permanent photo
    const usersWithoutPhotos = allProfiles.filter((p) => !usersWithPhoto.has(p.id));

    console.log(`Found ${usersWithoutPhotos.length} users without permanent photo (out of ${allProfiles.length} total)`);

    if (usersWithoutPhotos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All users have permanent photos", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Base URL for redirect after magic link login
    const baseUrl = "https://agent-love-chat.lovable.app";
    const redirectTo = `${baseUrl}/profile-setup?photo-only=true`;

    let sentCount = 0;
    let errorCount = 0;
    const results: Array<{ userId: string; email: string; status: string; error?: string }> = [];

    // Helper to wait between emails (Resend allows max 2/sec)
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const user of usersWithoutPhotos) {
      if (!user.email) {
        console.log(`Skipping user ${user.id} - no email`);
        results.push({ userId: user.id, email: "none", status: "skipped", error: "No email" });
        continue;
      }

      try {
        // Generate a magic link that auto-logs the user in and redirects to photo upload
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: user.email,
          options: {
            redirectTo,
          },
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error(`Error generating magic link for ${user.email}:`, linkError);
          results.push({ userId: user.id, email: user.email, status: "error", error: linkError?.message || "No link generated" });
          errorCount++;
          continue;
        }

        const magicLink = linkData.properties.action_link;

        // Send email via Resend
        const html = generatePhotoRequestEmail(user.first_name || "", magicLink);

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Matchmaker Flori <noreply@matchmakerflori.nl>",
          to: [user.email],
          subject: "📸 We missen nog je selfie — Matchmaker Flori",
          html,
        });

        if (emailError) {
          console.error(`Error sending email to ${user.email}:`, emailError);
          results.push({ userId: user.id, email: user.email, status: "error", error: String(emailError) });
          errorCount++;
          continue;
        }

        console.log(`✅ Email sent to ${user.email}, ID: ${emailData?.id}`);
        results.push({ userId: user.id, email: user.email, status: "sent" });
        sentCount++;

        // Rate limit: wait 600ms between sends to stay under 2/sec
        await delay(600);

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.push({ userId: user.id, email: user.email, status: "error", error: String(userError) });
        errorCount++;
      }
    }

    console.log(`=== Done: ${sentCount} sent, ${errorCount} errors ===`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errorCount,
        total: usersWithoutPhotos.length,
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
