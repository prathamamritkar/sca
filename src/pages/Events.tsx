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
  ShieldCheck
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as cvApi from "@/services/cvApi";
import { cn } from "@/lib/utils";

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
}

const Events = () => {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const { useMockData } = useAuthStore();
  const { toast } = useToast();

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await cvApi.getEvents({
        limit: 100,
        search: searchQuery || undefined,
        action: actionFilter === "all" ? undefined : actionFilter
      });

      if (result.success && result.data) {
        setEvents(result.data.events.map(e => ({
          ...e,
          action_type: e.action_type || "sustainable"
        } as DetectionEvent)));
      } else {
        toast({
          title: "Inquiry Failure",
          description: result.error || "The node ledger could not be interrogated.",
          variant: "destructive"
        });
      }
    } catch (e) {
      toast({
        title: "Gateway Timeout",
        description: "Audit node is currently unresponsive.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, actionFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Effect to reload when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, actionFilter, loadEvents]);

  const actionTypes = useMemo(() => {
    const defaultActions = ["light_off", "fan_off", "ac_off", "ac_on", "light_on"];
    const foundActions = Array.from(new Set(events.map(e => e.action_detected)));
    return Array.from(new Set([...defaultActions, ...foundActions]));
  }, [events]);

  const handleExport = () => {
    if (events.length === 0) return;

    const headers = ["Event_ID", "Timestamp", "Action", "Room", "Department", "Credits", "Energy_Saved_W"];
    const rows = events.map(e => [
      e.event_id,
      e.timestamp,
      e.action_detected,
      e.room_id,
      e.department,
      e.blockchain_credits,
      e.energy_saved_estimate
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SCA_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Archive Exported",
      description: `Synchronized ledger has been extracted to CSV.`
    });
  };

  const stats = useMemo(() => ({
    total: events.length,
    credits: events.reduce((s, e) => s + e.blockchain_credits, 0),
    impact: events.reduce((s, e) => s + e.energy_saved_estimate, 0)
  }), [events]);

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Forensic Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-xl shadow-slate-200">
                <History className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Event Log</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Complete activity records of verified campus energy events. All entries are immutable and synchronized with the decentralized network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={loadEvents} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} /> Refresh Buffer
            </Button>
            <Button onClick={handleExport} disabled={events.length === 0} className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200">
              Export Logs
            </Button>
          </div>
        </div>

        {/* Impact Segment */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Chronicle", value: stats.total, icon: <Box className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Ledger Proofs", value: `${stats.total} IDs`, icon: <ShieldCheck className="w-4 h-4" />, color: "text-primary" },
            { label: "XP Velocity", value: `+${stats.credits}`, icon: <Zap className="w-4 h-4" />, color: "text-success" },
            { label: "Energy Offset", value: `${(stats.impact / 1000).toFixed(1)} kWh`, icon: <Activity className="w-4 h-4" />, color: "text-slate-900" }
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

        {/* Audit Filter Interface */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Chronicle Flow</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <label htmlFor="lookup-event" className="sr-only">Lookup Action or Room</label>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <Input
                  id="lookup-event"
                  placeholder="Lookup Action or Room..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-64 rounded-2xl bg-slate-50 border-none font-bold text-xs pl-10"
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
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Hydrating Local Buffer...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="py-20 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px]">
                <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-slate-900">No Blocks Found</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Try broadening your audit parameters.</p>
              </div>
            ) : (
              <>
                {events.slice(0, displayCount).map((event) => (
                  <Card key={event.event_id} role="listitem" className="p-6 rounded-[32px] border-slate-100 hover:border-primary/20 transition-all group overflow-hidden relative">
                    {/* Identity Ribbon */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-50 group-hover:bg-primary/20 transition-colors" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                      <div className="flex items-start gap-5 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 transition-all">
                          <Zap className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-black tracking-tighter text-slate-900">{event.action_detected.toUpperCase()}</span>
                            <Badge className="bg-success/5 text-success border-success/10 text-[8px] font-bold uppercase h-4 px-2">VERIFIED</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-70">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {event.room_id}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(event.timestamp).toLocaleTimeString()}</span>
                            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Conf: {Math.round(event.overall_confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 self-end md:self-center">
                        <div className="text-right">
                          <div className="text-2xl font-black tracking-tighter text-slate-900">+{event.blockchain_credits} <span className="text-xs text-slate-400">XP</span></div>
                          <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">{event.energy_saved_estimate}W OFFSET</div>
                        </div>
                        <Button variant="ghost" size="sm" aria-label={`View audit report for ${event.action_detected}`} onClick={() => { setSelectedEvent(event); setIsDetailModalOpen(true); }} className="h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 transition-all">
                          Audit Report
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {displayCount < events.length && (
                  <Button variant="ghost" onClick={() => setDisplayCount(c => c + 10)} className="w-full h-14 rounded-3xl text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 hover:text-primary transition-all">
                    Index Subsequent Blocks <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audit Detail Terminal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl rounded-[40px] p-8 border-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-slate-900" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Audit Identity Report</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Block_Hash: {selectedEvent?.event_id}_{Date.now().toString().slice(-6)} • NODE_SYNC_OK</DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Status", value: "FINALIZED", color: "text-success" },
                  { label: "Entity", value: selectedEvent.room_id },
                  { label: "Inference", value: `${Math.round(selectedEvent.overall_confidence * 100)}%` },
                  { label: "Ledger ID", value: `#${selectedEvent.event_id}` }
                ].map((d, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl space-y-1 text-center">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{d.label}</div>
                    <div className={cn("text-xs font-black truncate px-1", d.color || "text-slate-900")}>{d.value}</div>
                  </div>
                ))}
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
                    <div className="text-4xl font-black tracking-tighter">+{selectedEvent.blockchain_credits} <span className="text-xl text-white/40">XP</span></div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Asset Reward Distribution</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-4xl font-black tracking-tighter text-success">{selectedEvent.energy_saved_estimate} <span className="text-xl text-success/40">W</span></div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Behavioral Energy Offset</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Detection Metadata</div>
                <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 grid gap-4 text-xs font-medium text-slate-500">
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="uppercase tracking-widest opacity-60">Action Classifier</span>
                    <span className="font-bold text-slate-900">{selectedEvent.action_detected.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="uppercase tracking-widest opacity-60">Temporal Marker</span>
                    <span className="font-bold text-slate-900">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase tracking-widest opacity-60">Department Node</span>
                    <span className="font-bold text-slate-900">{selectedEvent.department}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)} className="font-black text-[10px] uppercase tracking-widest text-slate-300 hover:text-slate-900">Close Report</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Events;
