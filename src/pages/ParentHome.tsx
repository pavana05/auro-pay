import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, RefreshCw, Plus, ChevronRight, ShieldCheck, Users, Receipt } from "lucide-react";
import ParentBottomNav from "@/components/ParentBottomNav";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import { EmptyState } from "@/components/feedback";
import { SkeletonRow, SkeletonBalanceCard } from "@/components/zen/SkeletonRow";

interface LinkedTeen {
  teen_id: string;
  teen_name: string;
  teen_initials: string;
  balance: number;
  last_tx: string | null;
  wallet_id: string;
}

const ParentHome = () => {
  const [teens, setTeens] = useState<LinkedTeen[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(prof);

    // Get linked teens
    const { data: links } = await supabase
      .from("parent_teen_links")
      .select("teen_id")
      .eq("parent_id", user.id)
      .eq("is_active", true);

    if (links && links.length > 0) {
      const teenIds = links.map(l => l.teen_id);
      const { data: teenProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teenIds);

      const { data: teenWallets } = await supabase
        .from("wallets")
        .select("*")
        .in("user_id", teenIds);

      const linkedTeens: LinkedTeen[] = (teenProfiles || []).map(tp => {
        const wallet = teenWallets?.find(w => w.user_id === tp.id);
        const initials = tp.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
        return {
          teen_id: tp.id,
          teen_name: tp.full_name || "Teen",
          teen_initials: initials,
          balance: wallet?.balance || 0,
          last_tx: null,
          wallet_id: wallet?.id || "",
        };
      });
      setTeens(linkedTeens);

      // Fetch all teen transactions
      const walletIds = teenWallets?.map(w => w.id) || [];
      if (walletIds.length > 0) {
        const { data: txns } = await supabase
          .from("transactions")
          .select("*")
          .in("wallet_id", walletIds)
          .order("created_at", { ascending: false })
          .limit(20);
        setAllTransactions(txns || []);
      }
    }

    // Pending parent approvals count
    const { count: apprCount } = await supabase
      .from("pending_payment_approvals")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
    setPendingApprovals(apprCount || 0);
    } catch (err: any) {
      toast.fail("Couldn't load dashboard", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime subscription for teen wallets + pending approvals
  useEffect(() => {
    const channel = supabase
      .channel(`parent-home-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pending_payment_approvals" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const totalBalance = teens.reduce((sum, t) => sum + t.balance, 0);
  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24" role="status" aria-busy="true" aria-label="Loading parent dashboard">
        <div className="flex items-center gap-3 mb-6">
          <SkeletonRow className="w-10 h-10" rounded="rounded-full" height={40} />
          <SkeletonRow className="w-32" height={14} />
        </div>
        <SkeletonBalanceCard />
        <div className="flex gap-3 overflow-x-auto mt-6 mb-6 px-1">
          {[1, 2].map(i => <SkeletonRow key={i} className="w-48 shrink-0" height={130} rounded="rounded-2xl" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <SkeletonRow key={i} height={64} />)}
        </div>
        <ParentBottomNav />
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
            <p className="text-xs text-muted-foreground">Parent Dashboard</p>
            <p className="text-base font-semibold">{profile?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/notifications")} aria-label="Open notifications" className="w-10 h-10 rounded-full bg-input flex items-center justify-center hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={fetchData} aria-label="Refresh dashboard" className="w-10 h-10 rounded-full bg-input flex items-center justify-center hover:bg-muted transition-colors">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Pending Approvals Banner */}
      {pendingApprovals > 0 && (
        <button
          onClick={() => navigate("/parent/approvals")}
          className="w-full mb-4 p-4 rounded-lg border border-primary/40 bg-primary/10 flex items-center gap-3 transition-all hover:bg-primary/15 active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">
              {pendingApprovals} pending approval{pendingApprovals !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">Tap to review payment requests</p>
          </div>
          <span className="min-w-[24px] h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            {pendingApprovals}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Family Wallet Overview */}
      <div className="gradient-card rounded-lg p-6 mb-6 card-glow border border-border">
        <span className="text-xs font-medium tracking-wider text-muted-foreground">FAMILY WALLET</span>
        <p className="text-[36px] font-bold tracking-[-2px] mt-1 mb-2">{formatAmount(totalBalance)}</p>
        <p className="text-xs text-muted-foreground">{teens.length} linked teen{teens.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Linked Teens Carousel */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Your Teens</h3>
          <button
            onClick={() => navigate("/linked-teens")}
            className="text-[12px] font-bold text-primary inline-flex items-center gap-1"
          >
            Manage →
          </button>
        </div>

        {teens.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-primary/70" />}
            title="No teens linked yet"
            description="Link your teen to start managing their wallet, limits, and approvals."
            action={
              <button
                onClick={() => navigate("/linked-teens")}
                className="h-10 px-4 rounded-full text-[12px] font-bold inline-flex items-center gap-2 gradient-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4" /> Link a teen
              </button>
            }
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {teens.map(teen => (
              <button
                key={teen.teen_id}
                onClick={() => navigate(`/parent/teen/${teen.teen_id}`)}
                className="min-w-[200px] p-4 rounded-lg bg-card border border-border card-glow shrink-0 text-left snap-start transition-all hover:border-primary/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                    {teen.teen_initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{teen.teen_name}</p>
                    <p className="text-[10px] text-muted-foreground">Teen</p>
                  </div>
                </div>
                <p className="text-lg font-bold">{formatAmount(teen.balance)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">View details</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Pocket Money Button */}
      {teens.length > 0 && (
        <button
          onClick={() => navigate("/parent/add-money")}
          className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 mb-6 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Pocket Money
        </button>
      )}

      {/* Recent Activity (All Teens) */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3">Recent Activity</h3>
        {allTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTransactions.slice(0, 10).map(tx => {
              const teen = teens.find(t => t.wallet_id === tx.wallet_id);
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border card-glow">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                    {tx.type === "credit" ? "💰" : "💸"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.merchant_name || tx.description || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">{teen?.teen_name || "Teen"} · {tx.category || "other"}</p>
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
              );
            })}
          </div>
        )}
      </div>

      <ParentBottomNav />
    </div>
  );
};

export default ParentHome;
