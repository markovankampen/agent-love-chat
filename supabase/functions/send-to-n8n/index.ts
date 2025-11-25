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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Create client and verify the JWT token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Authenticated user:', user.id);

    const { message, user_message_id, conversation_history } = await req.json();

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // Get user profile
    const { data: profile } = await supabaseClient
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
          email: profile?.email || user.email,
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

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      let agentContent: string;

      try {
        const responseText = await response.text();
        console.log("Raw response from n8n:", responseText);
        
        if (!responseText || responseText.trim() === '') {
          console.log("Empty response from n8n, using fallback");
          agentContent = "Dank je voor je bericht! Laat me daar even over nadenken... 🤔";
        } else if (contentType?.includes("application/json")) {
          try {
            const data = JSON.parse(responseText);
            console.log("Parsed JSON response from n8n:", data);
            agentContent = data.response || data.message || data.content || responseText;
          } catch (jsonError) {
            console.error("Failed to parse JSON, using text response:", jsonError);
            agentContent = responseText;
          }
        } else {
          agentContent = responseText;
        }
      } catch (textError) {
        console.error("Failed to read response text:", textError);
        agentContent = "Dank je voor je bericht! Laat me daar even over nadenken... 🤔";
      }

      // Save agent response to database
      const { data: agentMsgData, error: agentMsgError } = await supabaseClient
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
        
        const { data: agentMsgData } = await supabaseClient
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
