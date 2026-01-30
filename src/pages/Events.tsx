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
  Copy,
  Coins
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

  // Simulation Engine for Sandbox Environment
  const generateMockEvents = useCallback(() => {
    const departments = ["CS_DEPT", "MECH_DEPT", "ELEC_DEPT", "CIVIL_DEPT", "ADMIN"];
    const rooms = ["LAB-101", "HALL-04", "CR-202", "OFFICE-10", "LIB-WEST", "LAB-305"];
    const actions = [
      { name: "ac_off", type: "sustainable", credit: 5.5, energy: 150, device: "ac" },
      { name: "light_off", type: "sustainable", credit: 2.0, energy: 45, device: "light" },
      { name: "fan_off", type: "sustainable", credit: 1.2, energy: 30, device: "fan" },
      { name: "pc_off", type: "sustainable", credit: 3.5, energy: 100, device: "pc" },
      { name: "ac_on", type: "unsustainable", credit: -5.0, energy: -150, device: "ac" },
      { name: "light_on", type: "unsustainable", credit: -1.0, energy: -45, device: "light" },
    ];

    const mockEvents: cvApi.DetectionEvent[] = Array.from({ length: 50 }).map((_, i) => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const isSustainable = action.type === "sustainable";
      const timestamp = new Date(Date.now() - Math.floor(Math.random() * 604800000)).toISOString(); // Last 7 days

      return {
        event_id: 5000 + i,
        timestamp,
        action_detected: action.name,
        action_type: action.type as "sustainable" | "unsustainable",
        room_id: rooms[Math.floor(Math.random() * rooms.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        overall_confidence: 0.85 + (Math.random() * 0.14),
        blockchain_credits: action.credit,
        energy_saved_estimate: action.energy,
        status: isSustainable ? "verified" : "flagged",
        occupancy: Math.random() > 0.5,
        person_count: Math.floor(Math.random() * 5),
        devices_on: isSustainable ? [] : [{ type: action.device, state: "ON" as "ON" | "OFF" }],
        devices_off: isSustainable ? [{ type: action.device, state: "OFF" as "ON" | "OFF" }] : [],
        lights_on: action.device === "light" && !isSustainable,
        action_confidence: 0.90 + (Math.random() * 0.09),
        person_id: `user_${Math.floor(Math.random() * 100)}@campus.edu`,
        video_file: "sample_audit.mp4"
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return mockEvents;
  }, []);

  const loadMockEvents = useCallback(() => {
    const mockData = generateMockEvents();
    const totalCreds = mockData.reduce((sum, e) => sum + e.blockchain_credits, 0);
    const totalImpact = mockData.reduce((sum, e) => sum + e.energy_saved_estimate, 0);

    setEvents(mockData);
    setTotalEvents(mockData.length);
    setAggregatedStats({ credits: totalCreds, impact: totalImpact });
    setIsLoading(false);
    setIsAppending(false);
  }, [generateMockEvents]);

  const loadEvents = useCallback(async (append = false) => {
    // Check for explicit mock mode preference
    const useMock = useAuthStore.getState().useMockData;
    if (useMock) {
      loadMockEvents();
      return;
    }

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
      console.error("Network Error:", e);
      toast({
        title: "Gateway Timeout",
        description: "Ledger station unresponsive. Check neural node status.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [searchQuery, actionFilter, displayLimit, events.length, toast, loadMockEvents]);

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
    const headers = ["Event_ID", "Timestamp", "Action", "Room", "Department", "Fidelity_Index", "Credits", "Energy_Saved_W"];
    const csvContent = [
      headers.join(","),
      ...events.map(e => [
        e.event_id, e.timestamp, e.action_detected, e.room_id, e.department, `${Math.round((e.overall_confidence || 0) * 100)}%`, e.blockchain_credits, e.energy_saved_estimate
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SCA_Current_View_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: "View Exported", description: "Current filtered results serialized locally." });
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
        <div className="section-header">
          <div className="space-y-4">
            <div className="page-title-group">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-2xl shadow-slate-200">
                <History className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Ledger</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Interrogate the decentralised ledger of campus energy events. Every entry is verified via AI Vision and recorded with cryptographic proof.
            </p>
          </div>

          <div className="section-actions">
            <Select onValueChange={(v) => v === "local" ? handleExportLocal() : handleFullExport()}>
              <SelectTrigger className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50 w-52 whitespace-nowrap">
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
            { label: "Signals Logged", value: stats.total.toLocaleString(), icon: <Box className="w-5 h-5" />, color: "text-slate-900", bg: "bg-slate-50" },
            { label: "Signals in View", value: `${events.length.toLocaleString()}`, icon: <ShieldCheck className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/5" },
            { label: "Total Credits", value: `${stats.credits >= 0 ? "+" : ""}${stats.credits.toFixed(2)}`, icon: <Zap className="w-5 h-5" />, color: stats.credits >= 0 ? "text-success" : "text-destructive", bg: stats.credits >= 0 ? "bg-success/5" : "bg-destructive/5" },
            { label: "Carbon Offset", value: `${(stats.impact / 1000).toFixed(2)} kWh`, icon: <Activity className="w-5 h-5" />, color: "text-slate-900", bg: "bg-slate-50" }
          ].map((stat, i) => (
            <Card key={i} className={cn("p-6 border border-slate-100 rounded-[32px] hover:border-primary/30 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group cursor-default", stat.bg)}>
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

        {/* Audit Filter Interface */}
        <div className="space-y-6">
          <div className="section-header border-none pb-0 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Network Ledger</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <input
                  id="lookup-event"
                  placeholder="Lookup Signal ID..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full md:w-64 rounded-xl bg-slate-50 border-none font-bold text-xs pl-10 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger aria-label="Filter events by type" className="h-10 w-48 rounded-xl border-none bg-slate-50 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors">
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
                  <Card key={event.event_id} role="listitem" className="p-6 rounded-[32px] border-slate-100 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 group overflow-hidden relative cursor-pointer" onClick={() => { setSelectedEvent(event); setIsDetailModalOpen(true); }}>
                    {/* Sync Bar - Dynamic Opacity */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary transition-all duration-300"
                      style={{ opacity: 0.3 + (event.overall_confidence || 0) * 0.7 }}
                    />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                      <div className="flex items-start gap-5 flex-1">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 group-hover:scale-105 transition-all duration-300">
                          <Zap className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors duration-300">{(event.action_detected || 'UNKNOWN').toUpperCase()}</span>
                            <Badge className={cn(
                              "text-[8px] font-bold uppercase h-4 px-2 hover:bg-opacity-20 transition-all border-none",
                              event.action_type === 'sustainable' ? "bg-success/5 text-success group-hover:bg-success/10" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/50"
                            )}>
                              {event.action_type === 'sustainable' ? 'VERIFIED' : 'OBSERVED'}
                            </Badge>
                          </div>
                          <div className="auto-scroll-row items-center gap-x-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> {event.room_id}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> {new Date(event.timestamp).toLocaleTimeString()}</span>

                            <div className="flex items-center gap-2">
                              <Terminal className="w-3.5 h-3.5 text-slate-300" />
                              <span className="text-[9px] opacity-60">Fidelity Index:</span>
                              <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${(event.overall_confidence || 0) * 100}%` }} />
                              </div>
                              <span className="text-primary">{Math.round((event.overall_confidence || 0) * 100)}%</span>
                            </div>
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
                            "flex items-center gap-2 text-2xl font-black tracking-tighter transition-transform duration-300 group-hover:scale-105",
                            event.blockchain_credits >= 0 ? "text-slate-900" : "text-destructive"
                          )}>
                            {event.blockchain_credits >= 0 ? "+" : ""}{event.blockchain_credits.toFixed(2)}
                            <Coins className="w-5 h-5 text-slate-300 group-hover:text-primary opacity-60 transition-colors" />
                          </div>
                          <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] group-hover:text-slate-500 transition-colors">{event.energy_saved_estimate.toFixed(2)}W OFFSET</div>
                        </div>
                        <Button variant="ghost" size="sm" aria-label={`View audit report for ${event.action_detected}`} className="h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 hover:bg-slate-50 active:scale-95 transition-all">
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
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                  <Terminal className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                    {(selectedEvent?.action_detected || 'Unknown Signal').replace(/_/g, ' ')}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Pulse ID: {selectedEvent?.event_id} • Status: SYNC_OK
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {[
                    { label: "Status", value: (selectedEvent.status || "FINALIZED").toUpperCase(), color: selectedEvent.status === 'rejected' ? 'text-destructive' : 'text-success' },
                    { label: "Station Entity", value: selectedEvent.room_id },
                    { label: "Dept Entity", value: selectedEvent.department },
                    { label: "Temporal sync", value: new Date(selectedEvent.timestamp).toLocaleTimeString() },
                    { label: "Fidelity Index", value: `${Math.round(selectedEvent.overall_confidence * 100)}%` },
                    { label: "Entry ID", value: `${selectedEvent.event_id}` },
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
                    {selectedEvent.video_file && (!useAuthStore.getState().useMockData || selectedEvent.video_file !== "sample_audit.mp4") ? (
                      <video
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        muted
                        playsInline
                        crossOrigin="anonymous"
                      >
                        <source
                          src={selectedEvent.video_file.startsWith('http') ? selectedEvent.video_file : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${selectedEvent.video_file}`}
                          type="video/mp4"
                        />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/50">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                          <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
                        </div>
                        <Database className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center px-8">Video Stream Archived • Local Node Offline</p>
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

              </div>
            )}

            <div className="shrink-0 flex justify-center pt-6 border-t border-slate-100 bg-white">
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)} className="w-full h-16 rounded-[28px] border-2 border-slate-100 font-black text-xs uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all">
                Close Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout >
  );
};

export default Events;
