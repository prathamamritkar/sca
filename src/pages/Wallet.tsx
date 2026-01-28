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
  Wallet as WalletIcon,
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
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadMockWalletData = useCallback(() => {
    const isAdmin = useAuthStore.getState().isAdmin();
    const mockBalance = isAdmin ? 50000.00 : 1245.50;
    setTotalPoints(mockBalance);
    setNetworkStatus(false);

    const mockTx: Transaction[] = [
      { id: 'mtx_1', action: 'SIGNAL_REWARD', points: 15.42, timestamp: new Date().toISOString(), hash: '0x' + 'a'.repeat(40), location: 'Lab 3' },
      { id: 'mtx_2', action: 'SIGNAL_REWARD', points: 12.80, timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), hash: '0x' + 'b'.repeat(40), location: 'Central Hall' },
      { id: 'mtx_3', action: 'CREDIT_DISBURSEMENT', points: 50.00, timestamp: new Date(Date.now() - 86400000).toISOString(), hash: '0x' + 'c'.repeat(40), location: 'Admin Hub' },
      { id: 'mtx_4', action: 'SIGNAL_REWARD', points: 8.25, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), hash: '0x' + 'd'.repeat(40), location: 'Library' },
      { id: 'mtx_5', action: 'ASSET_RECEIPT', points: 200.00, timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), hash: '0x' + 'e'.repeat(40), location: 'Network Node' },
    ];

    setTransactions(mockTx);
    setTotalActions(mockTx.length);
    setWeeklyGain(286.47);
    setDailyGain(28.22);
    setIsLoading(false);
  }, []);

  const loadWalletData = useCallback(async () => {
    const useMock = useAuthStore.getState().useMockData;
    if (useMock) {
      loadMockWalletData();
      return;
    }

    setIsLoading(true);
    try {
      const userEmail = useAuthStore.getState().user?.email || "anonymous";

      const credits = await cvApi.getBlockchainCredits({ person_id: userEmail });
      if (credits.success && credits.data) {
        setTotalPoints(credits.data.total_blockchain_credits || 0);
        setNetworkStatus(credits.data.blockchain_status ?? false);

        const historyData: Transaction[] = [];

        // 1. Earned through behavior (Events)
        const eventsResult = await cvApi.getEvents({ limit: 100, person_id: userEmail });
        if (eventsResult.success && eventsResult.data) {
          eventsResult.data.events.filter(e => (e.blockchain_credits || 0) !== 0).forEach(e => {
            historyData.push({
              id: `evt_${e.event_id}`,
              action: (e.action_detected || 'Behavioral_Correction').toUpperCase(),
              points: e.blockchain_credits || 0,
              timestamp: e.timestamp,
              hash: `0x${(e.event_id).toString(16).padStart(40, '0')}`,
              location: e.room_id || 'Unknown'
            });
          });
        }

        // 2. Transfers and other activities
        if (credits.data.recent_history) {
          credits.data.recent_history.forEach((a: any) => {
            if (a.activity_type === 'disbursement' || a.activity_type === 'transfer_receipt') {
              historyData.push({
                id: `act_${a.activity_id}`,
                action: (a.activity_type === 'disbursement' ? 'ASSET_DISPATCH' : 'ASSET_RECEIPT').toUpperCase(),
                points: Math.abs(a.incentive_points),
                timestamp: a.timestamp,
                hash: a.details?.tx_hash || `0x${(a.activity_id + 5000).toString(16).padStart(40, 'b000')}`,
                location: a.details?.recipient || a.details?.sender || 'Network'
              });
            }
          });
        }

        // Sort by timestamp descending
        const sortedHistory = historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(sortedHistory);
        setTotalActions(sortedHistory.length);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekly = sortedHistory.filter(tx => new Date(tx.timestamp) >= sevenDaysAgo)
          .reduce((sum, tx) => sum + tx.points, 0);
        setWeeklyGain(parseFloat(weekly.toFixed(2)));

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const daily = sortedHistory.filter(tx => new Date(tx.timestamp) >= twentyFourHoursAgo)
          .reduce((sum, tx) => sum + tx.points, 0);
        setDailyGain(parseFloat(daily.toFixed(2)));
      } else {
        // If API responds but no data (e.g. 404 or empty), try mock fallback if requested
        loadMockWalletData();
      }
    } catch (e) {
      toast({
        title: "Sandbox Mode Engaged",
        description: "Decentralized ledger link is offline. Initializing local data stream.",
        variant: "default"
      });
      loadMockWalletData();
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadMockWalletData]);

  useEffect(() => { loadWalletData(); }, [loadWalletData]);

  useEffect(() => {
    let filtered = transactions.filter(tx => tx.action.toLowerCase().includes(searchQuery.toLowerCase()) || tx.hash.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType !== "all") filtered = filtered.filter(tx => filterType === "high" ? tx.points >= 12 : tx.points < 12);
    setFilteredTransactions(filtered);
  }, [searchQuery, filterType, transactions]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash); setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    toast({ title: "Signature Cached", description: "Transaction signature copied to clipstream." });
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
          description: `${amount} Credits successfully routed. Pulse_Hash: ${result.data!.transaction_hash}`
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
      <div className="page-section">
        {/* Ledger Header */}
        <div className="section-header md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 shadow-2xl shadow-slate-200">
                <WalletIcon className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Wallet</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
              Manage your sustainable carbon credits. Every credit represents a verified energy-saving signal recorded on the ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={loadWalletData} disabled={isLoading} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-slate-50">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button aria-label="Open transfer assets modal" onClick={() => setIsTransferModalOpen(true)} className="h-10 px-8 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-200 group">
              <Send className="w-3.5 h-3.5 mr-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /> Dispatch Assets
            </Button>
          </div>
        </div>

        {/* Premium Portfolio Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <Card role="region" aria-label="Portfolio Summary" className="relative p-8 bg-slate-900 text-white rounded-[40px] overflow-hidden border-none shadow-3xl shadow-slate-200 group">
            {/* Dynamic Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
            <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:scale-110 transition-transform">
              <Coins className="w-64 h-64" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Credit Balance</div>
                  <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
                    <div className="text-6xl font-black tracking-tighter">
                      {isLoading ? "---" : totalPoints.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-2xl text-white/40">Credits</span>
                    </div>

                    <div className="flex flex-col gap-1.5 mb-2">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Dispatch Address</div>
                      <div className="flex items-center gap-2 group/handle cursor-pointer" onClick={() => {
                        const email = useAuthStore.getState().user?.email || "anonymous";
                        navigator.clipboard.writeText(email);
                        toast({ title: "Identity Signature Cached", description: "Node handle copied to clipstream." });
                      }}>
                        <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 group-hover/handle:border-primary/40 group-hover/handle:bg-white/10 transition-all cursor-help">
                          <Fingerprint className="w-3.5 h-3.5 text-primary/60 group-hover/handle:text-primary transition-colors" />
                          <code className="text-[10px] font-mono font-bold text-white/60 uppercase tracking-tighter group-hover/handle:text-white transition-colors">
                            NODE_{(useAuthStore.getState().user?.email || "ANON").split('@')[0].toUpperCase()}
                          </code>
                          <Copy className="w-3 h-3 text-white/40 opacity-0 -ml-1 group-hover/handle:opacity-100 group-hover/handle:ml-1 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="border-white/10 text-white/60 font-black text-[9px] uppercase tracking-widest px-4 h-7">Node_{totalActions}</Badge>
              </div>

              <div className="auto-scroll-row pt-8 border-t border-white/5">
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Estimated INR Value</div>
                  <div className="text-xl font-bold text-success leading-none">₹{totalPoints.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">7D Velocity</div>
                  <div className={cn("text-xl font-bold leading-none", weeklyGain >= 0 ? "text-white" : "text-destructive")}>
                    {weeklyGain >= 0 ? "+" : ""}{weeklyGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="space-y-1 hidden md:block text-right">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ledger Sync</div>
                  <div className={cn("text-xl font-bold leading-none", networkStatus ? "text-primary" : "text-amber-400")}>
                    {networkStatus === null ? "..." : (networkStatus ? "CONNECTED" : "SIMULATED")}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="page-section gap-[var(--space-md)]">
            {[
              { label: "Signals Verified", value: totalActions.toLocaleString(), icon: <Award className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/5" },
              { label: "Daily Yield", value: `${dailyGain >= 0 ? "+" : ""}${dailyGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: <TrendingUp className="w-4 h-4" />, color: dailyGain >= 0 ? "text-success" : "text-destructive", bg: dailyGain >= 0 ? "bg-success/5" : "bg-destructive/5" }
            ].map((w, i) => (
              <Card key={i} className={cn("p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group cursor-default", w.bg)}>
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
              <div className="p-4 text-center space-y-4">
                <Globe className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed px-4">Ledger Authority: <br /><span className="text-slate-900">CAMPUS_MAINNET_NODE_01</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="page-section gap-[var(--space-md)]">
          <div className="section-header border-none pb-0 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Verification History</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <label htmlFor="lookup-hash" className="sr-only">Lookup Pulse ID</label>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <Input
                  id="lookup-hash"
                  placeholder="Lookup Pulse ID..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full md:w-64 rounded-2xl bg-slate-50 border-none font-bold text-xs pl-10"
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
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Finalizing Ledger Transitions...</p>
              </div>
            ) : filteredTransactions.map((tx) => (
              <Card key={tx.id} className="p-6 rounded-[32px] border-slate-100 hover:border-primary/20 transition-all group relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary/20 transition-colors" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 transition-all">
                      <Zap className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
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
                      <div className={cn(
                        "text-2xl font-black tracking-tighter leading-tight",
                        tx.points >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {tx.points >= 0 ? "+" : ""}{tx.points.toLocaleString(undefined, { maximumFractionDigits: 2 })} Credits
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Signal Reward</div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-11 h-11 rounded-2xl border border-slate-100 hover:bg-slate-50" onClick={() => { setSelectedTx(tx); setIsTxModalOpen(true); }}>
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
        <DialogContent className="fixed left-[50%] top-[50%] z-[200] w-[95vw] max-w-[42rem] translate-x-[-50%] translate-y-[-50%] bg-white rounded-[40px] shadow-3xl overflow-hidden focus:outline-none">
          <div className="h-3 w-full bg-slate-900" />
          <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Dispatch Assets</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-Node Asset Sync Protocol</DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Disbursement Amount (Credits)</Label>
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
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Available: {totalPoints.toLocaleString()} Credits</span>
                  {parseFloat(transferAmount) > totalPoints && <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">Insufficient Balance</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Destination ID / Node Entity</Label>
                <Input placeholder="0x... or Station_REF" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} className="h-16 px-8 bg-slate-50 border-none rounded-3xl font-bold text-sm" />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-3 mt-8">
                <Button variant="ghost" className="font-bold text-xs uppercase" onClick={() => setIsTransferModalOpen(false)}>Abort</Button>
                <Button onClick={handleTransfer} className="h-16 rounded-[28px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 flex-1">
                  Execute Final Sync →
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
        <DialogContent className="fixed left-[50%] top-[50%] z-[200] w-[95vw] max-w-[42rem] translate-x-[-50%] translate-y-[-50%] bg-white rounded-[40px] shadow-3xl overflow-hidden focus:outline-none">
          <div className="h-3 w-full bg-slate-900" />
          <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar">
            {selectedTx && (
              <div className="space-y-10">
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                      <Fingerprint className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Ledger Audit</DialogTitle>
                      <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Confirmed Signal Record</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-10 rounded-[40px] bg-slate-900 text-white space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Database className="w-32 h-32" />
                  </div>
                  <div className="flex items-center justify-between text-primary">
                    <div className="text-[10px] font-bold uppercase tracking-[0.4em]">Asset Delta</div>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="relative z-10 flex justify-between items-end">
                    <div className="text-6xl font-black tracking-tighter">
                      {selectedTx.points >= 0 ? "+" : ""}{selectedTx.points.toFixed(2)} <span className="text-2xl opacity-40">Credits</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Pulse Hash</div>
                      <div className="text-xs font-mono opacity-60">0x...{selectedTx.hash.slice(-12)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {[
                    { label: "Action Class", value: selectedTx.action.toUpperCase() },
                    { label: "Node Entity", value: selectedTx.location },
                    { label: "Temporal sync", value: new Date(selectedTx.timestamp).toLocaleString() },
                    { label: "Entry ID", value: `#${selectedTx.id}` }
                  ].map((d, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-[2rem] space-y-1 border border-slate-100 min-w-[160px] text-center snap-center flex flex-col justify-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{d.label}</div>
                      <div className="text-xs font-black text-slate-900 leading-tight">{d.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-6">
                  <Button variant="ghost" onClick={() => setIsTxModalOpen(false)} className="w-full h-16 rounded-[28px] border-2 border-slate-100 font-black text-xs uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all">
                    Close Audit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Wallet;
