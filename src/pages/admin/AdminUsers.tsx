import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Search, Eye, Snowflake, Bell, X } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  kyc_status: string | null;
  created_at: string | null;
}

interface UserWallet {
  balance: number | null;
  is_frozen: boolean | null;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<(UserProfile & { wallet?: UserWallet; txCount: number })[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (roleFilter !== "All") query = query.eq("role", roleFilter.toLowerCase());
    if (kycFilter !== "All") query = query.eq("kyc_status", kycFilter.toLowerCase());

    const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    const profiles = (data || []) as UserProfile[];

    // Fetch wallets and tx counts
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const { data: w } = await supabase.from("wallets").select("balance, is_frozen").eq("user_id", p.id).single();
        const { data: txns } = await supabase.from("transactions").select("id").eq("wallet_id", w?.id || "");
        return { ...p, wallet: w as UserWallet | undefined, txCount: txns?.length || 0 };
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

  const formatAmount = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

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
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
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
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-pill ${
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
                        <button onClick={() => setSelectedUser(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="View">
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

        {/* User Detail Drawer */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
            <div className="relative w-[400px] max-w-full bg-secondary border-l border-border p-6 overflow-y-auto animate-slide-in-right">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">User Details</h2>
                <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground mb-3">
                  {selectedUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <p className="font-semibold">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                <span className={`mt-2 text-[10px] font-medium px-2 py-0.5 rounded-pill ${
                  selectedUser.kyc_status === "verified" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                }`}>
                  {selectedUser.kyc_status}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Role", value: selectedUser.role },
                  { label: "Balance", value: selectedUser.wallet ? formatAmount(selectedUser.wallet.balance || 0) : "—" },
                  { label: "Transactions", value: selectedUser.txCount },
                  { label: "Wallet Status", value: selectedUser.wallet?.is_frozen ? "Frozen" : "Active" },
                  { label: "Joined", value: selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("en-IN") : "—" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium capitalize">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => { toggleFreeze(selectedUser.id, selectedUser.wallet?.is_frozen || false); setSelectedUser(null); }}
                  className="w-full h-10 rounded-pill border border-border-active text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  {selectedUser.wallet?.is_frozen ? "Unfreeze Wallet" : "Freeze Wallet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
