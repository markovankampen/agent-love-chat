import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fire-and-forget sync to external database
async function triggerSync(table: string, type: string, record: Record<string, unknown>) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;

    await fetch(`${supabaseUrl}/functions/v1/sync-to-external`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-webhook-source": "database",
      },
      body: JSON.stringify({ type, table, record }),
    });
    console.log(`✅ Sync triggered: ${type} on ${table}`);
  } catch (e) {
    console.error("⚠️ Sync trigger failed (non-critical):", e);
  }
}

// Detect eye and hair color using Lovable AI
async function detectColorsWithAI(photoUrl: string): Promise<{ eyeColor: string | null; hairColor: string | null }> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    console.log("⚠️ LOVABLE_API_KEY not configured, skipping color detection");
    return { eyeColor: null, hairColor: null };
  }

  try {
    console.log("🎨 Detecting eye and hair color with AI...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this photo and detect the person's eye color and hair color. 
Return ONLY a JSON object in this exact format, nothing else:
{"eyeColor": "color", "hairColor": "color"}
For eye color, use one of: brown, blue, green, hazel, gray, amber
For hair color, use one of: black, brown, blonde, red, gray, white, auburn
If you cannot determine a color, use null.`,
              },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("❌ AI color detection failed:", response.status);
      return { eyeColor: null, hairColor: null };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("✅ Detected colors:", parsed);
      return { eyeColor: parsed.eyeColor || null, hairColor: parsed.hairColor || null };
    }
    return { eyeColor: null, hairColor: null };
  } catch (error) {
    console.error("❌ AI color detection error:", error);
    return { eyeColor: null, hairColor: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Process Reupload Function Started ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { token, photoBase64, photoFileName } = await req.json();

    if (!token || !photoBase64) {
      return new Response(
        JSON.stringify({ error: "Token and photo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("photo_reupload_tokens")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (tokenError || !tokenData) {
      console.error("Invalid or expired token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Ongeldige of verlopen link. Vraag een nieuwe link aan." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Deze link is verlopen. Vraag een nieuwe link aan." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = tokenData.user_id;
    console.log("✅ Token valid for user:", userId);

    // Decode base64 photo
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const photoBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to permanent storage
    const fileName = `${userId}/${Date.now()}.jpeg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("profile-photos")
      .upload(fileName, photoBytes, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Fout bij uploaden van foto. Probeer opnieuw." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Photo uploaded:", fileName);

    // Build permanent public URL
    const permanentUrl = `${supabaseUrl}/storage/v1/object/public/profile-photos/${fileName}`;

    // Generate signed URL for AI analysis
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("profile-photos")
      .createSignedUrl(fileName, 3600);

    const analysisPhotoUrl = signedUrlData?.signedUrl || permanentUrl;

    // Run Face++ analysis
    const faceppApiKey = Deno.env.get("FACEPP_API_KEY");
    const faceppApiSecret = Deno.env.get("FACEPP_API_SECRET");

    let attractivenessScore = 7;
    let facialFeatures: Record<string, unknown> = { note: "Face++ not available" };

    if (faceppApiKey && faceppApiSecret) {
      try {
        console.log("🔍 Running Face++ analysis...");
        const formData = new FormData();
        formData.append("api_key", faceppApiKey);
        formData.append("api_secret", faceppApiSecret);
        formData.append("image_url", analysisPhotoUrl);
        formData.append("return_attributes", "gender,age,beauty,emotion,eyestatus,skinstatus,headpose");

        const faceResp = await fetch("https://api-us.faceplusplus.com/facepp/v3/detect", {
          method: "POST",
          body: formData,
        });

        if (faceResp.ok) {
          const faceResult = await faceResp.json();
          if (faceResult.faces?.length === 1) {
            const attrs = faceResult.faces[0].attributes;
            const maleScore = attrs?.beauty?.male_score || 0;
            const femaleScore = attrs?.beauty?.female_score || 0;
            attractivenessScore = Math.round(((maleScore + femaleScore) / 2) / 10);

            facialFeatures = {
              gender: attrs?.gender?.value || null,
              age: attrs?.age?.value || null,
              emotion: attrs?.emotion || null,
              beauty_scores: { male: maleScore, female: femaleScore },
              skin_status: attrs?.skinstatus || null,
              headpose: attrs?.headpose || null,
            };
            console.log("✅ Face++ analysis complete, score:", attractivenessScore);
          } else {
            console.log("⚠️ Face++ detected", faceResult.faces?.length || 0, "faces");
            facialFeatures = { note: "Unexpected face count: " + (faceResult.faces?.length || 0) };
          }
        } else {
          const errText = await faceResp.text();
          console.error("❌ Face++ error:", errText);
          facialFeatures = { note: "Face++ error", error: errText };
        }
      } catch (e) {
        console.error("❌ Face++ exception:", e);
        facialFeatures = { note: "Face++ exception", error: String(e) };
      }
    }

    // Detect colors with AI
    const { eyeColor, hairColor } = await detectColorsWithAI(analysisPhotoUrl);

    // Save/update face_analysis
    const { data: analysisData, error: analysisError } = await supabaseAdmin
      .from("face_analysis")
      .upsert(
        {
          user_id: userId,
          photo_url: permanentUrl,
          permanent_photo_url: permanentUrl,
          attractiveness_score: attractivenessScore,
          facial_features: facialFeatures,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (analysisError) {
      console.error("Error saving face_analysis:", analysisError);
    } else {
      console.log("✅ Face analysis saved:", analysisData?.id);
    }

    // Update profile with photo, colors, and analysis
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        photo_url: fileName,
        eye_color: eyeColor,
        hair_color: hairColor,
        attractiveness_score: attractivenessScore,
        facial_features: facialFeatures,
      })
      .eq("id", userId)
      .select()
      .single();

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Fout bij opslaan van profiel: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Profile updated with photo:", {
      id: profileData?.id,
      photo_url: profileData?.photo_url,
      eye_color: profileData?.eye_color,
      hair_color: profileData?.hair_color,
    });

    // Mark token as used
    await supabaseAdmin
      .from("photo_reupload_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Sync to external
    if (profileData) triggerSync("profiles", "UPDATE", profileData as Record<string, unknown>);
    if (analysisData) triggerSync("face_analysis", "UPDATE", analysisData as Record<string, unknown>);

    console.log("=== ✅ Process Reupload Completed ===");

    return new Response(
      JSON.stringify({ success: true, message: "Foto succesvol geüpload en opgeslagen!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
