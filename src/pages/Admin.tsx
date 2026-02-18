import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, Users, Activity, MessageCircle, TrendingUp, Eye, LogOut, Sparkles, UserPlus, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string | null;
  photo_url: string | null;
  attractiveness_score: number | null;
  gender: string | null;
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

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    try {
      const { data: result, error } = await supabase.functions.invoke("admin-data", {
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

  const totalUsers = data.tables.profiles?.count || 0;
  const liveUsers = activeUsers.filter(u => u.is_online).length;
  const today = new Date().toDateString();
  const newToday = profiles.filter(p => p.created_at && new Date(p.created_at).toDateString() === today).length;
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

  // Gender ratio from enriched profiles
  const genderCounts: Record<string, number> = {};
  profiles.forEach(p => {
    const g = p.gender || null;
    if (g) genderCounts[g] = (genderCounts[g] || 0) + 1;
  });
  const unknownGender = totalUsers - Object.values(genderCounts).reduce((a, b) => a + b, 0);
  if (unknownGender > 0) genderCounts["Unknown"] = unknownGender;
  const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value, pct: ((value / totalUsers) * 100).toFixed(1) }));

  // User engagement
  const engagementData = [
    { name: "Completed Chat", value: completedProfiles.length, pct: ((completedProfiles.length / Math.max(totalUsers, 1)) * 100).toFixed(1) },
    { name: "Incomplete Chat", value: totalUsers - completedProfiles.length, pct: (((totalUsers - completedProfiles.length) / Math.max(totalUsers, 1)) * 100).toFixed(1) },
    { name: "New Today", value: newToday, pct: ((newToday / Math.max(totalUsers, 1)) * 100).toFixed(1) },
  ];

  // Match activity
  const matchActivityData = [
    { name: "Accepted", value: acceptedMatches, pct: totalMatches > 0 ? ((acceptedMatches / totalMatches) * 100).toFixed(1) : "0.0" },
    { name: "Pending", value: pendingMatches, pct: totalMatches > 0 ? ((pendingMatches / totalMatches) * 100).toFixed(1) : "0.0" },
    { name: "Declined", value: declinedMatches, pct: totalMatches > 0 ? ((declinedMatches / totalMatches) * 100).toFixed(1) : "0.0" },
  ];

  // Match pairs with profile lookup
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const matchPairs = matches.map(m => ({
    ...m,
    user: profileMap.get(m.user_id),
    matched: profileMap.get(m.matched_user_id),
  }));

  const weeklySignups = getWeeklySignups(profiles);
  const recentCompleted = completedProfiles.slice(0, 10);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Heart className="h-5 w-5 text-destructive" />} value={totalMatches} label="Total Matches" />
          <StatCard icon={<Clock className="h-5 w-5 text-destructive" />} value={pendingMatches} label="Pending Matches" />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-primary" />} value={`${matchRate}%`} label="Match Rate" />
          <StatCard icon={<Eye className="h-5 w-5 text-primary" />} value={declinedMatches} label="Declined" />
        </div>

        {/* Recent Profiles */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Profiles</CardTitle>
            <Badge variant="outline">{profiles.length} total</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {profiles.slice(0, 12).map(p => (
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
              {matchPairs.slice(0, 6).map(mp => (
                <MatchPairCard key={mp.id} mp={mp} />
              ))}
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

        {/* Recent Completed Users Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Users</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCompleted.map(p => {
                  const age = getAge(p.date_of_birth);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.photo_url ? (
                          <img src={p.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
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
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">complete</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{timeAgo(p.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
      <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center overflow-hidden">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Users className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
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
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {mp.user?.photo_url ? (
            <img src={mp.user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Users className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
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
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {mp.matched?.photo_url ? (
            <img src={mp.matched.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Users className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
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

function PieChartCard({ title, data }: { title: string; data: { name: string; value: number; pct: string }[] }) {
  const filtered = data.filter(d => d.value > 0);
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={filtered} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                  {filtered.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground truncate">{d.name}</span>
                <span className="font-medium ml-auto">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
