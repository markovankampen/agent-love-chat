import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, user_message_id, conversation_history } = await req.json();

    // Get username from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending message to n8n webhook');

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
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle both JSON and plain text responses
    const contentType = response.headers.get("content-type");
    let agentContent: string;

    try {
      const textResponse = await response.text();
      console.log("Received response from n8n:", textResponse);
      
      if (!textResponse || textResponse.trim() === "") {
        agentContent = "I received your message! Let me think about that... 🤔";
      } else if (contentType?.includes("application/json")) {
        const data = JSON.parse(textResponse);
        agentContent = data.response || data.message || textResponse;
      } else {
        agentContent = textResponse;
      }
    } catch (parseError) {
      console.error("Error parsing n8n response:", parseError);
      agentContent = "I received your message! Let me think about that... 🤔";
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
      console.error("Error saving agent message:", agentMsgError);
    }

    return new Response(
      JSON.stringify({
        response: agentContent,
        agent_message_id: agentMsgData?.id,
        created_at: agentMsgData?.created_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-to-n8n function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
