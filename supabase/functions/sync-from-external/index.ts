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

async function fetchAllRows(client: any, table: string) {
  let allData: Record<string, unknown>[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = allData.concat(data);
      if (data.length < pageSize) hasMore = false;
      else page++;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

async function upsertBatches(client: any, table: string, data: Record<string, unknown>[]) {
  let synced = 0;
  let errors = 0;
  let lastError = "";

  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50);
    const { error } = await client
      .from(table)
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Upsert error for ${table} batch ${i}:`, error);
      errors++;
      lastError = error.message;
    } else {
      synced += batch.length;
    }
  }

  return { synced, errors, ...(lastError ? { errorDetails: lastError } : {}) };
}

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

    // Process all tables in parallel for speed
    const results = await Promise.all(
      tablesToSync.map(async (table) => {
        try {
          const data = await fetchAllRows(externalClient, table);
          if (!data || data.length === 0) {
            return { table, synced: 0, errors: 0 };
          }
          const result = await upsertBatches(localClient, table, data);
          return { table, ...result };
        } catch (e) {
          console.error(`Error syncing ${table}:`, e);
          return { table, synced: 0, errors: 1, errorDetails: e instanceof Error ? e.message : String(e) };
        }
      })
    );

    const syncResults: Record<string, any> = {};
    for (const r of results) {
      const { table, ...rest } = r;
      syncResults[table] = rest;
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
