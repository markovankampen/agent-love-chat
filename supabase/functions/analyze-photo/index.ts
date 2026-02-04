import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to detect eye and hair color using Lovable AI (Gemini)
async function detectColorsWithAI(photoUrl: string): Promise<{ eyeColor: string | null; hairColor: string | null }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    console.log('⚠️ LOVABLE_API_KEY not configured, skipping color detection');
    return { eyeColor: null, hairColor: null };
  }

  try {
    console.log('🎨 Detecting eye and hair color with AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this photo and detect the person's eye color and hair color. 
                
Return ONLY a JSON object in this exact format, nothing else:
{"eyeColor": "color", "hairColor": "color"}

For eye color, use one of: brown, blue, green, hazel, gray, amber
For hair color, use one of: black, brown, blonde, red, gray, white, auburn

If you cannot determine a color, use null.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: photoUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI color detection failed:', response.status, errorText);
      return { eyeColor: null, hairColor: null };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    console.log('🎨 AI response:', content);
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Detected colors:', parsed);
      return {
        eyeColor: parsed.eyeColor || null,
        hairColor: parsed.hairColor || null,
      };
    }
    
    console.log('⚠️ Could not parse AI response');
    return { eyeColor: null, hairColor: null };
    
  } catch (error) {
    console.error('❌ AI color detection error:', error);
    return { eyeColor: null, hairColor: null };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Analyze Photo Function Started ===');
    
    // Check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { photoUrl, photoPath, userId, firstName, username, phoneNumber, dateOfBirth } = requestBody;

    console.log('📝 Request data:', { 
      userId, 
      firstName, 
      username, 
      phoneNumber: phoneNumber ? 'provided' : 'not provided',
      dateOfBirth,
      photoPath,
      photoUrl: photoUrl ? 'provided' : 'missing'
    });

    // Validate required fields
    if (!photoUrl) {
      console.error('Missing photoUrl in request');
      return new Response(
        JSON.stringify({ error: 'Photo URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firstName || !dateOfBirth) {
      console.error('Missing required fields:', { firstName: !!firstName, dateOfBirth: !!dateOfBirth });
      return new Response(
        JSON.stringify({ error: 'First name and date of birth are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Face++ credentials
    const faceppApiKey = Deno.env.get('FACEPP_API_KEY');
    const faceppApiSecret = Deno.env.get('FACEPP_API_SECRET');
    
    if (!faceppApiKey || !faceppApiSecret) {
      console.error('❌ Face++ credentials not configured');
      console.error('FACEPP_API_KEY present:', !!faceppApiKey);
      console.error('FACEPP_API_SECRET present:', !!faceppApiSecret);
      
      // For development/testing: Skip Face++ and save profile anyway
      console.log('⚠️ Skipping Face++ analysis - saving profile with mock data');
      
      // Detect eye and hair color with AI
      const { eyeColor, hairColor } = await detectColorsWithAI(photoUrl);
      
      const mockAnalysis = {
        attractiveness_score: 7,
        facial_features: {
          gender: 'unknown',
          age: 25,
          note: 'Face++ not configured - using mock data'
        }
      };

      // Save mock analysis
      const { data: mockAnalysisData, error: analysisError } = await supabase
        .from('face_analysis')
        .upsert({
          user_id: user.id,
          photo_url: photoUrl,
          attractiveness_score: mockAnalysis.attractiveness_score,
          facial_features: mockAnalysis.facial_features,
        })
        .select()
        .single();

      if (analysisError) {
        console.error('Error saving mock analysis:', analysisError);
      } else {
        console.log('✅ Mock analysis saved:', mockAnalysisData?.id);
      }

      // Update profile with attractiveness_score, facial_features, and colors
      const { data: mockProfileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          username: username || null,
          phone_number: phoneNumber || null,
          date_of_birth: dateOfBirth,
          photo_url: photoUrl,
          attractiveness_score: mockAnalysis.attractiveness_score,
          facial_features: mockAnalysis.facial_features,
          eye_color: eyeColor,
          hair_color: hairColor,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile: ' + profileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Profile updated successfully (mock mode):', {
        id: mockProfileData?.id,
        photo_url: mockProfileData?.photo_url ? 'set' : 'missing',
        attractiveness_score: mockProfileData?.attractiveness_score,
        eye_color: mockProfileData?.eye_color,
        hair_color: mockProfileData?.hair_color,
      });

      // Delete temp photo
      if (photoPath) {
        try {
          await supabase.storage.from('profile-photos-temp').remove([photoPath]);
          console.log('✅ Temp photo deleted');
        } catch (deleteErr) {
          console.error('Failed to delete temp photo:', deleteErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profiel succesvol bijgewerkt (development mode)',
          analysis: mockAnalysis,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Starting Face++ analysis...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Call Face++ API
      const formData = new FormData();
      formData.append('api_key', faceppApiKey);
      formData.append('api_secret', faceppApiSecret);
      formData.append('image_url', photoUrl);
      formData.append('return_attributes', 'gender,age,beauty,emotion,eyestatus,skinstatus,headpose');

      console.log('📤 Sending request to Face++ API...');

      const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Face++ API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Face++ API error:', response.status, errorText);
        
        let errorMessage = 'Unable to analyze photo. Please ensure the image is clear and contains a visible face.';
        
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Face++ error details:', errorJson);
          
          if (errorJson.error_message) {
            if (errorJson.error_message.includes('INVALID_IMAGE_URL')) {
              errorMessage = 'Foto kon niet worden geladen. Probeer opnieuw.';
            } else if (errorJson.error_message.includes('IMAGE_FILE_TOO_LARGE')) {
              errorMessage = 'Foto is te groot. Upload een kleinere foto (max 2MB).';
            } else if (errorJson.error_message.includes('INVALID_IMAGE')) {
              errorMessage = 'Ongeldig bestandsformaat. Upload een JPG of PNG foto.';
            } else {
              errorMessage = `Face++ error: ${errorJson.error_message}`;
            }
          }
        } catch (parseErr) {
          console.error('Could not parse Face++ error response');
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const faceppResult = await response.json();
      console.log('✅ Face++ response received');
      console.log('Faces detected:', faceppResult.faces?.length || 0);

      // Validate face detection
      if (!faceppResult.faces || faceppResult.faces.length === 0) {
        console.log('❌ No faces detected in the photo');
        return new Response(
          JSON.stringify({ 
            error: 'Geen persoon gedetecteerd. Upload een duidelijke selfie foto van jezelf.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (faceppResult.faces.length > 1) {
        console.log('❌ Multiple faces detected:', faceppResult.faces.length);
        return new Response(
          JSON.stringify({ 
            error: 'Meerdere personen gedetecteerd. Upload een selfie met alleen jezelf in beeld.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const face = faceppResult.faces[0];
      const attributes = face.attributes;
      const faceRectangle = face.face_rectangle;

      // Validate face size
      const faceWidth = faceRectangle?.width || 0;
      const faceHeight = faceRectangle?.height || 0;
      
      console.log('Face dimensions:', { width: faceWidth, height: faceHeight });
      
      if (faceWidth < 50 || faceHeight < 50) {
        console.log('❌ Face too small');
        return new Response(
          JSON.stringify({ 
            error: 'Je gezicht is te klein in de foto. Upload een close-up selfie waarbij je gezicht goed zichtbaar is.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate head pose
      const headpose = attributes?.headpose;
      if (headpose) {
        const yawAngle = Math.abs(headpose.yaw_angle || 0);
        const pitchAngle = Math.abs(headpose.pitch_angle || 0);
        
        console.log('Head pose:', { yaw: yawAngle, pitch: pitchAngle });
        
        if (yawAngle > 45 || pitchAngle > 30) {
          console.log('❌ Face not facing camera');
          return new Response(
            JSON.stringify({ 
              error: 'Upload een selfie waarbij je recht in de camera kijkt. Je gezicht moet duidelijk zichtbaar zijn.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Calculate attractiveness score
      const maleScore = attributes?.beauty?.male_score || 0;
      const femaleScore = attributes?.beauty?.female_score || 0;
      const avgBeauty = (maleScore + femaleScore) / 2;
      const attractivenessScore = Math.round(avgBeauty / 10);

      console.log('Beauty scores:', { male: maleScore, female: femaleScore, average: avgBeauty, final: attractivenessScore });

      const analysisResult = {
        attractiveness_score: attractivenessScore,
        facial_features: {
          gender: attributes?.gender?.value || null,
          age: attributes?.age?.value || null,
          emotion: attributes?.emotion || null,
          beauty_scores: {
            male: maleScore,
            female: femaleScore,
          },
          skin_status: attributes?.skinstatus || null,
          headpose: headpose || null,
        }
      };

      // Save face analysis
      console.log('💾 Saving face analysis...');
      const { data: analysisData2, error: analysisError } = await supabase
        .from('face_analysis')
        .upsert({
          user_id: user.id,
          photo_url: photoUrl,
          attractiveness_score: analysisResult.attractiveness_score,
          facial_features: analysisResult.facial_features,
        })
        .select()
        .single();

      if (analysisError) {
        console.error('❌ Error storing face analysis:', analysisError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save analysis results: ' + analysisError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Face analysis saved:', analysisData2?.id);

      // Detect eye and hair color with AI
      const { eyeColor, hairColor } = await detectColorsWithAI(photoUrl);

      // Update profile with all fields INCLUDING attractiveness_score, facial_features, and colors
      console.log('💾 Updating profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          username: username || null,
          phone_number: phoneNumber || null,
          date_of_birth: dateOfBirth,
          photo_url: photoUrl,
          attractiveness_score: analysisResult.attractiveness_score,
          facial_features: analysisResult.facial_features,
          eye_color: eyeColor,
          hair_color: hairColor,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update profile: ' + profileError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Profile updated successfully:', {
        id: profileData?.id,
        photo_url: profileData?.photo_url ? 'set' : 'missing',
        attractiveness_score: profileData?.attractiveness_score,
        eye_color: profileData?.eye_color,
        hair_color: profileData?.hair_color,
      });

      // Send to n8n
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      if (n8nWebhookUrl) {
        try {
          console.log('📤 Sending to n8n...');
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              face_rate: analysisResult.attractiveness_score,
              user_id: userId,
              timestamp: new Date().toISOString(),
            }),
          });
          console.log('✅ Sent to n8n');
        } catch (n8nError) {
          console.error('⚠️ n8n error (non-critical):', n8nError);
        }
      }

      // Delete temp photo
      if (photoPath) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('profile-photos-temp')
            .remove([photoPath]);

          if (deleteError) {
            console.error('⚠️ Error deleting temp photo:', deleteError);
          } else {
            console.log('✅ Temp photo deleted:', photoPath);
          }
        } catch (deleteErr) {
          console.error('⚠️ Exception during photo deletion:', deleteErr);
        }
      }

      console.log('=== ✅ Analyze Photo Function Completed Successfully ===');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profiel succesvol bijgewerkt',
          analysis: analysisResult,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ Face++ API request timed out');
        return new Response(
          JSON.stringify({ 
            error: 'Photo analysis timed out. Please try again with a smaller image.' 
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('❌ Fetch error:', fetchError);
      throw fetchError;
    }

  } catch (error) {
    console.error('=== ❌ FATAL ERROR in analyze-photo function ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        debug: Deno.env.get('ENVIRONMENT') === 'development' ? {
          type: error?.constructor?.name,
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});