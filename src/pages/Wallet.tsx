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
  Wallet as WalletIcon,
  Globe,
  Link2Off
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
import { CLIENT_ID, CONTRACT_ADDRESS, CHAIN_ID } from "../client";

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
  const [internalCredits, setInternalCredits] = useState(0);
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null); // Active MetaMask Address
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null); // Backend Persisted Address
  const [isChainAligned, setIsChainAligned] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [nodeId, setNodeId] = useState("SCA_NODE_PRIMARY");
  const [nodeStatusLabel, setNodeStatusLabel] = useState("Syncing");

  const { toast } = useToast();
  const navigate = useNavigate();

  // Core Data Loading Functions
  const loadMockWalletData = useCallback(() => {
    const isAdmin = useAuthStore.getState().isAdmin();
    setTotalPoints(isAdmin ? 50000.00 : 0.00); // Simulated On-Chain Balance
    setInternalCredits(isAdmin ? 1250.00 : 1245.50); // Simulated Internal Database Credits
    setNetworkStatus(false);

    const actions = [
      { name: 'SIGNAL_REWARD', points: 15.42, loc: 'Lab 3' },
      { name: 'SIGNAL_REWARD', points: 22.80, loc: 'Main Hall' },
      { name: 'CREDIT_DISBURSEMENT', points: -50.00, loc: 'Admin Hub' },
      { name: 'SIGNAL_REWARD', points: 8.25, loc: 'Library' },
      { name: 'ASSET_RECEIPT', points: 200.00, loc: 'Network Node' }
    ];

    const mockTx: Transaction[] = Array.from({ length: 12 }).map((_, i) => {
      const act = actions[i % actions.length];
      return {
        id: `mtx_${5000 + i}`,
        action: act.name,
        points: act.points,
        timestamp: new Date(Date.now() - (i * 3600000 * 4)).toISOString(),
        hash: '0x' + Math.random().toString(16).slice(2).padStart(40, '0'),
        location: act.loc
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
        setInternalCredits(credits.data.total_credits || 0);
        setNetworkStatus(credits.data.blockchain_status ?? false);

        // Restore linked wallet from backend
        if (credits.data.wallet_address) {
          setLinkedAddress(credits.data.wallet_address);
          // Only auto-set active walletAddress if it matches our linked one or if nothing else is active
          if (!walletAddress) setWalletAddress(credits.data.wallet_address);
        }

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
            if (['disbursement', 'transfer_receipt', 'bridge_withdrawal'].includes(a.activity_type)) {
              historyData.push({
                id: `act_${a.activity_id}`,
                action: (a.activity_type === 'disbursement' ? 'ASSET_DISPATCH' :
                  a.activity_type === 'bridge_withdrawal' ? 'BRIDGE_SYNC' : 'ASSET_RECEIPT').toUpperCase(),
                points: Math.abs(a.incentive_points),
                timestamp: a.timestamp,
                hash: a.details?.tx_hash || `0x${(a.activity_id + 5000).toString(16).padStart(40, 'b000')}`,
                location: a.details?.recipient || a.details?.sender || 'Network Node'
              });
            }
          });
        }

        const sortedHistory = historyData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(sortedHistory);
        setTotalActions(sortedHistory.length);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        setWeeklyGain(sortedHistory.filter(tx => new Date(tx.timestamp) >= weekAgo).reduce((sum, tx) => sum + tx.points, 0));
        setDailyGain(sortedHistory.filter(tx => new Date(tx.timestamp) >= dayAgo).reduce((sum, tx) => sum + tx.points, 0));
      }
    } catch (e) {
      console.error("Wallet Sync Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [loadMockWalletData, walletAddress]);

  const syncScaNetwork = async () => {
    if (typeof window.ethereum === 'undefined') return;

    try {
      // Attempt to switch to Sepolia (0xaa36a7)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID }],
      });
      toast({ title: "Network Synchronized", description: "Ledger chain identified: Sepolia." });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          toast({ title: "Network Provisioned", description: "SCA Ledger Node added to MetaMask." });
        } catch (addError) {
          console.error("Failed to add network", addError);
        }
      }
    }
  };

  // Automated Sync & Refresh on Mount
  useEffect(() => {
    const handleInitialRefresh = async () => {
      // Only sync network if a wallet is already linked
      if (walletAddress) {
        await syncScaNetwork();
      }
      await loadWalletData();
    };

    handleInitialRefresh();
  }, [loadWalletData]); // Dependencies should include loadWalletData

  // Node Discovery Effect
  useEffect(() => {
    const fetchNodeInfo = async () => {
      try {
        const response = await fetch(`${cvApi.getApiBaseUrl()}/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.node_id) setNodeId(data.node_id);
          setNodeStatusLabel(data.status === 'operational' ? "Synced" : "Degraded");
        } else {
          setNodeStatusLabel("Isolated");
        }
      } catch (e) {
        setNodeStatusLabel("Offline");
      }
    };
    fetchNodeInfo();
  }, []);

  // Connection Alignment Watcher
  useEffect(() => {
    const checkAlignment = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setIsChainAligned(chainId === CHAIN_ID);
        } catch (e) {
          console.error("Chain check failed", e);
        }
      }
    };

    checkAlignment();
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkAlignment);
      window.ethereum.on('accountsChanged', checkAlignment);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', checkAlignment);
        window.ethereum.removeListener('accountsChanged', checkAlignment);
      }
    };
  }, [walletAddress]);

  // UI Interaction Handlers
  const connectWallet = async (forceChange = false) => {
    if (typeof window.ethereum === 'undefined') {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask to initiate blockchain interactions.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Step 1: Force network sync if needed
      await syncScaNetwork();

      if (forceChange) {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newAddress = accounts[0];
      setWalletAddress(newAddress);
      setLinkedAddress(newAddress);

      // Sync with backend if not in mock mode
      if (!useAuthStore.getState().useMockData) {
        try {
          await cvApi.updateWalletAddress(newAddress);
          toast({
            title: "Identity Synchronized",
            description: `Permanent Link Established: ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`
          });
        } catch (syncError) {
          console.error("Backend sync failed", syncError);
          toast({
            title: "Local Connection Only",
            description: "MetaMask connected, but backend persistence failed.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Wallet Linked",
          description: `Sandbox Node: ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`
        });
      }

      // Refresh data
      loadWalletData();
    } catch (err: any) {
      // Ignore user rejection to avoid error spam
      if (err.code === 4001) return;

      toast({
        title: "Connection Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBridgeCredits = async () => {
    if (!walletAddress) {
      connectWallet();
      return;
    }

    setIsTxPending(true);
    const useMock = useAuthStore.getState().useMockData;
    if (useMock || typeof window.ethereum === 'undefined') {
      setTimeout(() => {
        toast({ title: "Sandbox Bridge Verified", description: "Simulated Proof Published." });
        setIsTxPending(false);
      }, 2000);
      return;
    }

    try {
      const amountToBridge = useAuthStore.getState().isAdmin() ? 10.0 : 1.0;
      const result = await cvApi.bridgeCredits(amountToBridge);

      if (result.success) {
        toast({
          title: "Bridge Initiation Successful",
          description: `Immutable SCC token mint triggered on Sepolia.`,
        });
        loadWalletData();
      } else {
        throw new Error(result.error || "Bridge request rejected by Node Authority.");
      }
    } catch (e: any) {
      toast({
        title: "Bridge Failed",
        description: e.message || "The ledger link could not be authorized.",
        variant: "destructive"
      });
    } finally {
      setIsTxPending(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    // Allow transfer if amount is within either internal OR external balance limits
    const maxAvailable = Math.max(totalPoints, internalCredits);

    if (isNaN(amount) || amount <= 0 || amount > maxAvailable || !transferRecipient.trim()) {
      toast({ title: "Invalid Dispatch", description: "Please verify amount and available balance.", variant: "destructive" });
      return;
    }

    const useMock = useAuthStore.getState().useMockData;
    if (useMock) {
      setTimeout(() => {
        toast({ title: "Sandbox Transfer Verified", description: `Assets routed to ${transferRecipient}.` });
        setIsTransferModalOpen(false);
        loadMockWalletData();
      }, 1500);
      return;
    }

    // Check if recipient is an Email/ID that resolves to a wallet
    let finalRecipientAddress = null;
    if (transferRecipient.startsWith('0x') && transferRecipient.length === 42) {
      finalRecipientAddress = transferRecipient;
    } else {
      // Try to resolve user ID to wallet
      try {
        const personInfo = await cvApi.getPerson(transferRecipient);
        if (personInfo.success && personInfo.data && personInfo.data.wallet_address) {
          console.log(`Resolved ${transferRecipient} to ${personInfo.data.wallet_address}`);
          finalRecipientAddress = personInfo.data.wallet_address;
        }
      } catch (e) {
        // Ignore lookup errors, proceed to internal transfer
        console.log("Could not resolve wallet for user, proceeding with internal transfer.");
      }
    }

    // Handle External Blockchain Transfer ONLY if sender has enough ON-CHAIN funds
    if (finalRecipientAddress && walletAddress && amount <= totalPoints) {
      if (typeof window.ethereum === 'undefined') {
        toast({ title: "Wallet Not Connected", description: "Please connect MetaMask to dispatch to external addresses.", variant: "destructive" });
        return;
      }

      try {
        // Parse Amount to Wei (18 Decimals) safely
        const [intPart, decPart = ''] = transferAmount.split('.');
        const paddedDec = decPart.padEnd(18, '0').slice(0, 18);
        const rawAmount = BigInt(intPart + paddedDec);
        const amountHex = rawAmount.toString(16).padStart(64, '0');

        // Prepare Data for transfer(address,uint256)
        const recipientHex = finalRecipientAddress.slice(2).padStart(64, '0');
        const data = `0xa9059cbb${recipientHex}${amountHex}`;

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: CONTRACT_ADDRESS,
            data: data,
          }]
        });

        toast({ title: "Dispatch Broadcast", description: `Transaction submitted to ${transferRecipient.includes('@') ? 'linked wallet' : 'ledger'}.` });

        // Optimistic UI Update
        setTotalPoints(prev => Math.max(0, prev - amount));
        setIsTransferModalOpen(false);
        setTransferAmount("");
        setTransferRecipient("");

        // Note: We're not calling internal transfer API here because this is an external chain event.
        // The chain is the truth for this balance.

      } catch (err: any) {
        console.error("External Dispatch Failed:", err);
        toast({ title: "Dispatch Failed", description: err.message || "Transaction rejected.", variant: "destructive" });
      }
      return;
    }

    // Handle Internal Database Transfer (Fallback if no wallet linked)
    try {
      const senderId = useAuthStore.getState().user?.email || "anonymous";
      const result = await cvApi.transferCredits(senderId, transferRecipient, amount);
      if (result.success) {
        toast({ title: "Internal Dispatch Confirmed", description: `${amount} Credits routed to internal ledger.` });
        setIsTransferModalOpen(false);
        loadWalletData();
        setTransferAmount("");
        setTransferRecipient("");
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({ title: "Dispatch Failure", description: err.message, variant: "destructive" });
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    toast({ title: "Signature Cached", description: "Transaction signature copied to clipstream." });
  };

  // Lifecycle & Filtering
  useEffect(() => { loadWalletData(); }, [loadWalletData]);

  useEffect(() => {
    let filtered = transactions.filter(tx =>
      tx.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterType !== "all") {
      filtered = filtered.filter(tx => filterType === "high" ? tx.points >= 12 : tx.points < 12);
    }
    setFilteredTransactions(filtered);
  }, [searchQuery, filterType, transactions]);

  // Connection Watcher - LOCAL ONLY. Do NOT auto-sync to backend.
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        const newAddress = accounts.length > 0 ? accounts[0] : null;
        if (newAddress !== walletAddress) {
          setWalletAddress(newAddress);
          // Notice: We purposefully do NOT call cvApi.updateWalletAddress here.
          // This prevents accidental account hijacking when multiple users use the same machine.
          if (newAddress && newAddress !== linkedAddress) {
            toast({
              title: "Active Account Mismatch",
              description: "The active MetaMask wallet differs from your linked identity. Sync required.",
            });
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [walletAddress, linkedAddress]);

  return (
    <DashboardLayout>
      <div className="page-section">
        {/* Ledger Header */}
        <div className="section-header">
          <div className="space-y-4">
            <div className="page-title-group">
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
            {useAuthStore(state => state.isAdmin()) && (
              <Button aria-label="Open transfer assets modal" onClick={() => setIsTransferModalOpen(true)} className="h-10 px-8 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-200 group">
                <Send className="w-3.5 h-3.5 mr-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /> Dispatch Assets
              </Button>
            )}
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
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Blockchain Credit Balance</div>
                  <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
                    <div className="text-6xl font-black tracking-tighter">
                      {isLoading ? "---" : totalPoints.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-2xl text-white/40">SCC</span>
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

              <div className="auto-scroll-row pt-8 border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Internal Reserves</div>
                  <div className="text-xl font-bold text-white leading-none">{internalCredits.toLocaleString(undefined, { maximumFractionDigits: 2 })} Cr</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Estimated Value</div>
                  <div className="text-xl font-bold text-success leading-none">₹{totalPoints.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">7D Velocity</div>
                  <div className={cn("text-xl font-bold leading-none", weeklyGain >= 0 ? "text-white" : "text-destructive")}>
                    {weeklyGain >= 0 ? "+" : ""}{weeklyGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ledger Sync</div>
                  <div className={cn("text-xl font-bold leading-none", networkStatus ? "text-success" : "text-amber-400")}>
                    {networkStatus === null ? "..." : (networkStatus ? "CONNECTED" : "SIMULATED")}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Blockchain Connect Card */}
          <Card className="p-8 rounded-[40px] border border-slate-200 bg-white shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Chain Proof</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {walletAddress ? "Wallet Connected" : "Connect for Proof"}
                </p>
              </div>


              <div className="flex justify-center py-2">
                {!walletAddress ? (
                  <Button
                    onClick={() => connectWallet(true)}
                    disabled={isConnecting}
                    className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WalletIcon className="w-4 h-4 mr-2" />}
                    {isConnecting ? "Connecting..." : "Link Wallet"}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3 w-full">
                    {/* Connection Status Badge */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full w-fit",
                      walletAddress === linkedAddress
                        ? "bg-success/10 text-success border border-success/20"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    )}>
                      <Fingerprint className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        {walletAddress === linkedAddress ? "Identity Verified" : "Identity Mismatch"}
                      </span>
                    </div>

                    <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", walletAddress === linkedAddress ? "bg-success animate-pulse" : "bg-amber-400")} />
                        <span className="text-[10px] font-mono font-bold text-slate-600 truncate">{walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {walletAddress !== linkedAddress && (
                          <Button
                            onClick={() => connectWallet(true)}
                            size="sm"
                            className="h-7 px-3 bg-slate-900 border-none text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800"
                          >
                            Sync Identity
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!useAuthStore.getState().useMockData) {
                              try {
                                await cvApi.updateWalletAddress('');
                                setLinkedAddress(null);
                                toast({ title: "Wallet Association Purged", description: "Node authority has cleared your ledger link." });
                              } catch (e) {
                                console.error(e);
                                toast({ title: "Sync Interrupted", description: "Backend failed to clear association. Retry recommended.", variant: "destructive" });
                                return;
                              }
                            }
                            setWalletAddress(null);
                            setLinkedAddress(null);
                          }}
                          disabled={isConnecting}
                          className="h-7 px-2 text-[8px] font-black uppercase text-destructive/60 hover:text-destructive hover:bg-destructive/5 flex items-center gap-1 transition-all shrink-0"
                          title="Unlink your wallet"
                        >
                          {isConnecting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Link2Off className="w-2.5 h-2.5" />} Unlink
                        </Button>
                      </div>
                    </div>

                    {walletAddress !== linkedAddress && (
                      <p className="text-[9px] font-bold text-amber-600 px-1 leading-tight">
                        Active MetaMask account does not match your linked ID. Transactions will be rejected by the node.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {walletAddress && (
                <Button
                  onClick={handleBridgeCredits}
                  disabled={isTxPending}
                  className="w-full h-12 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                >
                  {isTxPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                  Bridge Credits
                </Button>
              )}
            </div>

            {walletAddress && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Authenticated Ledger Node</div>
                <div className="text-[10px] font-mono text-slate-300 truncate px-2">{walletAddress}</div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group cursor-default hover:bg-white hover:border-primary/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 bg-primary/5">
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tighter text-primary transition-colors duration-300">{totalActions.toLocaleString()}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">Signals Verified</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:scale-110 group-hover:shadow-sm transition-all duration-300">
              < Award className="w-5 h-5" />
            </div>
          </Card>

          <Card className={cn("p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group cursor-default hover:bg-white hover:border-primary/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300", dailyGain >= 0 ? "bg-success/5" : "bg-destructive/5")}>
            <div className="space-y-1">
              <div className={cn("text-3xl font-black tracking-tighter transition-colors duration-300", dailyGain >= 0 ? "text-success" : "text-destructive")}>
                {dailyGain >= 0 ? "+" : ""}{dailyGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">Daily Yield</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:scale-110 group-hover:shadow-sm transition-all duration-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-6 rounded-[32px] border border-slate-100 flex items-center justify-between group cursor-default hover:bg-white hover:border-primary/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 bg-slate-50">
            <div className="space-y-1 overflow-hidden">
              <div className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors duration-300 truncate pr-2 uppercase" title={nodeId}>
                {nodeId.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", nodeStatusLabel === "Synced" ? "bg-success" : "bg-amber-400")} />
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">Auth Node: {nodeStatusLabel}</div>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:scale-110 group-hover:shadow-sm transition-all duration-300 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
          </Card>
        </div>

        {/* Transaction Ledger Table */}
        <div className="space-y-6">
          <div className="section-header border-none pb-0 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <ArrowRightLeft className="w-5 h-5 text-slate-400" />
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Verification History</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                <input
                  id="lookup-hash"
                  placeholder="Lookup Signal ID..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full md:w-64 rounded-2xl bg-slate-50 border-none font-bold text-xs pl-10 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger aria-label="Filter transactions" className="h-11 w-32 rounded-2xl border-none bg-slate-50 font-black text-[10px] uppercase hover:bg-slate-100 transition-colors">
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
              <Card key={tx.id} onClick={() => { setSelectedTx(tx); setIsTxModalOpen(true); }} className="p-6 rounded-[32px] border-slate-100 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 group relative overflow-hidden cursor-pointer">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-100 group-hover:bg-primary transition-all duration-300" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
                  <div className="flex items-start gap-5 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-100 group-hover:scale-105 transition-all duration-300">
                      <Zap className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors duration-300">{tx.action.toUpperCase()}</span>
                        <Badge className="bg-slate-50 hover:bg-slate-100 text-slate-500 border-none text-[8px] font-bold tracking-widest uppercase h-4 px-2 hover:bg-opacity-20 transition-all">{tx.location}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter group-hover:text-slate-500 transition-colors">
                        <span className="flex items-center gap-1.5"><History className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" /> {new Date(tx.timestamp).toLocaleString()}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopyHash(tx.hash); }} aria-label={`Copy hash ${tx.hash}`} className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group/copy">
                          <Fingerprint className="w-3 h-3 text-slate-300 group-hover/copy:text-primary transition-colors" /> {tx.hash.slice(0, 12)}...
                          {copiedHash === tx.hash ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 opacity-40 group-hover/copy:opacity-100" />}
                        </button>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-primary transition-colors hover:underline decoration-primary/20 underline-offset-4"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                          <span>View Block</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 self-end md:self-center">
                    <div className="text-right">
                      <div className={cn(
                        "text-2xl font-black tracking-tighter leading-tight transition-transform duration-300 group-hover:scale-105",
                        tx.points >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {tx.points >= 0 ? "+" : ""}{tx.points.toLocaleString(undefined, { maximumFractionDigits: 2 })} Credits
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Signal Reward</div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-11 h-11 rounded-2xl border border-slate-100 hover:bg-slate-50 active:scale-95 transition-all">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-all group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      < Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen} >
        <DialogContent className="fixed left-[50%] top-[50%] z-[200] w-[95vw] max-w-[42rem] translate-x-[-50%] translate-y-[-50%] bg-white rounded-[40px] shadow-3xl overflow-hidden focus:outline-none">
          <div className="h-3 w-full bg-slate-900" />
          <div className="p-8 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar">
            <DialogHeader className="mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Dispatch Assets</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-Node Asset Sync Protocol</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-8 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Disbursement Amount (Credits)</Label>
                <div className="relative group">
                  <Coins className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="number"
                    min="0"
                    max={Math.max(totalPoints, internalCredits)}
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
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Available: {Math.max(totalPoints, internalCredits).toLocaleString()} Credits</span>
                  {parseFloat(transferAmount) > Math.max(totalPoints, internalCredits) && <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">Insufficient Balance</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Destination ID / Node Entity</Label>
                <Input placeholder="0x... or Station_REF" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} className="h-16 px-8 bg-slate-50 border-none rounded-3xl font-bold text-sm" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-slate-100">
                <Button variant="ghost" className="h-16 rounded-[28px] border-2 border-slate-100 font-black text-xs uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all flex-1" onClick={() => setIsTransferModalOpen(false)}>Abort</Button>
                <Button onClick={handleTransfer} className="h-16 rounded-[28px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 flex-1">
                  Execute Final Sync →
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Transaction Detail Modal */}
      < Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen} >
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
                    { label: "Entry ID", value: `${selectedTx.id}` }
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
      </Dialog >
    </DashboardLayout >
  );
};

export default Wallet;
