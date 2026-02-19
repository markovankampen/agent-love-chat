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

    // Fetch all data
    const profiles = await fetchAllRows(supabaseAdmin, "profiles");
    const matches = await fetchAllRows(supabaseAdmin, "matches");
    const conversations = await fetchAllRows(supabaseAdmin, "conversations", "id, user_id, role, created_at");
    const userActivity = await fetchAllRows(supabaseAdmin, "user_activity");
    const faceAnalysis = await fetchAllRows(supabaseAdmin, "face_analysis");

    // Collect all file paths that need signed URLs (from profiles AND face_analysis)
    const allPaths = new Set<string>();

    profiles.forEach((p: any) => {
      if (p.photo_url && !p.photo_url.startsWith("http")) {
        allPaths.add(p.photo_url);
      }
    });
    faceAnalysis.forEach((fa: any) => {
      if (fa.photo_url && !fa.photo_url.startsWith("http")) {
        allPaths.add(fa.photo_url);
      }
    });

    // Batch sign URLs
    let signedUrlMap: Record<string, string> = {};
    const pathsArray = Array.from(allPaths);
    if (pathsArray.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < pathsArray.length; i += batchSize) {
        const batch = pathsArray.slice(i, i + batchSize);
        // Try permanent bucket first
        const { data: signedData } = await supabaseAdmin.storage
          .from("profile-photos")
          .createSignedUrls(batch, 3600);
        if (signedData) {
          const missingPaths: string[] = [];
          signedData.forEach((sd: any, idx: number) => {
            if (sd.signedUrl) {
              signedUrlMap[batch[idx]] = sd.signedUrl;
            } else {
              missingPaths.push(batch[idx]);
            }
          });
          // Fallback to temp bucket for legacy photos
          if (missingPaths.length > 0) {
            const { data: fallbackData } = await supabaseAdmin.storage
              .from("profile-photos-temp")
              .createSignedUrls(missingPaths, 3600);
            if (fallbackData) {
              fallbackData.forEach((sd: any, idx: number) => {
                if (sd.signedUrl) {
                  signedUrlMap[missingPaths[idx]] = sd.signedUrl;
                }
              });
            }
          }
        }
      }
    }

    // Enrich profiles with gender and fresh photo URLs
    const enrichedProfiles = profiles.map((p: any) => {
      let gender: string | null = null;
      if (p.facial_features) {
        const ff = typeof p.facial_features === "string" ? JSON.parse(p.facial_features) : p.facial_features;
        gender = ff?.gender || null;
      }
      const freshUrl = (!p.photo_url?.startsWith("http") && signedUrlMap[p.photo_url]) || p.photo_url;
      return { ...p, gender, photo_url: freshUrl };
    });

    // Enrich face_analysis with fresh photo URLs
    const enrichedFaceAnalysis = faceAnalysis.map((fa: any) => {
      const freshUrl = (!fa.photo_url?.startsWith("http") && signedUrlMap[fa.photo_url]) || fa.photo_url;
      return { ...fa, photo_url: freshUrl };
    });

    return new Response(
      JSON.stringify({
        fetched_at: new Date().toISOString(),
        admin_user_id: userId,
        tables: {
          profiles: { count: profiles.length, data: enrichedProfiles },
          conversations: { count: conversations.length, data: [] },
          matches: { count: matches.length, data: matches },
          user_activity: { count: userActivity.length, data: userActivity },
          face_analysis: { count: faceAnalysis.length, data: enrichedFaceAnalysis },
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
