import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  first_name: string | null;
  username: string | null;
  email: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  matching_complete: boolean | null;
  email_verified: boolean | null;
  attractiveness_score: number | null;
  facial_features: Record<string, unknown> | null;
  hair_color: string | null;
  eye_color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Match {
  id: string;
  user_id: string;
  matched_user_id: string;
  match_score: number;
  compatibility_reasons: unknown;
  status: string;
  created_at: string;
  email_sent_at: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string | null;
}

export interface UserActivity {
  id: string;
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
  page_route: string | null;
}

export interface AdminData {
  profiles: Profile[];
  matches: Match[];
  conversations: Conversation[];
  user_activity: UserActivity[];
  counts: {
    profiles: number;
    matches: number;
    conversations: number;
    user_activity: number;
  };
}

export function useAdminData() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke("admin-data", {
        body: null,
        method: "GET",
      });

      if (response.error) {
        setError(response.error.message);
        return;
      }

      const result = response.data;
      if (result?.error) {
        setError(result.error);
        return;
      }

      const tables = result.tables || {};
      setData({
        profiles: (tables.profiles?.data || []) as Profile[],
        matches: (tables.matches?.data || []) as Match[],
        conversations: (tables.conversations?.data || []) as Conversation[],
        user_activity: (tables.user_activity?.data || []) as UserActivity[],
        counts: {
          profiles: tables.profiles?.count || 0,
          matches: tables.matches?.count || 0,
          conversations: tables.conversations?.count || 0,
          user_activity: tables.user_activity?.count || 0,
        },
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
