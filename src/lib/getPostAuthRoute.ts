import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct route for a user after authentication.
 * - Admin role → /admin
 * - Incomplete profile (missing first_name, date_of_birth, or photo_url) → /profile-setup
 * - Complete profile → /home
 */
export async function getPostAuthRoute(userId: string): Promise<string> {
  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleData) {
    return "/admin";
  }

  // Check profile completeness
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, date_of_birth, photo_url")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.first_name || !profile.date_of_birth || !profile.photo_url) {
    return "/profile-setup";
  }

  return "/home";
}
