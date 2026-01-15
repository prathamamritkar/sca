import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore, UserRole } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Loader2, Video, Lock, Mail, Database, Zap, ChevronRight, ShieldCheck, Network, Globe, Fingerprint, User, GraduationCap, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import * as cvApi from "@/services/cvApi";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Auth = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<'student' | 'faculty'>('student');
    const [department, setDepartment] = useState("");
    const [useMockData, setUseMockData] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleQuickSync = () => {
        setEmail("admin@sca.campus");
        setPassword("admin123");
        setIsRegistering(false);
        toast({ title: "Admin Sync", description: "System admin credentials synchronized." });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: "Portal Error", description: "Identity credentials required.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        try {
            const result = await cvApi.authLogin({ email, password, use_mock: useMockData });

            if (result.success && result.data) {
                const userData = result.data.user;
                login({
                    email: userData.email,
                    role: userData.role as UserRole,
                    name: userData.name,
                    department: userData.department
                }, useMockData);
                toast({
                    title: "Access Granted",
                    description: `Welcome, ${userData.name || userData.email}. Role: ${userData.role.toUpperCase()}`
                });
                navigate("/dashboard");
            } else {
                toast({
                    title: "Access Denied",
                    description: result.error || "Identity could not be verified by the node.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Gateway Timeout",
                description: "Authentication node is currently unresponsive.",
                variant: "destructive"
            });
        } finally {
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: "Portal Error", description: "Email and password are required.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        try {
            const result = await cvApi.authRegister({
                email,
                password,
                name: name || email.split('@')[0],
                role,
                department: department || 'General'
            });

            if (result.success && result.data) {
                toast({
                    title: "Registration Successful",
                    description: `Account created for ${result.data.user.name}. You can now login.`
                });
                setIsRegistering(false);
                // Clear registration fields except email
                setName("");
                setDepartment("");
            } else {
                toast({
                    title: "Registration Failed",
                    description: result.error || "Could not create account.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Gateway Timeout",
                description: "Registration node is currently unresponsive.",
                variant: "destructive"
            });
        } finally {
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsLoading(false);
        }
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
                        <h1 className="text-5xl font-black text-white leading-tight tracking-tighter">
                            Bridging Vision <br />& Efficiency.
                        </h1>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            The intelligent interface for campus sustainability. Authenticate to sync your local node with the global impact ledger.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="text-primary font-black text-3xl mb-1">99.8%</div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Inference Uptime</div>
                        </div>
                        <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="text-primary font-black text-3xl mb-1">0.02s</div>
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
                            {isRegistering ? <User className="w-8 h-8 text-slate-900" /> : <Lock className="w-8 h-8 text-slate-900" />}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {isRegistering ? "Create Account" : "Identity Access"}
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                {isRegistering ? "Register as a student or faculty member." : "Select your connectivity mode and provide credentials."}
                            </p>
                        </div>
                    </div>

                    {/* Login/Register Toggle */}
                    <div className="flex rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setIsRegistering(false)}
                            className={cn(
                                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                !isRegistering ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRegistering(true)}
                            className={cn(
                                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isRegistering ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={isRegistering ? handleRegister : handleLogin} aria-label={isRegistering ? "Registration Form" : "Login Form"} className="space-y-6">
                        {/* Network Interface Toggle (Login only) */}
                        {!isRegistering && (
                            <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="mock-toggle" className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 cursor-pointer">
                                            <Globe className="w-3.5 h-3.5" /> Network Interface
                                        </Label>
                                        <p className="text-[10px] font-medium text-slate-500">Toggle between Local Node and Campus Mainnet</p>
                                    </div>
                                    <Switch
                                        id="mock-toggle"
                                        checked={!useMockData}
                                        onCheckedChange={(c) => setUseMockData(!c)}
                                        aria-label="Toggle between mock and production data"
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
                        )}

                        {/* Registration: Role Selector */}
                        {isRegistering && (
                            <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">Select Your Role</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                            role === 'student' ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <GraduationCap className={cn("w-6 h-6", role === 'student' ? "text-primary" : "text-slate-400")} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Student</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('faculty')}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                            role === 'faculty' ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <Briefcase className={cn("w-6 h-6", role === 'faculty' ? "text-primary" : "text-slate-400")} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Faculty</span>
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-3 text-center">Admin accounts are auto-provisioned and cannot be self-registered.</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Name (Registration only) */}
                            {isRegistering && (
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Full Name</Label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="name" type="text" placeholder="John Doe"
                                            value={name} onChange={(e) => setName(e.target.value)}
                                            className="h-14 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                                    {isRegistering ? "Email Address" : "Authorized Email"}
                                </Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="email" type="email" placeholder="user@campus.edu"
                                        required
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="h-14 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                                    {isRegistering ? "Create Password" : "Access Secret"}
                                </Label>
                                <div className="relative group">
                                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password" type="password" placeholder="••••••••"
                                        required
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="h-14 pl-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {/* Department (Registration only) */}
                            {isRegistering && (
                                <div className="space-y-2">
                                    <Label htmlFor="department" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Department</Label>
                                    <Select value={department} onValueChange={setDepartment}>
                                        <SelectTrigger className="h-14 bg-white border-2 border-slate-100 rounded-2xl font-bold text-sm">
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                                            <SelectItem value="Information Technology">Information Technology</SelectItem>
                                            <SelectItem value="Engineering">Engineering</SelectItem>
                                            <SelectItem value="Business">Business</SelectItem>
                                            <SelectItem value="Science">Science</SelectItem>
                                            <SelectItem value="Arts & Media">Arts & Media</SelectItem>
                                            <SelectItem value="General">General</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            disabled={isLoading}
                            aria-label={isRegistering ? "Create Account" : "Initialize Session"}
                            className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-200 font-black text-xs uppercase tracking-[0.2em] group disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" /> {isRegistering ? "Creating Account..." : "Synchronising Node..."}
                                </>
                            ) : (
                                <>
                                    {isRegistering ? "Create Account" : "Initialise Session"}
                                    <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                        <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                            ← Abort Access
                        </Link>
                        <button
                            type="button"
                            onClick={handleQuickSync}
                            className="text-[10px] font-bold text-slate-300 hover:text-primary transition-colors cursor-pointer uppercase tracking-widest"
                        >
                            Admin Quick Sync
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
