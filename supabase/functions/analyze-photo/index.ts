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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with service role for storage operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user auth for profile updates
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { photoUrl, photoPath, userId, firstName, username, dateOfBirth } = await req.json();

    console.log('Received data:', { userId, firstName, username, dateOfBirth, photoPath });

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

      const faceWidth = faceRectangle?.width || 0;
      const faceHeight = faceRectangle?.height || 0;
      
      if (faceWidth < 50 || faceHeight < 50) {
        console.log('Face too small - width:', faceWidth, 'height:', faceHeight);
        return new Response(
          JSON.stringify({ 
            error: 'Je gezicht is te klein in de foto. Upload een close-up selfie waarbij je gezicht goed zichtbaar is.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const headpose = attributes?.headpose;
      if (headpose) {
        const yawAngle = Math.abs(headpose.yaw_angle || 0);
        const pitchAngle = Math.abs(headpose.pitch_angle || 0);
        
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

      const maleScore = attributes?.beauty?.male_score || 0;
      const femaleScore = attributes?.beauty?.female_score || 0;
      const avgBeauty = (maleScore + femaleScore) / 2;

      analysisResult.attractiveness_score = Math.round(avgBeauty / 10);
      analysisResult.facial_features = {
        gender: attributes?.gender?.value || null,
        age: attributes?.age?.value || null,
        emotion: attributes?.emotion || null,
        beauty_scores: {
          male: maleScore,
          female: femaleScore,
        },
        skin_status: attributes?.skinstatus || null,
        headpose: headpose || null,
      };

      console.log('Attractiveness score calculated:', analysisResult.attractiveness_score);

      // CRITICAL: Move photo from temp to permanent storage
      let permanentPhotoUrl = null;
      if (photoPath) {
        try {
          console.log('Moving photo from temp to permanent storage...');
          
          // Download from temp storage
          const { data: photoData, error: downloadError } = await supabaseService.storage
            .from('profile-photos-temp')
            .download(photoPath);

          if (downloadError) {
            console.error('Error downloading temp photo:', downloadError);
          } else {
            // Upload to permanent storage
            const permanentPath = `${userId}/profile.jpg`;
            const { data: uploadData, error: uploadError } = await supabaseService.storage
              .from('profile-photos')
              .upload(permanentPath, photoData, {
                contentType: 'image/jpeg',
                upsert: true, // Overwrite if exists
              });

            if (uploadError) {
              console.error('Error uploading to permanent storage:', uploadError);
            } else {
              // Get public URL
              const { data: urlData } = supabaseService.storage
                .from('profile-photos')
                .getPublicUrl(permanentPath);
              
              permanentPhotoUrl = urlData.publicUrl;
              console.log('Photo moved to permanent storage:', permanentPhotoUrl);
            }
          }

          // Delete temp photo
          const { error: deleteError } = await supabaseService.storage
            .from('profile-photos-temp')
            .remove([photoPath]);

          if (deleteError) {
            console.error('Error deleting temp photo:', deleteError);
          } else {
            console.log('Temp photo deleted successfully');
          }
        } catch (storageError) {
          console.error('Error managing photo storage:', storageError);
          // Continue even if storage operations fail
        }
      }

      // Store face analysis in separate table
      const { error: analysisError } = await supabase
        .from('face_analysis')
        .upsert({
          user_id: user.id,
          photo_url: permanentPhotoUrl || photoUrl,
          attractiveness_score: analysisResult.attractiveness_score,
          facial_features: analysisResult.facial_features || null,
        });

      if (analysisError) {
        console.error('Error storing face analysis:', analysisError);
      }

      // CRITICAL FIX: Update profile with ALL fields including username and photo_url
      console.log('Updating profile with:', {
        id: user.id,
        email: user.email,
        first_name: firstName,
        username: username,
        date_of_birth: dateOfBirth,
        photo_url: permanentPhotoUrl,
      });

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          username: username, // ADDED: Save username
          date_of_birth: dateOfBirth,
          photo_url: permanentPhotoUrl, // ADDED: Save photo URL
          updated_at: new Date().toISOString(),
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

      console.log('Profile updated successfully');

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
              username: username,
              first_name: firstName,
              timestamp: new Date().toISOString(),
            }),
          });
          console.log('Successfully sent face_rate to n8n');
        } catch (n8nError) {
          console.error('Error sending to n8n:', n8nError);
        }
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