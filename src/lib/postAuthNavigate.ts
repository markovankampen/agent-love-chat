import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct route after authentication based on:
 * 1. Admin role → /admin
 * 2. Incomplete profile → /profile-setup
 * 3. Complete profile → /home
 */
export async function getPostAuthRoute(userId: string): Promise<string> {
  // Check if user has admin role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roles?.some((r) => r.role === "admin")) {
    return "/admin";
  }

  // Check profile completeness
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, username, date_of_birth, photo_url")
    .eq("id", userId)
    .maybeSingle();

  const isComplete =
    profile &&
    profile.first_name &&
    profile.date_of_birth &&
    profile.photo_url;

  return isComplete ? "/home" : "/profile-setup";
}
