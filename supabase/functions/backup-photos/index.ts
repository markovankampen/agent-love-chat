import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Simple auth: require a specific admin secret header for this batch job
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret !== 'backup-batch-2026') {
      // Fall back to JWT auth
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await anonClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        if (!roleData) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Parse optional limit/offset for batching
    let limit = 5;
    let offset = 0;
    try {
      const body = await req.json();
      if (body.limit) limit = Math.min(body.limit, 10);
      if (body.offset) offset = body.offset;
    } catch {}

    const { data: records, error: fetchErr } = await supabase
      .from('face_analysis')
      .select('user_id, photo_url, attractiveness_score, facial_features, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchErr) throw fetchErr;

    const results: Array<{
      user_id: string;
      photo_url: string;
      status: string;
      backed_up: boolean;
      reanalyzed: boolean;
      eye_color?: string | null;
      hair_color?: string | null;
    }> = [];

    const faceppApiKey = Deno.env.get('FACEPP_API_KEY');
    const faceppApiSecret = Deno.env.get('FACEPP_API_SECRET');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    for (const record of records || []) {
      const photoPath = record.photo_url;
      if (!photoPath) {
        results.push({ user_id: record.user_id, photo_url: '', status: 'no_path', backed_up: false, reanalyzed: false });
        continue;
      }

      // Try to download the file from profile-photos-temp
      const { data: fileData, error: downloadErr } = await supabase.storage
        .from('profile-photos-temp')
        .download(photoPath);

      if (downloadErr || !fileData) {
        console.log(`❌ File missing for ${record.user_id}: ${photoPath}`);
        results.push({ user_id: record.user_id, photo_url: photoPath, status: 'file_missing', backed_up: false, reanalyzed: false });
        continue;
      }

      console.log(`✅ File found for ${record.user_id}: ${photoPath}`);

      // Back up to permanent bucket
      const { error: uploadErr } = await supabase.storage
        .from('profile-photos-backup')
        .upload(photoPath, fileData, { upsert: true, contentType: fileData.type || 'image/jpeg' });

      if (uploadErr) {
        console.error(`⚠️ Backup failed for ${record.user_id}:`, uploadErr);
        results.push({ user_id: record.user_id, photo_url: photoPath, status: 'backup_failed', backed_up: false, reanalyzed: false });
        continue;
      }

      console.log(`📦 Backed up: ${photoPath}`);

      // Generate signed URL for Face++ re-analysis
      let reanalyzed = false;
      let eyeColor: string | null = null;
      let hairColor: string | null = null;

      if (faceppApiKey && faceppApiSecret) {
        const { data: signedData } = await supabase.storage
          .from('profile-photos-backup')
          .createSignedUrl(photoPath, 300);

        if (signedData?.signedUrl) {
          try {
            // Face++ analysis
            const formData = new FormData();
            formData.append('api_key', faceppApiKey);
            formData.append('api_secret', faceppApiSecret);
            formData.append('image_url', signedData.signedUrl);
            formData.append('return_attributes', 'gender,age,beauty,emotion,eyestatus,skinstatus,headpose');

            const faceResp = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
              method: 'POST',
              body: formData,
            });

            if (faceResp.ok) {
              const faceResult = await faceResp.json();
              if (faceResult.faces?.length === 1) {
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

                // Update face_analysis
                await supabase.from('face_analysis').update({
                  attractiveness_score: score,
                  facial_features: facialFeatures,
                }).eq('user_id', record.user_id);

                // Detect colors with AI
                if (lovableApiKey) {
                  try {
                    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${lovableApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        model: 'google/gemini-2.5-flash',
                        messages: [{
                          role: 'user',
                          content: [
                            { type: 'text', text: 'Analyze this photo. Return ONLY JSON: {"eyeColor": "color", "hairColor": "color"}. Eye: brown/blue/green/hazel/gray/amber. Hair: black/brown/blonde/red/gray/white/auburn. Use null if unsure.' },
                            { type: 'image_url', image_url: { url: signedData.signedUrl } },
                          ],
                        }],
                      }),
                    });

                    if (aiResp.ok) {
                      const aiResult = await aiResp.json();
                      const content = aiResult.choices?.[0]?.message?.content || '';
                      const jsonMatch = content.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        eyeColor = parsed.eyeColor || null;
                        hairColor = parsed.hairColor || null;
                      }
                    }
                  } catch (e) {
                    console.error('AI color detection failed:', e);
                  }
                }

                // Update profile
                await supabase.from('profiles').update({
                  attractiveness_score: score,
                  facial_features: facialFeatures,
                  ...(eyeColor && { eye_color: eyeColor }),
                  ...(hairColor && { hair_color: hairColor }),
                }).eq('id', record.user_id);

                reanalyzed = true;
                console.log(`🔍 Re-analyzed ${record.user_id}: score=${score}, eye=${eyeColor}, hair=${hairColor}`);
              }
            }

            // Rate limit - Face++ has limits
            await new Promise(r => setTimeout(r, 1000));
          } catch (e) {
            console.error(`Face++ error for ${record.user_id}:`, e);
          }
        }
      }

      results.push({
        user_id: record.user_id,
        photo_url: photoPath,
        status: 'success',
        backed_up: true,
        reanalyzed,
        eye_color: eyeColor,
        hair_color: hairColor,
      });
    }

    const summary = {
      total: results.length,
      backed_up: results.filter(r => r.backed_up).length,
      missing: results.filter(r => r.status === 'file_missing').length,
      reanalyzed: results.filter(r => r.reanalyzed).length,
      results,
    };

    console.log('📊 Summary:', { total: summary.total, backed_up: summary.backed_up, missing: summary.missing, reanalyzed: summary.reanalyzed });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
