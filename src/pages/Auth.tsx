import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import {
    Video,
    Lock,
    Mail,
    Database,
    Zap,
    ChevronRight,
    ShieldCheck,
    Network,
    Globe,
    Fingerprint
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const Auth = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [useMockData, setUseMockData] = useState(true);
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: "Portal Error", description: "Identity credentials required.", variant: "destructive" });
            return;
        }
        login(email, useMockData);
        toast({ title: "Access Granted", description: `Session initialized in ${useMockData ? 'Simulated' : 'Mainnet'} mode.` });
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-primary/20">
            {/* Left Column: Brand & Context (Segregated) */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                <div className="absolute top-12 left-12">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:rotate-6 transition-transform">
                            <Video className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tighter uppercase">Sustainable Campus</span>
                    </Link>
                </div>

                <div className="relative z-10 max-w-lg p-12 space-y-8">
                    <div className="space-y-4">
                        <Badge className="bg-primary/20 text-primary border-primary/30 h-6 px-4 font-bold tracking-widest text-[9px]">ENTERPRISE LAYER v2.4</Badge>
                        <h1 className="text-5xl font-black text-white leading-tight italic tracking-tighter">
                            Bridging Vision <br />& Efficiency.
                        </h1>
                        <p className="text-slate-400 font-medium leading-relaxed italic">
                            The intelligent interface for campus sustainability. Authenticate to sync your local node with the global impact ledger.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="text-primary font-black text-3xl mb-1 italic">99.8%</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inference Uptime</div>
                        </div>
                        <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="text-primary font-black text-3xl mb-1 italic">0.02s</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Block Sync Time</div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-12 left-12 flex items-center gap-4 text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">
                    <Network className="w-4 h-4" />
                    Secure P2P Environment • SHA-256 Compliant
                </div>
            </div>

            {/* Right Column: Key Access (Optimized UI) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-md space-y-10">
                    <div className="space-y-4">
                        <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-slate-900" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identity Access</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">Select your connectivity mode and provide credentials.</p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        {/* Segregated Network Interface */}
                        <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> Network Interface
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 italic">Toggle between Local Node and Campus Mainnet</p>
                                </div>
                                <Switch
                                    id="mock-toggle"
                                    checked={!useMockData}
                                    onCheckedChange={(c) => setUseMockData(!c)}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t border-slate-200/50">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                    useMockData ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                                )}>
                                    {useMockData ? <Database className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest">
                                        {useMockData ? "Sandbox Environment" : "Production Mainnet"}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter opacity-80">
                                        {useMockData ? "Pre-Signed Mock Data Blocks" : "Real-time AI Inference Stream"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Authorized Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="email" type="email" placeholder="principal@node.01"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="h-14 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Access Secret</Label>
                                <div className="relative group">
                                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password" type="password" placeholder="••••••••"
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="h-14 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button type="submit" size="lg" className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-200 font-black text-xs uppercase tracking-[0.2em] group">
                            Initialise Session
                            <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                        <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                            ← Abort Access
                        </Link>
                        <div className="text-[10px] font-bold text-slate-300 italic">DEMO_CREDENTIALS: ANY</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("inline-flex items-center justify-center h-5 px-2 border rounded text-[9px] font-black uppercase tracking-widest", className)}>
        {children}
    </div>
);

export default Auth;
