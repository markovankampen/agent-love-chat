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
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { photoUrl, userId, firstName, dateOfBirth } = await req.json();

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    console.log('Sending photo to n8n for analysis:', webhookUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for photo analysis

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'photo_analysis',
          user_id: userId,
          photo_url: photoUrl,
          first_name: firstName,
          date_of_birth: dateOfBirth,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status}`);
      }

      const textResponse = await response.text();
      console.log("Received response from n8n:", textResponse);

      let analysisResult: any = {};
      
      if (textResponse.trim()) {
        try {
          analysisResult = JSON.parse(textResponse);
        } catch (parseError) {
          console.log("Response is not JSON, treating as text:", textResponse);
          analysisResult = { message: textResponse };
        }
      }

      // Update user profile with analysis results and basic info
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          date_of_birth: dateOfBirth,
          hair_color: analysisResult.hair_color || null,
          eye_color: analysisResult.eye_color || null,
          facial_features: analysisResult.facial_features || null,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      // Delete the temporary photo
      const photoPath = photoUrl.split('/profile-photos-temp/')[1];
      if (photoPath) {
        const { error: deleteError } = await supabase.storage
          .from('profile-photos-temp')
          .remove([photoPath]);

        if (deleteError) {
          console.error('Error deleting photo:', deleteError);
        } else {
          console.log('Photo deleted successfully');
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
        throw new Error('Foto analyse duurde te lang. Probeer het opnieuw.');
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in analyze-photo function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
