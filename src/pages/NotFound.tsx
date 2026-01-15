import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Unplug, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Protocol mismatch at:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-slate-900 font-sans">
      <div className="max-w-md w-full text-center space-y-10">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl -z-10 scale-150 transform animate-pulse" />
          <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl shadow-primary/10 flex items-center justify-center mx-auto border border-border/50">
            <Unplug className="w-16 h-16 text-primary italic" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Protocol Error 404</div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900">Node Disconnected.</h1>
          <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
            The coordinate <span className="text-slate-900 font-bold">"{location.pathname}"</span> is not recognized by the Campus Mainnet. The data may have been expunged or moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-2xl h-14 px-8 font-black text-xs uppercase tracking-widest bg-slate-900 text-white shadow-xl shadow-slate-200 group">
            <Link to="/">
              <Home className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
              Base Station
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl h-14 px-8 font-black text-xs uppercase tracking-widest border-2">
            <Link to="/auth">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Re-Authenticate
            </Link>
          </Button>
        </div>

        <div className="pt-8 border-t border-slate-200">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-50">SCA Diagnostic Service</div>
          <div className="text-[8px] font-bold text-slate-300 italic">ERR_ROUTE_MISMATCH_v2.0</div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
