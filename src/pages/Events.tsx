import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  History,
  Search,
  Download,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  RefreshCw,
  Database,
  BarChart3,
  Terminal,
  Activity,
  Box,
  Zap,
  ShieldCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as cvApi from "@/services/cvApi";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface DetectionEvent {
  event_id: number;
  timestamp: string;
  action_detected: string;
  action_type: "sustainable" | "unsustainable" | "neutral";
  room_id: string;
  department: string;
  overall_confidence: number;
  blockchain_credits: number;
  energy_saved_estimate: number;
  person_id?: string;
  action_confidence?: number;
  status?: string;
}

const Events = () => {
  const [events, setEvents] = useState<cvApi.DetectionEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<cvApi.DetectionEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [aggregatedStats, setAggregatedStats] = useState({ credits: 0, impact: 0 });
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();

  const loadEvents = useCallback(async (append = false) => {
    if (append) setIsAppending(true);
    else setIsLoading(true);

    try {
      const result = await cvApi.getEvents({
        limit: displayLimit,
        offset: append ? events.length : 0,
        search: searchQuery || undefined,
        action: actionFilter === "all" ? undefined : actionFilter
      });

      if (result.success && result.data) {
        if (append) {
          setEvents(prev => [...prev, ...(result.data?.events || [])]);
        } else {
          setEvents(result.data.events || []);
          setTotalEvents(result.data.total || 0);
          setAggregatedStats({
            credits: result.data.total_credits || 0,
            impact: result.data.total_impact || 0
          });
        }
      } else {
        toast({
          title: "Ledger Inquiry Failure",
          description: result.error || "The station ledger could not be interrogated.",
          variant: "destructive"
        });
      }
    } catch (e) {
      toast({
        title: "Gateway Timeout",
        description: "Ledger station is currently unresponsive.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [searchQuery, actionFilter, displayLimit, events.length, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, actionFilter]);

  const actionTypes = useMemo(() => {
    const defaultActions = ["light_off", "fan_off", "ac_off", "ac_on", "light_on"];
    const foundActions = Array.from(new Set(events.map(e => e.action_detected))).filter(Boolean);
    // Combine with default actions to ensure common types are always available
    return Array.from(new Set([...defaultActions, ...foundActions])).sort();
  }, [events]);

  const handleExportLocal = () => {
    if (events.length === 0) return;
    const headers = ["Event_ID", "Timestamp", "Action", "Room", "Department", "Credits", "Energy_Saved_W"];
    const csvContent = [
      headers.join(","),
      ...events.map(e => [
        e.event_id, e.timestamp, e.action_detected, e.room_id, e.department, e.blockchain_credits, e.energy_saved_estimate
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SCA_Current_View_${new Date().toISOString().slice(0, 13)}.csv`;
    link.click();
    toast({ title: "View Exported", description: "Current filtered results extracted." });
  };

  const handleFullExport = async () => {
    try {
      await cvApi.exportEvents();
      toast({ title: "Ledger Exported", description: "Official verified audit log downloaded." });
    } catch (e: any) {
      toast({ title: "Export Failed", description: e.message, variant: "destructive" });
    }
  };

  const stats = useMemo(() => ({
    total: totalEvents,
    credits: aggregatedStats.credits,
    impact: aggregatedStats.impact
  }), [totalEvents, aggregatedStats]);

  return (
    <DashboardLayout>
      <div className="page-section">
        {/* Forensic Header */}
        <div className="section-header md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-2xl shadow-slate-200">
                <History className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Ledger</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Interrogate the decentralised ledger of campus energy events. Every entry is verified via AI Vision and recorded with cryptographic proof.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select onValueChange={(v) => v === "local" ? handleExportLocal() : handleFullExport()}>
              <SelectTrigger className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50 w-44">
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" />
                  <SelectValue placeholder="EXPORT DATA" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Current View</SelectItem>
                {isAdmin && <SelectItem value="full">Verified Ledger</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Impact Segment */}
        <div className="stat-grid">
          {[
            { label: "Signals Logged", value: stats.total.toLocaleString(), icon: <Box className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Signals in View", value: `${events.length.toLocaleString()}`, icon: <ShieldCheck className="w-4 h-4" />, color: "text-primary" },
            { label: "Total Credits", value: `${stats.credits >= 0 ? "+" : ""}${stats.credits.toFixed(2)} Credits`, icon: <Zap className="w-4 h-4" />, color: stats.credits >= 0 ? "text-success" : "text-destructive" },
            { label: "Carbon Offset", value: `${(stats.impact / 1000).toFixed(2)} kWh`, icon: <Activity className="w-4 h-4" />, color: "text-slate-900" }
          ].map((stat, i) => (
            <Card key={i} className="p-5 bg-slate-50/50 border-slate-200/50 rounded-[32px] group hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-white border border-slate-200/50 text-slate-400 group-hover:text-primary transition-colors">
                  {stat.icon}
                </div>
              </div>
              <div className="space-y-1">
                <div className={cn("text-2xl font-black tracking-tighter", stat.color)}>{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Audit Filter Interface */}
        <div className="page-section gap-[var(--space-md)]">
          <div className="section-header border-none pb-0 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Activity Stream</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <label htmlFor="lookup-event" className="sr-only">Lookup Action or Room</label>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <Input
                  id="lookup-event"
                  placeholder="Lookup Action or Room..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full md:w-64 rounded-2xl bg-slate-50 border-none font-bold text-xs pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger aria-label="Filter events by type" className="h-11 w-48 rounded-2xl border-none bg-slate-50 font-black text-[10px] uppercase">
                  <SelectValue placeholder="FILTER" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL TYPES</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>{action.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3">
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-slate-200 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Indexing Ledger Stream...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="py-20 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-900">No Signals Found</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Try broadening your ledger parameters.</p>
              </div>
            ) : (
              <>
                {events.map((event) => (
                  <Card key={event.event_id} role="listitem" className="p-6 rounded-[32px] border-slate-100 hover:border-primary/20 transition-all group overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary/20 transition-colors" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                      <div className="flex items-start gap-5 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 transition-all">
                          <Zap className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-black tracking-tighter text-slate-900">{(event.action_detected || 'UNKNOWN').toUpperCase()}</span>
                            <Badge className={cn(
                              "text-[8px] font-bold uppercase h-4 px-2",
                              event.action_type === 'sustainable' ? "bg-success/5 text-success border-success/10" : "bg-warning/5 text-warning border-warning/10"
                            )}>
                              {event.action_type === 'sustainable' ? 'VERIFIED' : 'OBSERVED'}
                            </Badge>
                          </div>
                          <div className="auto-scroll-row items-center gap-x-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-70">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {event.room_id}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(event.timestamp).toLocaleTimeString()}</span>
                            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Fidelity: {Math.round(event.overall_confidence * 100)}%</span>
                          </div>

                          {event.person_id && (
                            <div className="flex items-center gap-2 group/handle cursor-pointer mt-2" onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(event.person_id!);
                              toast({ title: "Node Handle Cached", description: `Identity signature for ${event.person_id} copied.` });
                            }}>
                              <Fingerprint className="w-2.5 h-2.5 text-slate-300 group-hover/handle:text-primary transition-colors" />
                              <code className="text-[8px] font-mono font-bold text-slate-400 group-hover/handle:text-primary transition-colors uppercase tracking-tighter">
                                NODE_{event.person_id.split('@')[0].toUpperCase()}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-8 self-end md:self-center">
                        <div className="text-right">
                          <div className={cn(
                            "text-2xl font-black tracking-tighter",
                            event.blockchain_credits >= 0 ? "text-slate-900" : "text-destructive"
                          )}>
                            {event.blockchain_credits >= 0 ? "+" : ""}{event.blockchain_credits.toFixed(2)} <span className="text-xs text-slate-400">Credits</span>
                          </div>
                          <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">{event.energy_saved_estimate.toFixed(2)}W OFFSET</div>
                        </div>
                        <Button variant="ghost" size="sm" aria-label={`View audit report for ${event.action_detected}`} onClick={() => { setSelectedEvent(event); setIsDetailModalOpen(true); }} className="h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 transition-all">
                          Ledger Report
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {events.length < totalEvents && (
                  <Button
                    variant="ghost"
                    onClick={() => loadEvents(true)}
                    disabled={isAppending}
                    className="w-full h-14 rounded-3xl text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 hover:text-primary transition-all"
                  >
                    {isAppending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Index Subsequent Ledger Entries <ChevronRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audit Detail Terminal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="fixed left-[50%] top-[50%] z-[200] w-[95vw] max-w-[42rem] translate-x-[-50%] translate-y-[-50%] bg-white rounded-[40px] shadow-3xl overflow-hidden focus:outline-none">
          <div className="h-3 w-full bg-slate-900" />
          <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar">
            <DialogHeader className="mb-8 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-slate-900" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tighter uppercase text-slate-900">Ledger Identity Report</DialogTitle>
              </div>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pulse_Hash: {selectedEvent?.event_id}_{Date.now().toString().slice(-6)} • NODE_SYNC_OK</DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {[
                    { label: "Status", value: (selectedEvent.status || "FINALIZED").toUpperCase(), color: selectedEvent.status === 'rejected' ? 'text-destructive' : 'text-success' },
                    { label: "Station Entity", value: selectedEvent.room_id },
                    { label: "Fidelity Index", value: `${Math.round(selectedEvent.overall_confidence * 100)}%` },
                    { label: "Entry ID", value: `#${selectedEvent.event_id}` },
                    { label: "Node Operator", value: selectedEvent.person_id || "SYSTEM" }
                  ].map((d, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-3xl space-y-1 text-center min-w-[140px] border border-slate-100/50 flex flex-col justify-center snap-center">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{d.label}</div>
                      <div className={cn("text-[11px] font-black break-all px-1 leading-tight", d.color || "text-slate-900")}>{d.value}</div>
                    </div>
                  ))}
                </div>

                {/* Video Evidence Section */}
                <div className="space-y-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Visual Evidence</div>
                  <Card className="aspect-video bg-slate-900 rounded-[32px] overflow-hidden relative group border border-white/5 shadow-2xl">
                    {selectedEvent.video_file ? (
                      <video
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${selectedEvent.video_file}`}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/50">
                        <Database className="w-12 h-12 text-slate-700 mb-4" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Video Stream Archived</p>
                      </div>
                    )}
                  </Card>
                </div>

                <div className="p-8 rounded-[32px] bg-slate-900 text-white space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Zap className="w-32 h-32" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Impact Analytics</div>
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-1">
                      <div className={cn(
                        "text-4xl font-black tracking-tighter",
                        selectedEvent.blockchain_credits >= 0 ? "text-white" : "text-red-400"
                      )}>
                        {selectedEvent.blockchain_credits >= 0 ? "+" : ""}{selectedEvent.blockchain_credits.toFixed(2)} <span className="text-xl text-white/40">Credits</span>
                      </div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Credit Disbursement</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-4xl font-black tracking-tighter text-success">{selectedEvent.energy_saved_estimate} <span className="text-xl text-success/40">W</span></div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Behavioral Energy Offset</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-8">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Signal Metadata</div>
                  <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 grid gap-4 text-xs font-medium text-slate-500">
                    <div className="flex justify-between border-b border-slate-200/50 pb-2">
                      <span className="uppercase tracking-widest opacity-60">Action Classifier</span>
                      <span className="font-bold text-slate-900">{(selectedEvent.action_detected || 'unknown').replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-2">
                      <span className="uppercase tracking-widest opacity-60">Temporal Marker</span>
                      <span className="font-bold text-slate-900">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase tracking-widest opacity-60">Department Station</span>
                      <span className="font-bold text-slate-900">{selectedEvent.department}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="shrink-0 flex justify-center pt-6 border-t border-slate-100 bg-white">
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)} className="font-black text-[10px] uppercase tracking-widest text-slate-300 hover:text-slate-900">Close Report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout >
  );
};

export default Events;
