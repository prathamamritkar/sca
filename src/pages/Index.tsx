import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import {
  Video,
  Award,
  TrendingUp,
  Shield,
  ArrowRight,
  Leaf,
  Zap,
  Database,
  Globe,
  Target,
  ChevronRight,
  Cpu,
  BarChart3,
  Users,
  Mail,
  MapPin,
  Send,
  MessageSquare,
  Terminal,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import * as cvApi from "@/services/cvApi";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, logout } = useAuthStore();
  const [isSending, setIsSending] = useState(false);
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [networkStats, setNetworkStats] = useState({ totalCredits: 0, totalEvents: 0, totalEnergy: 0 });
  const [nodeStatus, setNodeStatus] = useState<'operational' | 'degraded' | 'offline'>('operational');
  const [nodeId, setNodeId] = useState<string>('SCA_NODE_PRIMARY');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await cvApi.getStats();
        if (result.success && result.data) {
          setNetworkStats({
            totalCredits: result.data.total_credits || 0,
            totalEvents: result.data.total_events || 0,
            totalEnergy: result.data.total_energy_saved || 0
          });
        }
      } catch (e) {
        console.error("Failed to fetch node stats", e);
      }
    };

    const fetchNodeStatus = async () => {
      try {
        const response = await fetch(cvApi.getApiBaseUrl() + '/status');
        if (response.ok) {
          const data = await response.json();
          setNodeStatus(data.status || 'operational');
          if (data.node_id) setNodeId(data.node_id);
        } else {
          setNodeStatus('offline');
        }
      } catch (e) {
        setNodeStatus('offline');
      }
    };

    fetchStats();
    fetchNodeStatus();
    const statsTimer = setInterval(fetchStats, 60000); // Refresh every minute
    const statusTimer = setInterval(fetchNodeStatus, 30000); // Check status every 30 seconds

    return () => {
      if (statsTimer) clearInterval(statsTimer);
      if (statusTimer) clearInterval(statusTimer);
    };
  }, []);

  const handleCta = () => {
    if (isAuthenticated) navigate("/dashboard");
    else navigate("/auth");
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const result = await cvApi.submitContact(formState);

      if (result.success) {
        toast({
          title: "Transmission Received",
          description: result.data?.message || "Your signal has been cached. Our node admins will sync with you shortly.",
        });
        setFormState({ name: "", email: "", message: "" });
      } else {
        toast({
          title: "Transmission Error",
          description: result.error || "Failed to dispatch signal to the network hub.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Link Failure",
        description: "Network node is currently unreachable. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 selection:bg-primary/10">
      {/* Accessibility Skip Link */}
      <a href="#mission" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      {/* Premium Glass Navbar */}
      <header role="banner" className="fixed top-0 left-0 right-0 z-[100] border-b border-border/40 bg-white/70 backdrop-blur-xl">
        <div className="main-container h-20 flex items-center justify-between">
          <Logo linkTo="/" variant="default" />

          <nav className="hidden lg:flex items-center gap-10">
            {["Mission", "Technology", "Incentives", "Team", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-primary pr-4 border-r border-border">Panel</Link>
                <Button variant="ghost" size="sm" onClick={logout} className="text-xs font-bold uppercase tracking-widest">Sign Out</Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-primary">Login</Link>
                <Button onClick={() => navigate("/auth")} size="sm" className="hidden sm:flex rounded-full px-6 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200">
                  Join Network
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: The Visionary Entry */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated Background Shapes - Hidden on mobile to prevent overflow */}
        <div className="hidden md:block absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[40vw] max-w-[600px] h-[40vw] max-h-[600px] bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="hidden md:block absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[30vw] max-w-[400px] h-[30vw] max-h-[400px] bg-secondary/10 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <Badge className="bg-primary/10 text-primary border-primary/20 py-1.5 px-4 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] animate-bounce">
              <Zap className="w-3 h-3 mr-2" /> Redefining Campus Efficiency
            </Badge>

            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.05] text-slate-900">
              The Ledger of <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Green Energy.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Empowering campuses to eliminate 40% idle energy waste through real-time AI computer vision and decentralized blockchain rewards.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Button onClick={handleCta} size="lg" aria-label="Access Detection Dashboard" className="h-16 px-10 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-300 font-bold text-base group">
                Access Dashboard
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[
                    { tag: "SDG11", link: "https://sdgs.un.org/goals/goal11" },
                    { tag: "SDG12", link: "https://sdgs.un.org/goals/goal12" },
                    { tag: "SDG13", link: "https://sdgs.un.org/goals/goal13" }
                  ].map((sdg, i) => (
                    <a
                      key={i}
                      href={sdg.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black hover:bg-primary hover:text-white transition-all hover:scale-110 z-10"
                      title={`Learn more about ${sdg.tag}`}
                    >
                      {sdg.tag}
                    </a>
                  ))}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-widest leading-none">Certified Project</div>
                  <a
                    href="https://sdgs.un.org/goals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-slate-400 font-medium hover:text-primary transition-colors cursor-pointer"
                  >
                    UN Sustainability Goals
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Segregated Functionality: The Problem (Internal Context) */}
      <section id="mission" className="py-20 bg-slate-50/50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em]">The Inefficiency Gap</h2>
                <h3 className="text-4xl font-black tracking-tight text-slate-900 leading-tight">
                  Why 40% of Campus <br />Energy is Wasted Tonight.
                </h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  Most buildings operate on static timers. Lights stay on in empty labs, PCs run phantom updates, and ACs cool vacant lecture halls. Without precise, human-centric monitoring, efficiency is a guess.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-white border border-border/40 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="text-3xl font-black text-slate-900 mb-1">35%</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phantom Load</div>
                </div>
                <div className="p-6 rounded-3xl bg-white border border-border/40 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="text-3xl font-black text-slate-900 mb-1">200t</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">CO2 Excess/Yr</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative group/vis">
              <div className="aspect-square bg-slate-900 rounded-[64px] overflow-hidden p-1 flex items-center justify-center relative shadow-3xl shadow-slate-200">
                {/* HUD Simulation Layer */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.15)_0%,transparent_70%)]" />

                {/* Scanning Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary/20 animate-[scan_4s_linear_infinite]" />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/20 animate-[scan_4s_linear_infinite_reverse]" />
                </div>

                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12">
                  <div className="relative">
                    <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center animate-[spin_30s_linear_infinite]">
                      <div className="absolute inset-2 rounded-full border border-dashed border-primary/20" />
                      <div className="absolute inset-8 rounded-full border border-white/5" />
                    </div>
                    <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-primary group-hover/vis:scale-110 transition-transform duration-700" />
                  </div>

                  <div className="mt-8 flex gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-10 left-10 right-10 p-6 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl group-hover/vis:bg-white/15 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white tracking-tight">20% Reduction</div>
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Target Threshold</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Technology Pillars (Segregated Interface) */}
      <section id="technology" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Core Architecture</h2>
            <h3 className="text-4xl font-black tracking-tight text-slate-900">How the Network Breathes.</h3>
            <p className="text-slate-500 font-medium">We integrated hardware-agnostic sensing with immutable data structures to create a closed-loop efficiency cycle.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: <Cpu className="w-6 h-6" />,
                title: "Edge Vision AI",
                desc: "Real-time YOLO parsing of CCTV feeds identifies energy-saving actions without compromising student privacy.",
                tag: "The Observer"
              },
              {
                icon: <Database className="w-6 h-6" />,
                title: "Immutable Ledger",
                desc: "Every watt saved is signed and recorded on a private blockchain, creating a tamper-proof audit trail of impact.",
                tag: "The Proof"
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Dynamic Rebates",
                desc: "Credits flow directly to students and departments through a decentralized engine, redeemable for campus perks.",
                tag: "The Reward"
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-10 rounded-[40px] bg-white border border-border/50 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all mb-8 shadow-inner">
                  {feature.icon}
                </div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 opacity-60">{feature.tag}</div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof & Community Segregation */}
      <section id="incentives" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Recognition & Community</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  Compete for <br />the Future.
                </h3>
              </div>

              <div className="space-y-6">
                {[
                  { icon: <Award className="w-5 h-5" />, title: "SPPU Startup Bootcamp '25", desc: "Active Participant • Innovation & Incubation Center" },
                  { icon: <Award className="w-5 h-5" />, title: "IEEE Inv.Ent Pitch '25", desc: "Regional Finalist • Technical Entrepreneurship" },
                  { icon: <Globe className="w-5 h-5" />, title: "PCCOE Indradhanu '25", desc: "Semifinalist • International Grand Challenge" },
                  { icon: <Target className="w-5 h-5" />, title: "IIT Delhi Moonshot 6.0", desc: "Quarter Finalist • eDC Disruptive Tech" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{item.title}</div>
                      <div className="text-xs text-white/50 font-medium">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <Card className="bg-white/5 border-white/10 backdrop-blur-3xl p-8 rounded-[48px] border">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center relative">
                    <Globe className="w-6 h-6 text-primary" />
                    <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      Network Snapshot
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Live Campus Node #1</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Credits Issued</div>
                    <div className="text-3xl font-black text-primary tabular-nums">{networkStats.totalCredits.toLocaleString()}</div>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min((networkStats.totalCredits / 200000) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <span>Target Score: 200K</span>
                    <span>{Math.abs(Math.min(((networkStats.totalCredits / 200000) * 100), 100)).toFixed(1)}% Confirmed</span>
                  </div>

                  <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Energy Conserved</div>
                      <div className="text-xl font-black text-white">
                        {Math.abs(networkStats.totalEnergy) < 1000
                          ? `${Math.abs(networkStats.totalEnergy).toLocaleString()} W`
                          : `${(Math.abs(networkStats.totalEnergy) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} KW`}
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Verified Signals</div>
                      <div className="text-xl font-black text-white">{networkStats.totalEvents.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Team Consortium Section - Infinite Scrolling Carousel */}
      <section id="team" className="py-32 bg-slate-50/50 overflow-hidden">
        <div className="container mx-auto px-6 mb-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em]">The Innovators</h2>
            <h3 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Team Consortium</h3>
            <p className="text-slate-500 font-medium">Developed by the Class of 2027, BE Computer Engineering at AISSMS COE, Pune.</p>
          </div>
        </div>

        <div className="relative">
          {/* Faded edges for better visual transition */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50/50 to-transparent z-10 pointer-events-none" />

          <div className="flex animate-marquee hover:[animation-play-state:paused] cursor-grab active:cursor-grabbing w-fit">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-8 px-4">
                {[
                  { name: "Pratham Amritkar", role: "BE Computer 2027 • AISSMS COE, Pune" },
                  { name: "Harshalee Malu", role: "BE Computer 2027 • AISSMS COE, Pune" },
                  { name: "Balaji Alli", role: "BE Computer 2027 • AISSMS COE, Pune" }
                ].map((member, idx) => (
                  <div key={idx} className="w-[400px] p-10 rounded-[48px] bg-white border border-border/60 text-center space-y-6 shadow-xl shadow-slate-100/50 shrink-0">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] mb-2 leading-none opacity-60">Consortium Member</div>
                      <h4 className="text-2xl font-black tracking-tighter text-slate-900">{member.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Contact Node</h3>
                </div>
                <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
                  Have questions about integration or technical audits? Reach out to the core development team at AISSMS COE.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex gap-6 group">
                  <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-all shadow-inner shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grid Email</div>
                    <div className="text-lg font-black tracking-tighter text-slate-900">sca.project@aissmscoe.com</div>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-all shadow-inner shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nexus Location</div>
                    <div className="text-lg font-black tracking-tighter text-slate-900">AISSMS COE, Pune</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-10 md:p-12 rounded-[56px] bg-white border border-border/60 shadow-2xl shadow-slate-200/50">
              <form onSubmit={handleContactSubmit} aria-label="Technical Inquiry Form" className="space-y-8">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Entity Name</Label>
                      <Input
                        id="contact-name"
                        placeholder="Team Member / Guest"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        className="h-14 px-8 bg-slate-50 border-none rounded-2xl font-bold text-sm focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Signal / Email</Label>
                      <Input
                        id="contact-email"
                        placeholder="nexus@domain.com"
                        type="email"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                        className="h-14 px-8 bg-slate-50 border-none rounded-2xl font-bold text-sm focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Message Payload</Label>
                    <textarea
                      id="contact-message"
                      required
                      value={formState.message}
                      onChange={(e) => setFormState(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full min-h-[140px] p-8 bg-slate-50 border-none rounded-[32px] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      placeholder="Describe your technical inquiry..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSending}
                  aria-label="Dispatch Transmission"
                  className="w-full h-16 rounded-[28px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-3 animate-spin" /> Transmitting Signal...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-3" /> Dispatch Signal →
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-slate-50/30">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto rounded-[64px] bg-gradient-to-br from-slate-900 to-slate-800 p-16 md:p-24 text-center text-white relative shadow-3xl shadow-slate-400 overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <div className="relative z-10 space-y-10">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                Ready to Sync <br />Your Impact?
              </h2>
              <p className="max-w-xl mx-auto text-white/60 font-medium">
                Join the decentralized movement of campus conservation. Register your node today and start earning credits for every watt you save.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={handleCta} size="lg" className="h-16 px-12 rounded-2xl bg-primary text-slate-900 hover:bg-primary/90 font-black text-base shadow-xl shadow-primary/20">
                  {isAuthenticated ? "Enter Dashboard" : "Register Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Premium Footer */}
      <footer className="border-t border-border bg-white pt-20 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2 space-y-6">
              <Logo showText={true} variant="default" linkTo={undefined} />
              <p className="text-slate-400 text-sm max-w-xs font-medium">
                Pioneering the intersection of computer vision, blockchain, and environmental conservation to build the campus of 2030.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-6">Internal Network</h5>
              <div className="flex flex-col gap-3">
                {["Dashboard", "Leaderboard", "Ledger", "Wallet"].map(p => (
                  isAuthenticated ? (
                    <Link key={p} to={`/${p === 'Ledger' ? 'events' : p.toLowerCase()}`} className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">{p}</Link>
                  ) : (
                    <button
                      key={p}
                      onClick={() => navigate('/auth')}
                      className="text-sm font-medium text-slate-400 hover:text-primary transition-colors text-left"
                      title="Login required"
                    >
                      {p}
                    </button>
                  )
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-6">Organization</h5>
              <div className="flex flex-col gap-3">
                <a href="#team" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Our Team</a>
                <a href="#contact" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Contact Support</a>
                <a href="#mission" className="text-sm font-medium text-slate-400 hover:text-primary transition-colors">Our Mission</a>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-6">Status</h5>
              <div className={cn(
                "flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight",
                nodeStatus === 'operational' && "text-emerald-600",
                nodeStatus === 'degraded' && "text-amber-600",
                nodeStatus === 'offline' && "text-rose-600"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  nodeStatus === 'operational' && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
                  nodeStatus === 'degraded' && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
                  nodeStatus === 'offline' && "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                )} />
                {nodeStatus === 'operational' && 'Synced & Active'}
                {nodeStatus === 'degraded' && 'Local / Degraded'}
                {nodeStatus === 'offline' && 'Severed / Offline'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 font-medium tracking-wider"> Node Identifier: {nodeId}</div>
            </div>
          </div>

          <div className="pt-12 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="text-center md:text-left flex items-center gap-2">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              <span>© 2026 SUSTAINABLE CAMPUS AUTOMATION</span>
            </div>
            <div className="flex gap-8">
              <a href="#team" className="hover:text-slate-900">About Initiative</a>
              <a href="#contact" className="hover:text-slate-900">Grid Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
