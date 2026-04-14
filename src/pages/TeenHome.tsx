import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, RefreshCw, QrCode, Plus, Clock, Eye, EyeOff } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

interface Wallet {
  id: string;
  balance: number;
  daily_limit: number;
  spent_today: number;
  is_frozen: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  category: string | null;
  status: string;
  created_at: string;
}

const categoryIcons: Record<string, string> = {
  food: "🍔",
  transport: "🚗",
  education: "📚",
  shopping: "🛍️",
  entertainment: "🎮",
  other: "💸",
};

const TeenHome = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, walletRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
      supabase.from("wallets").select("*").eq("user_id", user.id).single(),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (walletRes.data) {
      setWallet(walletRes.data as Wallet);
      // Fetch transactions
      const { data: txns } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", walletRes.data.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (txns) setTransactions(txns as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time subscription for wallet changes
  useEffect(() => {
    if (!wallet?.id) return;
    const channel = supabase
      .channel("wallet-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `id=eq.${wallet.id}` }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallet?.id]);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const firstName = profile?.full_name?.split(" ")[0] || "";

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
        {/* Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="w-20 h-3 bg-muted rounded animate-pulse" />
              <div className="w-28 h-4 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="w-full h-44 rounded-lg bg-muted animate-pulse mb-4" />
        <div className="flex gap-3 mb-6">
          {[1,2,3].map(i => <div key={i} className="flex-1 h-12 rounded-pill bg-muted animate-pulse" />)}
        </div>
        {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-lg bg-muted animate-pulse mb-3" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Welcome back,</p>
            <p className="text-base font-semibold">{profile?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/notifications")} className="w-10 h-10 rounded-full bg-input flex items-center justify-center hover:bg-muted transition-colors relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={fetchData} className="w-10 h-10 rounded-full bg-input flex items-center justify-center hover:bg-muted transition-colors">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="gradient-card rounded-lg p-6 mb-4 card-glow border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium tracking-wider text-muted-foreground">AVAILABLE BALANCE</span>
          <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[42px] font-bold tracking-[-2px] mb-1">
          {showBalance ? formatAmount(wallet?.balance || 0) : "₹••••••"}
        </p>
        <p className="text-xs text-muted-foreground">
          Limit: {formatAmount(wallet?.daily_limit || 0)} today
        </p>
        {wallet?.is_frozen && (
          <div className="mt-3 px-3 py-1.5 bg-destructive/20 rounded-pill inline-flex items-center gap-1.5">
            <span className="text-xs font-medium text-destructive">🔒 Wallet Frozen</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => navigate("/scan")} className="flex-1 h-12 rounded-pill gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]">
          <QrCode className="w-4 h-4" /> Scan & Pay
        </button>
        <button onClick={() => navigate("/add-money")} className="flex-1 h-12 rounded-pill border border-border-active text-primary text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:bg-primary/5 active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Add Money
        </button>
        <button onClick={() => navigate("/activity")} className="flex-1 h-12 rounded-pill border border-border-active text-primary text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:bg-primary/5 active:scale-[0.98]">
          <Clock className="w-4 h-4" /> History
        </button>
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Recent Activity</h3>
          <button onClick={() => navigate("/activity")} className="text-xs text-primary font-medium">View All</button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your transactions will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-glow">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                  {categoryIcons[tx.category || "other"] || "💸"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchant_name || tx.category || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tx.category}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                    {tx.type === "credit" ? "+" : "-"}{formatAmount(tx.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default TeenHome;
