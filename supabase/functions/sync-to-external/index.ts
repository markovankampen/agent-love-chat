import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNC_TABLES = [
  "profiles",
  "conversations",
  "matches",
  "face_analysis",
  "notification_settings",
  "email_verification_tokens",
  "user_roles",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY")!;

    if (!externalUrl || !externalKey) {
      throw new Error("External Supabase credentials not configured");
    }

    const localClient = createClient(localUrl, localServiceKey);
    const externalClient = createClient(externalUrl, externalKey);

    // Parse request body for webhook-triggered syncs
    let payload: { type?: string; table?: string; record?: Record<string, unknown>; old_record?: Record<string, unknown> } = {};
    
    if (req.method === "POST") {
      const body = await req.text();
      if (body) {
        try {
          payload = JSON.parse(body);
        } catch {
          // Not JSON, treat as full sync
        }
      }
    }

    // If triggered by database webhook with specific change
    if (payload.type && payload.table && payload.record) {
      const { type, table, record, old_record } = payload;
      console.log(`Webhook sync: ${type} on ${table}`, record?.id);

      if (!SYNC_TABLES.includes(table)) {
        return new Response(JSON.stringify({ skipped: true, reason: `Table ${table} not in sync list` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let result;
      if (type === "INSERT" || type === "UPDATE") {
        // Upsert to external
        const { data, error } = await externalClient
          .from(table)
          .upsert(record as Record<string, unknown>, { onConflict: "id" });
        
        if (error) {
          console.error(`Sync error for ${table}:`, error);
          throw error;
        }
        result = { synced: type.toLowerCase(), table, id: record.id };
      } else if (type === "DELETE" && old_record) {
        const { error } = await externalClient
          .from(table)
          .delete()
          .eq("id", old_record.id as string);
        
        if (error) {
          console.error(`Delete sync error for ${table}:`, error);
          throw error;
        }
        result = { synced: "delete", table, id: old_record.id };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full sync mode - verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const authClient = createClient(localUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await authClient.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await localClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For non-webhook, non-auth requests, deny
      // Allow if called internally (no auth header but from webhook)
      const isWebhook = req.headers.get("x-webhook-source") === "database";
      if (!isWebhook) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Full sync: pull all data from local and push to external
    console.log("Starting full sync...");
    const syncResults: Record<string, { synced: number; errors: number }> = {};

    for (const table of SYNC_TABLES) {
      const { data, error } = await localClient.from(table).select("*");

      if (error) {
        console.error(`Error reading ${table}:`, error);
        syncResults[table] = { synced: 0, errors: 1 };
        continue;
      }

      if (!data || data.length === 0) {
        syncResults[table] = { synced: 0, errors: 0 };
        continue;
      }

      // Upsert in batches of 50
      let synced = 0;
      let errors = 0;
      for (let i = 0; i < data.length; i += 50) {
        const batch = data.slice(i, i + 50);
        const { error: upsertError } = await externalClient
          .from(table)
          .upsert(batch, { onConflict: "id" });

        if (upsertError) {
          console.error(`Upsert error for ${table} batch:`, upsertError);
          errors++;
        } else {
          synced += batch.length;
        }
      }

      syncResults[table] = { synced, errors };
    }

    return new Response(
      JSON.stringify({
        synced_at: new Date().toISOString(),
        results: syncResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
