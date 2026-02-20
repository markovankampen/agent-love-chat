import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generatePhotoRequestEmail(firstName: string, reuploadLink: string): string {
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
            <a href="${reuploadLink}" 
               style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              📸 Selfie uploaden
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 22px; margin: 16px 0;">
            Klik op de knop hierboven om direct een selfie te uploaden. De link is 7 dagen geldig.
          </p>
          
          <p style="color: #666; font-size: 14px; line-height: 22px; margin: 24px 0 8px 0;">
            Of kopieer en plak deze link in je browser:
          </p>
          
          <div style="padding: 12px; background-color: #f4f4f4; border-radius: 5px; border: 1px solid #eee; word-break: break-all;">
            <code style="color: #333; font-size: 12px;">${reuploadLink}</code>
          </div>
          
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
    // Verify admin/service role access
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Parse optional body for targeting specific users
    let targetUserIds: string[] | null = null;
    try {
      const body = await req.json();
      if (body.userIds && Array.isArray(body.userIds)) {
        targetUserIds = body.userIds;
      }
    } catch {
      // No body or invalid JSON — send to all users without photos
    }

    // Find users without a photo_url in their profile
    let query = supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, photo_url")
      .is("photo_url", null);

    if (targetUserIds) {
      query = query.in("id", targetUserIds);
    }

    const { data: usersWithoutPhotos, error: queryError } = await query;

    if (queryError) {
      console.error("Error querying profiles:", queryError);
      throw queryError;
    }

    console.log(`Found ${usersWithoutPhotos?.length || 0} users without photos`);

    if (!usersWithoutPhotos || usersWithoutPhotos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users need photo requests", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine base URL for reupload links
    const baseUrl = "https://agent-love-chat.lovable.app";

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
        // Generate a unique token
        const token = generateToken();

        // Store token in database
        const { error: tokenError } = await supabaseAdmin
          .from("photo_reupload_tokens")
          .insert({
            user_id: user.id,
            token,
          });

        if (tokenError) {
          console.error(`Error creating token for ${user.id}:`, tokenError);
          results.push({ userId: user.id, email: user.email, status: "error", error: tokenError.message });
          errorCount++;
          continue;
        }

        // Build reupload link
        const reuploadLink = `${baseUrl}/reupload-photo?token=${token}`;

        // Send email
        const html = generatePhotoRequestEmail(user.first_name || "", reuploadLink);

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
