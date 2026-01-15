import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin, Clock, Coins, Terminal, Eye, Zap, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

interface Detection {
  id: number;
  timestamp: string;
  action: string;
  location: string;
  confidence: number;
  pointsAwarded: number;
}

interface DetectionViewerProps {
  results: Detection[];
}

const DetectionViewer = ({ results }: DetectionViewerProps) => {
  const getActionLabel = (action: string) => action.replace(/_/g, ' ').toUpperCase();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          <Terminal className="w-3.5 h-3.5" /> Live Inference Stream
        </div>
        <div className="flex items-center gap-2 text-[9px] font-black text-success uppercase tracking-widest animate-pulse italic">
          <div className="w-1.5 h-1.5 rounded-full bg-success" /> Synchronised
        </div>
      </div>

      <div className="grid gap-4">
        {results.map((detection) => (
          <div
            key={detection.id}
            className="group relative overflow-hidden p-6 rounded-[32px] bg-white border border-slate-100 hover:border-primary/30 hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500"
          >
            {/* Edge Indicator */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-50 group-hover:bg-primary/20 transition-colors"
              style={{ opacity: 0.2 + detection.confidence * 0.8 }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-lg group-hover:shadow-slate-100 transition-all">
                    <Zap className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black italic tracking-tighter text-slate-900 leading-none">
                      {getActionLabel(detection.action)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Confidence Score:</span>
                      <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${detection.confidence * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-black italic text-primary">{Math.round(detection.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-16">
                  <span className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {detection.location}
                  </span>
                  <span className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Clock className="w-3.5 h-3.5 text-primary" /> {formatTimestamp(detection.timestamp)}
                  </span>
                  <span className="flex items-center gap-2 text-primary/70">
                    <Fingerprint className="w-3.5 h-3.5" /> TX_SIGNED
                  </span>
                </div>
              </div>

              <div className="text-right self-end md:self-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 md:bg-transparent md:p-0 md:border-none">
                <div className="flex items-center gap-2 text-success font-black text-3xl tracking-tighter italic">
                  <span className="text-lg opacity-40 not-italic">+</span>
                  {detection.pointsAwarded}
                  <Coins className="w-5 h-5 opacity-40 not-italic" />
                </div>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-1">XP_DISBURSED</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectionViewer;
