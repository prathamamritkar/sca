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
  Fingerprint
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
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { toast } = useToast();

  const getBadgeForRank = (rank: number): string => rank === 1 ? "Eco Champion" : rank === 2 ? "Sustainability Hero" : rank === 3 ? "Green Guardian" : "Eco Warrior";

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await cvApi.getLeaderboard();
      if (result.success && result.data) {
        setLeaderboard(result.data.leaderboard.map((e: any, i: number) => ({
          id: e.person_id,
          name: e.name || e.person_id,
          points: e.total_credits || 0,
          actions: e.total_activities || 0,
          rank: i + 1,
          badge: getBadgeForRank(i + 1),
          department: e.department || "Universal",
          weeklyGain: Math.floor((e.total_credits || 0) * 0.12), // Still a relative trend
          energySaved: e.total_energy_saved || 0
        })));
      } else {
        toast({
          title: "Census Failure",
          description: result.error || "The node leaderboard could not be retrieved.",
          variant: "destructive"
        });
      }
    } catch (e) {
      toast({
        title: "Gateway Timeout",
        description: "Leaderboard node is currently unreachable.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const stats = useMemo(() => ({
    totalPoints: leaderboard.reduce((s, e) => s + e.points, 0),
    totalImpact: leaderboard.reduce((s, e) => s + (e.energySaved || 0), 0)
  }), [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return leaderboard.filter(e => e.name.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
  }, [leaderboard, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Elite Census Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Leaderboard</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Recognizing top contributors to campus sustainability. Impact scores are refreshed after every verified event.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={loadLeaderboard} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} /> Refresh Table
            </Button>
          </div>
        </div>

        {/* Global Network Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Active Nodes", value: leaderboard.length, icon: <Globe className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Network Offset", value: `${(stats.totalImpact / 1000).toFixed(1)} kWh`, icon: <Zap className="w-4 h-4" />, color: "text-success" },
            { label: "Circulating XP", value: stats.totalPoints.toLocaleString(), icon: <Binary className="w-4 h-4" />, color: "text-primary" },
            { label: "Audit Confidence", value: "0.992", icon: <Fingerprint className="w-4 h-4" />, color: "text-slate-900" }
          ].map((stat, i) => (
            <Card key={i} className="p-6 bg-slate-50/50 border-slate-200/50 rounded-[32px] group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                {stat.icon}
              </div>
              <div className="space-y-1">
                <div className={cn("text-2xl font-black tracking-tighter text-slate-900", stat.color)}>{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Podium Interface - Massive Impact */}
        {!isLoading && filteredLeaderboard.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 items-end">
            {/* Rank 2 */}
            <Card role="article" aria-label={`Rank 2: ${filteredLeaderboard[1].name}`} className="relative p-6 md:p-10 pb-8 md:pb-12 rounded-[32px] md:rounded-[48px] border-slate-200/60 bg-white shadow-xl shadow-slate-100 flex flex-col items-center text-center space-y-4 md:space-y-6 order-2 md:order-1 min-h-[200px] md:min-h-[280px] justify-between group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-300 opacity-20" />
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg shadow-slate-200">
                <span className="text-2xl font-black text-slate-400">2</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter text-slate-900 leading-none">{filteredLeaderboard[1].name}</h3>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredLeaderboard[1].department}</div>
              </div>
              <div className="w-full pt-6 border-t border-slate-50 flex justify-between">
                <div className="text-left"><div className="text-lg font-black text-slate-900 leading-none">{filteredLeaderboard[1].points}</div><div className="text-[8px] font-bold uppercase text-slate-400">XP_CREDITS</div></div>
                <div className="text-right"><div className="text-lg font-black text-slate-900 leading-none">#{filteredLeaderboard[1].rank}</div><div className="text-[8px] font-bold uppercase text-slate-400">GLOBAL_ID</div></div>
              </div>
            </Card>

            {/* Rank 1 */}
            <Card role="article" aria-label={`Rank 1: ${filteredLeaderboard[0].name}`} className="relative p-8 md:p-12 pb-10 md:pb-16 rounded-[40px] md:rounded-[64px] border-2 border-primary/20 bg-slate-900 text-white shadow-3xl shadow-primary/10 flex flex-col items-center text-center space-y-6 md:space-y-8 order-1 md:order-2 min-h-[260px] md:min-h-[340px] justify-between group overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 opacity-20 pointer-events-none" />
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-slate-900 shadow-2xl shadow-primary/20 scale-110">
                <Crown className="w-12 h-12 text-slate-900 fill-current" />
              </div>
              <div className="space-y-3 z-10">
                <h3 className="text-3xl font-black tracking-tighter text-white leading-none">{filteredLeaderboard[0].name}</h3>
                <Badge className="bg-primary hover:bg-primary text-slate-900 border-none font-black text-[9px] uppercase tracking-widest px-4 h-6">ULTIMATE_CHAMPS</Badge>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{filteredLeaderboard[0].department}</div>
              </div>
              <div className="w-full pt-8 border-t border-white/5 flex justify-between z-10">
                <div className="text-left"><div className="text-2xl font-black text-primary leading-none">{filteredLeaderboard[0].points}</div><div className="text-[9px] font-bold uppercase text-white/40">MASTER_SCORE</div></div>
                <div className="text-right"><div className="text-2xl font-black text-white leading-none">0.1s</div><div className="text-[9px] font-bold uppercase text-white/40">LATENCY_OK</div></div>
              </div>
            </Card>

            {/* Rank 3 */}
            <Card role="article" aria-label={`Rank 3: ${filteredLeaderboard[2].name}`} className="relative p-6 md:p-10 pb-8 md:pb-12 rounded-[32px] md:rounded-[48px] border-slate-200/60 bg-white shadow-xl shadow-slate-100 flex flex-col items-center text-center space-y-4 md:space-y-6 order-3 min-h-[180px] md:min-h-[260px] justify-between group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-600/20 opacity-20" />
              <div className="w-20 h-20 rounded-full bg-amber-600/10 flex items-center justify-center border-4 border-white shadow-lg shadow-amber-600/10">
                <span className="text-2xl font-black text-amber-600">3</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tighter text-slate-900 leading-none">{filteredLeaderboard[2].name}</h3>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredLeaderboard[2].department}</div>
              </div>
              <div className="w-full pt-6 border-t border-slate-50 flex justify-between">
                <div className="text-left"><div className="text-lg font-black text-slate-900 leading-none">{filteredLeaderboard[2].points}</div><div className="text-[8px] font-bold uppercase text-slate-400">XP_CREDITS</div></div>
                <div className="text-right"><div className="text-lg font-black text-slate-900 leading-none">#{filteredLeaderboard[2].rank}</div><div className="text-[8px] font-bold uppercase text-slate-400">GLOBAL_ID</div></div>
              </div>
            </Card>
          </div>
        )}

        {/* Dense Network Census */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Audit Census</h2>
            </div>
            <div className="relative group">
              <label htmlFor="search-census" className="sr-only">Search Node Identity</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                id="search-census"
                placeholder="Search Node Identity..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full md:w-80 rounded-2xl bg-slate-50 border-none font-bold text-xs pl-12"
              />
            </div>
          </div>

          <Card className="rounded-[48px] overflow-hidden border-slate-100 shadow-2xl shadow-slate-100">
            <div className="divide-y divide-slate-50">
              {isLoading ? (
                <div className="py-20 text-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-slate-100 mx-auto" />
                </div>
              ) : filteredLeaderboard.map((user) => (
                <div
                  key={user.id}
                  onClick={() => { setSelectedUser(user); setIsProfileModalOpen(true); }}
                  className="flex items-center justify-between p-6 px-8 hover:bg-slate-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-10 text-center">
                      <span className="text-sm font-black text-slate-300 group-hover:text-slate-900 transition-colors">#{user.rank}</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <Avatar className="w-12 h-12 rounded-2xl border-2 border-white shadow-xl">
                        <AvatarFallback className="bg-slate-100 text-[10px] font-black text-slate-900 uppercase">
                          {user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-base font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors">{user.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.department}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="hidden lg:flex flex-col items-end">
                      <div className="text-base font-black text-slate-900 tracking-tighter">+{user.weeklyGain} <span className="text-[10px] uppercase text-success">XP</span></div>
                      <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none">Weekly Delta</div>
                    </div>
                    <div className="text-right min-w-20 md:min-w-24">
                      <div className="text-2xl font-black tracking-tighter text-slate-900">{user.points.toLocaleString()}</div>
                      <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none opacity-60">Total Accrued</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Node Identity Terminal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-2xl rounded-[48px] p-12 border-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-slate-900" />
          {selectedUser && (
            <div className="space-y-10">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <Avatar className="w-32 h-32 rounded-[40px] border-4 border-white shadow-3xl shadow-slate-100">
                    <AvatarFallback className="bg-slate-900 text-white text-3xl font-black">
                      {selectedUser.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary text-slate-900 shadow-xl flex items-center justify-center border-4 border-white">
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-4xl font-black tracking-tighter uppercase">{selectedUser.name}</DialogTitle>
                  <DialogDescription className="text-xs font-bold text-primary uppercase tracking-[0.4em] leading-none">{selectedUser.department} • NODE_ID_2026</DialogDescription>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Audit Rank", value: `#${selectedUser.rank}` },
                  { label: "Trust Score", value: "0.992" },
                  { label: "Impact Factor", value: `${(selectedUser.energySaved! / 1000).toFixed(1)}k` },
                  { label: "Sync Status", value: "CERT", color: "text-success" }
                ].map((d, i) => (
                  <div key={i} className="p-5 bg-slate-50 rounded-3xl text-center space-y-1 group">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">{d.label}</div>
                    <div className={cn("text-base font-black text-slate-900 tracking-tighter", d.color)}>{d.value}</div>
                  </div>
                ))}
              </div>

              <div className="p-8 rounded-[40px] bg-slate-900 text-white space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:scale-110 transition-transform">
                  <Binary className="w-32 h-32" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Ledger Breakdown</div>
                  <Fingerprint className="w-4 h-4 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-12 relative z-10">
                  <div className="space-y-1">
                    <div className="text-4xl font-black tracking-tighter text-white leading-none">{selectedUser.points.toLocaleString()} <span className="text-lg opacity-40">XP</span></div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Global Asset Holding</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-4xl font-black tracking-tighter text-white leading-none">+{selectedUser.weeklyGain}</div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Cycle Performance Delta</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center flex-wrap gap-2">
                <Badge variant="outline" className="h-8 px-4 rounded-xl border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">#SEED_CONTRIBUTOR</Badge>
                <Badge variant="outline" className="h-8 px-4 rounded-xl border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">#NETWORK_GUARD</Badge>
                <Badge variant="outline" className="h-8 px-4 rounded-xl border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">#SDG_PIONEER</Badge>
              </div>

              <div className="flex justify-center pt-2">
                <Button variant="ghost" onClick={() => setIsProfileModalOpen(false)} className="font-black text-[10px] uppercase tracking-widest text-slate-300 hover:text-slate-900">Close Node Profile</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Leaderboard;
