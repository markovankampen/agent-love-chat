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
    // Hardcoded user ID for dpgmedia
    const HARDCODED_USER_ID = "93fc2384-4b8b-4f53-a5a6-9f53caaab22a";

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with service role key to bypass RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Using hardcoded user:', HARDCODED_USER_ID);

    const { message, user_message_id, conversation_history } = await req.json();

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username, email')
      .eq('id', HARDCODED_USER_ID)
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
          email: profile?.email || 'dpgmedia@indebuurt.nl',
          username: profile?.username || 'dpgmedia',
          user_id: HARDCODED_USER_ID,
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

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        console.log("Received JSON response from n8n:", data);
        agentContent = data.response || data.message || "I received your message! Let me think about that... 🤔";
      } else {
        const textResponse = await response.text();
        console.log("Received text response from n8n:", textResponse);
        agentContent = textResponse || "I received your message! Let me think about that... 🤔";
      }

      // Save agent response to database
      const { data: agentMsgData, error: agentMsgError } = await supabaseClient
        .from('conversations')
        .insert({
          user_id: HARDCODED_USER_ID,
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
            user_id: HARDCODED_USER_ID,
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
