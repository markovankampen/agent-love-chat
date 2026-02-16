import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fire-and-forget sync to external database
async function triggerSync(table: string, type: string, record: Record<string, unknown>) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;
    
    await fetch(`${supabaseUrl}/functions/v1/sync-to-external`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "x-webhook-source": "database",
      },
      body: JSON.stringify({ type, table, record }),
    });
  } catch (_e) { /* non-critical */ }
}

// Phrases that indicate conversation completion
const COMPLETION_PHRASES = [
  "bedankt voor het invullen",
  "we gaan voor je op zoek",
  "het gesprek stopt hier",
  "ik ga nu op zoek naar een match",
  "veel succes met je date",
  "we laten je weten zodra",
  "je hoort snel van ons",
  "we nemen contact op",
  "matchmaking wordt gestart",
];

function isConversationComplete(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return COMPLETION_PHRASES.some((phrase) => lowerContent.includes(phrase));
}

// Trigger the find-match function in the background
async function triggerMatchmaking(userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  console.log("Triggering matchmaking for user:", userId);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/find-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to trigger matchmaking:", response.status, errorText);
    } else {
      const result = await response.json();
      console.log("Matchmaking triggered successfully:", result);
    }
  } catch (error) {
    console.error("Error triggering matchmaking:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Extract JWT token from Authorization header
    const token = authHeader.replace("Bearer ", "");

    // Create client to verify the JWT token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    // Create service role client for saving agent messages (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Authenticated user:", user.id);

    const { message, user_message_id, conversation_history } = await req.json();

    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("N8N_WEBHOOK_URL not configured");
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username, email, matching_complete, photo_url, date_of_birth, first_name, email_verified")
      .eq("id", user.id)
      .single();

    console.log("Sending message to n8n:", webhookUrl);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile?.email || user.email,
          username: profile?.username || user.user_metadata?.username || "",
          user_id: user.id,
          user_message_id,
          message,
          timestamp: new Date().toISOString(),
          conversation_history,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      let agentContent: string;

      const responseText = await response.text();
      console.log("Raw response from n8n:", responseText);
      console.log("Content-Type:", contentType);

      if (!responseText || responseText.trim() === "") {
        console.error("Empty response from n8n webhook");
        throw new Error(
          "N8N webhook returned empty response. Please check your n8n workflow to ensure it returns a response.",
        );
      }

      if (contentType?.includes("application/json")) {
        try {
          const data = JSON.parse(responseText);
          console.log("Parsed JSON response from n8n:", data);
          agentContent = data.response || data.message || data.content || data.text || responseText;
        } catch (jsonError) {
          console.error("Failed to parse JSON, using text response:", jsonError);
          agentContent = responseText;
        }
      } else {
        agentContent = responseText;
      }

      // Save agent response to database using admin client (bypasses RLS)
      const { data: agentMsgData, error: agentMsgError } = await supabaseAdmin
        .from("conversations")
        .insert({
          user_id: user.id,
          role: "agent",
          content: agentContent,
        })
        .select()
        .single();

      if (agentMsgError) {
        console.error("Error saving agent message:", agentMsgError);
      } else if (agentMsgData) {
        triggerSync("conversations", "INSERT", agentMsgData as Record<string, unknown>);
      }

      // ✅ AUTO-COMPLETE PROFILE if essential fields are filled
      if (
        profile?.photo_url &&
        profile?.date_of_birth &&
        profile?.first_name &&
        (!profile?.matching_complete || !profile?.email_verified)
      ) {
        console.log("Auto-completing profile for user:", user.id);
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            matching_complete: true,
            email_verified: true,
          })
          .eq("id", user.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error auto-completing profile:", updateError);
        } else {
          console.log("✅ Profile auto-completed for user:", user.id);
          if (updatedProfile) {
            triggerSync("profiles", "UPDATE", updatedProfile as Record<string, unknown>);
          }
        }
      }

      // Check if conversation is complete and trigger matchmaking
      if (isConversationComplete(agentContent) && !profile?.matching_complete) {
        console.log("Conversation complete detected! Triggering matchmaking...");

        // Use EdgeRuntime.waitUntil if available for background processing
        const runtime = (globalThis as any).EdgeRuntime;
        if (runtime?.waitUntil) {
          runtime.waitUntil(triggerMatchmaking(user.id));
        } else {
          // Fallback: fire and forget
          triggerMatchmaking(user.id).catch((err) => console.error("Background matchmaking error:", err));
        }
      }

      return new Response(
        JSON.stringify({
          content: agentContent,
          id: agentMsgData?.id,
          created_at: agentMsgData?.created_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        // Timeout occurred
        const fallbackContent = "Sorry, het duurt wat langer dan verwacht. Kun je je vraag nog eens proberen? 🙏";

        // Save fallback message using admin client (bypasses RLS)
        const { data: agentMsgData } = await supabaseAdmin
          .from("conversations")
          .insert({
            user_id: user.id,
            role: "agent",
            content: fallbackContent,
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({
            content: fallbackContent,
            id: agentMsgData?.id,
            created_at: agentMsgData?.created_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Error in send-to-n8n function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});