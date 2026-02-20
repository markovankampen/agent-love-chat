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

async function authenticateAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
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
    return { error: "Unauthorized", status: 401 };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return { error: "Forbidden: Admin access required", status: 403 };
  }

  return { user, supabaseAdmin, supabaseUrl };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAdmin(req);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user, supabaseAdmin } = auth;
    const userId = user.id;

    // Handle POST actions (delete profile, etc.)
    if (req.method === "POST") {
      let body: any = {};
      try {
        const text = await req.text();
        if (text) body = JSON.parse(text);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { action, targetUserId, reason } = body;

      if (action === "delete_profile") {
        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "targetUserId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Prevent deleting other admins
        const { data: targetRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .eq("role", "admin")
          .maybeSingle();

        if (targetRole) {
          return new Response(JSON.stringify({ error: "Cannot delete an admin user" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fetch profile details before deletion for audit
        const { data: targetProfile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, email")
          .eq("id", targetUserId)
          .maybeSingle();

        // Delete related data in order
        await supabaseAdmin.from("face_analysis").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("conversations").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("matches").delete().or(`user_id.eq.${targetUserId},matched_user_id.eq.${targetUserId}`);
        await supabaseAdmin.from("notification_settings").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("user_activity").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("email_verification_tokens").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("photo_reupload_tokens").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);

        // Delete auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        if (authDeleteError) {
          console.error("Error deleting auth user:", authDeleteError);
        }

        // Log the action
        await supabaseAdmin.from("admin_audit_log").insert({
          admin_user_id: userId,
          action: "delete_profile",
          target_table: "profiles",
          target_id: targetUserId,
          details: {
            reason: reason || "No reason provided",
            deleted_user: targetProfile?.first_name || targetProfile?.email || "Unknown",
          },
        });

        // Sync deletion to external
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/sync-to-external`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              "x-webhook-source": "database",
            },
            body: JSON.stringify({
              type: "DELETE",
              table: "profiles",
              old_record: { id: targetUserId },
            }),
          });
        } catch (e) {
          console.error("Sync error (non-critical):", e);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Profile deleted successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "pause_profile") {
        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "targetUserId is required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("first_name, email, paused").eq("id", targetUserId).maybeSingle();
        const newPaused = !(profile?.paused);
        await supabaseAdmin.from("profiles").update({ paused: newPaused }).eq("id", targetUserId);
        await supabaseAdmin.from("admin_audit_log").insert({
          admin_user_id: userId,
          action: newPaused ? "pause_profile" : "unpause_profile",
          target_table: "profiles",
          target_id: targetUserId,
          details: {
            reason: reason || "No reason provided",
            user: profile?.first_name || profile?.email || "Unknown",
          },
        });
        return new Response(
          JSON.stringify({ success: true, paused: newPaused, message: newPaused ? "Profile paused" : "Profile unpaused" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "restart_chat") {
        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "targetUserId is required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("first_name, email").eq("id", targetUserId).maybeSingle();
        // Delete conversations and reset matching_complete
        await supabaseAdmin.from("conversations").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("matches").delete().or(`user_id.eq.${targetUserId},matched_user_id.eq.${targetUserId}`);
        await supabaseAdmin.from("profiles").update({ matching_complete: false }).eq("id", targetUserId);
        await supabaseAdmin.from("admin_audit_log").insert({
          admin_user_id: userId,
          action: "restart_chat",
          target_table: "profiles",
          target_id: targetUserId,
          details: {
            reason: reason || "No reason provided",
            user: profile?.first_name || profile?.email || "Unknown",
          },
        });
        return new Response(
          JSON.stringify({ success: true, message: "Chat restarted successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "remove_notifications") {
        if (!targetUserId) {
          return new Response(JSON.stringify({ error: "targetUserId is required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("first_name, email").eq("id", targetUserId).maybeSingle();
        await supabaseAdmin.from("notification_settings").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("admin_audit_log").insert({
          admin_user_id: userId,
          action: "remove_notifications",
          target_table: "notification_settings",
          target_id: targetUserId,
          details: {
            reason: reason || "No reason provided",
            user: profile?.first_name || profile?.email || "Unknown",
          },
        });
        return new Response(
          JSON.stringify({ success: true, message: "Notifications removed successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "get_audit_log") {
        const logs = await fetchAllRows(supabaseAdmin, "admin_audit_log");
        const adminIds = [...new Set(logs.map((l: any) => l.admin_user_id))];
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("id, first_name, email")
          .in("id", adminIds);
        const adminMap = new Map((adminProfiles || []).map((p: any) => [p.id, p]));
        const enrichedLogs = logs.map((l: any) => {
          const admin = adminMap.get(l.admin_user_id);
          return { ...l, admin_name: admin?.first_name || admin?.email || "Unknown" };
        });
        return new Response(
          JSON.stringify({ logs: enrichedLogs }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: Fetch all data (existing logic)
    const profiles = await fetchAllRows(supabaseAdmin, "profiles");
    const matches = await fetchAllRows(supabaseAdmin, "matches");
    const conversations = await fetchAllRows(supabaseAdmin, "conversations", "id, user_id, role, created_at");
    const userActivity = await fetchAllRows(supabaseAdmin, "user_activity");
    const faceAnalysis = await fetchAllRows(supabaseAdmin, "face_analysis");

    // Collect all file paths that need signed URLs
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

    let signedUrlMap: Record<string, string> = {};
    const pathsArray = Array.from(allPaths);
    if (pathsArray.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < pathsArray.length; i += batchSize) {
        const batch = pathsArray.slice(i, i + batchSize);
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

    const enrichedProfiles = profiles.map((p: any) => {
      let gender: string | null = null;
      if (p.facial_features) {
        const ff = typeof p.facial_features === "string" ? JSON.parse(p.facial_features) : p.facial_features;
        gender = ff?.gender || null;
      }
      const freshUrl = (!p.photo_url?.startsWith("http") && signedUrlMap[p.photo_url]) || p.photo_url;
      return { ...p, gender, photo_url: freshUrl };
    });

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