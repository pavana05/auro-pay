import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Search, Eye, Snowflake, ArrowLeft, Calendar, Phone, Shield, Wallet, ArrowLeftRight, Clock, User, X, Mail, Award, Link2, Trash2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  kyc_status: string | null;
  created_at: string | null;
  avatar_url: string | null;
  aadhaar_verified: boolean | null;
}

interface UserWallet {
  id: string;
  balance: number | null;
  is_frozen: boolean | null;
  daily_limit: number | null;
  monthly_limit: number | null;
  spent_today: number | null;
  spent_this_month: number | null;
  created_at: string | null;
}

interface KycInfo {
  id: string;
  status: string | null;
  aadhaar_name: string | null;
  aadhaar_number: string | null;
  date_of_birth: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  digio_request_id: string | null;
}

interface TransactionInfo {
  id: string;
  type: string;
  amount: number;
  merchant_name: string | null;
  status: string | null;
  created_at: string | null;
  category: string | null;
}

interface DetailedUser extends UserProfile {
  wallet?: UserWallet;
  txCount: number;
  kyc?: KycInfo;
  recentTxns: TransactionInfo[];
  appRoles: string[];
  savingsGoals: number;
  parentLinks: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<(UserProfile & { wallet?: { balance: number | null; is_frozen: boolean | null }; txCount: number })[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<DetailedUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "kyc" | "wallet" | "transactions">("info");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  
  // Delete user state - 2-step verification
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (roleFilter !== "All") query = query.eq("role", roleFilter.toLowerCase());
    if (kycFilter !== "All") query = query.eq("kyc_status", kycFilter.toLowerCase());

    const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    const profiles = (data || []) as UserProfile[];

    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const { data: w } = await supabase.from("wallets").select("id, balance, is_frozen").eq("user_id", p.id).single();
        const walletId = (w as any)?.id;
        const { data: txns } = await supabase.from("transactions").select("id").eq("wallet_id", walletId || "");
        return { ...p, wallet: w as { balance: number | null; is_frozen: boolean | null } | undefined, txCount: txns?.length || 0 };
      })
    );

    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, kycFilter, page]);

  const filtered = users.filter(
    (u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
  );

  const logAuditAction = async (action: string, targetType: string, targetId: string, details: Record<string, any> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      admin_user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  };

  const toggleFreeze = async (userId: string, currentFrozen: boolean) => {
    const { data: w } = await supabase.from("wallets").select("id").eq("user_id", userId).single();
    if (w) {
      await supabase.from("wallets").update({ is_frozen: !currentFrozen }).eq("id", w.id);
      await logAuditAction(currentFrozen ? "wallet_unfreeze" : "wallet_freeze", "wallet", w.id, { user_id: userId });
      toast.success(currentFrozen ? "Wallet unfrozen" : "Wallet frozen");
      fetchUsers();
    }
  };

  const startDelete = (userId: string, userName: string) => {
    setDeleteTarget({ id: userId, name: userName });
    setDeleteStep(1);
    setDeleteConfirmText("");
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteConfirmText("");
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: deleteTarget.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await logAuditAction("user_delete", "user", deleteTarget.id, { name: deleteTarget.name });
      toast.success(`User "${deleteTarget.name}" deleted successfully`);
      cancelDelete();
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user");
    }
    setDeleteLoading(false);
  };

  const openUserDetail = async (user: UserProfile & { wallet?: { balance: number | null; is_frozen: boolean | null }; txCount: number }) => {
    setSelectedUser(null);
    setDetailLoading(true);
    setDetailTab("info");

    const { data: walletData } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
    const { data: kycData } = await supabase.from("kyc_requests").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).single();
    const walletId = (walletData as any)?.id;
    const { data: txnData } = walletId
      ? await supabase.from("transactions").select("*").eq("wallet_id", walletId).order("created_at", { ascending: false }).limit(20)
      : { data: [] };
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const { data: savingsData } = await supabase.from("savings_goals").select("id").eq("teen_id", user.id);
    const { data: linksData } = await supabase.from("parent_teen_links").select("id").or(`parent_id.eq.${user.id},teen_id.eq.${user.id}`);

    const detailedUser: DetailedUser = {
      ...user,
      wallet: walletData as UserWallet | undefined,
      txCount: user.txCount,
      kyc: kycData as KycInfo | undefined,
      recentTxns: (txnData || []) as TransactionInfo[],
      appRoles: (rolesData || []).map((r: any) => r.role),
      savingsGoals: savingsData?.length || 0,
      parentLinks: linksData?.length || 0,
    };

    setSelectedUser(detailedUser);
    setDetailLoading(false);
  };

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;
  const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const maskAadhaar = (num: string | null) => num ? `XXXX XXXX ${num.slice(-4)}` : "—";

  const exportUsersCSV = () => {
    const headers = "Name,Phone,Role,KYC Status,Balance,Transactions,Joined\n";
    const rows = filtered.map((u) =>
      `"${u.full_name || ""}",${u.phone || ""},${u.role || ""},${u.kyc_status || ""},${u.wallet ? (u.wallet.balance || 0) / 100 : 0},${u.txCount},${u.created_at || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUserTransactionsCSV = async (user: DetailedUser) => {
    const headers = "ID,Type,Amount,Merchant,Category,Status,Date\n";
    const rows = user.recentTxns.map((t) =>
      `${t.id},${t.type},${t.amount / 100},${t.merchant_name || ""},${t.category || ""},${t.status},${t.created_at || ""}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${user.full_name?.replace(/\s/g, "_") || user.id}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full-screen detail view
  if (selectedUser || detailLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen">
          {detailLoading ? (
            <div className="p-8 space-y-4">
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded-xl animate-pulse" />
              {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : selectedUser && (
            <div className="animate-fade-in-up">
              {/* Top bar */}
              <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Users
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startDelete(selectedUser.id, selectedUser.full_name || "Unknown")}
                      className="text-xs px-3 py-1.5 rounded-pill font-medium border border-destructive text-destructive hover:bg-destructive/5 transition-colors mr-2"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" /> Delete User
                    </button>
                    {selectedUser.recentTxns.length > 0 && (
                      <button
                        onClick={() => exportUserTransactionsCSV(selectedUser)}
                        className="text-xs px-3 py-1.5 rounded-pill font-medium border border-primary/30 text-primary hover:bg-primary/5 transition-colors mr-2"
                      >
                        <Download className="w-3 h-3 inline mr-1" /> Export Txns
                      </button>
                    )}
                    <button
                      onClick={() => { toggleFreeze(selectedUser.id, selectedUser.wallet?.is_frozen || false); setSelectedUser(null); }}
                      className={`text-xs px-3 py-1.5 rounded-pill font-medium transition-colors ${
                        selectedUser.wallet?.is_frozen ? "border border-success text-success hover:bg-success/5" : "border border-destructive text-destructive hover:bg-destructive/5"
                      }`}
                    >
                      {selectedUser.wallet?.is_frozen ? "Unfreeze" : "Freeze"} Wallet
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile hero */}
              <div className="px-6 py-8 relative">
                <div className="absolute inset-0 opacity-[0.03]" style={{ background: "radial-gradient(ellipse at top, hsl(42 78% 55%), transparent 70%)" }} />
                <div className="relative flex items-start gap-5">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shimmer-border">
                      {selectedUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1">{selectedUser.full_name || "Unknown User"}</h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                      <Phone className="w-3.5 h-3.5" /> {selectedUser.phone || "No phone"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                        selectedUser.kyc_status === "verified" ? "bg-success/20 text-success" :
                        selectedUser.kyc_status === "rejected" ? "bg-destructive/20 text-destructive" :
                        "bg-warning/20 text-warning"
                      }`}>KYC: {selectedUser.kyc_status}</span>
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground capitalize">{selectedUser.role}</span>
                      {selectedUser.appRoles.map(r => (
                        <span key={r} className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                          r === "admin" ? "badge-premium" : r === "moderator" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                        }`}>{r}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-3 mt-6">
                  {[
                    { label: "Balance", value: formatAmount(selectedUser.wallet?.balance || 0), icon: Wallet },
                    { label: "Transactions", value: `${selectedUser.txCount}`, icon: ArrowLeftRight },
                    { label: "Savings Goals", value: `${selectedUser.savingsGoals}`, icon: Award },
                    { label: "Links", value: `${selectedUser.parentLinks}`, icon: Link2 },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-xl bg-card border border-border card-glow text-center">
                      <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-sm font-bold">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6">
                <div className="flex gap-1 p-1 bg-muted/20 rounded-xl mb-6">
                  {([
                    { key: "info", label: "Account Info", icon: User },
                    { key: "kyc", label: "KYC Details", icon: Shield },
                    { key: "wallet", label: "Wallet", icon: Wallet },
                    { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        detailTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Info Tab */}
                {detailTab === "info" && (
                  <div className="space-y-0 rounded-xl bg-card border border-border card-glow overflow-hidden animate-scale-in">
                    {[
                      { label: "User ID", value: selectedUser.id },
                      { label: "Full Name", value: selectedUser.full_name || "—" },
                      { label: "Phone", value: selectedUser.phone || "—" },
                      { label: "Profile Role", value: selectedUser.role || "—" },
                      { label: "System Roles", value: selectedUser.appRoles.length > 0 ? selectedUser.appRoles.join(", ") : "None" },
                      { label: "KYC Status", value: selectedUser.kyc_status || "—" },
                      { label: "Aadhaar Verified", value: selectedUser.aadhaar_verified ? "Yes ✓" : "No" },
                      { label: "Avatar", value: selectedUser.avatar_url ? "Set" : "Not set" },
                      { label: "Savings Goals", value: `${selectedUser.savingsGoals}` },
                      { label: "Parent/Teen Links", value: `${selectedUser.parentLinks}` },
                      { label: "Total Transactions", value: `${selectedUser.txCount}` },
                      { label: "Account Created", value: formatDateTime(selectedUser.created_at) },
                    ].map((item, idx) => (
                      <div key={item.label} className={`flex justify-between items-center px-5 py-3.5 ${idx < 11 ? "border-b border-border/30" : ""}`}>
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-medium text-right max-w-[50%] break-all">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* KYC Tab */}
                {detailTab === "kyc" && (
                  <div className="animate-scale-in">
                    {selectedUser.kyc ? (
                      <div className="space-y-4">
                        <div className="rounded-xl bg-card border border-border card-glow overflow-hidden">
                          {[
                            { label: "KYC ID", value: selectedUser.kyc.id },
                            { label: "Status", value: selectedUser.kyc.status || "—" },
                            { label: "Aadhaar Name", value: selectedUser.kyc.aadhaar_name || "—" },
                            { label: "Aadhaar Number", value: maskAadhaar(selectedUser.kyc.aadhaar_number) },
                            { label: "Date of Birth", value: selectedUser.kyc.date_of_birth || "—" },
                            { label: "Digio Request ID", value: selectedUser.kyc.digio_request_id || "—" },
                            { label: "Submitted At", value: formatDateTime(selectedUser.kyc.submitted_at) },
                            { label: "Verified At", value: formatDateTime(selectedUser.kyc.verified_at) },
                          ].map((item, idx) => (
                            <div key={item.label} className={`flex justify-between items-center px-5 py-3.5 ${idx < 7 ? "border-b border-border/30" : ""}`}>
                              <span className="text-xs text-muted-foreground">{item.label}</span>
                              <span className="text-xs font-medium text-right max-w-[50%] break-all">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        {/* Timeline */}
                        <div className="rounded-xl bg-card border border-border card-glow p-5">
                          <h5 className="text-xs font-medium text-muted-foreground tracking-wider mb-4">VERIFICATION TIMELINE</h5>
                          <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                            {[
                              { event: "KYC Submitted", date: selectedUser.kyc.submitted_at, color: "bg-primary" },
                              ...(selectedUser.kyc.verified_at ? [{ event: "KYC Verified", date: selectedUser.kyc.verified_at, color: "bg-success" }] : []),
                              ...(selectedUser.kyc.status === "rejected" ? [{ event: "KYC Rejected", date: selectedUser.kyc.submitted_at, color: "bg-destructive" }] : []),
                            ].map((item, i) => (
                              <div key={i} className="flex items-start gap-3 pl-0">
                                <div className={`w-3.5 h-3.5 rounded-full ${item.color} mt-0.5 relative z-10 ring-2 ring-card`} />
                                <div>
                                  <p className="text-xs font-medium">{item.event}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatDateTime(item.date)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-xl bg-card border border-border card-glow">
                        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No KYC request submitted</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Wallet Tab */}
                {detailTab === "wallet" && (
                  <div className="animate-scale-in">
                    {selectedUser.wallet ? (
                      <div className="space-y-4">
                        <div className="p-6 rounded-xl bg-card border border-border card-premium shimmer-border">
                          <p className="text-[10px] text-muted-foreground tracking-wider mb-1">CURRENT BALANCE</p>
                          <p className="text-3xl font-bold mb-2">{formatAmount(selectedUser.wallet.balance || 0)}</p>
                          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                            selectedUser.wallet.is_frozen ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"
                          }`}>
                            {selectedUser.wallet.is_frozen ? "🔒 Frozen" : "● Active"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-card border border-border card-glow overflow-hidden">
                          {[
                            { label: "Wallet ID", value: selectedUser.wallet.id },
                            { label: "Daily Limit", value: formatAmount(selectedUser.wallet.daily_limit || 0) },
                            { label: "Monthly Limit", value: formatAmount(selectedUser.wallet.monthly_limit || 0) },
                            { label: "Spent Today", value: formatAmount(selectedUser.wallet.spent_today || 0) },
                            { label: "Spent This Month", value: formatAmount(selectedUser.wallet.spent_this_month || 0) },
                            { label: "Wallet Created", value: formatDateTime(selectedUser.wallet.created_at) },
                          ].map((item, idx) => (
                            <div key={item.label} className={`flex justify-between items-center px-5 py-3.5 ${idx < 5 ? "border-b border-border/30" : ""}`}>
                              <span className="text-xs text-muted-foreground">{item.label}</span>
                              <span className="text-xs font-medium">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-xl bg-card border border-border card-glow">
                        <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No wallet created</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Transactions Tab */}
                {detailTab === "transactions" && (
                  <div className="animate-scale-in">
                    <p className="text-xs text-muted-foreground mb-3">Showing {selectedUser.recentTxns.length} recent transactions</p>
                    {selectedUser.recentTxns.length === 0 ? (
                      <div className="text-center py-16 rounded-xl bg-card border border-border card-glow">
                        <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No transactions found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedUser.recentTxns.map((tx) => (
                          <div key={tx.id} className="p-4 rounded-xl bg-card border border-border card-glow hover:border-primary/10 transition-all">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${tx.type === "credit" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                                  {tx.type}
                                </span>
                                <span className="text-xs text-muted-foreground">{tx.merchant_name || tx.category || "—"}</span>
                              </div>
                              <span className="text-sm font-bold">{formatAmount(tx.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                tx.status === "success" ? "bg-success/20 text-success" :
                                tx.status === "failed" ? "bg-destructive/20 text-destructive" :
                                "bg-warning/20 text-warning"
                              }`}>{tx.status}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom spacer */}
              <div className="h-8" />
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-semibold">Users</h1>
          <button onClick={exportUsersCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.06] transition-all duration-200 active:scale-95">
            <Download className="w-4 h-4" /> Export Users CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." className="input-auro w-full pl-10" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-auro w-auto px-3">
            <option>All</option><option>Teen</option><option>Parent</option><option>Admin</option>
          </select>
          <select value={kycFilter} onChange={(e) => setKycFilter(e.target.value)} className="input-auro w-auto px-3">
            <option>All</option><option>Verified</option><option>Pending</option><option>Rejected</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-card border border-border card-glow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Phone", "Role", "KYC", "Balance", "Txns", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="py-3 px-4"><div className="h-5 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No users found</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => openUserDetail(u)}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                            {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        <span className="font-medium">{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.phone || "—"}</td>
                    <td className="py-3 px-4 capitalize">{u.role || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        u.kyc_status === "verified" ? "bg-success/20 text-success" :
                        u.kyc_status === "rejected" ? "bg-destructive/20 text-destructive" :
                        "bg-warning/20 text-warning"
                      }`}>{u.kyc_status}</span>
                    </td>
                    <td className="py-3 px-4">{u.wallet ? formatAmount(u.wallet.balance || 0) : "—"}</td>
                    <td className="py-3 px-4">{u.txCount}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openUserDetail(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="View Details">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => toggleFreeze(u.id, u.wallet?.is_frozen || false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Freeze/Unfreeze">
                          <Snowflake className={`w-3.5 h-3.5 ${u.wallet?.is_frozen ? "text-primary" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="text-sm text-primary disabled:text-muted-foreground">Previous</button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={filtered.length < pageSize} className="text-sm text-primary disabled:text-muted-foreground">Next</button>
        </div>

        {/* 2-Step Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md mx-4 bg-card rounded-2xl border border-border p-6 animate-scale-in shadow-2xl">
              {deleteStep === 1 ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Delete User</h3>
                      <p className="text-xs text-muted-foreground">Step 1 of 2 — Confirm intent</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You are about to permanently delete <span className="font-semibold text-foreground">{deleteTarget.name}</span>. 
                    This will remove all their data including wallet, transactions, KYC, and settings.
                  </p>
                  <p className="text-xs text-destructive font-medium mb-6">⚠️ This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button onClick={cancelDelete} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/10 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => setDeleteStep(2)} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                      Continue to Step 2
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Final Verification</h3>
                      <p className="text-xs text-muted-foreground">Step 2 of 2 — Type to confirm</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm permanent deletion of <span className="font-semibold text-foreground">{deleteTarget.name}</span>.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full h-11 rounded-xl bg-background border border-border px-4 text-sm font-mono focus:outline-none focus:border-destructive/50 mb-4"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setDeleteStep(1)} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/10 transition-colors">
                      Back
                    </button>
                    <button
                      onClick={executeDelete}
                      disabled={deleteConfirmText !== "DELETE" || deleteLoading}
                      className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      {deleteLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                          Deleting...
                        </span>
                      ) : "Permanently Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
