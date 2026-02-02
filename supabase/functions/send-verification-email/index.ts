import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string;

const generateVerificationEmail = (email: string, verificationLink: string) => {
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
  console.log("=== Email Verification Function Started ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers));

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.text();
    console.log("Raw payload received:", payload.substring(0, 200) + "...");

    const headers = Object.fromEntries(req.headers);

    // Check if webhook secret is configured
    if (!hookSecret) {
      console.error("SEND_EMAIL_HOOK_SECRET is not configured!");
      throw new Error("Webhook secret not configured");
    }

    const wh = new Webhook(hookSecret);

    let verified;
    try {
      verified = wh.verify(payload, headers) as {
        user: {
          email: string;
        };
        email_data: {
          token: string;
          token_hash: string;
          redirect_to: string;
          email_action_type: string;
        };
      };
    } catch (verifyError) {
      console.error("Webhook verification failed:", verifyError);
      throw new Error("Invalid webhook signature");
    }

    const { user, email_data } = verified;
    const { token_hash, redirect_to } = email_data;

    console.log("Processing verification email for:", user.email);
    console.log("Token hash:", token_hash);
    console.log("Redirect to:", redirect_to);

    // Build verification link - point to frontend /verify with token
    // This ensures same-tab verification instead of opening new tab
<<<<<<< HEAD
    const frontendUrl = redirect_to.split('/verify')[0] // Extract base URL from redirect_to
    const verificationLink = `${frontendUrl}/verify?token=${token_hash}&type=signup`
    
    console.log('Verification link generated:', verificationLink)
=======
    const frontendUrl = redirect_to.split("/verify")[0]; // Extract base URL from redirect_to
    const verificationLink = `${frontendUrl}/verify?token=${token_hash}&type=signup`;

    console.log("Verification link generated:", verificationLink);
>>>>>>> 03b03009182773d19fd219acf9c3269ea6557739

    const html = generateVerificationEmail(user.email, verificationLink);

    // Check Resend API key
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("RESEND_API_KEY not configured!");
      throw new Error("Resend API key not configured");
    }

    console.log("Sending email via Resend...");
    const { data, error } = await resend.emails.send({
      from: "Matchmaker Flori <onboarding@resend.dev>",
      to: [user.email],
      subject: "Verifieer je e-mailadres - indebuurt ontmoet",
      html,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw error;
    }

    console.log("✅ Email sent successfully!");
    console.log("Resend response:", data);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: data?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send verification email";
    const errorCode = (error as any)?.code || "UNKNOWN_ERROR";

    return new Response(
      JSON.stringify({
        error: {
          code: errorCode,
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
