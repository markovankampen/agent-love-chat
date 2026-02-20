import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: roleData } = await supabaseAdmin
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

    // Fetch all profiles missing photo
    const allProfiles: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, first_name, photo_url")
        .or("photo_url.is.null,photo_url.eq.")
        .range(offset, offset + batchSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        allProfiles.push(...data);
        offset += batchSize;
        hasMore = data.length === batchSize;
      }
    }

    console.log(`Found ${allProfiles.length} users without photos`);

    if (allProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users missing photos", count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional redirectDomain from body
    let redirectDomain = "https://agent-love-chat.lovable.app";
    try {
      const body = await req.json();
      if (body.redirectDomain) {
        redirectDomain = body.redirectDomain.replace(/\/$/, "");
      }
    } catch {
      // no body, use default
    }

    const redirectTo = `${redirectDomain}/profile-setup?photo-only=true`;

    const csvRows: string[] = ["email,magic_link"];
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const profile of allProfiles) {
      if (!profile.email) {
        console.log(`Skipping user ${profile.id} — no email`);
        errors.push({ email: "(none)", error: "No email on profile" });
        errorCount++;
        continue;
      }

      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: profile.email,
          options: { redirectTo },
        });

        if (linkError || !linkData?.properties?.action_link) {
          console.error(`Link error for ${profile.email}:`, linkError);
          errors.push({ email: profile.email, error: linkError?.message || "No link generated" });
          errorCount++;
          continue;
        }

        // Escape email for CSV (handle commas/quotes)
        const safeEmail = profile.email.includes(",")
          ? `"${profile.email.replace(/"/g, '""')}"`
          : profile.email;

        csvRows.push(`${safeEmail},${linkData.properties.action_link}`);
        successCount++;
      } catch (e) {
        console.error(`Error for ${profile.email}:`, e);
        errors.push({ email: profile.email, error: String(e) });
        errorCount++;
      }
    }

    console.log(`CSV generated: ${successCount} links, ${errorCount} errors`);

    // Log the admin action
    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: "export_photo_links",
      target_table: "profiles",
      details: {
        total_missing: allProfiles.length,
        links_generated: successCount,
        errors: errorCount,
        redirect_domain: redirectDomain,
      },
    });

    // Check if caller wants JSON summary instead of CSV
    const accept = req.headers.get("Accept") || "";
    if (accept.includes("application/json")) {
      return new Response(
        JSON.stringify({
          success: true,
          total_missing: allProfiles.length,
          links_generated: successCount,
          errors: errorCount,
          error_details: errors,
          csv: csvRows.join("\n"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return CSV file
    return new Response(csvRows.join("\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="photo-magic-links-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
