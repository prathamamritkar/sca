import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Play,
  Loader2,
  RefreshCw,
  Trash2,
  Database,
  Terminal,
  Cpu,
  Zap,
  Activity,
  ChevronRight,
  Wifi,
  WifiOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import DetectionViewer from "@/components/dashboard/DetectionViewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import * as cvApi from "@/services/cvApi";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface DetectionResult {
  id: number;
  timestamp: string;
  action: string;
  location: string;
  confidence: number;
  pointsAwarded: number;
  actionType?: 'sustainable' | 'unsustainable' | 'neutral';
  energySaved?: number;
}

const Dashboard = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [filterAction, setFilterAction] = useState<string>("all");
  const { useMockData } = useAuthStore();
  const [apiConnected, setApiConnected] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(true);
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
        const converted: DetectionResult[] = response.data.events.map((e) => ({
          id: e.event_id,
          timestamp: e.timestamp,
          action: e.action_detected || 'unknown',
          location: e.room_id || 'Unknown',
          confidence: e.overall_confidence || 0.9,
          pointsAwarded: e.blockchain_credits || 0,
          actionType: e.action_type,
          energySaved: e.energy_saved_estimate
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
    const totalCredits = detectionResults.reduce((sum, d) => sum + d.pointsAwarded, 0);
    const averageConfidence = detectionResults.length > 0
      ? Math.round(detectionResults.reduce((sum, d) => sum + d.confidence, 0) / detectionResults.length * 100)
      : 0;
    return { totalActions: detectionResults.length, totalCredits, averageConfidence, uniqueLocations: new Set(detectionResults.map(d => d.location)).size };
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
        confidence: e.overall_confidence || 0.9,
        pointsAwarded: e.blockchain_credits || 0,
        actionType: e.action_type,
        energySaved: e.energy_saved_estimate
      }));

      setDetectionResults(prev => [...converted, ...prev]);
      toast({ title: "Inference Complete", description: `Successfully parsed ${converted.length} events from stream.` });
    } catch (err: any) {
      toast({ title: "Neural Link Error", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Futuristic Workspace Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-6 border-b border-slate-100">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Dashboard</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed">
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
            <Button variant="ghost" size="sm" onClick={fetchLatestEvents} className="h-10 px-4 rounded-xl text-primary hover:bg-primary/5 font-medium text-sm transition-all">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDetectionResults([])} className="h-10 px-4 rounded-xl text-destructive hover:bg-destructive/5 font-medium text-sm transition-all">
              <Trash2 className="w-4 h-4 mr-2" /> Clear
            </Button>
          </div>
        </div>

        {/* Distributed Metrics Table */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Actions Detected", value: sessionStats.totalActions, icon: <Activity className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Credits Earned", value: `+${sessionStats.totalCredits}`, icon: <Zap className="w-4 h-4" />, color: "text-primary" },
            { label: "Accuracy", value: `${sessionStats.averageConfidence}%`, icon: <Cpu className="w-4 h-4" />, color: "text-slate-900" },
            { label: "Locations", value: sessionStats.uniqueLocations, icon: <Database className="w-4 h-4" />, color: "text-slate-900" }
          ].map((stat, i) => (
            <Card key={i} className="p-6 bg-slate-50/50 border-slate-200/50 rounded-[32px] hover:border-primary/20 transition-all group cursor-default">
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

        {/* Input Interface - Neural Feed */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <Card className="relative overflow-hidden group border-2 border-dashed border-slate-200 rounded-[48px] bg-slate-50/30 hover:bg-slate-50/80 transition-all p-12 flex items-center justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Upload className="w-48 h-48 rotate-12" />
            </div>
            <div className="relative z-10 text-center space-y-8">
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="w-20 h-20 rounded-[32px] bg-white shadow-2xl shadow-slate-200 flex items-center justify-center mx-auto border border-slate-100">
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Inject Feed</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">Point the AI model towards a campus CCTV stream for immediate behavioral analysis.</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" id="dash-upload" />
                <label htmlFor="dash-upload">
                  <Button asChild variant="outline" aria-label="Select Video Source" className="h-14 px-8 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest bg-white shadow-lg shadow-slate-100 hover:shadow-primary/10 transition-all cursor-pointer">
                    <span>{videoFile ? "Queue Replace" : "Select Source"}</span>
                  </Button>
                </label>
                {videoFile && (
                  <Button onClick={handleProcessVideo} aria-label="Start Processing Video" disabled={isProcessing} className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 group">
                    {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</> : <><Play className="w-4 h-4 mr-3" /> Initialise Inference</>}
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
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Stream Refinement</h2>
              <Badge variant="secondary" className="font-bold text-[9px] tracking-tighter uppercase px-2 h-5 bg-slate-100">{detectionResults.length} FOUND</Badge>
            </div>

            <Card className="p-8 rounded-[40px] border border-slate-200/50 bg-white space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Filter Context</Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold text-xs focus:ring-primary/20">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ALL STREAMS</SelectItem>
                    {actionTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Portfolio Delta</div>
                  <Activity className="w-3.5 h-3.5 text-primary opacity-40" />
                </div>
                <div className="text-3xl font-black tracking-tighter text-slate-900">+{sessionStats.totalCredits} XP</div>
                <Button variant="ghost" className="w-full h-10 font-black text-[9px] uppercase tracking-widest text-primary hover:bg-primary/10" onClick={() => navigate("/wallet")}>
                  View Ledger Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Detection Stream Refactored List */}
        {detectionResults.length > 0 && (
          <div className="pt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black tracking-tighter text-slate-900 uppercase">Live Audit Stream</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-primary">
                Archive History →
              </Button>
            </div>
            <DetectionViewer results={detectionResults.filter(r => filterAction === "all" || r.action === filterAction)} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
