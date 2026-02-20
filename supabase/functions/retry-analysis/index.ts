import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fire-and-forget sync to external database
async function triggerSync(supabaseUrl: string, serviceKey: string, table: string, type: string, record: Record<string, unknown>) {
  try {
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

async function detectColorsWithAI(photoUrl: string, lovableApiKey: string) {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: 'Analyze this photo. Return ONLY JSON: {"eyeColor": "color", "hairColor": "color"}. Eye: brown/blue/green/hazel/gray/amber. Hair: black/brown/blonde/red/gray/white/auburn. Use null if unsure.' },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        }],
      }),
    });
    if (!response.ok) return { eyeColor: null, hairColor: null };
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { eyeColor: parsed.eyeColor || null, hairColor: parsed.hairColor || null };
    }
    return { eyeColor: null, hairColor: null };
  } catch { return { eyeColor: null, hairColor: null }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const faceppApiKey = Deno.env.get("FACEPP_API_KEY");
    const faceppApiSecret = Deno.env.get("FACEPP_API_SECRET");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!faceppApiKey || !faceppApiSecret) {
      return new Response(JSON.stringify({ error: "Face++ API keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch records that hit the rate limit (fallback data)
    const { data: records, error } = await supabase
      .from("face_analysis")
      .select("*")
      .eq("attractiveness_score", 7)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Filter to only those with fallback/placeholder notes
    const failedRecords = (records || []).filter(
      (r: any) => r.facial_features?.note?.includes("Face++ free limit reached") ||
                   r.facial_features?.note?.includes("Uploaded via reupload link") ||
                   r.facial_features?.note?.includes("Face++ not available") ||
                   r.facial_features?.note?.includes("Face++ error")
    );

    console.log(`Found ${failedRecords.length} records to retry`);

    const results: any[] = [];

    for (const record of failedRecords) {
      const photoUrl = record.permanent_photo_url || record.photo_url;
      console.log(`🔄 Retrying analysis for user ${record.user_id}...`);

      try {
        // Download image and send as base64 to avoid IMAGE_FILE_TOO_LARGE with URL
        let imageBase64: string | null = null;
        try {
          const imgResp = await fetch(photoUrl);
          if (imgResp.ok) {
            const imgBuffer = await imgResp.arrayBuffer();
            const bytes = new Uint8Array(imgBuffer);
            
            // Resize if > 2MB using OffscreenCanvas
            let finalBytes = bytes;
            if (bytes.length > 2 * 1024 * 1024) {
              console.log(`📐 Image too large (${(bytes.length / 1024 / 1024).toFixed(1)}MB), resizing...`);
              try {
                const blob = new Blob([bytes], { type: "image/jpeg" });
                const imageBitmap = await createImageBitmap(blob);
                // Resize to max 800px on longest side
                const maxDim = 800;
                const ratio = Math.min(maxDim / imageBitmap.width, maxDim / imageBitmap.height, 1);
                const w = Math.round(imageBitmap.width * ratio);
                const h = Math.round(imageBitmap.height * ratio);
                const canvas = new OffscreenCanvas(w, h);
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(imageBitmap, 0, 0, w, h);
                const resizedBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.6 });
                finalBytes = new Uint8Array(await resizedBlob.arrayBuffer());
                console.log(`✅ Resized to ${w}x${h}, ${(finalBytes.length / 1024).toFixed(0)}KB`);
              } catch (resizeErr) {
                console.error("⚠️ Resize failed, trying raw base64:", resizeErr);
              }
            }
            
            // Convert to base64
            let binary = "";
            for (let i = 0; i < finalBytes.length; i++) {
              binary += String.fromCharCode(finalBytes[i]);
            }
            imageBase64 = btoa(binary);
          }
        } catch (dlErr) {
          console.error(`⚠️ Failed to download image for ${record.user_id}:`, dlErr);
        }

        const formData = new FormData();
        formData.append("api_key", faceppApiKey);
        formData.append("api_secret", faceppApiSecret);
        if (imageBase64) {
          formData.append("image_base64", imageBase64);
        } else {
          formData.append("image_url", photoUrl);
        }
        formData.append("return_attributes", "gender,age,beauty,emotion,eyestatus,skinstatus,headpose");

        const faceResp = await fetch("https://api-us.faceplusplus.com/facepp/v3/detect", {
          method: "POST",
          body: formData,
        });

        if (!faceResp.ok) {
          const errText = await faceResp.text();
          console.error(`❌ Face++ failed for ${record.user_id}: ${errText}`);
          results.push({ user_id: record.user_id, status: "face++_error", error: errText });
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const faceResult = await faceResp.json();

        if (!faceResult.faces?.length) {
          console.log(`⚠️ No face detected for ${record.user_id}`);
          results.push({ user_id: record.user_id, status: "no_face" });
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        if (faceResult.faces.length > 1) {
          console.log(`⚠️ Multiple faces for ${record.user_id}`);
          results.push({ user_id: record.user_id, status: "multiple_faces" });
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        const attrs = faceResult.faces[0].attributes;
        const maleScore = attrs?.beauty?.male_score || 0;
        const femaleScore = attrs?.beauty?.female_score || 0;
        const score = Math.round(((maleScore + femaleScore) / 2) / 10);

        const facialFeatures = {
          gender: attrs?.gender?.value || null,
          age: attrs?.age?.value || null,
          emotion: attrs?.emotion || null,
          beauty_scores: { male: maleScore, female: femaleScore },
          skin_status: attrs?.skinstatus || null,
          headpose: attrs?.headpose || null,
        };

        // Detect colors with AI
        let eyeColor: string | null = null;
        let hairColor: string | null = null;
        if (lovableApiKey) {
          const colors = await detectColorsWithAI(photoUrl, lovableApiKey);
          eyeColor = colors.eyeColor;
          hairColor = colors.hairColor;
        }

        // Update face_analysis
        const { data: faData } = await supabase.from("face_analysis").update({
          attractiveness_score: score,
          facial_features: facialFeatures,
        }).eq("id", record.id).select().single();

        // Update profile
        const { data: profileData } = await supabase.from("profiles").update({
          attractiveness_score: score,
          facial_features: facialFeatures,
          ...(eyeColor && { eye_color: eyeColor }),
          ...(hairColor && { hair_color: hairColor }),
        }).eq("id", record.user_id).select().single();

        // Sync to external DB
        if (faData) triggerSync(supabaseUrl, serviceKey, "face_analysis", "UPDATE", faData as Record<string, unknown>);
        if (profileData) triggerSync(supabaseUrl, serviceKey, "profiles", "UPDATE", profileData as Record<string, unknown>);

        console.log(`✅ ${record.user_id}: score=${score}, eye=${eyeColor}, hair=${hairColor}`);
        results.push({ user_id: record.user_id, status: "success", score, eyeColor, hairColor });

      } catch (e) {
        console.error(`❌ Error for ${record.user_id}:`, e);
        results.push({ user_id: record.user_id, status: "error", error: String(e) });
      }

      // Rate limit delay between requests
      await new Promise(r => setTimeout(r, 1500));
    }

    const summary = {
      total: failedRecords.length,
      success: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status !== "success").length,
      results,
    };

    console.log("📊 Retry summary:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
