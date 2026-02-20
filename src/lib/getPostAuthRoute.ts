import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct route for a user after authentication.
 * - Incomplete profile (missing first_name or date_of_birth) → /profile-setup
 * - Missing photo → /profile-setup?photo-only=true
 * - Admin role → /admin
 * - Complete profile → /home
 */
export async function getPostAuthRoute(userId: string): Promise<string> {
  // Check profile completeness first (always readable by the user via RLS)
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, date_of_birth, photo_url")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.first_name || !profile.date_of_birth) {
    return "/profile-setup";
  }

  // Returning users with complete profile but missing photo go to /home
  // where they'll see the photo re-upload prompt banner
  if (!profile.photo_url) {
    return "/home";
  }

  // Check admin role (RLS only allows admins to read user_roles)
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleData) {
    return "/admin";
  }

  return "/home";
}
