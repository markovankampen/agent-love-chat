import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, Users, Activity, MessageCircle, TrendingUp, Eye, LogOut, Sparkles, UserPlus, Clock, Camera, Trash2, Shield, ClipboardList, Pause, Play, RotateCcw, BellOff, Search, ChevronLeft, ChevronRight, Download, Mail, Send } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_name: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
interface AdminData {
  fetched_at: string;
  admin_user_id: string;
  tables: Record<string, { count: number; data: unknown[] }>;
}

interface Profile {
  id: string;
  first_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  matching_complete: boolean | null;
  paused: boolean | null;
  created_at: string | null;
  photo_url: string | null;
  attractiveness_score: number | null;
  gender: string | null;
}

interface FaceAnalysis {
  id: string;
  user_id: string;
  photo_url: string;
  attractiveness_score: number | null;
  facial_features: Record<string, unknown> | null;
  created_at: string;
}

interface Match {
  id: string;
  user_id: string;
  matched_user_id: string;
  match_score: number;
  status: string;
  created_at: string;
  compatibility_reasons: { reasons?: string[] } | null;
}

const PIE_COLORS = ["hsl(245, 85%, 60%)", "hsl(200, 80%, 55%)", "hsl(0, 84%, 60%)", "hsl(35, 90%, 55%)", "hsl(150, 60%, 45%)", "hsl(280, 60%, 55%)"];

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getAgeGroup(age: number | null): string | null {
  if (age === null) return null;
  if (age < 18) return "<18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}

function getWeeklySignups(profiles: Profile[]): { day: string; signups: number }[] {
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { day: string; signups: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = days[d.getDay()];
    const count = profiles.filter(p => {
      if (!p.created_at) return false;
      const cd = new Date(p.created_at);
      return cd.toDateString() === d.toDateString();
    }).length;
    result.push({ day: dayStr, signups: count });
  }
  return result;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [exportingLinks, setExportingLinks] = useState(false);
  const [batchEmailStats, setBatchEmailStats] = useState<{
    totalMissingPhotos: number;
    totalAlreadyEmailed: number;
    remaining: number;
  } | null>(null);
  const [batchEmailResult, setBatchEmailResult] = useState<{
    attempted: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    attempted: number; sent: number; failed: number;
    results?: Array<{ email: string; status: string; error?: string }>;
  } | null>(null);
  const [reuploadEmailLogs, setReuploadEmailLogs] = useState<{
    id: string; user_id: string; email: string; sent_at: string | null; status: string; error_message: string | null; reupload_token: string | null;
  }[]>([]);
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogPage, setEmailLogPage] = useState(0);
  const [matchPage, setMatchPage] = useState(0);
  const EMAIL_LOGS_PER_PAGE = 15;
  const USERS_PER_PAGE = 10;
  const MATCHES_PER_PAGE = 10;

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    try {
      const { data: result, error } = await supabase.functions.invoke("admin-data", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setData(result as AdminData);
      setIsAdmin(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Access denied";
      toast({ title: "Admin access required", description: msg, variant: "destructive" });
      navigate("/home");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  async function handleDeleteProfile(targetUserId: string) {
    setDeletingUserId(targetUserId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: result, error } = await supabase.functions.invoke("admin-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "delete_profile", targetUserId, reason: deleteReason },
      });
      if (error) throw error;
      toast({ title: "Profile deleted", description: result.message });
      setDeleteReason("");
      checkAdminAndFetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleAdminAction(targetUserId: string, action: string, label: string) {
    setActionUserId(targetUserId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: result, error } = await supabase.functions.invoke("admin-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action, targetUserId },
      });
      if (error) throw error;
      toast({ title: label, description: result.message });
      checkAdminAndFetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : `${label} failed`;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setActionUserId(null);
    }
  }

  async function fetchAuditLogs() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: result, error } = await supabase.functions.invoke("admin-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "get_audit_log" },
      });
      if (error) throw error;
      setAuditLogs(result.logs || []);
      setShowAuditLog(true);
    } catch (e: unknown) {
      toast({ title: "Error loading audit log", variant: "destructive" });
    }
  }

  async function handleExportPhotoLinks() {
    setExportingLinks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-photo-links`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Export failed");
      }
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        toast({ title: "No users missing photos", description: json.message });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo-magic-links-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "CSV downloaded", description: "Magic links exported successfully" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Export failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setExportingLinks(false);
    }
  }

  async function fetchBatchEmailStats() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Quick stats call with batchSize=0 to just get counts
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-photo-reupload-batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batchSize: 0 }),
        }
      );
      const result = await res.json();
      if (result.totalMissingPhotos !== undefined) {
        setBatchEmailStats({
          totalMissingPhotos: result.totalMissingPhotos,
          totalAlreadyEmailed: result.totalAlreadyEmailed,
          remaining: result.remaining,
        });
      }
    } catch (e) {
      console.error("Error fetching batch email stats:", e);
    }
  }

  async function fetchReuploadEmailLogs() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: result, error } = await supabase.functions.invoke("admin-data", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "get_reupload_email_logs" },
      });
      if (error) throw error;
      setReuploadEmailLogs(result.logs || []);
      setShowEmailLogs(true);
    } catch (e) {
      toast({ title: "Error loading email logs", variant: "destructive" });
    }
  }

  async function handleSendBatch(batchSize: number) {
    setSendingBatch(true);
    setBatchEmailResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-photo-reupload-batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batchSize }),
        }
      );
      const result = await res.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setBatchEmailResult({
        attempted: result.attempted,
        sent: result.sent,
        failed: result.failed,
      });
      setBatchEmailStats({
        totalMissingPhotos: result.totalMissingPhotos,
        totalAlreadyEmailed: result.totalAlreadyEmailed,
        remaining: result.remaining,
      });
      toast({
        title: "Batch verzonden",
        description: `${result.sent} verzonden, ${result.failed} mislukt van ${result.attempted} pogingen.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Batch send failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSendingBatch(false);
    }
  }

  async function handleSendTestEmail() {
    setSendingTest(true);
    setTestEmailResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-photo-reupload-batch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ testMode: true }),
        }
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setTestEmailResult({
        attempted: result.attempted,
        sent: result.sent,
        failed: result.failed,
        results: result.results,
      });
      toast({
        title: "Test emails verzonden",
        description: `${result.sent} verzonden, ${result.failed} mislukt van ${result.attempted} test adressen.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Test send failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin || !data) return null;

  const profiles = (data.tables.profiles?.data || []) as Profile[];
  const matches = (data.tables.matches?.data || []) as Match[];
  const activeUsers = (data.tables.user_activity?.data || []) as { user_id: string; is_online: boolean }[];
  const faceAnalyses = (data.tables.face_analysis?.data || []) as FaceAnalysis[];

  const totalUsers = data.tables.profiles?.count || 0;
  const liveUsers = activeUsers.filter(u => u.is_online).length;
  const today = new Date().toDateString();
  const newToday = profiles.filter(p => p.created_at && new Date(p.created_at).toDateString() === today).length;
  const missingPhotosCount = profiles.filter(p => !p.photo_url || p.photo_url.trim() === "").length;
  const totalMessages = data.tables.conversations?.count || 0;
  const totalMatches = matches.length;
  const pendingMatches = matches.filter(m => m.status === "pending").length;
  const acceptedMatches = matches.filter(m => m.status === "accepted").length;
  const declinedMatches = matches.filter(m => m.status === "declined").length;
  const matchRate = totalMatches > 0 ? ((acceptedMatches / totalMatches) * 100).toFixed(1) : "0.0";
  const completedProfiles = profiles.filter(p => p.matching_complete);

  // Age distribution - exclude unknown
  const ageGroups: Record<string, number> = {};
  profiles.forEach(p => {
    const group = getAgeGroup(getAge(p.date_of_birth));
    if (group) ageGroups[group] = (ageGroups[group] || 0) + 1;
  });
  const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value, pct: ((value / totalUsers) * 100).toFixed(1) }));

  // Gender ratio from enriched profiles - exclude unknown
  const genderCounts: Record<string, number> = {};
  profiles.forEach(p => {
    const g = p.gender || null;
    if (g && g !== "Unknown") genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  const genderTotal = Object.values(genderCounts).reduce((a, b) => a + b, 0);
  const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value, pct: ((value / Math.max(genderTotal, 1)) * 100).toFixed(1) }));

  // User engagement
  const engagementData = [
    { name: "Completed Chat", value: completedProfiles.length, pct: ((completedProfiles.length / Math.max(totalUsers, 1)) * 100).toFixed(1) },
    { name: "Incomplete Chat", value: totalUsers - completedProfiles.length, pct: (((totalUsers - completedProfiles.length) / Math.max(totalUsers, 1)) * 100).toFixed(1) },
    { name: "New Today", value: newToday, pct: ((newToday / Math.max(totalUsers, 1)) * 100).toFixed(1) },
  ];

  // Match activity
  const matchActivityData = [
    { name: "Accepted", value: acceptedMatches, pct: totalMatches > 0 ? ((acceptedMatches / totalMatches) * 100).toFixed(1) : "0.0", color: "hsl(150, 60%, 45%)" },
    { name: "Pending", value: pendingMatches, pct: totalMatches > 0 ? ((pendingMatches / totalMatches) * 100).toFixed(1) : "0.0", color: "hsl(35, 90%, 55%)" },
    { name: "Declined", value: declinedMatches, pct: totalMatches > 0 ? ((declinedMatches / totalMatches) * 100).toFixed(1) : "0.0", color: "hsl(0, 84%, 60%)" },
  ];

  // Match pairs with profile lookup
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const matchPairs = matches.map(m => ({
    ...m,
    user: profileMap.get(m.user_id),
    matched: profileMap.get(m.matched_user_id),
  }));

  const weeklySignups = getWeeklySignups(profiles);
  // All users: search, sort, paginate
  const filteredProfiles = profiles.filter(p => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (p.first_name?.toLowerCase().includes(q)) || (p.email?.toLowerCase().includes(q));
  });
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    const aHasData = (a.gender && a.date_of_birth) ? 1 : 0;
    const bHasData = (b.gender && b.date_of_birth) ? 1 : 0;
    if (bHasData !== aHasData) return bHasData - aHasData;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  const totalPages = Math.max(1, Math.ceil(sortedProfiles.length / USERS_PER_PAGE));
  const safeUserPage = Math.min(userPage, totalPages - 1);
  const paginatedProfiles = sortedProfiles.slice(safeUserPage * USERS_PER_PAGE, (safeUserPage + 1) * USERS_PER_PAGE);

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-destructive fill-destructive" />
          <h1 className="text-xl font-bold text-foreground">Matchmaker Flori</h1>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            <span className="w-2 h-2 rounded-full bg-primary mr-1.5 inline-block" /> Live
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm hidden md:block">Your matchmaking insights at a glance</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportPhotoLinks} disabled={exportingLinks}>
            <Download className="h-4 w-4 mr-1" /> {exportingLinks ? "Exporting..." : "Export Photo Links"}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchAuditLogs}>
            <ClipboardList className="h-4 w-4 mr-1" /> Audit Log
          </Button>
          <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => toast({ title: "Matching triggered" })}>
            <Sparkles className="h-4 w-4 mr-1" /> Run Matching
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Stat Cards Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="h-5 w-5 text-destructive" />} value={totalUsers} label="Total Users" />
          <StatCard icon={<Activity className="h-5 w-5 text-primary" />} value={liveUsers} label="Live Users" />
          <StatCard icon={<UserPlus className="h-5 w-5 text-primary" />} value={newToday} label="New Today" />
          <StatCard icon={<MessageCircle className="h-5 w-5 text-primary" />} value={totalMessages.toLocaleString()} label="Messages Sent" />
        </div>

        {/* Stat Cards Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={<Heart className="h-5 w-5 text-destructive" />} value={totalMatches} label="Total Matches" />
          <StatCard icon={<Clock className="h-5 w-5 text-destructive" />} value={pendingMatches} label="Pending Matches" />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-primary" />} value={`${matchRate}%`} label="Match Rate" />
          <StatCard icon={<Eye className="h-5 w-5 text-primary" />} value={declinedMatches} label="Declined" />
          <StatCard icon={<Camera className="h-5 w-5 text-destructive" />} value={missingPhotosCount} label="Missing Photos" />
        </div>

        {/* Recent Profiles */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Profiles</CardTitle>
            <Badge variant="outline">{profiles.length} total</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {[...profiles].sort((a, b) => {
                const aHasData = (a.gender && a.date_of_birth) ? 1 : 0;
                const bHasData = (b.gender && b.date_of_birth) ? 1 : 0;
                if (bHasData !== aHasData) return bHasData - aHasData;
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              }).slice(0, 12).map(p => (
                <ProfileCard key={p.id} profile={p} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pie Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <PieChartCard title="Age Distribution" data={ageData} />
          <PieChartCard title="Gender Ratio" data={genderData} />
          <PieChartCard title="User Engagement" data={engagementData} />
          <PieChartCard title="Match Activity" data={matchActivityData} />
        </div>

        {/* Match Pairs & Weekly Signups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Match Pairs</CardTitle>
              <Badge variant="outline">{matches.length} matches</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {matchPairs.slice(matchPage * MATCHES_PER_PAGE, (matchPage + 1) * MATCHES_PER_PAGE).map(mp => (
                <MatchPairCard key={mp.id} mp={mp} />
              ))}
              {matches.length > MATCHES_PER_PAGE && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {matchPage + 1} of {Math.ceil(matches.length / MATCHES_PER_PAGE)}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={matchPage === 0} onClick={() => setMatchPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={(matchPage + 1) * MATCHES_PER_PAGE >= matches.length} onClick={() => setMatchPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Weekly Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklySignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="signups" name="Signups" fill="hsl(340, 80%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* All Users Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">All Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
                  className="pl-9 w-64"
                />
              </div>
              <Badge variant="outline">{filteredProfiles.length} users</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead>EMAIL</TableHead>
                  <TableHead>AGE</TableHead>
                  <TableHead>GENDER</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>JOINED</TableHead>
                  <TableHead>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProfiles.map(p => {
                  const age = getAge(p.date_of_birth);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.first_name || "User"} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{p.first_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.email || "—"}</TableCell>
                      <TableCell>{age ?? "—"}</TableCell>
                      <TableCell>{p.gender || "—"}</TableCell>
                      <TableCell>
                        {p.paused ? (
                          <Badge variant="destructive">paused</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">complete</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{timeAgo(p.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={p.paused ? "Unpause profile" : "Pause profile"}
                            onClick={() => handleAdminAction(p.id, "pause_profile", p.paused ? "Profile unpaused" : "Profile paused")}
                            disabled={actionUserId === p.id}
                          >
                            {p.paused ? <Play className="h-4 w-4 text-primary" /> : <Pause className="h-4 w-4 text-warning" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Restart chat"
                            onClick={() => handleAdminAction(p.id, "restart_chat", "Chat restarted")}
                            disabled={actionUserId === p.id}
                          >
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove notifications"
                            onClick={() => handleAdminAction(p.id, "remove_notifications", "Notifications removed")}
                            disabled={actionUserId === p.id}
                          >
                            <BellOff className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete profile: {p.first_name || p.email || "User"}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this user's profile, conversations, matches, and auth account. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                placeholder="Reason for deletion (optional)"
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteReason("")}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteProfile(p.id)}
                                  disabled={deletingUserId === p.id}
                                >
                                  {deletingUserId === p.id ? "Deleting..." : "Delete permanently"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {safeUserPage * USERS_PER_PAGE + 1}–{Math.min((safeUserPage + 1) * USERS_PER_PAGE, sortedProfiles.length)} of {sortedProfiles.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeUserPage === 0}
                  onClick={() => setUserPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {safeUserPage + 1} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeUserPage >= totalPages - 1}
                  onClick={() => setUserPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Face Analysis */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Face Analysis
            </CardTitle>
            <Badge variant="outline">{faceAnalyses.length} analyses</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {faceAnalyses.slice(0, 18).map(fa => {
                const profile = profileMap.get(fa.user_id);
                const name = profile?.first_name || profile?.email?.split("@")[0] || "User";
                return (
                  <div key={fa.id} className="text-center space-y-1.5 p-3 rounded-lg bg-card border">
                    {fa.photo_url ? (
                      <a href={fa.photo_url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={fa.photo_url}
                          alt={name}
                          className="w-16 h-16 mx-auto rounded-full object-cover ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer"
                        />
                      </a>
                    ) : (
                      <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm font-semibold truncate">{name}</p>
                    {fa.attractiveness_score != null && (
                      <p className="text-xs text-muted-foreground">Score: {fa.attractiveness_score}/10</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{timeAgo(fa.created_at)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Batch Photo Reupload Emails */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Photo Reupload Email Batches
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchBatchEmailStats} disabled={sendingBatch}>
              Refresh Stats
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {batchEmailStats ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{batchEmailStats.totalMissingPhotos}</p>
                  <p className="text-xs text-muted-foreground">Missing Photos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{batchEmailStats.totalAlreadyEmailed}</p>
                  <p className="text-xs text-muted-foreground">Already Emailed</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{batchEmailStats.remaining}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Refresh Stats" to load current numbers.</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSendTestEmail}
                disabled={sendingTest || sendingBatch}
              >
                <Mail className="h-4 w-4 mr-1" />
                {sendingTest ? "Sending Test..." : "Send Test Emails"}
              </Button>
              <div className="w-px h-6 bg-border" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendBatch(10)}
                disabled={sendingBatch || sendingTest || (batchEmailStats?.remaining === 0)}
              >
                <Send className="h-4 w-4 mr-1" />
                {sendingBatch ? "Sending..." : "Send 10"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendBatch(50)}
                disabled={sendingBatch || sendingTest || (batchEmailStats?.remaining === 0)}
              >
                <Send className="h-4 w-4 mr-1" />
                {sendingBatch ? "Sending..." : "Send 50"}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleSendBatch(batchEmailStats?.remaining || 500)}
                disabled={sendingBatch || sendingTest || (batchEmailStats?.remaining === 0)}
              >
                <Send className="h-4 w-4 mr-1" />
                {sendingBatch ? "Sending..." : `Send Remaining (${batchEmailStats?.remaining ?? "?"})`}
              </Button>
            </div>

            {testEmailResult && (
              <div className="border rounded-lg p-4 bg-card space-y-2">
                <p className="font-semibold text-sm">Test Email Result:</p>
                <div className="space-y-1">
                  {testEmailResult.results?.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant={r.status === "sent" ? "default" : "destructive"} className="text-xs">{r.status}</Badge>
                      <span className="text-muted-foreground">{r.email}</span>
                      {r.error && <span className="text-destructive text-xs">({r.error})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {batchEmailResult && (
              <div className="border rounded-lg p-4 bg-card space-y-2">
                <p className="font-semibold text-sm">Last Batch Result:</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{batchEmailResult.attempted}</p>
                    <p className="text-xs text-muted-foreground">Attempted</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">{batchEmailResult.sent}</p>
                    <p className="text-xs text-muted-foreground">Sent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">{batchEmailResult.failed}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Reupload Email Logs */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Photo Reupload Email Log
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchReuploadEmailLogs}>
              {showEmailLogs ? "Refresh Log" : "Load Log"}
            </Button>
          </CardHeader>
          <CardContent>
            {!showEmailLogs ? (
              <p className="text-sm text-muted-foreground">Click "Load Log" to view all sent reupload emails.</p>
            ) : reuploadEmailLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reupload emails sent yet.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>EMAIL</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead>SENT AT</TableHead>
                      <TableHead>ERROR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reuploadEmailLogs
                      .slice(emailLogPage * EMAIL_LOGS_PER_PAGE, (emailLogPage + 1) * EMAIL_LOGS_PER_PAGE)
                      .map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{log.email}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.error_message || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {reuploadEmailLogs.length > EMAIL_LOGS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {reuploadEmailLogs.length} total entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={emailLogPage === 0} onClick={() => setEmailLogPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {emailLogPage + 1} of {Math.ceil(reuploadEmailLogs.length / EMAIL_LOGS_PER_PAGE)}
                      </span>
                      <Button variant="outline" size="sm" disabled={emailLogPage >= Math.ceil(reuploadEmailLogs.length / EMAIL_LOGS_PER_PAGE) - 1} onClick={() => setEmailLogPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Audit Log */}
        {showAuditLog && (
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Admin Audit Log
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAuditLog(false)}>Close</Button>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No actions recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ADMIN</TableHead>
                      <TableHead>ACTION</TableHead>
                      <TableHead>TARGET</TableHead>
                      <TableHead>REASON</TableHead>
                      <TableHead>WHEN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.admin_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(log.details as Record<string, unknown>)?.deleted_user as string || log.target_id?.slice(0, 8) || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(log.details as Record<string, unknown>)?.reason as string || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{timeAgo(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2">{icon}</div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const age = getAge(profile.date_of_birth);
  const name = profile.first_name || profile.email?.split("@")[0] || "User";
  const score = profile.attractiveness_score ? `${profile.attractiveness_score}/10` : null;
  return (
    <div className="text-center space-y-1 p-3 rounded-lg bg-card border">
      {profile.photo_url ? (
        <img src={profile.photo_url} alt={name} className="w-14 h-14 mx-auto rounded-full object-cover" />
      ) : (
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-semibold truncate">{name}</p>
      <p className="text-xs text-muted-foreground">
        {age ? `${age}y` : ""}
        {age && profile.gender ? " • " : ""}
        {profile.gender || ""}
      </p>
      {score && <p className="text-xs text-muted-foreground">Score: {score}</p>}
      <p className="text-[10px] text-muted-foreground">{timeAgo(profile.created_at)}</p>
    </div>
  );
}

function MatchPairCard({ mp }: { mp: { id: string; user?: Profile; matched?: Profile; match_score: number; status: string; created_at: string } }) {
  const userName = mp.user?.first_name || mp.user?.email?.split("@")[0] || "User";
  const matchedName = mp.matched?.first_name || mp.matched?.email?.split("@")[0] || "User";
  const userAge = getAge(mp.user?.date_of_birth ?? null);
  const matchedAge = getAge(mp.matched?.date_of_birth ?? null);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
      {/* User 1 */}
      <div className="flex flex-col items-center gap-1 min-w-[60px]">
        {mp.user?.photo_url ? (
          <img src={mp.user.photo_url} alt={userName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <p className="text-xs font-semibold truncate max-w-[60px]">{userName}</p>
        <p className="text-[10px] text-muted-foreground">{userAge ? `${userAge}y` : ""}</p>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center">
        <Heart className="h-4 w-4 text-destructive fill-destructive" />
        <span className="text-sm font-bold text-destructive">{mp.match_score}%</span>
      </div>

      {/* User 2 */}
      <div className="flex flex-col items-center gap-1 min-w-[60px]">
        {mp.matched?.photo_url ? (
          <img src={mp.matched.photo_url} alt={matchedName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <p className="text-xs font-semibold truncate max-w-[60px]">{matchedName}</p>
        <p className="text-[10px] text-muted-foreground">{matchedAge ? `${matchedAge}y` : ""}</p>
      </div>

      {/* Status & Time */}
      <div className="flex items-center gap-2 ml-auto">
        <Badge variant={mp.status === "accepted" ? "default" : mp.status === "declined" ? "destructive" : "secondary"} className="text-xs">
          {mp.status}
        </Badge>
        <span className="text-xs text-muted-foreground">{timeAgo(mp.created_at)}</span>
      </div>
    </div>
  );
}

function PieChartCard({ title, data }: { title: string; data: { name: string; value: number; pct: string; color?: string }[] }) {
  const filtered = data.filter(d => d.value > 0);
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={filtered} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {filtered.map((entry, i) => {
                    const origIndex = data.findIndex(d => d.name === entry.name);
                    const color = entry.color || PIE_COLORS[origIndex % PIE_COLORS.length];
                    return <Cell key={i} fill={color} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-1.5">
            {data.map((d, i) => {
              const color = d.color || PIE_COLORS[i % PIE_COLORS.length];
              return (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground truncate">{d.name}</span>
                  <span className="font-medium ml-auto">{d.value} ({d.pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
