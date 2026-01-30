import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Play,
  Loader2,
  Trash2,
  Database,
  Cpu,
  Zap,
  Activity,
  ChevronRight,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Terminal,
  Fingerprint,
  MapPin,
  Clock,
  ShieldCheck,
  Coins,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

interface DetectionResult {
  id: number;
  timestamp: string;
  action: string;
  location: string;
  fidelity: number;
  creditsEarned: number;
  actionType?: 'sustainable' | 'unsustainable' | 'neutral';
  energySaved?: number;
  video_file?: string;
  person_id?: string;
}

const Dashboard = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { useMockData } = useAuthStore();
  const [apiConnected, setApiConnected] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(true);
  const [selectedResult, setSelectedResult] = useState<DetectionResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkApiConnection = useCallback(async () => {
    if (useMockData) {
      setIsCheckingApi(false);
      setApiConnected(false);
      return;
    }
    setIsCheckingApi(true);
    const connected = await cvApi.checkApiStatus();
    setApiConnected(connected);
    setIsCheckingApi(false);
  }, [useMockData]);

  const fetchLatestEvents = useCallback(async () => {
    try {
      const response = await cvApi.getEvents({ limit: 10 });
      if (response.success && response.data) {
        const converted: DetectionResult[] = (response.data.events || []).map((e) => ({
          id: e.event_id,
          timestamp: e.timestamp,
          action: e.action_detected || 'unknown',
          location: e.room_id || 'Unknown',
          fidelity: e.overall_confidence || 0,
          creditsEarned: e.blockchain_credits || 0,
          actionType: e.action_type,
          energySaved: e.energy_saved_estimate,
          video_file: e.video_file,
          person_id: e.person_id
        }));
        setDetectionResults(converted);
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  }, []);

  useEffect(() => {
    checkApiConnection();
    fetchLatestEvents();
  }, [checkApiConnection, fetchLatestEvents]);

  const sessionStats = useMemo(() => {
    const totalCredits = detectionResults.reduce((sum, d) => sum + d.creditsEarned, 0);
    const averageFidelity = detectionResults.length > 0
      ? Math.round(detectionResults.reduce((sum, d) => sum + d.fidelity, 0) / detectionResults.length * 100)
      : 0;
    return { totalActions: detectionResults.length, totalCredits, averageFidelity, uniqueLocations: new Set(detectionResults.map(d => d.location)).size };
  }, [detectionResults]);

  const actionTypes = useMemo(() => Array.from(new Set(detectionResults.map(d => d.action))), [detectionResults]);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) setVideoFile(file);
    else if (file) toast({ title: "Incompatible Format", description: "Audit engine requires video source.", variant: "destructive" });
  };

  const handleProcessVideo = async () => {
    if (!videoFile) return;
    setIsProcessing(true);

    try {
      const upload = await cvApi.uploadVideo(videoFile);
      if (!upload.success || !upload.data) throw new Error(upload.error || 'Upload failed');

      const process = await cvApi.processVideo(upload.data.filename, 0.5);
      if (!process.success || !process.data) throw new Error(process.error || 'Processing failed');

      const converted = (process.data.events || []).map((e, i) => ({
        id: e.event_id || Date.now() + i,
        timestamp: e.timestamp,
        action: e.action_detected || 'unknown',
        location: e.room_id || 'Unknown',
        fidelity: e.overall_confidence || 0,
        creditsEarned: e.blockchain_credits || 0,
        actionType: e.action_type,
        energySaved: e.energy_saved_estimate,
        video_file: e.video_file,
        person_id: e.person_id
      }));

      setDetectionResults(prev => [...converted, ...prev]);
      toast({ title: "Signal Audit Complete", description: `Successfully parsed ${converted.length} signals from stream.` });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "An unexpected error occurred during AI inference.";
      toast({ title: "Neural Link Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <DashboardLayout>
      <div className="page-section">
        {/* Futuristic Workspace Header */}
        <div className="section-header">
          <div className="space-y-4">
            <div className="page-title-group">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-2xl shadow-slate-200">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Dashboard</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Monitor your campus energy savings in real-time. Every action is verified and rewarded.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
              {isCheckingApi ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : apiConnected ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-slate-300" />}
              <div className="flex flex-col leading-none">
                <span className="text-xs font-semibold text-slate-900">Connection</span>
                <span className="text-[10px] text-slate-500">
                  {isCheckingApi ? "Checking..." : apiConnected ? "Live Data" : "Demo Mode"}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDetectionResults([])} className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm text-destructive hover:bg-destructive/5 transition-all">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear
            </Button>
          </div>
        </div>

        {/* Distributed Metrics Table */}
        <div className="stat-grid">
          {[
            { label: "Signals Captured", value: sessionStats.totalActions, icon: <Activity className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Credits Earned", value: `${sessionStats.totalCredits.toFixed(2)}`, icon: <Zap className="w-4 h-4" />, color: "text-primary" },
            { label: "Fidelity Index", value: `${sessionStats.averageFidelity}%`, icon: <Cpu className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Station Nodes", value: sessionStats.uniqueLocations, icon: <Database className="w-4 h-4" />, color: "text-slate-900" }
          ].map((stat, i) => (
            <Card key={i} className="p-5 bg-slate-50/50 border-slate-200/50 rounded-[32px] hover:border-primary/20 transition-all group cursor-default">
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

        {/* Input Interface - Signal Stream */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-[var(--space-md)]">
          <Card className="relative overflow-hidden group border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30 hover:bg-slate-50/80 transition-all p-6 md:p-10 flex items-center justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Upload className="w-48 h-48 rotate-12" />
            </div>
            <div className="relative z-10 text-center space-y-6">
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="w-20 h-20 rounded-[20px] bg-white shadow-2xl shadow-slate-200 flex items-center justify-center mx-auto border border-slate-100">
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Inject Signal</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Point the AI model towards a campus station for immediate signal analysis.</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" id="dash-upload" />
                <label htmlFor="dash-upload">
                  <Button asChild variant="outline" aria-label="Select Video Source" className="h-12 px-8 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest bg-white shadow-lg shadow-slate-100 hover:shadow-primary/10 transition-all cursor-pointer">
                    <span>{videoFile ? "Queue Replace" : "Select Source"}</span>
                  </Button>
                </label>
                {videoFile && (
                  <Button onClick={handleProcessVideo} aria-label="Start Processing Video" disabled={isProcessing} className="h-12 px-10 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 group">
                    {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</> : <><Play className="w-4 h-4 mr-3" /> Initialize Signal Audit</>}
                  </Button>
                )}
              </div>
              {videoFile && (
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/5 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> {videoFile.name.slice(0, 30)}...
                </div>
              )}
            </div>
          </Card>

          {/* Results Refinement Port */}
          <div className="page-section gap-[var(--space-md)]">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Session Impact</h2>
              <Badge variant="secondary" className="font-bold text-[9px] tracking-tighter uppercase px-2 h-5 bg-slate-100">ACTIVE</Badge>
            </div>

            <Card className="adaptive-card bg-white space-y-6">
              <div className="p-[var(--space-md)] rounded-[var(--radius-lg)] bg-primary/5 border border-primary/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Credit Delta</div>
                  <Activity className="w-3.5 h-3.5 text-primary opacity-40" />
                </div>
                <div className={cn(
                  "text-3xl font-black tracking-tighter",
                  sessionStats.totalCredits >= 0 ? "text-slate-900" : "text-destructive"
                )}>
                  {sessionStats.totalCredits >= 0 ? "+" : ""}{sessionStats.totalCredits.toFixed(2)} Credits
                </div>
                <Button variant="ghost" className="w-full h-10 font-black text-[9px] uppercase tracking-widest text-primary hover:bg-primary/10" onClick={() => navigate("/wallet")}>
                  Access Wallet <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Detection Viewer Unified into Dashboard */}
        {detectionResults.length > 0 && (
          <div className="pt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <h2 className="text-sm font-black tracking-tighter text-slate-900 uppercase">Live Signal Stream</h2>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative group flex-1 md:flex-none">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                  <input
                    type="text"
                    placeholder="Lookup Live Signals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full md:w-64 rounded-xl bg-slate-50 border-none font-bold text-xs pl-10 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="h-10 w-40 rounded-xl bg-slate-50 border-slate-100 font-black text-[10px] uppercase tracking-widest focus:ring-primary/20">
                    <SelectValue placeholder="FILTER" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ALL STREAMS</SelectItem>
                    {actionTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => navigate("/events")} className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {detectionResults.filter(r => {
                const matchesFilter = filterAction === "all" || r.action === filterAction;
                const matchesSearch = !searchQuery ||
                  r.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.id.toString().includes(searchQuery) ||
                  (r.person_id && r.person_id.toLowerCase().includes(searchQuery.toLowerCase()));
                return matchesFilter && matchesSearch;
              }).map((result) => (
                <Card
                  key={result.id}
                  role="article"
                  aria-label={`Signal: ${result.action} at ${result.location}`}
                  onClick={() => { setSelectedResult(result); setIsModalOpen(true); }}
                  className={cn(
                    "p-6 rounded-[32px] border-slate-100 transition-all duration-300 group overflow-hidden relative cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-slate-100 active:scale-[0.99]"
                  )}
                >
                  {/* Sync Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary transition-all duration-300"
                    style={{ opacity: 0.3 + result.fidelity * 0.7 }}
                  />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                    <div className="flex items-start gap-5 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 group-hover:scale-105 transition-all duration-300">
                        <Zap className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors duration-300">
                            {(result.action || 'unknown').replace(/_/g, ' ').toUpperCase()}
                          </h3>
                          <Badge className={cn(
                            "text-[8px] font-bold uppercase h-4 px-2 hover:bg-opacity-20 transition-all border-none bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                          )}>
                            REALTIME_STREAM
                          </Badge>
                        </div>

                        <div className="auto-scroll-row items-center gap-x-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary" /> {result.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" /> {formatTimestamp(result.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-[9px] opacity-60">Fidelity Index:</span>
                            <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${result.fidelity * 100}%` }} />
                            </div>
                            <span className="text-primary">{Math.round(result.fidelity * 100)}%</span>
                          </div>
                        </div>

                        {result.person_id && (
                          <div className="flex items-center gap-2 mt-2">
                            <Fingerprint className="w-2.5 h-2.5 text-slate-300" />
                            <code className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                              NODE_{result.person_id.split('@')[0].toUpperCase()}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-8 self-end md:self-center">
                      <div className="text-right">
                        <div className={cn(
                          "flex items-center gap-2 text-2xl font-black tracking-tighter transition-transform duration-300 group-hover:scale-105",
                          result.creditsEarned >= 0 ? "text-slate-900" : "text-destructive"
                        )}>
                          {result.creditsEarned >= 0 ? "+" : ""}
                          {result.creditsEarned.toFixed(2)}
                          <Coins className="w-5 h-5 text-slate-300 group-hover:text-primary opacity-60 transition-colors" />
                        </div>
                        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] group-hover:text-slate-500 transition-colors">
                          {result.energySaved ? `${result.energySaved}W OFFSET` : "SIGNAL_VERIFIED"}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 hover:bg-slate-50 active:scale-95 transition-all">
                        Audit Report
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unified Verification Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                    {(selectedResult?.action || 'Unknown Signal').replace(/_/g, ' ')}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Pulse ID: {selectedResult?.id} • Status: SYNC_OK
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedResult && (
              <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {[
                    { label: "Station Entity", value: selectedResult.location },
                    { label: "Temporal sync", value: new Date(selectedResult.timestamp).toLocaleTimeString() },
                    { label: "Fidelity Index", value: `${Math.round(selectedResult.fidelity * 100)}%` },
                    { label: "Node Operator", value: selectedResult.person_id || "SYSTEM" }
                  ].map((d, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-3xl space-y-1 text-center min-w-[140px] border border-slate-100/50 flex flex-col justify-center snap-center">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{d.label}</div>
                      <div className={cn("text-[11px] font-black break-all px-1 leading-tight", "text-slate-900")}>{d.value}</div>
                    </div>
                  ))}
                </div>

                {/* Video Evidence Section */}
                <div className="space-y-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Visual Evidence</div>
                  <Card className="aspect-video bg-slate-900 rounded-[32px] overflow-hidden relative group border border-white/5 shadow-2xl">
                    {selectedResult.video_file && (!useMockData || selectedResult.video_file !== "sample_audit.mp4") ? (
                      <video
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        muted
                        playsInline
                        crossOrigin="anonymous"
                      >
                        <source
                          src={selectedResult.video_file.startsWith('http') ? selectedResult.video_file : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${selectedResult.video_file}`}
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
                        (selectedResult.creditsEarned || 0) >= 0 ? "text-white" : "text-red-400"
                      )}>
                        {(selectedResult.creditsEarned || 0) >= 0 ? "+" : ""}{(selectedResult.creditsEarned || 0).toFixed(2)} <span className="text-xl text-white/40">Credits</span>
                      </div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Credit Disbursement</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-4xl font-black tracking-tighter text-success">{(selectedResult.energySaved || 0)} <span className="text-xl text-success/40">W</span></div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Behavioral Energy Offset</div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex justify-center pt-6 border-t border-slate-100 bg-white">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full h-16 rounded-[28px] border-2 border-slate-100 font-black text-xs uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all">
                    Close Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout >
  );
};

export default Dashboard;
