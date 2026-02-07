import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimum score threshold - matches below this won't be sent
// Minimum score threshold - matches below this won't be sent
const MIN_MATCH_SCORE = 50;

// Maximum candidates to evaluate (for performance)
const MAX_CANDIDATES = 20;

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  date_of_birth: string;
  eye_color: string | null;
  hair_color: string | null;
  attractiveness_score: number | null;
}

interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}

interface MatchResult {
  matchedUserId: string;
  score: number;
  reasons: string[];
}

// Background processing function
async function processMatching(userId: string) {
  console.log("Background: Starting match processing for user:", userId);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Check if user already has been matched
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "notified")
      .maybeSingle();

    if (existingMatch) {
      console.log("Background: User already has a notified match, skipping");
      return;
    }

    // Get the user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, first_name, date_of_birth, eye_color, hair_color, attractiveness_score")
      .eq("id", userId)
      .single();

    if (profileError || !userProfile) {
      console.error("Background: User profile not found");
      return;
    }

    // Get the user's chat history
    const { data: userChats, error: chatError } = await supabase
      .from("conversations")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (chatError || !userChats || userChats.length < 3) {
      console.log("Background: Insufficient chat history for matching");
      return;
    }

    // Get candidates with the most chat messages (more data = better matching)
    // Using a subquery approach to get users with sufficient chat history
    const { data: candidatesWithChats, error: candidatesError } = await supabase
      .from("profiles")
      .select("id, email, first_name, date_of_birth, eye_color, hair_color, attractiveness_score")
      .neq("id", userId)
      .not("first_name", "is", null)
      .not("date_of_birth", "is", null)
      .limit(MAX_CANDIDATES * 2); // Get more initially, filter by chat history

    if (candidatesError || !candidatesWithChats || candidatesWithChats.length === 0) {
      console.log("Background: No eligible candidates found");
      return;
    }

    console.log(`Background: Found ${candidatesWithChats.length} initial candidates`);

    // Filter to those with sufficient chat history and take top candidates
    const eligibleCandidates: Array<{ profile: UserProfile; chats: ChatMessage[] }> = [];

    for (const candidate of candidatesWithChats) {
      if (eligibleCandidates.length >= MAX_CANDIDATES) break;

      // Check if already matched
      const { data: existingPairMatch } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(user_id.eq.${userId},matched_user_id.eq.${candidate.id}),and(user_id.eq.${candidate.id},matched_user_id.eq.${userId})`,
        )
        .maybeSingle();

      if (existingPairMatch) {
        console.log(`Background: Skipping ${candidate.id} - already matched`);
        continue;
      }

      const { data: candidateChats } = await supabase
        .from("conversations")
        .select("role, content, created_at")
        .eq("user_id", candidate.id)
        .order("created_at", { ascending: true });

      if (candidateChats && candidateChats.length >= 3) {
        eligibleCandidates.push({
          profile: candidate as UserProfile,
          chats: candidateChats as ChatMessage[],
        });
      }
    }

    if (eligibleCandidates.length === 0) {
      console.log("Background: No candidates with sufficient chat history");
      await supabase.from("profiles").update({ matching_complete: true }).eq("id", userId);
      return;
    }

    console.log(`Background: Evaluating ${eligibleCandidates.length} candidates with AI`);

    // Process candidates and find best match
    const matchResults: MatchResult[] = [];

    for (const candidate of eligibleCandidates) {
      try {
        const matchScore = await calculateCompatibility(
          userProfile as UserProfile,
          userChats as ChatMessage[],
          candidate.profile,
          candidate.chats,
        );

        if (matchScore && matchScore.score >= MIN_MATCH_SCORE) {
          matchResults.push({
            matchedUserId: candidate.profile.id,
            score: matchScore.score,
            reasons: matchScore.reasons,
          });
          console.log(`Background: Found potential match ${candidate.profile.id} with score ${matchScore.score}`);

          // Early exit if we find a great match (80%+)
          if (matchScore.score >= 80) {
            console.log("Background: Found excellent match, stopping search");
            break;
          }
        }
      } catch (error) {
        console.error(`Background: Error evaluating candidate ${candidate.profile.id}:`, error);
      }
    }

    if (matchResults.length === 0) {
      console.log("Background: No meaningful matches found above threshold");
      await supabase.from("profiles").update({ matching_complete: true }).eq("id", userId);
      return;
    }

    // Sort by score and get the best match
    matchResults.sort((a, b) => b.score - a.score);
    const bestMatch = matchResults[0];

    console.log(`Background: Best match: ${bestMatch.matchedUserId} with score ${bestMatch.score}`);

    // Get matched user's profile for email
    const { data: matchedProfile } = await supabase
      .from("profiles")
      .select("first_name, email")
      .eq("id", bestMatch.matchedUserId)
      .single();

    // Insert the match
    const { data: insertedMatch, error: insertError } = await supabase
      .from("matches")
      .insert({
        user_id: userId,
        matched_user_id: bestMatch.matchedUserId,
        match_score: bestMatch.score,
        compatibility_reasons: { reasons: bestMatch.reasons },
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Background: Failed to insert match:", insertError);
      return;
    }

    console.log("Background: Match saved to database");

    // Send email notification
    const emailSent = await sendMatchEmail(
      userProfile.email,
      userProfile.first_name,
      matchedProfile?.first_name || "Iemand bijzonders",
      bestMatch.score,
      bestMatch.reasons,
    );

    // Update match status
    if (emailSent) {
      await supabase
        .from("matches")
        .update({
          status: "notified",
          email_sent_at: new Date().toISOString(),
        })
        .eq("id", insertedMatch.id);
      console.log("Background: Email sent and match updated");
    }

    // Mark user's matching as complete
    await supabase.from("profiles").update({ matching_complete: true }).eq("id", userId);

    console.log("Background: Matching process completed successfully");
  } catch (error) {
    console.error("Background: Fatal error in match processing:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    console.log("Starting match finding for user:", user_id);

    // Use EdgeRuntime.waitUntil for background processing
    // This allows the function to return immediately while processing continues
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) {
      runtime.waitUntil(processMatching(user_id));
      console.log("Background processing initiated");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Match processing started in background",
          status: "processing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // Fallback: Run synchronously but with timeout awareness
      console.log("EdgeRuntime.waitUntil not available, running synchronously");
      await processMatching(user_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Match processing completed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Error in find-match function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function calculateCompatibility(
  user1Profile: UserProfile,
  user1Chats: ChatMessage[],
  user2Profile: UserProfile,
  user2Chats: ChatMessage[],
): Promise<{ score: number; reasons: string[] } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  // Extract only user messages (not agent responses)
  const user1Answers = user1Chats
    .filter((c) => c.role === "user")
    .map((c) => c.content)
    .join("\n---\n");

  const user2Answers = user2Chats
    .filter((c) => c.role === "user")
    .map((c) => c.content)
    .join("\n---\n");

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const user1Age = user1Profile.date_of_birth ? calculateAge(user1Profile.date_of_birth) : "onbekend";
  const user2Age = user2Profile.date_of_birth ? calculateAge(user2Profile.date_of_birth) : "onbekend";

  const systemPrompt = `Je bent een dating matchmaking expert die de compatibiliteit tussen twee personen analyseert op basis van hun chatgesprekken en profielgegevens.

Analyseer de volgende twee profielen en hun antwoorden op gespreksvragen om een compatibiliteitsscore te bepalen.

BELANGRIJKE CRITERIA:
1. Gedeelde interesses en hobby's (25 punten)
2. Vergelijkbare waarden en levensdoelen (25 punten)
3. Communicatiestijl compatibiliteit (15 punten)
4. Leeftijdsverschil acceptabel (15 punten) - ideaal is < 10 jaar verschil
5. Fysieke voorkeuren match (10 punten) - oogkleur, haarkleur, attractiviteit
6. Persoonlijkheid complementariteit (10 punten)

Geef een DETERMINISTISCH resultaat - dezelfde input moet altijd dezelfde output geven.
Wees objectief en baseer je score alleen op de beschikbare data.`;

  const userPrompt = `PERSOON 1 (${user1Profile.first_name}):
Leeftijd: ${user1Age}
Oogkleur: ${user1Profile.eye_color || "onbekend"}
Haarkleur: ${user1Profile.hair_color || "onbekend"}
Attractiviteitsscore: ${user1Profile.attractiveness_score || "niet beoordeeld"}

Gesprekantwoorden:
${user1Answers}

---

PERSOON 2 (${user2Profile.first_name}):
Leeftijd: ${user2Age}
Oogkleur: ${user2Profile.eye_color || "onbekend"}
Haarkleur: ${user2Profile.hair_color || "onbekend"}
Attractiviteitsscore: ${user2Profile.attractiveness_score || "niet beoordeeld"}

Gesprekantwoorden:
${user2Answers}

---

Analyseer de compatibiliteit en geef een score van 0-100 plus 3-5 specifieke redenen waarom deze match goed of minder goed is.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_compatibility",
              description: "Report the compatibility score and reasons",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Compatibility score from 0-100",
                    minimum: 0,
                    maximum: 100,
                  },
                  reasons: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 3-5 reasons explaining the compatibility",
                  },
                },
                required: ["score", "reasons"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_compatibility" } },
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log(`Compatibility score for ${user1Profile.id} <-> ${user2Profile.id}: ${result.score}`);
      return {
        score: Math.round(result.score),
        reasons: result.reasons || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Error calculating compatibility:", error);
    return null;
  }
}

async function sendMatchEmail(
  toEmail: string,
  userName: string,
  matchName: string,
  score: number,
  reasons: string[],
): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  const reasonsList = reasons.map((r) => `<li style="margin-bottom: 8px;">${r}</li>`).join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Matchmaker_Flori <no-reply@auth.lovable.cloud>",
        to: [toEmail],
        subject: `🎉 We hebben een match voor je gevonden, ${userName}!`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #e11d48; margin-bottom: 10px;">❤️ Match Gevonden!</h1>
  </div>
  
  <p style="font-size: 18px;">Hoi ${userName},</p>
  
  <p>Geweldig nieuws! We hebben iemand gevonden die perfect bij je zou kunnen passen.</p>
  
  <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 16px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="font-size: 16px; color: #666; margin-bottom: 8px;">Je match</p>
    <h2 style="color: #e11d48; font-size: 28px; margin: 0 0 16px 0;">${matchName}</h2>
    <div style="background: white; border-radius: 12px; padding: 16px; display: inline-block;">
      <span style="font-size: 32px; font-weight: bold; color: #e11d48;">${score}%</span>
      <span style="display: block; font-size: 14px; color: #666;">compatibiliteit</span>
    </div>
  </div>
  
  <h3 style="color: #333; margin-top: 30px;">Waarom deze match?</h3>
  <ul style="padding-left: 20px; color: #555;">
    ${reasonsList}
  </ul>
  
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://agent-love-chat.lovable.app/chat" 
       style="background: linear-gradient(135deg, #e11d48 0%, #be185d 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; display: inline-block;">
      Bekijk je match
    </a>
  </div>
  
  <p style="color: #888; font-size: 14px; text-align: center; margin-top: 40px;">
    Dit is een automatisch gegenereerde e-mail van Indebuurt Ontmoet.<br>
    Je ontvangt deze e-mail omdat je je hebt aangemeld voor onze matching service.
  </p>
</body>
</html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", response.status, errorText);
      return false;
    }

    console.log("Match email sent successfully to:", toEmail);
    return true;
  } catch (error) {
    console.error("Error sending match email:", error);
    return false;
  }
}
