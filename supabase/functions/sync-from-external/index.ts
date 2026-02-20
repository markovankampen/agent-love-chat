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
  "user_activity",
  "photo_reupload_tokens",
  "admin_audit_log",
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

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const localAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(localUrl, localAnonKey, {
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

    // Parse optional table filter
    const url = new URL(req.url);
    const onlyTables = url.searchParams.get("tables")?.split(",").map(t => t.trim()) || null;
    const tablesToSync = onlyTables 
      ? SYNC_TABLES.filter(t => onlyTables.includes(t))
      : SYNC_TABLES;

    console.log(`Starting reverse sync (external → cloud) for tables: ${tablesToSync.join(", ")}`);
    const syncResults: Record<string, { synced: number; errors: number; errorDetails?: string }> = {};

    for (const table of tablesToSync) {
      let allData: Record<string, unknown>[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all data from external DB
      while (hasMore) {
        const { data, error } = await externalClient
          .from(table)
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error(`Error reading external ${table}:`, error);
          syncResults[table] = { synced: 0, errors: 1, errorDetails: error.message };
          hasMore = false;
          continue;
        }

        if (data && data.length > 0) {
          allData = allData.concat(data);
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      if (syncResults[table]) continue;

      if (!allData || allData.length === 0) {
        syncResults[table] = { synced: 0, errors: 0 };
        continue;
      }

      // Upsert into local Cloud DB in batches
      let synced = 0;
      let errors = 0;
      let lastError = "";
      for (let i = 0; i < allData.length; i += 50) {
        const batch = allData.slice(i, i + 50);
        const { error: upsertError } = await localClient
          .from(table)
          .upsert(batch, { onConflict: "id" });

        if (upsertError) {
          console.error(`Upsert error for ${table} batch ${i}:`, upsertError);
          errors++;
          lastError = upsertError.message;
        } else {
          synced += batch.length;
        }
      }

      syncResults[table] = { synced, errors, ...(lastError ? { errorDetails: lastError } : {}) };
    }

    return new Response(
      JSON.stringify({
        direction: "external → cloud",
        synced_at: new Date().toISOString(),
        results: syncResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reverse sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
