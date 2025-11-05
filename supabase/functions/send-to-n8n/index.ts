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

    const { message, user_message_id, conversation_history } = await req.json();

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', user.id)
      .single();

    console.log('Sending message to n8n:', webhookUrl);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user.email,
          username: profile?.username || '',
          user_id: user.id,
          user_message_id,
          message,
          timestamp: new Date().toISOString(),
          conversation_history,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("N8N webhook response status:", response.status);
      console.log("N8N webhook response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`N8N webhook error: ${response.status}`, errorText);
        throw new Error(`N8N webhook error: ${response.status} - ${errorText}`);
      }

      // Read response as text first to safely handle empty responses
      const responseText = await response.text();
      console.log("Raw response body from n8n (length:", responseText.length, "):", responseText);
      
      let agentContent: string;

      if (!responseText || responseText.trim() === '') {
        console.error("⚠️ N8N webhook returned empty response. Please ensure your n8n workflow returns a JSON response with 'response' or 'message' field.");
        agentContent = "Sorry, ik kon geen antwoord genereren. Probeer het nog eens! 🙏";
      } else {
        try {
          const data = JSON.parse(responseText);
          console.log("✅ Successfully parsed JSON response from n8n:", data);
          agentContent = data.response || data.message || data.text || responseText;
          
          if (!agentContent || agentContent.trim() === '') {
            console.error("⚠️ N8N returned JSON but no content in expected fields (response/message/text):", data);
            agentContent = "Sorry, ik kreeg een onvolledig antwoord. Probeer het nog eens! 🙏";
          }
        } catch (parseError) {
          console.log("Response is not JSON, using raw text as response");
          agentContent = responseText;
        }
      }

      // Save agent response to database
      const { data: agentMsgData, error: agentMsgError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          role: 'agent',
          content: agentContent,
        })
        .select()
        .single();

      if (agentMsgError) {
        console.error('Error saving agent message:', agentMsgError);
      }

      return new Response(
        JSON.stringify({
          content: agentContent,
          id: agentMsgData?.id,
          created_at: agentMsgData?.created_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        // Timeout occurred
        const fallbackContent = "Sorry, het duurt wat langer dan verwacht. Kun je je vraag nog eens proberen? 🙏";
        
        const { data: agentMsgData } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            role: 'agent',
            content: fallbackContent,
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({
            content: fallbackContent,
            id: agentMsgData?.id,
            created_at: agentMsgData?.created_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in send-to-n8n function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
