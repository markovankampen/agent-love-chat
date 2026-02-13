import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds

export function useHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const sendHeartbeat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;

      const route = window.location.pathname;

      await supabase.from("user_activity").upsert(
        {
          user_id: session.user.id,
          last_seen_at: new Date().toISOString(),
          is_online: true,
          page_route: route,
        },
        { onConflict: "user_id" }
      );
    };

    const markOffline = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from("user_activity").upsert(
        {
          user_id: session.user.id,
          last_seen_at: new Date().toISOString(),
          is_online: false,
        },
        { onConflict: "user_id" }
      );
    };

    // Start heartbeat
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Mark offline on tab close
    const handleVisibilityChange = () => {
      if (document.hidden) {
        markOffline();
      } else {
        sendHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      markOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
