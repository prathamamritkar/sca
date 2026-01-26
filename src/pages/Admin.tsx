import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Download,
  Filter,
  RefreshCw,
  Search,
  Eye,
  AlertTriangle,
  ChevronRight,
  Database,
  Terminal,
  Activity,
  UserCheck,
  Loader2,
  Users,
  Settings,
  MoreHorizontal,
  Mail,
  Calendar,
  Shield,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as cvApi from "@/services/cvApi";
import { cn } from "@/lib/utils";

interface PendingAction {
  id: number;
  action: string;
  location: string;
  timestamp: string;
  confidence: number;
  image_url?: string;
  video_url?: string;
  status?: string;
}

interface UserRecord {
  user_id: number;
  email: string;
  name: string;
  role: string;
  department: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'users'>('audit');
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | string | null>(null);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalStats, setGlobalStats] = useState({
    pending_count: 0,
    hc_count: 0,
    avg_accuracy: 0,
    total_verified: 0,
    db_size_kb: 0
  });
  const { useMockData } = useAuthStore();
  const { toast } = useToast();

  const loadMockData = useCallback(() => {
    const mockEvents: PendingAction[] = [
      { id: 101, action: "light_off", location: "Lab 3", timestamp: new Date().toISOString(), confidence: 0.72 },
      { id: 102, action: "fan_off", location: "Library", timestamp: new Date().toISOString(), confidence: 0.88 },
      { id: 103, action: "ac_off", location: "Conf. Room", timestamp: new Date().toISOString(), confidence: 0.81 },
    ];
    setPendingActions(mockEvents);

    const mockUsers: UserRecord[] = [
      { user_id: 1, email: "admin@sca.campus", name: "System Admin", role: "admin", department: "IT", is_active: true, created_at: new Date().toISOString() },
      { user_id: 2, email: "john@student.com", name: "John Doe", role: "student", department: "CS", is_active: true, created_at: new Date().toISOString() },
    ];
    setUsers(mockUsers);
    setIsLoading(false);
  }, []);

  const loadPendingActions = useCallback(async () => {
    if (useMockData) { loadMockData(); return; }
    setIsLoading(true);
    try {
      const result = await cvApi.getEvents({ status: 'pending', limit: 50 });
      if (result.success && result.data) {
        setPendingActions(result.data.events.map(e => ({
          id: e.event_id,
          action: e.action_detected || e.action_type || 'unknown',
          location: e.room_id || 'Unknown',
          timestamp: e.timestamp,
          confidence: e.overall_confidence || 0.75,
          video_url: e.video_file ? (e.video_file.startsWith('http') ? e.video_file : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${e.video_file}`) : undefined
        })));
      }
    } catch (error) {
      toast({ title: "Node Timeout", description: "Failed to connect to governance bridge. Reverting to sandbox.", variant: "destructive" });
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, [useMockData, loadMockData, toast]);

  const loadUsers = useCallback(async () => {
    if (useMockData) return;
    setIsLoading(true);
    try {
      const result = await cvApi.getUsers();
      if (result.success && result.data) {
        setUsers(result.data.users);
      }
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setIsLoading(false);
    }
  }, [useMockData]);

  const loadGlobalStats = useCallback(async () => {
    if (useMockData) return;
    try {
      const result = await cvApi.getAdminStats();
      if (result.success && result.data) {
        setGlobalStats({
          pending_count: result.data.pending_count ?? 0,
          hc_count: result.data.hc_count ?? 0,
          avg_accuracy: result.data.avg_accuracy ?? 0,
          total_verified: result.data.total_verified ?? 0,
          db_size_kb: result.data.db_size_kb ?? 0
        });
      }
    } catch (e) { }
  }, [useMockData]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadPendingActions();
    } else {
      loadUsers();
    }
    loadGlobalStats();
  }, [activeTab, loadPendingActions, loadUsers, loadGlobalStats]);

  const handleAudit = async (id: number, status: 'verified' | 'rejected') => {
    setIsProcessing(id);
    try {
      if (!useMockData) {
        const result = await cvApi.updateEventStatus(id, status);
        if (!result.success) throw new Error(result.error || 'Failed to update status');
      }
      setPendingActions(prev => prev.filter(a => a.id !== id));
      loadGlobalStats();
      toast({
        title: status === 'verified' ? "Record Confirmed" : "Record Expunged",
        description: `Transaction ID #${id} updated on ledger.`
      });
    } catch (error: any) {
      toast({ title: "Audit Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    const hcCount = pendingActions.filter(a => a.confidence >= 0.8).length;
    if (hcCount === 0) {
      toast({ title: "No HC Candidates", description: "No pending actions meet the 0.8 confidence threshold." });
      return;
    }

    setIsProcessing('bulk');
    try {
      if (!useMockData) {
        const result = await cvApi.bulkVerifyEvents(0.8);
        if (!result.success) throw new Error(result.error || 'Bulk verification failed');
      }
      setPendingActions(prev => prev.filter(a => a.confidence < 0.8));
      loadGlobalStats();
      toast({
        title: "Bulk Approval Executed",
        description: `Successfully verified all high-confidence actions (${hcCount} records).`
      });
    } catch (error: any) {
      toast({ title: "Bulk Audit Failure", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateUser = async (userId: number, updates: Partial<UserRecord>) => {
    setIsProcessing(`user-${userId}`);
    try {
      if (!useMockData) {
        const result = await cvApi.updateUser(userId, {
          role: updates.role,
          is_active: updates.is_active
        });
        if (!result.success) throw new Error(result.error || 'Failed to update user');
      }

      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, ...updates } : u));
      toast({
        title: "User Profile Synced",
        description: `Permissions for node operator #${userId} updated.`
      });
    } catch (error: any) {
      toast({ title: "Sync Failure", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleExport = async () => {
    if (useMockData) {
      toast({ title: "Export Unavailable", description: "Ledger export is disabled in Sandbox mode." });
      return;
    }
    try {
      await cvApi.exportEvents();
      toast({ title: "Export Complete", description: "Audit log has been serialized to CSV." });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    }
  };

  const filteredActions = useMemo(() => {
    if (!searchQuery) return pendingActions;
    return pendingActions.filter(a =>
      a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toString().includes(searchQuery)
    );
  }, [pendingActions, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const stats = useMemo(() => ({
    inQueue: pendingActions.length,
    highConfidence: pendingActions.filter(a => a.confidence >= 0.8).length,
    avgConfidence: pendingActions.length > 0 ? Math.round(pendingActions.reduce((s, a) => s + a.confidence, 0) / pendingActions.length * 100) : 0
  }), [pendingActions]);

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* SOC-Themed Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Admin Center</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              System governance for {activeTab === 'audit' ? 'audit verification' : 'operator management'}. Review and maintain network integrity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl mr-4">
              <button
                onClick={() => { setActiveTab('audit'); setSearchQuery(""); }}
                className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'audit' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}
              >
                Audits
              </button>
              <button
                onClick={() => { setActiveTab('users'); setSearchQuery(""); }}
                className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'users' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}
              >
                Users
              </button>
            </div>

            <Button onClick={handleExport} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50">
              <Download className="w-3.5 h-3.5 mr-2" /> Export Log
            </Button>

            <Button onClick={() => activeTab === 'audit' ? loadPendingActions() : loadUsers()} disabled={isLoading} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} /> Refresh
            </Button>

            {activeTab === 'audit' && (
              <Button
                onClick={handleBulkApprove}
                disabled={!!isProcessing || isLoading || stats.highConfidence === 0}
                className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {isProcessing === 'bulk' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Bulk Approve ({useMockData ? stats.highConfidence : globalStats.hc_count})</>}
              </Button>
            )}
          </div>
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Pending Audit", value: useMockData ? stats.inQueue : globalStats.pending_count, icon: <Clock className="w-4 h-4" />, color: "text-slate-900" },
            { label: "HC Reliability", value: useMockData ? stats.highConfidence : globalStats.hc_count, icon: <UserCheck className="w-4 h-4" />, color: "text-success" },
            { label: "System Accuracy", value: `${useMockData ? stats.avgConfidence : globalStats.avg_accuracy}%`, icon: <Activity className="w-4 h-4" />, color: "text-primary" },
            { label: "Database Size", value: `${globalStats.db_size_kb.toLocaleString()} KB`, icon: <Database className="w-4 h-4" />, color: "text-slate-900" }
          ].map((stat, i) => (
            <Card key={i} className="p-6 bg-slate-50/50 border-slate-200/50 rounded-[32px] group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                {stat.icon}
              </div>
              <div className="space-y-1">
                <div className={cn("text-2xl font-black tracking-tighter", stat.color)}>{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Verification Hub */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              {activeTab === 'audit' ? <><Terminal className="w-4 h-4" /> Discrepancy Stream</> : <><Users className="w-4 h-4" /> Network Operators</>}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'audit' ? "Filter segments..." : "Search operators..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64 transition-all"
                />
              </div>
              <Badge variant="outline" className="h-5 px-3 text-[9px] font-bold tracking-tighter border-slate-200 text-slate-400 hidden sm:flex">SYNC_OK</Badge>
            </div>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-slate-200 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Polling Network Nodes...</p>
              </div>
            ) : activeTab === 'audit' ? (
              filteredActions.length === 0 ? (
                <Card className="py-20 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                  <CheckCircle2 className="w-12 h-12 text-success/20 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-slate-900">{searchQuery ? "No matches found" : "Queue Fully Synchronized"}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{searchQuery ? "Try refining your filter parameters." : "No deviations requiring manual intervention."}</p>
                </Card>
              ) : (
                filteredActions.map((action) => (
                  <Card key={action.id} className="p-6 rounded-[32px] border-slate-200/50 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary/20 transition-colors" />

                    <div className="flex items-start gap-5 pl-2 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Activity className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-base font-black tracking-tighter text-slate-900">{action.action.replace(/_/g, ' ').toUpperCase()}</span>
                          <Badge className={cn(
                            "h-5 text-[9px] font-bold uppercase tracking-tighter",
                            action.confidence >= 0.8 ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                          )}>
                            {Math.round(action.confidence * 100)}% Match
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] font-bold text-slate-500 uppercase tracking-widest opacity-60">
                          <span className="flex items-center gap-1.5">ID: #{action.id}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(action.timestamp).toLocaleTimeString()}</span>
                          <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Zone: {action.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedAction(action); setIsVideoModalOpen(true); }} className="h-11 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900">
                        Audit Clip
                      </Button>
                      <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                        <Button onClick={() => handleAudit(action.id, 'rejected')} disabled={!!isProcessing} variant="ghost" size="icon" className="w-11 h-11 rounded-2xl text-destructive hover:bg-destructive/5 hover:text-destructive active:scale-95 transition-all">
                          <XCircle className="w-5 h-5" />
                        </Button>
                        <Button onClick={() => handleAudit(action.id, 'verified')} disabled={!!isProcessing} className="h-11 px-8 rounded-2xl bg-success text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-success/10 group active:scale-95 transition-all">
                          {isProcessing === action.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )
            ) : (
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <Card className="py-20 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-slate-900">No operators found</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Try a different search term.</p>
                  </Card>
                ) : (
                  filteredUsers.map((user) => (
                    <Card key={user.user_id} className="p-6 rounded-[32px] border-slate-200/50 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative">
                          {user.is_active ? <div className="absolute top-0 right-0 w-3 h-3 bg-success border-2 border-white rounded-full" /> : null}
                          <UserCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black tracking-tighter text-slate-900">{user.name}</span>
                            <Badge className={cn(
                              "h-4 text-[8px] font-black uppercase tracking-widest",
                              user.role === 'admin' ? "bg-slate-900" : user.role === 'faculty' ? "bg-primary" : "bg-slate-200 text-slate-500"
                            )}>
                              {user.role}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {user.email}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Joined {new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4">
                          <span className="text-[10px] font-black uppercase text-slate-300">{user.department || "No Dept"}</span>
                          <span className="text-[9px] font-bold text-slate-400">Node ID: #{user.user_id}</span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-slate-100">
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-none shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Operator Governance</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="p-3 rounded-xl cursor-copy font-bold text-xs" onClick={() => navigator.clipboard.writeText(user.email)}>
                              <Mail className="w-3.5 h-3.5 mr-2" /> Copy Identifier
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[9px] font-bold text-slate-400 uppercase px-3 py-1">Set Authority</DropdownMenuLabel>
                            {['student', 'faculty', 'admin'].filter(r => r !== user.role).map(role => (
                              <DropdownMenuItem key={role} className="p-3 rounded-xl cursor-pointer font-bold text-xs capitalize" onClick={() => handleUpdateUser(user.user_id, { role })}>
                                <Shield className="w-3.5 h-3.5 mr-2" /> Elevate to {role}
                              </DropdownMenuItem>
                            ))}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem className={cn("p-3 rounded-xl cursor-pointer font-bold text-xs", user.is_active ? "text-destructive" : "text-success")} onClick={() => handleUpdateUser(user.user_id, { is_active: !user.is_active })}>
                              {user.is_active ? <ToggleLeft className="w-3.5 h-3.5 mr-2" /> : <ToggleRight className="w-3.5 h-3.5 mr-2" />}
                              {user.is_active ? "Suspend Node" : "Activate Node"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Audit Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-2xl rounded-[40px] p-8 border-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-slate-900" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tighter">Visual Analytics Review</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inference Source Analysis #TX_{selectedAction?.id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            <Card className="aspect-video bg-slate-900 rounded-[32px] overflow-hidden relative group border border-white/5">
              {selectedAction?.video_url && !useMockData ? (
                <video
                  src={selectedAction.video_url}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                />
              ) : (
                <>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 h-12 flex items-end justify-between px-4">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div key={i} className="w-1 bg-primary/20 rounded-full transition-all" style={{ height: `${20 + Math.random() * 80}%` }} />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <Badge className="bg-primary hover:bg-primary border-none text-[9px] font-black uppercase tracking-widest h-6">Live Link</Badge>
                <Badge className="bg-white/10 backdrop-blur text-white border-none text-[9px] font-black uppercase tracking-widest h-6">Object: {selectedAction?.action}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-3xl space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inference Engine</div>
                <div className="text-xs font-black">YOLOv8-Small-Quant</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confidence Threshold</div>
                <div className="text-xs font-black">{(selectedAction?.confidence || 0.5) * 100}% Verification</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="ghost" onClick={() => setIsVideoModalOpen(false)} className="font-bold text-xs uppercase tracking-widest h-12 px-8">Dismiss Audit</Button>
              <Button onClick={() => { handleAudit(selectedAction!.id, 'verified'); setIsVideoModalOpen(false); }} className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest h-12 px-10 rounded-2xl shadow-2xl shadow-slate-200">
                Confirm Signal →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Admin;
