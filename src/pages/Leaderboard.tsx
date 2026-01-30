import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Loader2,
  RefreshCw,
  Search,
  User,
  Zap,
  Crown,
  Star,
  ChevronRight,
  Database,
  Terminal,
  Activity,
  Globe,
  Binary,
  Fingerprint,
  Copy
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as cvApi from "@/services/cvApi";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  actions: number;
  rank: number;
  badge: string;
  department?: string;
  weeklyGain?: number;
  energySaved?: number;
  trustScore?: number;
  lastSeen?: string;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { toast } = useToast();

  const getBadgeForRank = (rank: number): string => rank === 1 ? "Eco Champion" : rank === 2 ? "Sustainability Hero" : rank === 3 ? "Green Guardian" : "Eco Warrior";

  const loadMockLeaderboard = useCallback(() => {
    const mockContributors = [
      { person_id: "dr.rao@faculty.com", name: "Dr. Rao", total_credits: 4520.50, total_activities: 85, department: "Physics", weekly_gain: 120.4, total_energy_saved: 12500, trust_score: 0.992, last_seen: new Date().toISOString() },
      { person_id: "john@student.com", name: "John Doe", total_credits: 3210.20, total_activities: 142, department: "CS", weekly_gain: 245.1, total_energy_saved: 8400, trust_score: 0.985, last_seen: new Date().toISOString() },
      { person_id: "sarah.lee@student.com", name: "Sarah Lee", total_credits: 2840.15, total_activities: 96, department: "MECH", weekly_gain: 85.0, total_energy_saved: 7200, trust_score: 0.978, last_seen: new Date(Date.now() - 3600000).toISOString() },
      { person_id: "prof_gupta@faculty.com", name: "Prof. Gupta", total_credits: 2150.80, total_activities: 42, department: "ELEC", weekly_gain: -15.2, total_energy_saved: 5120, trust_score: 0.995, last_seen: new Date().toISOString() },
      { person_id: "m.verma@student.com", name: "M. Verma", total_credits: 1890.00, total_activities: 110, department: "CIVIL", weekly_gain: 310.5, total_energy_saved: 4500, trust_score: 0.942, last_seen: new Date(Date.now() - 86400000).toISOString() }
    ];

    setLeaderboard(mockContributors.map((e, i) => ({
      id: e.person_id,
      name: e.name,
      points: e.total_credits,
      actions: e.total_activities,
      rank: i + 1,
      badge: getBadgeForRank(i + 1),
      department: e.department,
      weeklyGain: e.weekly_gain,
      energySaved: e.total_energy_saved,
      trustScore: e.trust_score,
      lastSeen: e.last_seen
    })));
  }, []);

  const loadLeaderboard = useCallback(async () => {
    const useMock = useAuthStore.getState().useMockData;
    if (useMock) {
      loadMockLeaderboard();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await cvApi.getLeaderboard();
      if (result.success && result.data) {
        // Exclude system administrators and specialist accounts from the leaderboard
        const contributors = (result.data.leaderboard || [])
          .filter((e: any) => e.person_id !== 'admin@sca.campus' && !e.name?.toLowerCase().includes('admin'));

        setLeaderboard(contributors.map((e: any, i: number) => ({
          id: e.person_id,
          name: e.name || e.person_id,
          points: e.total_credits || 0,
          actions: e.total_activities || 0,
          rank: i + 1,
          badge: getBadgeForRank(i + 1),
          department: e.department || "Universal",
          weeklyGain: e.weekly_gain || 0,
          energySaved: e.total_energy_saved || 0,
          trustScore: e.trust_score || 0.95,
          lastSeen: e.last_seen
        })));
      } else {
        toast({
          title: "Census Failure",
          description: result.error || "The node leaderboard could not be retrieved.",
          variant: "destructive"
        });
      }
    } catch (e) {
      console.error("Network Error:", e);
      toast({
        title: "Gateway Timeout",
        description: "Leaderboard node is currently unreachable.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadMockLeaderboard]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const stats = useMemo(() => ({
    totalPoints: leaderboard.reduce((s, e) => s + e.points, 0),
    totalImpact: leaderboard.reduce((s, e) => s + (e.energySaved || 0), 0)
  }), [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return leaderboard.filter(e => e.name.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
  }, [leaderboard, searchQuery]);

  // Helper to determine if a node is active
  const isNodeActive = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24; // Active if seen in last 24h
  };

  return (
    <DashboardLayout>
      <div className="page-section">
        {/* Elite Census Header */}
        <div className="section-header">
          <div className="space-y-4">
            <div className="page-title-group">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-2xl shadow-slate-200">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Leaderboard</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Recognizing top contributors to campus sustainability. Impact scores are refreshed after every verified event.
            </p>
          </div>

          <div className="flex items-center gap-3">
          </div>
        </div>

        {/* Global Network Metrics */}
        <div className="stat-grid">
          {[
            { label: "Active Nodes", value: leaderboard.length, icon: <Globe className="w-5 h-5" />, color: "text-slate-900", bg: "bg-slate-50" },
            { label: "Network Offset", value: `${(stats.totalImpact / 1000).toFixed(1)} kWh`, icon: <Zap className="w-5 h-5" />, color: "text-success", bg: "bg-success/5" },
            { label: "Circulating Credits", value: stats.totalPoints.toFixed(2), icon: <Binary className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/5" },
            { label: "Avg Fidelity", value: "0.992", icon: <Fingerprint className="w-5 h-5" />, color: "text-slate-900", bg: "bg-slate-50" }
          ].map((stat, i) => (
            <Card key={i} className={cn("p-6 border border-slate-100 rounded-[32px] group hover:border-primary/20 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300", stat.bg)}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-300 group-hover:text-primary group-hover:scale-110 transition-all duration-300">
                  {stat.icon}
                </div>
              </div>
              <div className="space-y-1">
                <div className={cn("text-3xl font-black tracking-tighter transition-colors duration-300", stat.color)}>{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-500 transition-colors">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>



        {/* Podium Interface - Massive Impact */}
        {!isLoading && filteredLeaderboard.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {/* Rank 2 */}
            <Card role="article" aria-label={`Rank 2: ${filteredLeaderboard[1].name}`} className="relative p-5 md:p-8 pb-6 md:pb-10 rounded-[32px] md:rounded-[48px] border-slate-200/60 bg-white shadow-xl shadow-slate-100 flex flex-col items-center text-center space-y-4 md:space-y-6 order-2 md:order-1 min-h-[180px] md:min-h-[240px] justify-between group overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500" onClick={() => { setSelectedUser(filteredLeaderboard[1]); setIsProfileModalOpen(true); }}>
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-300 opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform duration-500">
                <span className="text-2xl font-black text-slate-400">2</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter text-slate-900 leading-none group-hover:text-primary transition-colors">{filteredLeaderboard[1].name}</h3>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredLeaderboard[1].department}</div>
              </div>
              <div className="w-full pt-6 border-t border-slate-50 flex justify-between">
                <div className="text-left"><div className="text-lg font-black text-slate-900 leading-none">{filteredLeaderboard[1].points.toFixed(2)}</div><div className="text-[8px] font-bold uppercase text-slate-400">CREDITS</div></div>
                <div className="text-right"><div className="text-lg font-black text-slate-900 leading-none">{filteredLeaderboard[1].rank}</div><div className="text-[8px] font-bold uppercase text-slate-400">GLOBAL_RANK</div></div>
              </div>
            </Card>

            {/* Rank 1 */}
            <Card role="article" aria-label={`Rank 1: ${filteredLeaderboard[0].name}`} className="relative p-6 md:p-10 pb-8 md:pb-12 rounded-[40px] md:rounded-[64px] border-2 border-primary/20 bg-slate-900 text-white shadow-3xl shadow-primary/10 flex flex-col items-center text-center space-y-6 md:space-y-8 order-1 md:order-2 min-h-[220px] md:min-h-[300px] justify-between group overflow-hidden cursor-pointer hover:-translate-y-4 hover:shadow-primary/20 transition-all duration-500" onClick={() => { setSelectedUser(filteredLeaderboard[0]); setIsProfileModalOpen(true); }}>
              <div className="absolute inset-0 bg-primary/5 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity" />
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-slate-900 shadow-2xl shadow-primary/20 scale-110 group-hover:scale-125 transition-transform duration-500">
                <Crown className="w-12 h-12 text-slate-900 fill-current" />
              </div>
              <div className="space-y-3 z-10 transition-transform duration-500 group-hover:-translate-y-2">
                <h3 className="text-3xl font-black tracking-tighter text-white leading-none">{filteredLeaderboard[0].name}</h3>
                <Badge className="bg-primary hover:bg-primary text-slate-900 border-none font-black text-[9px] uppercase tracking-widest px-4 h-6">ULTIMATE_CHAMPS</Badge>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{filteredLeaderboard[0].department}</div>
              </div>
              <div className="w-full pt-8 border-t border-white/5 flex justify-between z-10">
                <div className="text-left"><div className="text-2xl font-black text-primary leading-none">{filteredLeaderboard[0].points.toFixed(2)}</div><div className="text-[9px] font-bold uppercase text-white/40">MASTER_SCORE</div></div>
                <div className="text-right"><div className="text-2xl font-black text-white leading-none">0.1s</div><div className="text-[9px] font-bold uppercase text-white/40">LATENCY_OK</div></div>
              </div>
            </Card>

            {/* Rank 3 */}
            <Card role="article" aria-label={`Rank 3: ${filteredLeaderboard[2].name}`} className="relative p-5 md:p-8 pb-6 md:pb-10 rounded-[32px] md:rounded-[48px] border-slate-200/60 bg-white shadow-xl shadow-slate-100 flex flex-col items-center text-center space-y-4 md:space-y-6 order-3 min-h-[180px] md:min-h-[240px] justify-between group overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500" onClick={() => { setSelectedUser(filteredLeaderboard[2]); setIsProfileModalOpen(true); }}>
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-600/20 opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="w-20 h-20 rounded-full bg-amber-600/10 flex items-center justify-center border-4 border-white shadow-lg shadow-amber-600/10 group-hover:scale-110 transition-transform duration-500">
                <span className="text-2xl font-black text-amber-600">3</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter text-slate-900 leading-none group-hover:text-primary transition-colors">{filteredLeaderboard[2].name}</h3>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredLeaderboard[2].department}</div>
              </div>
              <div className="w-full pt-6 border-t border-slate-50 flex justify-between">
                <div className="text-left"><div className="text-lg font-black text-slate-900 leading-none">{filteredLeaderboard[2].points.toFixed(2)}</div><div className="text-[8px] font-bold uppercase text-slate-400">CREDITS</div></div>
                <div className="text-right"><div className="text-lg font-black text-slate-900 leading-none">{filteredLeaderboard[2].rank}</div><div className="text-[8px] font-bold uppercase text-slate-400">GLOBAL_RANK</div></div>
              </div>
            </Card>
          </div>
        )}

        {/* Dense Network Census */}
        <div className="space-y-6">
          <div className="section-header border-none pb-0 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <Terminal className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Network Census</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <input
                  type="text"
                  id="search-census"
                  placeholder="Lookup Node Handle..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full md:w-64 rounded-xl bg-slate-50 border-none font-bold text-xs pl-10 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-slate-200 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Compiling Census Data...</p>
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <Card className="py-20 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-900">{searchQuery ? "No node matches found" : "Node Census Empty"}</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">
                  {searchQuery ? "Try refining your search parameters." : "No identity records synchronized yet."}
                </p>
              </Card>
            ) : (
              filteredLeaderboard.map((user) => (
                <Card
                  key={user.id}
                  onClick={() => { setSelectedUser(user); setIsProfileModalOpen(true); }}
                  className="p-6 rounded-[32px] border-slate-100 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 group overflow-hidden relative cursor-pointer"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary transition-all duration-300" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-8 text-center shrink-0">
                        <span className="text-sm font-black text-slate-300 group-hover:text-slate-900 transition-colors">{user.rank}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 group-hover:scale-105 transition-all duration-300 overflow-hidden p-0.5">
                          <Avatar className="w-full h-full rounded-xl border-2 border-white">
                            <AvatarFallback className="bg-slate-50 text-xs font-black text-slate-400 uppercase group-hover:text-primary transition-colors">
                              {user.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <div className="text-base font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors duration-300">{user.name}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60 group-hover:text-slate-500 transition-colors">{user.department}</div>
                            <div className="flex items-center gap-1 group/handle cursor-pointer" onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(user.id);
                              toast({ title: "Node Handle Cached", description: `Identity signature for ${user.name} copied.` });
                            }}>
                              <Fingerprint className="w-2.5 h-2.5 text-slate-300 group-hover/handle:text-primary transition-colors" />
                              <code className="text-[8px] font-mono font-bold text-slate-400 group-hover/handle:text-primary transition-colors uppercase tracking-tighter">
                                NODE_{user.id.split('@')[0].toUpperCase()}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-10 self-end md:self-center">
                      <div className="hidden lg:flex flex-col items-end">
                        <div className={cn(
                          "text-base font-black tracking-tighter transition-transform duration-300 group-hover:scale-110",
                          (user.weeklyGain || 0) > 0 ? "text-success" : (user.weeklyGain || 0) < 0 ? "text-destructive" : "text-slate-900"
                        )}>
                          {(user.weeklyGain || 0) > 0 ? `+${user.weeklyGain.toFixed(2)}` : user.weeklyGain.toFixed(2)} <span className="text-[10px] uppercase">Credits</span>
                        </div>
                        <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none group-hover:text-slate-500 transition-colors">Weekly Delta</div>
                      </div>
                      <div className="text-right min-w-20 md:min-w-24">
                        <div className="text-2xl font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors duration-300">{user.points.toFixed(2)}</div>
                        <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none opacity-60 group-hover:text-slate-500 transition-colors">Total Accrued</div>
                      </div>
                      <Button variant="ghost" size="icon" className="w-11 h-11 rounded-2xl border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all">
                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-900 transition-all group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Node Identity Terminal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="fixed left-[50%] top-[50%] z-[200] w-[95vw] max-w-[42rem] translate-x-[-50%] translate-y-[-50%] bg-white rounded-[40px] shadow-3xl overflow-hidden focus:outline-none">
          <div className="h-3 w-full bg-slate-900" />

          <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar space-y-8">
            {selectedUser && (
              <>
                <DialogHeader className="flex flex-col items-center text-center space-y-6 pt-4">
                  <div className="relative">
                    <Avatar className="w-32 h-32 rounded-[40px] border-4 border-white shadow-3xl shadow-slate-100">
                      <AvatarFallback className="bg-slate-900 text-white text-3xl font-black">
                        {selectedUser.name ? selectedUser.name[0].toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary text-slate-900 shadow-xl flex items-center justify-center border-4 border-white">
                      <Star className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                  <DialogTitle className="text-4xl font-black tracking-tighter uppercase text-slate-900">{selectedUser.name}</DialogTitle>
                  <div className="flex flex-col items-center gap-2">
                    <DialogDescription className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] leading-none">{selectedUser.department || 'Universal'} • NODE_VERIFIED</DialogDescription>

                    <div className="mt-4 flex flex-col items-center gap-1.5">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dispatch Address</div>
                      <div className="flex items-center gap-2 group/handle cursor-pointer" onClick={() => {
                        if (selectedUser?.id) {
                          navigator.clipboard.writeText(selectedUser.id);
                          toast({ title: "Node Handle Cached", description: `Identity signature for ${selectedUser.name} copied.` });
                        }
                      }}>
                        <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2 group-hover/handle:border-primary/20 group-hover/handle:bg-slate-100 transition-all">
                          <Fingerprint className="w-4 h-4 text-slate-300 group-hover/handle:text-primary transition-colors" />
                          <code className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-tighter group-hover/handle:text-primary transition-colors">
                            NODE_{(selectedUser.id || "0000").split('@')[0].toUpperCase()}
                          </code>
                          <Copy className="w-3 h-3 text-slate-300 opacity-0 -ml-1 group-hover/handle:opacity-100 group-hover/handle:ml-1 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="auto-scroll-row px-2">
                  {[
                    { label: "Audit Rank", value: `#${selectedUser.rank}` },
                    { label: "Fidelity Index", value: selectedUser.trustScore?.toFixed(3) || "0.950" },
                    { label: "Impact Factor", value: `${(selectedUser.energySaved || 0) / 1000}k` },
                    {
                      label: "Sync Status",
                      value: isNodeActive(selectedUser.lastSeen) ? "ACTIVE" : "OFFLINE",
                      color: isNodeActive(selectedUser.lastSeen) ? "text-success" : "text-slate-400"
                    }
                  ].map((d, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-3xl text-center space-y-1 group border border-slate-100 min-w-[120px]">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">{d.label}</div>
                      <div className={cn("text-base font-black text-slate-900 tracking-tighter", d.color)}>{d.value}</div>
                    </div>
                  ))}
                </div>

                <div className="p-6 md:p-8 rounded-[40px] bg-slate-900 text-white space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:scale-110 transition-transform">
                    <Binary className="w-32 h-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-1">
                      <div className="text-4xl font-black tracking-tighter text-white leading-none">{(selectedUser.points || 0).toFixed(2)} <span className="text-lg opacity-40">Credits</span></div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Global Asset Holding</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-4xl font-black tracking-tighter text-white leading-none">{(selectedUser.weeklyGain || 0) > 0 ? `+${(selectedUser.weeklyGain || 0).toFixed(2)}` : (selectedUser.weeklyGain || 0).toFixed(2)}</div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Cycle Performance Delta</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-center flex-wrap gap-2">
                    {(() => {
                      const tags = [];
                      if (selectedUser.rank && selectedUser.rank <= 3) tags.push("#PRIME_OPERATOR");
                      else if (selectedUser.rank && selectedUser.rank <= 10) tags.push("#ELITE_UNIT");

                      if ((selectedUser.actions || 0) > 15) tags.push("#HYPER_ACTIVE");
                      else if ((selectedUser.actions || 0) > 5) tags.push("#CONSISTENT_ACTOR");

                      if ((selectedUser.energySaved || 0) > 50) tags.push("#GRID_SAVIOR");

                      if (selectedUser.department) {
                        const dept = selectedUser.department.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        if (dept) tags.push(`#${dept}_CORE`);
                      }

                      if ((selectedUser.weeklyGain || 0) > 5) tags.push("#RISING_MOMENTUM");
                      if ((selectedUser.trustScore || 0) >= 90) tags.push("#TRUSTED_ORACLE");

                      if (tags.length === 0) tags.push("#NEW_INITIATE");

                      return tags.slice(0, 5).map(tag => (
                        <Badge key={tag} variant="outline" className="h-8 px-4 rounded-xl border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">{tag}</Badge>
                      ));
                    })()}
                  </div>

                  <div className="flex justify-center pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setIsProfileModalOpen(false)} className="w-full h-16 rounded-[28px] border-2 border-slate-100 font-black text-xs uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all">
                      Close Node Profile
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Leaderboard;
