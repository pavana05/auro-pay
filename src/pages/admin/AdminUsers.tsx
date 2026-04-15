import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Search, Eye, Snowflake, X, Calendar, Phone, Shield, Wallet, ArrowLeftRight, Clock, FileText, CreditCard, User } from "lucide-react";

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

  const toggleFreeze = async (userId: string, currentFrozen: boolean) => {
    const { data: w } = await supabase.from("wallets").select("id").eq("user_id", userId).single();
    if (w) {
      await supabase.from("wallets").update({ is_frozen: !currentFrozen }).eq("id", w.id);
      fetchUsers();
    }
  };

  const openUserDetail = async (user: UserProfile & { wallet?: { balance: number | null; is_frozen: boolean | null }; txCount: number }) => {
    setDetailLoading(true);
    setDetailTab("info");

    // Fetch full wallet details
    const { data: walletData } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();

    // Fetch KYC
    const { data: kycData } = await supabase.from("kyc_requests").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).single();

    // Fetch recent transactions
    const walletId = (walletData as any)?.id;
    const { data: txnData } = walletId
      ? await supabase.from("transactions").select("*").eq("wallet_id", walletId).order("created_at", { ascending: false }).limit(20)
      : { data: [] };

    // Fetch roles
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

    // Fetch savings goals count
    const { data: savingsData } = await supabase.from("savings_goals").select("id").eq("teen_id", user.id);

    // Fetch parent/teen links count
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

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-[22px] font-semibold mb-6">Users</h1>

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
        <div className="rounded-lg bg-card border border-border card-glow overflow-x-auto">
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
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                          {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
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
                      }`}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{u.wallet ? formatAmount(u.wallet.balance || 0) : "—"}</td>
                    <td className="py-3 px-4">{u.txCount}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openUserDetail(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="View Full Details">
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

        {/* Full User Detail Drawer */}
        {(selectedUser || detailLoading) && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
            <div className="relative w-[480px] max-w-full bg-secondary border-l border-border overflow-y-auto animate-slide-in-right">
              {detailLoading ? (
                <div className="p-6 space-y-4">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : selectedUser && (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-secondary/95 backdrop-blur-sm border-b border-border z-10 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">User Details</h2>
                      <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Profile Header */}
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shimmer-border">
                        {selectedUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{selectedUser.full_name || "Unknown"}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {selectedUser.phone || "—"}
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            selectedUser.kyc_status === "verified" ? "bg-success/20 text-success" :
                            selectedUser.kyc_status === "rejected" ? "bg-destructive/20 text-destructive" :
                            "bg-warning/20 text-warning"
                          }`}>
                            KYC: {selectedUser.kyc_status}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                            {selectedUser.role}
                          </span>
                          {selectedUser.appRoles.map(r => (
                            <span key={r} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              r === "admin" ? "badge-premium" : r === "moderator" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                            }`}>{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-muted/20 rounded-lg mb-5">
                      {([
                        { key: "info", label: "Info", icon: User },
                        { key: "kyc", label: "KYC", icon: Shield },
                        { key: "wallet", label: "Wallet", icon: Wallet },
                        { key: "transactions", label: "Txns", icon: ArrowLeftRight },
                      ] as const).map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setDetailTab(tab.key)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                            detailTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <tab.icon className="w-3 h-3" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Info Tab */}
                    {detailTab === "info" && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground tracking-wider mb-3">ACCOUNT INFORMATION</h4>
                        {[
                          { label: "User ID", value: selectedUser.id },
                          { label: "Full Name", value: selectedUser.full_name || "—" },
                          { label: "Phone", value: selectedUser.phone || "—" },
                          { label: "Profile Role", value: selectedUser.role || "—" },
                          { label: "System Roles", value: selectedUser.appRoles.length > 0 ? selectedUser.appRoles.join(", ") : "None" },
                          { label: "KYC Status", value: selectedUser.kyc_status || "—" },
                          { label: "Aadhaar Verified", value: selectedUser.aadhaar_verified ? "Yes ✓" : "No" },
                          { label: "Avatar URL", value: selectedUser.avatar_url || "Not set" },
                          { label: "Savings Goals", value: `${selectedUser.savingsGoals}` },
                          { label: "Parent/Teen Links", value: `${selectedUser.parentLinks}` },
                          { label: "Total Transactions", value: `${selectedUser.txCount}` },
                          { label: "Account Created", value: formatDateTime(selectedUser.created_at) },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-start py-2 border-b border-border/30">
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                            <span className="text-xs font-medium text-right max-w-[200px] break-all">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* KYC Tab */}
                    {detailTab === "kyc" && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground tracking-wider mb-3">KYC VERIFICATION</h4>
                        {selectedUser.kyc ? (
                          <>
                            {[
                              { label: "KYC ID", value: selectedUser.kyc.id },
                              { label: "Status", value: selectedUser.kyc.status || "—" },
                              { label: "Aadhaar Name", value: selectedUser.kyc.aadhaar_name || "—" },
                              { label: "Aadhaar Number", value: maskAadhaar(selectedUser.kyc.aadhaar_number) },
                              { label: "Date of Birth", value: selectedUser.kyc.date_of_birth || "—" },
                              { label: "Digio Request ID", value: selectedUser.kyc.digio_request_id || "—" },
                              { label: "Submitted At", value: formatDateTime(selectedUser.kyc.submitted_at) },
                              { label: "Verified At", value: formatDateTime(selectedUser.kyc.verified_at) },
                            ].map((item) => (
                              <div key={item.label} className="flex justify-between items-start py-2 border-b border-border/30">
                                <span className="text-xs text-muted-foreground">{item.label}</span>
                                <span className="text-xs font-medium text-right max-w-[200px] break-all">{item.value}</span>
                              </div>
                            ))}

                            {/* KYC Timeline */}
                            <div className="mt-4">
                              <h5 className="text-xs font-medium text-muted-foreground tracking-wider mb-3">TIMELINE</h5>
                              <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                                {[
                                  { event: "KYC Submitted", date: selectedUser.kyc.submitted_at, color: "bg-primary" },
                                  ...(selectedUser.kyc.verified_at ? [{ event: "KYC Verified", date: selectedUser.kyc.verified_at, color: "bg-success" }] : []),
                                  ...(selectedUser.kyc.status === "rejected" ? [{ event: "KYC Rejected", date: selectedUser.kyc.submitted_at, color: "bg-destructive" }] : []),
                                ].map((item, i) => (
                                  <div key={i} className="flex items-start gap-3 pl-0">
                                    <div className={`w-3.5 h-3.5 rounded-full ${item.color} mt-0.5 relative z-10 ring-2 ring-secondary`} />
                                    <div>
                                      <p className="text-xs font-medium">{item.event}</p>
                                      <p className="text-[10px] text-muted-foreground">{formatDateTime(item.date)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No KYC request submitted</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Wallet Tab */}
                    {detailTab === "wallet" && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground tracking-wider mb-3">WALLET DETAILS</h4>
                        {selectedUser.wallet ? (
                          <>
                            <div className="p-4 rounded-lg bg-card border border-border card-premium shimmer-border mb-4">
                              <p className="text-[10px] text-muted-foreground mb-1">Current Balance</p>
                              <p className="text-2xl font-bold">{formatAmount(selectedUser.wallet.balance || 0)}</p>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-2 inline-block ${
                                selectedUser.wallet.is_frozen ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"
                              }`}>
                                {selectedUser.wallet.is_frozen ? "Frozen" : "Active"}
                              </span>
                            </div>
                            {[
                              { label: "Wallet ID", value: selectedUser.wallet.id },
                              { label: "Daily Limit", value: formatAmount(selectedUser.wallet.daily_limit || 0) },
                              { label: "Monthly Limit", value: formatAmount(selectedUser.wallet.monthly_limit || 0) },
                              { label: "Spent Today", value: formatAmount(selectedUser.wallet.spent_today || 0) },
                              { label: "Spent This Month", value: formatAmount(selectedUser.wallet.spent_this_month || 0) },
                              { label: "Wallet Created", value: formatDateTime(selectedUser.wallet.created_at) },
                            ].map((item) => (
                              <div key={item.label} className="flex justify-between items-start py-2 border-b border-border/30">
                                <span className="text-xs text-muted-foreground">{item.label}</span>
                                <span className="text-xs font-medium">{item.value}</span>
                              </div>
                            ))}

                            <button
                              onClick={() => { toggleFreeze(selectedUser.id, selectedUser.wallet?.is_frozen || false); setSelectedUser(null); }}
                              className={`w-full h-10 rounded-pill text-sm font-medium mt-4 transition-colors ${
                                selectedUser.wallet.is_frozen
                                  ? "border border-success text-success hover:bg-success/5"
                                  : "border border-destructive text-destructive hover:bg-destructive/5"
                              }`}
                            >
                              {selectedUser.wallet.is_frozen ? "Unfreeze Wallet" : "Freeze Wallet"}
                            </button>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No wallet created</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transactions Tab */}
                    {detailTab === "transactions" && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-muted-foreground tracking-wider mb-3">
                          RECENT TRANSACTIONS ({selectedUser.recentTxns.length})
                        </h4>
                        {selectedUser.recentTxns.length === 0 ? (
                          <div className="text-center py-8">
                            <ArrowLeftRight className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No transactions</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedUser.recentTxns.map((tx) => (
                              <div key={tx.id} className="p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-medium capitalize ${tx.type === "credit" ? "text-success" : "text-destructive"}`}>
                                    {tx.type}
                                  </span>
                                  <span className="text-sm font-bold">{formatAmount(tx.amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">
                                    {tx.merchant_name || tx.category || "—"}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                      tx.status === "success" ? "bg-success/20 text-success" :
                                      tx.status === "failed" ? "bg-destructive/20 text-destructive" :
                                      "bg-warning/20 text-warning"
                                    }`}>{tx.status}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
