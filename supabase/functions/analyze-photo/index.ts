import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { photoUrl, photoPath, userId, firstName, dateOfBirth } = await req.json();

    const faceppApiKey = Deno.env.get('FACEPP_API_KEY');
    const faceppApiSecret = Deno.env.get('FACEPP_API_SECRET');
    
    if (!faceppApiKey || !faceppApiSecret) {
      return new Response(
        JSON.stringify({ error: 'Photo analysis service is not configured. Please contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing photo with Face++ API:', photoUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Call Face++ API to analyze the photo
      const formData = new FormData();
      formData.append('api_key', faceppApiKey);
      formData.append('api_secret', faceppApiSecret);
      formData.append('image_url', photoUrl);
      formData.append('return_attributes', 'gender,age,beauty,emotion,eyestatus,skinstatus');

      const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Face++ API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Unable to analyze photo. Please ensure the image is clear and contains a visible face.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const faceppResult = await response.json();
      console.log("Received response from Face++:", JSON.stringify(faceppResult));

      let analysisResult: any = {
        hair_color: null,
        eye_color: null,
        facial_features: null,
        attractiveness_score: null,
      };

      if (faceppResult.faces && faceppResult.faces.length > 0) {
        const face = faceppResult.faces[0];
        const attributes = face.attributes;

        // Calculate attractiveness score from beauty scores
        const maleScore = attributes?.beauty?.male_score || 0;
        const femaleScore = attributes?.beauty?.female_score || 0;
        const avgBeauty = (maleScore + femaleScore) / 2;
        
        // Convert 0-100 score to 0-10 scale
        analysisResult.attractiveness_score = Math.round(avgBeauty / 10);

        // Store facial features
        analysisResult.facial_features = {
          gender: attributes?.gender?.value || null,
          age: attributes?.age?.value || null,
          emotion: attributes?.emotion || null,
          beauty_scores: {
            male: maleScore,
            female: femaleScore,
          },
          skin_status: attributes?.skinstatus || null,
        };

        console.log('Attractiveness score calculated:', analysisResult.attractiveness_score);
      } else {
        console.log('No faces detected in the photo');
        return new Response(
          JSON.stringify({ 
            error: 'No face detected in the photo. Please upload a clear photo showing your face.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store face analysis in separate table
      const { error: analysisError } = await supabase
        .from('face_analysis')
        .upsert({
          user_id: user.id,
          photo_url: photoUrl,
          attractiveness_score: analysisResult.attractiveness_score,
          facial_features: analysisResult.facial_features || null,
        });

      if (analysisError) {
        console.error('Error storing face analysis:', analysisError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save analysis results. Please try again.' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update basic profile info (first_name, date_of_birth only)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          date_of_birth: dateOfBirth,
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update profile. Please try again.' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send face_rate to n8n
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      if (n8nWebhookUrl) {
        try {
          console.log('Sending face_rate to n8n:', analysisResult.attractiveness_score);
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              face_rate: analysisResult.attractiveness_score,
              user_id: userId,
              timestamp: new Date().toISOString(),
            }),
          });
          console.log('Successfully sent face_rate to n8n');
        } catch (n8nError) {
          console.error('Error sending to n8n:', n8nError);
          // Don't fail the whole request if n8n fails
        }
      }

      // Delete the temporary photo using the provided path
      if (photoPath) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('profile-photos-temp')
            .remove([photoPath]);

          if (deleteError) {
            console.error('Error deleting photo:', deleteError);
          } else {
            console.log('Photo deleted successfully:', photoPath);
          }
        } catch (deleteErr) {
          console.error('Exception during photo deletion:', deleteErr);
          // Don't fail the whole request if deletion fails
        }
      } else {
        console.warn('No photoPath provided for cleanup');
      }

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
        console.error('Face++ API request timed out');
        return new Response(
          JSON.stringify({ 
            error: 'Photo analysis timed out. Please try again with a smaller image.' 
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in analyze-photo function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
