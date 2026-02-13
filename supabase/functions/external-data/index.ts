import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth using local project
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const localAuth = createClient(localUrl, localAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await localAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const localAdmin = createClient(localUrl, localServiceKey);
    const { data: roleData } = await localAdmin
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

    // Connect to external Supabase project
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY")!;

    if (!externalUrl || !externalKey) {
      throw new Error("External Supabase credentials not configured");
    }

    const externalClient = createClient(externalUrl, externalKey);

    const url = new URL(req.url);
    const table = url.searchParams.get("table");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);

    if (table) {
      const { data, error } = await externalClient
        .from(table)
        .select("*")
        .limit(limit);

      if (error) {
        return new Response(JSON.stringify({ error: `Table error: ${error.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ source: "external", table, count: data?.length || 0, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List available tables by trying common ones — adjust as needed
    const tablesToFetch = url.searchParams.get("tables")?.split(",") || [];

    if (tablesToFetch.length === 0) {
      return new Response(
        JSON.stringify({
          source: "external",
          message: "Specify ?table=TABLE_NAME or ?tables=table1,table2,table3",
          example: "/external-data?table=profiles",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, { count: number; data: unknown[] }> = {};
    await Promise.all(
      tablesToFetch.map(async (t) => {
        const { data, error } = await externalClient.from(t.trim()).select("*").limit(limit);
        results[t.trim()] = error ? { count: 0, data: [] } : { count: data?.length || 0, data: data || [] };
      })
    );

    return new Response(
      JSON.stringify({ source: "external", fetched_at: new Date().toISOString(), tables: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("External data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
