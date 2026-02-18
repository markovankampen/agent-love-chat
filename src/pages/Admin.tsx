import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatsCards } from "@/components/admin/StatsCards";
import { RecentProfiles } from "@/components/admin/RecentProfiles";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { MatchPairs } from "@/components/admin/MatchPairs";
import { WeeklySignups } from "@/components/admin/WeeklySignups";
import { RecentUsersTable } from "@/components/admin/RecentUsersTable";
import { Skeleton } from "@/components/ui/skeleton";

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const { data, loading, error, refetch } = useAdminData();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  if (!authChecked) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Toegang geweigerd</h2>
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => navigate("/")} className="text-primary underline">Terug naar home</button>
        </div>
      </div>
    );
  }

  const liveUsers = data?.user_activity.filter(a => {
    if (!a.is_online) return false;
    const diff = Date.now() - new Date(a.last_seen_at).getTime();
    return diff < 2 * 60 * 1000;
  }).length || 0;

  const today = new Date().toISOString().slice(0, 10);
  const newToday = data?.profiles.filter(p => p.created_at?.startsWith(today)).length || 0;
  const totalMessages = data?.counts.conversations || 0;
  const totalMatches = data?.matches.length || 0;
  const pendingMatches = data?.matches.filter(m => m.status === "pending").length || 0;
  const acceptedMatches = data?.matches.filter(m => m.status === "accepted").length || 0;
  const declinedMatches = data?.matches.filter(m => m.status === "declined").length || 0;
  const matchRate = totalMatches > 0 ? ((acceptedMatches / totalMatches) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        <AdminHeader onSignOut={async () => { await supabase.auth.signOut(); navigate("/auth"); }} />

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : data ? (
          <>
            <StatsCards
              totalUsers={data.counts.profiles}
              liveUsers={liveUsers}
              newToday={newToday}
              totalMessages={totalMessages}
              totalMatches={totalMatches}
              pendingMatches={pendingMatches}
              matchRate={matchRate}
              declined={declinedMatches}
            />
            <RecentProfiles profiles={data.profiles} />
            <AnalyticsCharts profiles={data.profiles} matches={data.matches} conversations={data.conversations} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MatchPairs matches={data.matches} profiles={data.profiles} />
              <WeeklySignups profiles={data.profiles} />
            </div>
            <RecentUsersTable profiles={data.profiles} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Admin;
