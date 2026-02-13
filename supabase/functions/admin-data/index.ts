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
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Check admin role using service role client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional query params for filtering
    const url = new URL(req.url);
    const table = url.searchParams.get("table"); // optional: fetch single table
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);

    // Fetch data using service role client
    if (table) {
      const validTables = ["profiles", "conversations", "matches", "face_analysis", "notification_settings", "email_verification_tokens", "user_roles"];
      if (!validTables.includes(table)) {
        return new Response(JSON.stringify({ error: `Invalid table: ${table}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from(table)
        .select("*")
        .limit(limit)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ table, count: data?.length || 0, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all tables
    const tables = ["profiles", "conversations", "matches", "face_analysis", "notification_settings", "email_verification_tokens", "user_roles"];
    const results: Record<string, { count: number; data: unknown[] }> = {};

    await Promise.all(
      tables.map(async (t) => {
        const { data, error } = await supabaseAdmin
          .from(t)
          .select("*")
          .limit(limit)
          .order("created_at", { ascending: false });

        if (!error && data) {
          results[t] = { count: data.length, data };
        } else {
          results[t] = { count: 0, data: [] };
        }
      })
    );

    return new Response(
      JSON.stringify({
        fetched_at: new Date().toISOString(),
        admin_user_id: userId,
        tables: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
