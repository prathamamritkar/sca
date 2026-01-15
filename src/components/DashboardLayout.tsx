import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Video,
  LayoutDashboard,
  Trophy,
  History,
  Wallet as WalletIcon,
  Shield,
  LogOut,
  User,
  ExternalLink,
  ChevronRight,
  Database,
  Menu,
  X,
  Zap,
  Cpu,
  Fingerprint
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userEmail, logout, useMockData } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Real-time Detection", roles: ['student', 'faculty', 'admin'] },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy, description: "Impact Rankings", roles: ['student', 'faculty', 'admin'] },
    { path: "/events", label: "Event Log", icon: History, description: "Activity Records", roles: ['student', 'faculty', 'admin'] },
    { path: "/wallet", label: "Wallet", icon: WalletIcon, description: "Credits & Transfers", roles: ['student', 'faculty', 'admin'] },
    { path: "/admin", label: "Admin Center", icon: Shield, description: "System Management", roles: ['admin'] },
  ];

  // Filter navigation items based on user role
  const userRole = user?.role || 'student';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const handleLogout = () => {
    logout();
    toast({ title: "Session Terminated", description: "Identity context has been cleared." });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg">
        Skip to content
      </a>

      {/* Premium Industrial Navbar */}
      <header role="banner" className="fixed top-0 left-0 right-0 z-[100] h-20 border-b border-border/40 bg-white/80 backdrop-blur-xl flex items-center">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" aria-label="SCA Home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-2xl shadow-slate-200 group-hover:rotate-6 transition-transform">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col leading-[0.9]">
              <span className="text-lg font-black tracking-[0.05em] uppercase text-slate-900">Sustainable</span>
              <span className="text-[12px] font-bold tracking-[0.1em] text-slate-400 uppercase">Campus Automation</span>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <div aria-hidden="true" className="hidden md:flex items-center gap-2 group cursor-help px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/50 transition-colors hover:bg-slate-200/50">
              <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {useMockData ? "Sandbox_v2.0" : "Mainnet_Active"}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end leading-tight mr-2">
                <span className="text-xs font-black text-slate-900">{user?.name || userEmail?.split('@')[0] || "Guest_01"}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'faculty' ? 'Faculty Node' : 'Student Node'}
                </span>
              </div>
              <Button variant="ghost" size="icon" aria-label="View Public Website" className="w-10 h-10 rounded-xl border border-border/40 hover:bg-slate-100" onClick={() => navigate("/")}>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Button>
              <Button variant="ghost" size="icon" aria-expanded={isMobileMenuOpen} aria-label="Toggle Menu" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 pt-32 pb-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-12 items-start">
          {/* Enhanced Sidebar: The Control Column */}
          <aside className={cn(
            "fixed inset-0 z-[90] bg-white lg:relative lg:bg-transparent lg:inset-auto lg:z-auto transition-transform lg:transition-none pt-24 lg:pt-0 lg:block",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}>
            <div className="flex flex-col h-full lg:h-[calc(100vh-160px)] lg:sticky lg:top-32 space-y-12">
              <nav aria-label="Main Navigation" className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 px-4">Core Context</h3>
                <div className="space-y-2">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between group px-4 py-4 rounded-3xl transition-all duration-300 focus-visible:ring-inset",
                          isActive
                            ? "bg-slate-900 text-white shadow-2xl shadow-slate-200"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            isActive ? "bg-primary/20" : "bg-slate-100 group-hover:bg-slate-200"
                          )}>
                            <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                          </div>
                          <div>
                            <div className="text-sm font-bold tracking-tight">{item.label}</div>
                            <div className={cn("text-[9px] font-bold uppercase tracking-widest", isActive ? "text-white/40" : "text-slate-400")}>
                              {item.description}
                            </div>
                          </div>
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 text-white/40" />}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Network Status Widget */}
              <div className="px-2">
                <div className="p-8 rounded-[40px] bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12 group-hover:scale-110 transition-transform">
                    <Cpu className="w-20 h-20" />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-primary uppercase tracking-[0.3em]">System Health</div>
                      <div className="text-lg font-black">Operating Range</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[88%] animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold">88.2%</span>
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium">Node is synchronised with the Campus Identity Layer.</p>
                  </div>
                </div>
              </div>

              {/* Global Sign Out (Segregated Bottom) */}
              <div className="pt-8 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-destructive hover:bg-destructive/5 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive group-hover:text-white transition-all">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="text-left leading-none">
                    <div className="text-xs font-black uppercase tracking-widest">Sign Out</div>
                    <div className="text-[9px] font-bold text-slate-400 opacity-60">Terminate Identity</div>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Workspace (Responsive Depth) */}
          <main className="min-w-0">
            <div className="bg-white rounded-[48px] border border-border/40 p-8 md:p-12 shadow-2xl shadow-slate-100 min-h-[calc(100vh-160px)]">
              {children}
            </div>
            {/* Context Footer */}
            <div className="mt-8 px-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300">
              <div>SCA_NODE_REF: {userEmail?.split('@')[0].toUpperCase() || "GUEST"}</div>
              <div>LATENCY: 0.2ms</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
