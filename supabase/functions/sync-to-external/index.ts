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

    // Full sync mode - verify admin auth or internal call
    const authHeader = req.headers.get("Authorization");
    const isWebhook = req.headers.get("x-webhook-source") === "database";
    const isFullSyncRequest = req.headers.get("x-full-sync") === "true";
    
    if (!isWebhook && !isFullSyncRequest) {
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Full sync: pull all data from local and push to external
    console.log("Starting full sync...");
    const syncResults: Record<string, { synced: number; errors: number }> = {};

    // Sync auth users first
    console.log("Syncing auth users...");
    try {
      let allUsers: Record<string, unknown>[] = [];
      let page = 1;
      let hasMoreUsers = true;

      while (hasMoreUsers) {
        const { data: { users }, error: usersError } = await localClient.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

        if (usersError) {
          console.error("Error listing users:", usersError);
          syncResults["auth_users"] = { synced: 0, errors: 1 };
          hasMoreUsers = false;
          continue;
        }

        if (users && users.length > 0) {
          const mapped = users.map((u) => ({
            id: u.id,
            email: u.email || null,
            created_at: u.created_at,
            updated_at: u.updated_at,
            last_sign_in_at: u.last_sign_in_at || null,
            email_confirmed_at: u.email_confirmed_at || null,
            phone: u.phone || null,
            is_anonymous: u.is_anonymous || false,
          }));
          allUsers = allUsers.concat(mapped);
          if (users.length < 1000) hasMoreUsers = false;
          else page++;
        } else {
          hasMoreUsers = false;
        }
      }

      if (!syncResults["auth_users"] && allUsers.length > 0) {
        let synced = 0;
        let errors = 0;
        for (let i = 0; i < allUsers.length; i += 50) {
          const batch = allUsers.slice(i, i + 50);
          const { error: upsertError } = await externalClient
            .from("auth_users")
            .upsert(batch, { onConflict: "id" });

          if (upsertError) {
            console.error("Upsert error for auth_users:", upsertError);
            errors++;
          } else {
            synced += batch.length;
          }
        }
        syncResults["auth_users"] = { synced, errors };
      } else if (!syncResults["auth_users"]) {
        syncResults["auth_users"] = { synced: 0, errors: 0 };
      }
    } catch (e) {
      console.error("Auth users sync error:", e);
      syncResults["auth_users"] = { synced: 0, errors: 1 };
    }

    // Sync regular tables
    for (const table of SYNC_TABLES) {
      let allData: Record<string, unknown>[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await localClient
          .from(table)
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error(`Error reading ${table}:`, error);
          syncResults[table] = { synced: 0, errors: 1 };
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

      const data = allData;

      if (!data || data.length === 0) {
        syncResults[table] = { synced: 0, errors: 0 };
        continue;
      }

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
