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
  Loader2
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

const Admin = () => {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [globalStats, setGlobalStats] = useState({ pending_count: 0, hc_count: 0, avg_accuracy: 0, total_verified: 0 });
  const { useMockData } = useAuthStore();
  const { toast } = useToast();

  const loadMockData = useCallback(() => {
    const mock: PendingAction[] = [
      { id: 101, action: "light_off", location: "Lab 3", timestamp: new Date().toISOString(), confidence: 0.72 },
      { id: 102, action: "fan_off", location: "Library", timestamp: new Date().toISOString(), confidence: 0.68 },
      { id: 103, action: "ac_off", location: "Conf. Room", timestamp: new Date().toISOString(), confidence: 0.81 },
    ];
    setPendingActions(mock);
    setIsLoading(false);
  }, []);

  const loadPendingActions = useCallback(async () => {
    if (useMockData) { loadMockData(); return; }
    setIsLoading(true);
    try {
      const result = await cvApi.getEvents({ status: 'pending', limit: 50 });
      if (result.success && result.data) {
        setPendingActions(result.data.events.map(e => ({
          id: e.event_id, action: e.action_detected || e.action_type || 'unknown',
          location: e.room_id || 'Unknown', timestamp: e.timestamp, confidence: e.overall_confidence || 0.75
        })));
      }
    } catch (error) {
      toast({ title: "Node Timeout", description: "Failed to connect to governance bridge. Reverting to sandbox.", variant: "destructive" });
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, [useMockData, loadMockData, toast]);

  const loadGlobalStats = useCallback(async () => {
    if (useMockData) return;
    try {
      const result = await cvApi.getAdminStats();
      if (result.success && result.data) {
        setGlobalStats(result.data);
      }
    } catch (e) { }
  }, [useMockData]);

  useEffect(() => {
    loadPendingActions();
    loadGlobalStats();
  }, [loadPendingActions, loadGlobalStats]);

  const handleAudit = async (id: number, status: 'verified' | 'rejected') => {
    setIsProcessing(id);
    if (!useMockData) {
      try { await cvApi.updateEventStatus(id, status); } catch (e) { }
    }
    setTimeout(() => {
      setPendingActions(prev => prev.filter(a => a.id !== id));
      setIsProcessing(null);
      loadGlobalStats(); // Refresh global stats after audit
      toast({ title: status === 'verified' ? "Record Confirmed" : "Record Expunged", description: `Transaction ID #${id} updated on ledger.` });
    }, 1000);
  };

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
              <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">Review Center</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm italic leading-relaxed">
              Manual verification node for low-confidence detections. Governance layer ensures 100% data fidelity before block finalization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={loadPendingActions} disabled={isLoading} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} /> Refresh Queue
            </Button>
            <Button className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200">
              Bulk Approve (HC)
            </Button>
          </div>
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Pending Audit", value: useMockData ? stats.inQueue : globalStats.pending_count, icon: <Clock className="w-4 h-4" />, color: "text-slate-900" },
            { label: "HC Reliability", value: useMockData ? stats.highConfidence : globalStats.hc_count, icon: <UserCheck className="w-4 h-4" />, color: "text-success" },
            { label: "System Accuracy", value: `${useMockData ? stats.avgConfidence : globalStats.avg_accuracy}%`, icon: <Activity className="w-4 h-4" />, color: "text-primary" },
            { label: "Active Buffer", value: "32MB", icon: <Database className="w-4 h-4" />, color: "text-slate-900" }
          ].map((stat, i) => (
            <Card key={i} className="p-6 bg-slate-50/50 border-slate-200/50 rounded-[32px] group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                {stat.icon}
              </div>
              <div className="space-y-1">
                <div className={cn("text-2xl font-black italic tracking-tighter", stat.color)}>{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Verification Hub */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <Terminal className="w-4 h-4" /> Discrepancy Stream
            </div>
            <Badge variant="outline" className="h-5 px-3 text-[9px] font-bold tracking-tighter italic border-slate-200 text-slate-400">SYNC_OK</Badge>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-slate-200 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Polling Network Nodes...</p>
              </div>
            ) : pendingActions.length === 0 ? (
              <Card className="py-20 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                <CheckCircle2 className="w-12 h-12 text-success/20 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-900 italic">Queue Fully Synchronized</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">No deviations requiring manual intervention.</p>
              </Card>
            ) : (
              pendingActions.map((action) => (
                <Card key={action.id} className="p-6 rounded-[32px] border-slate-200/50 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group overflow-hidden relative">
                  {/* Visual Confidence Gutter */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary/20 transition-colors" />

                  <div className="flex items-start gap-5 pl-2 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-base font-black italic tracking-tighter text-slate-900">{action.action.replace(/_/g, ' ').toUpperCase()}</span>
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
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedAction(action); setIsVideoModalOpen(true); }} className="h-11 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 italic">
                      Audit Clip
                    </Button>
                    <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                      <Button onClick={() => handleAudit(action.id, 'rejected')} disabled={!!isProcessing} variant="ghost" size="icon" className="w-11 h-11 rounded-2xl text-destructive hover:bg-destructive/5 hover:text-destructive border border-transparent active:scale-95 transition-all">
                        <XCircle className="w-5 h-5" />
                      </Button>
                      <Button onClick={() => handleAudit(action.id, 'verified')} disabled={!!isProcessing} className="h-11 px-8 rounded-2xl bg-success text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-success/10 group active:scale-95 transition-all">
                        {isProcessing === action.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Verification"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
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
              <DialogTitle className="text-2xl font-black italic tracking-tighter">Visual Analytics Review</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inference Source Analysis #TX_{selectedAction?.id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            <Card className="aspect-video bg-slate-900 rounded-[32px] overflow-hidden relative group cursor-pointer border border-white/5">
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white fill-current ml-1" />
                </div>
              </div>
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <Badge className="bg-primary hover:bg-primary border-none text-[9px] font-black uppercase tracking-widest h-6">Live Link</Badge>
                <Badge className="bg-white/10 backdrop-blur text-white border-none text-[9px] font-black uppercase tracking-widest h-6 italic">Object: {selectedAction?.action}</Badge>
              </div>
              {/* Simulated Waveform Overlay */}
              <div className="absolute bottom-6 left-6 right-6 h-12 flex items-end justify-between px-4">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-1 bg-primary/20 rounded-full transition-all" style={{ height: `${20 + Math.random() * 80}%` }} />
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-3xl space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inference Engine</div>
                <div className="text-xs font-black italic">YOLOv8-Small-Quant</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl space-y-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Frame Latency</div>
                <div className="text-xs font-black italic">14.2ms @ 60fps</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="ghost" onClick={() => setIsVideoModalOpen(false)} className="font-bold text-xs uppercase tracking-widest italic h-12 px-8">Dismiss Audit</Button>
              <Button onClick={() => { handleAudit(selectedAction!.id, 'verified'); setIsVideoModalOpen(false); }} className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest h-12 px-10 rounded-2xl italic shadow-2xl shadow-slate-200">
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
