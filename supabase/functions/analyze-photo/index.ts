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
      // Added headpose to verify it's a selfie (person facing camera)
      formData.append('return_attributes', 'gender,age,beauty,emotion,eyestatus,skinstatus,headpose');

      const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Face++ API error:', response.status, errorText);
        
        // Parse error to provide specific feedback
        let errorMessage = 'Unable to analyze photo. Please ensure the image is clear and contains a visible face.';
        if (errorText.includes('IMAGE_FILE_TOO_LARGE')) {
          errorMessage = 'Foto is te groot. Upload een kleinere foto (max 2MB) en probeer opnieuw.';
        } else if (errorText.includes('INVALID_IMAGE')) {
          errorMessage = 'Ongeldig bestandsformaat. Upload een JPG of PNG foto.';
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage }),
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

      // Validate it's a selfie - must have exactly one face
      if (!faceppResult.faces || faceppResult.faces.length === 0) {
        console.log('No faces detected in the photo');
        return new Response(
          JSON.stringify({ 
            error: 'Geen persoon gedetecteerd. Upload een duidelijke selfie foto van jezelf.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reject if multiple faces detected - must be a solo selfie
      if (faceppResult.faces.length > 1) {
        console.log('Multiple faces detected:', faceppResult.faces.length);
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

      // Calculate face size relative to image - selfies typically have face taking up significant portion
      const imageWidth = faceppResult.image_id ? 1000 : 1000; // Face++ doesn't return image dimensions directly
      const faceWidth = faceRectangle?.width || 0;
      const faceHeight = faceRectangle?.height || 0;
      const faceArea = faceWidth * faceHeight;
      
      // If face is too small (likely not a selfie but a distant photo), reject
      // Typical selfie has face area > 5% of image
      if (faceWidth < 100 || faceHeight < 100) {
        console.log('Face too small - width:', faceWidth, 'height:', faceHeight);
        return new Response(
          JSON.stringify({ 
            error: 'Je gezicht is te klein in de foto. Upload een close-up selfie waarbij je gezicht goed zichtbaar is.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate it's a proper selfie - check headpose (face should be facing camera)
      const headpose = attributes?.headpose;
      if (headpose) {
        const yawAngle = Math.abs(headpose.yaw_angle || 0);
        const pitchAngle = Math.abs(headpose.pitch_angle || 0);
        
        // If face is turned too much (not looking at camera), reject
        if (yawAngle > 45 || pitchAngle > 30) {
          console.log('Face not facing camera - yaw:', yawAngle, 'pitch:', pitchAngle);
          return new Response(
            JSON.stringify({ 
              error: 'Upload een selfie waarbij je recht in de camera kijkt. Je gezicht moet duidelijk zichtbaar zijn.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
