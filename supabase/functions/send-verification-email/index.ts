import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

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
  `
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    
    const {
      user,
      email_data: { token_hash, redirect_to },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
      }
    }

    console.log('Sending verification email to:', user.email)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const verificationLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=email&redirect_to=${redirect_to}`

    const html = generateVerificationEmail(user.email, verificationLink)

    const { error } = await resend.emails.send({
      from: 'Agent Love <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Verifieer je e-mailadres',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Verification email sent successfully to:', user.email)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending verification email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email'
    const errorCode = (error as any)?.code || 'UNKNOWN_ERROR'
    
    return new Response(
      JSON.stringify({
        error: {
          code: errorCode,
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
