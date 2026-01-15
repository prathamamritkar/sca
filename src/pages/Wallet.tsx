import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Coins,
  TrendingUp,
  Award,
  History,
  Shield,
  Loader2,
  RefreshCw,
  Send,
  Search,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRightLeft,
  Zap,
  Fingerprint,
  Activity,
  Box,
  Globe
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
  DialogFooter,
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

interface Transaction {
  id: string;
  action: string;
  points: number;
  timestamp: string;
  hash: string;
  location: string;
}

const Wallet = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [weeklyGain, setWeeklyGain] = useState(0);
  const [dailyGain, setDailyGain] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const { useMockData } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      const userEmail = useAuthStore.getState().user?.email || "anonymous";

      const credits = await cvApi.getBlockchainCredits({ person_id: userEmail });
      if (credits.success) setTotalPoints(Math.round(credits.data.total_blockchain_credits));

      const events = await cvApi.getEvents({ limit: 100 });
      if (events.success && events.data) {
        const txs = events.data.events.filter(e => (e.blockchain_credits || 0) !== 0).map((e, i) => ({
          id: `tx_${e.event_id || i}`,
          action: (e.action_detected || 'Behavioral_Correction').toUpperCase(),
          points: e.blockchain_credits || 0,
          timestamp: e.timestamp,
          hash: `0x${(e.event_id || i).toString(16).padStart(40, '0')}`, // Deterministic pseudo-hash for UI
          location: e.room_id || 'Unknown'
        }));
        setTransactions(txs);
        setTotalActions(txs.length);

        // Calculate weekly gain from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekly = txs.filter(tx => new Date(tx.timestamp) >= sevenDaysAgo && tx.points > 0)
          .reduce((sum, tx) => sum + tx.points, 0);
        setWeeklyGain(weekly);

        // Calculate daily gain from last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const daily = txs.filter(tx => new Date(tx.timestamp) >= twentyFourHoursAgo && tx.points > 0)
          .reduce((sum, tx) => sum + tx.points, 0);
        setDailyGain(daily);
      }
    } catch (e) {
      toast({
        title: "Link Failure",
        description: "The decentralized ledger could not be interrogated.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadWalletData(); }, [loadWalletData]);

  useEffect(() => {
    let filtered = transactions.filter(tx => tx.action.toLowerCase().includes(searchQuery.toLowerCase()) || tx.hash.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType !== "all") filtered = filtered.filter(tx => filterType === "high" ? tx.points >= 12 : tx.points < 12);
    setFilteredTransactions(filtered);
  }, [searchQuery, filterType, transactions]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash); setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    toast({ title: "Signal Cached", description: "Transaction signature copied to clipstream." });
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Disbursement must be a positive value.", variant: "destructive" });
      return;
    }
    if (amount > totalPoints) {
      toast({ title: "Insufficient Assets", description: "Disbursement exceeds total portfolio net value.", variant: "destructive" });
      return;
    }
    if (!transferRecipient.trim()) {
      toast({ title: "Recipient Missing", description: "Destination ID / Node reference required.", variant: "destructive" });
      return;
    }

    try {
      const senderId = useAuthStore.getState().user?.email || "anonymous";
      const result = await cvApi.transferCredits(senderId, transferRecipient, amount);

      if (result.success) {
        toast({
          title: "Dispatch Confirmed",
          description: `${amount} EP successfully routed. Block_Hash: ${result.data!.transaction_hash}`
        });
        setIsTransferModalOpen(false);
        loadWalletData(); // Refresh ledger
        setTransferAmount("");
        setTransferRecipient("");
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: "Dispatch Failure",
        description: err.message || "The transfer request was rejected by the network authority.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Ledger Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700">
                <Box className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Wallet</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Manage your sustainable carbon credits. Every point represents a verified energy-saving action recorded on the ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button aria-label="Open transfer assets modal" onClick={() => setIsTransferModalOpen(true)} className="h-10 px-8 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-200 group">
              <Send className="w-3.5 h-3.5 mr-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /> Dispatch Assets
            </Button>
          </div>
        </div>

        {/* Premium Portfolio Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <Card role="region" aria-label="Portfolio Summary" className="relative p-10 bg-slate-900 text-white rounded-[48px] overflow-hidden border-none shadow-3xl shadow-slate-200 group">
            {/* Dynamic Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
            <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12 group-hover:scale-110 transition-transform">
              <Coins className="w-64 h-64" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full space-y-16">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Portfolio Net Value</div>
                  <div className="flex items-center gap-4">
                    <div className="text-6xl font-black tracking-tighter">
                      {isLoading ? "---" : totalPoints.toLocaleString()} <span className="text-2xl text-white/40">EP</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="border-white/10 text-white/60 font-black text-[9px] uppercase tracking-widest px-4 h-7">Node_{totalActions}</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-12 pt-12 border-t border-white/5">
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Est. Rebate Value</div>
                  <div className="text-xl font-bold text-success leading-none">₹{(totalPoints * 5).toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Network Velocity</div>
                  <div className="text-xl font-bold text-white leading-none">+{weeklyGain}</div>
                </div>
                <div className="space-y-1 hidden md:block text-right">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Block Confirmation</div>
                  <div className="text-xl font-bold text-primary leading-none">SECURE</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {[
              { label: "Validations", value: totalActions, icon: <Award className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/5" },
              { label: "24h Delta", value: `+${dailyGain}`, icon: <TrendingUp className="w-4 h-4" />, color: "text-success", bg: "bg-success/5" }
            ].map((w, i) => (
              <Card key={i} className={cn("p-8 rounded-[40px] border border-slate-100 flex items-center justify-between group cursor-default", w.bg)}>
                <div className="space-y-1">
                  <div className={cn("text-3xl font-black tracking-tighter", w.color)}>{w.value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{w.label}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-slate-900 transition-colors">
                  {w.icon}
                </div>
              </Card>
            ))}

            <div className="p-1 shadow-inner bg-slate-50 rounded-[32px] border border-slate-100">
              <div className="p-6 text-center space-y-4">
                <Globe className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed px-4">Ledger Authority: <br /><span className="text-slate-900">CAMPUS_MAINNET_NODE_01</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Verification History</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <label htmlFor="lookup-hash" className="sr-only">Lookup Hash ID</label>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <Input
                  id="lookup-hash"
                  placeholder="Lookup Hash ID..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-64 rounded-2xl bg-slate-50 border-none font-bold text-xs pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger aria-label="Filter transactions" className="h-11 w-32 rounded-2xl border-none bg-slate-50 font-black text-[10px] uppercase">
                  <SelectValue placeholder="FILTER" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL BLOCKS</SelectItem>
                  <SelectItem value="high">VAL_HIGH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3">
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-slate-200 mx-auto" />
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Finalizing Block Transitions...</p>
              </div>
            ) : filteredTransactions.map((tx) => (
              <Card key={tx.id} className="p-6 rounded-[32px] border-slate-100 hover:border-primary/20 transition-all group relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black tracking-tighter text-slate-900">{tx.action.toUpperCase()}</span>
                        <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-500 border-none text-[8px] font-bold tracking-widest uppercase h-4 px-2">{tx.location}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span className="flex items-center gap-1.5"><History className="w-3 h-3" /> {new Date(tx.timestamp).toLocaleString()}</span>
                        <button onClick={() => handleCopyHash(tx.hash)} aria-label={`Copy hash ${tx.hash}`} className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer">
                          <Fingerprint className="w-3 h-3" /> {tx.hash.slice(0, 24)}...
                          {copiedHash === tx.hash ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 opacity-40" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tighter text-success leading-tight">+{tx.points} XP</div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Block Reward</div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-11 h-11 rounded-2xl border border-slate-100 hover:bg-slate-50" onClick={() => navigate("/events")}>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-md rounded-[40px] p-10 border-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-black tracking-tighter">Dispatch Assets</DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-Node Asset Sync Protocol</DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Disbursement Amount (XP)</Label>
              <div className="relative group">
                <Coins className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-primary transition-colors" />
                <Input
                  type="number"
                  min="0"
                  max={totalPoints}
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || parseFloat(val) >= 0) setTransferAmount(val);
                  }}
                  className="h-20 pl-16 bg-slate-50 border-none rounded-[32px] font-black text-3xl tracking-tighter"
                />
              </div>
              <div className="flex justify-between px-4 mt-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Available: {totalPoints.toLocaleString()} EP</span>
                {parseFloat(transferAmount) > totalPoints && <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">Insufficient Balance</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Destination ID / Node</Label>
              <Input placeholder="0x... or Entity_REF" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} className="h-16 px-8 bg-slate-50 border-none rounded-3xl font-bold text-sm" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3 mt-8">
            <Button variant="ghost" className="font-bold text-xs uppercase" onClick={() => setIsTransferModalOpen(false)}>Abort</Button>
            <Button onClick={handleTransfer} className="h-16 rounded-[28px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 flex-1">
              Execute Final Sync →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Wallet;
