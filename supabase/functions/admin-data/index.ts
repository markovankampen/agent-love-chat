import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchAllRows(supabaseAdmin: any, table: string, selectFields = "*", orderBy = "created_at") {
  const allRows: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(selectFields)
      .order(orderBy, { ascending: false })
      .range(offset, offset + batchSize - 1);
    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }
  }
  return allRows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Fetch all profiles (paginated)
    const profiles = await fetchAllRows(supabaseAdmin, "profiles");
    
    // Fetch all matches
    const matches = await fetchAllRows(supabaseAdmin, "matches");
    
    // Fetch conversation count via counting all rows
    const conversations = await fetchAllRows(supabaseAdmin, "conversations", "id, user_id, role, content, created_at");
    
    // Fetch user activity
    const userActivity = await fetchAllRows(supabaseAdmin, "user_activity");

    // Extract gender from conversations: the first user message after the "naar op zoek" question
    // Pattern: assistant asks "man, vrouw of allebei?", user responds with preference
    // We infer: looking for "man" → Female, looking for "vrouw" → Male, "allebei" → Unknown
    const genderMap: Record<string, string> = {};
    const userConvos: Record<string, { role: string; content: string; created_at: string }[]> = {};
    
    for (const c of conversations) {
      if (!userConvos[c.user_id]) userConvos[c.user_id] = [];
      userConvos[c.user_id].push(c);
    }

    for (const [uid, msgs] of Object.entries(userConvos)) {
      // Sort by created_at ascending
      msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].role === "agent" && msgs[i].content.includes("man, vrouw of allebei")) {
          const answer = msgs[i + 1]?.content?.toLowerCase().trim() || "";
          if (answer.includes("vrouw") && !answer.includes("man")) {
            genderMap[uid] = "Male";
          } else if (answer.includes("man") && !answer.includes("vrouw")) {
            genderMap[uid] = "Female";
          } else if (answer.includes("allebei") || (answer.includes("man") && answer.includes("vrouw"))) {
            genderMap[uid] = "Other";
          }
          break;
        }
      }
    }

    // Enrich profiles with gender
    const enrichedProfiles = profiles.map((p: any) => ({
      ...p,
      gender: genderMap[p.id] || null,
    }));

    return new Response(
      JSON.stringify({
        fetched_at: new Date().toISOString(),
        admin_user_id: userId,
        tables: {
          profiles: { count: profiles.length, data: enrichedProfiles },
          conversations: { count: conversations.length, data: [] },
          matches: { count: matches.length, data: matches },
          user_activity: { count: userActivity.length, data: userActivity },
        },
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
