import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Shield, ChevronDown, Crown, UserCheck, User, Search, AlertTriangle, X, UserPlus } from "lucide-react";

interface UserWithRole {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  appRoles: string[];
}

interface SearchUser {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
}

const ROLES: { value: string; label: string; icon: typeof Crown; color: string; desc: string }[] = [
  { value: "admin", label: "Admin", icon: Crown, color: "text-primary", desc: "Full system access" },
  { value: "moderator", label: "Moderator", icon: Shield, color: "text-accent", desc: "Can review KYC & manage users" },
  { value: "user", label: "User", icon: User, color: "text-muted-foreground", desc: "Standard user access" },
];

const AdminRoles = () => {
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; userName: string; role: string; action: "add" | "remove" } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddUser, setSelectedAddUser] = useState<SearchUser | null>(null);
  const [selectedAddRole, setSelectedAddRole] = useState("user");

  const fetchUsersWithRoles = async () => {
    setLoading(true);
    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
    if (!allRoles || allRoles.length === 0) { setUsersWithRoles([]); setLoading(false); return; }
    const userIdSet = new Set<string>();
    const roleMap = new Map<string, string[]>();
    allRoles.forEach((r: any) => { userIdSet.add(r.user_id); const e = roleMap.get(r.user_id) || []; e.push(r.role); roleMap.set(r.user_id, e); });
    const userIds = Array.from(userIdSet);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, role, created_at").in("id", userIds);
    const enriched = (profiles || []).map((p: any) => ({ ...p, appRoles: roleMap.get(p.id) || [] }));
    setUsersWithRoles(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsersWithRoles(); }, []);

  const filtered = usersWithRoles.filter(
    (u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
  );

  const searchUsers = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("id, full_name, phone, role").or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(10);
    setSearchResults((data || []) as SearchUser[]);
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (addSearch) searchUsers(addSearch); }, 300);
    return () => clearTimeout(timer);
  }, [addSearch]);

  const assignRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) { if (error.code === "23505") toast.error("User already has this role"); else toast.error(error.message); }
    else toast.success(`Role "${role}" assigned successfully`);
    setConfirmAction(null);
    fetchUsersWithRoles();
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) toast.error(error.message);
    else toast.success(`Role "${role}" removed`);
    setConfirmAction(null);
    fetchUsersWithRoles();
  };

  const handleRoleAction = (userId: string, role: string) => {
    const user = usersWithRoles.find(u => u.id === userId);
    if (!user) return;
    const hasRole = user.appRoles.includes(role);
    setConfirmAction({ userId, userName: user.full_name || "User", role, action: hasRole ? "remove" : "add" });
  };

  const handleAddUser = async () => {
    if (!selectedAddUser) return;
    await assignRole(selectedAddUser.id, selectedAddRole);
    setShowAddModal(false);
    setSelectedAddUser(null);
    setAddSearch("");
    setSearchResults([]);
    setSelectedAddRole("user");
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-medium";
      case "moderator": return "bg-accent/10 text-accent border border-accent/20 text-[10px] px-2 py-0.5 rounded-full font-medium";
      default: return "bg-white/[0.04] text-muted-foreground border border-white/[0.06] text-[10px] px-2 py-0.5 rounded-full font-medium";
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        {/* Ambient */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-0 w-[200px] h-[200px] rounded-full bg-teal-500/[0.02] blur-[80px] pointer-events-none" />

        <div className="flex items-center justify-between relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage system roles — only users with assigned roles appear here</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_30px_hsl(42_78%_55%/0.2)] transition-all duration-300 active:scale-95">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Role Legend */}
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map((r, i) => (
            <div key={r.value}
              className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/15 transition-all duration-500 hover:shadow-[0_0_25px_hsl(42_78%_55%/0.05)] relative overflow-hidden"
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.08 + i * 0.05}s both` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center gap-2 mb-1.5">
                <r.icon className={`w-4 h-4 ${r.color}`} />
                <span className="text-sm font-semibold">{r.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground relative z-10">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        {usersWithRoles.length > 0 && (
          <div className="relative" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.25s both" }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assigned users..."
              className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-11 pr-4 text-sm focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(42_78%_55%/0.08)] transition-all duration-300" />
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-x-auto backdrop-blur-sm" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["User", "Phone", "Profile Role", "System Roles", "Actions"].map((h) => (
                  <th key={h} className="text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td colSpan={5} className="py-4 px-5">
                      <div className="h-5 rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0 bg-white/[0.03]" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ animation: "admin-shimmer 2s infinite" }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No users with assigned roles</p>
                  <button onClick={() => setShowAddModal(true)} className="text-xs text-primary hover:underline mt-2">+ Add a user with a role</button>
                </td></tr>
              ) : (
                filtered.map((u, i) => (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200 group"
                    style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.03, 0.2)}s both` }}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary group-hover:scale-105 transition-transform duration-300">
                          {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium">{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-muted-foreground text-xs">{u.phone || "—"}</td>
                    <td className="py-3.5 px-5 capitalize text-xs">{u.role || "—"}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-1.5 flex-wrap">
                        {u.appRoles.map((role) => (
                          <span key={role} className={getRoleBadgeClass(role)}>{role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="relative">
                        <button onClick={() => setActionUser(actionUser === u.id ? null : u.id)}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-white/[0.06] text-xs font-medium hover:border-primary/20 hover:bg-white/[0.03] transition-all duration-200">
                          Manage <ChevronDown className="w-3 h-3" />
                        </button>
                        {actionUser === u.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.4)] z-20 overflow-hidden animate-scale-in">
                            {ROLES.map((r) => {
                              const hasRole = u.appRoles.includes(r.value);
                              return (
                                <button key={r.value}
                                  onClick={() => { handleRoleAction(u.id, r.value); setActionUser(null); }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-white/[0.04] transition-colors">
                                  <div className="flex items-center gap-2">
                                    <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                                    <span>{hasRole ? `Remove ${r.label}` : `Assign ${r.label}`}</span>
                                  </div>
                                  {hasRole && <UserCheck className="w-3 h-3 text-success" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => { setShowAddModal(false); setSelectedAddUser(null); setAddSearch(""); setSearchResults([]); }} />
            <div className="relative w-[440px] max-w-[90vw] bg-card/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.5)] animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent rounded-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="text-base font-semibold">Add User to Role Management</h3>
                <button onClick={() => { setShowAddModal(false); setSelectedAddUser(null); }} className="p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative z-10">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Search User</label>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={addSearch} onChange={(e) => { setAddSearch(e.target.value); setSelectedAddUser(null); }}
                    placeholder="Search by name or phone..."
                    className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-10 pr-4 text-sm focus:outline-none focus:border-primary/40 transition-all" autoFocus />
                </div>

                {addSearch.length >= 2 && !selectedAddUser && (
                  <div className="max-h-48 overflow-y-auto border border-white/[0.06] rounded-xl mb-4">
                    {searching ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">No users found</div>
                    ) : (
                      searchResults.map((u) => (
                        <button key={u.id} onClick={() => { setSelectedAddUser(u); setAddSearch(u.full_name || u.phone || ""); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left border-b border-white/[0.04] last:border-0">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                            {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.full_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{u.phone || "—"} · {u.role || "no role"}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedAddUser && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-primary/20 mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                      {selectedAddUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedAddUser.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedAddUser.phone}</p>
                    </div>
                    <button onClick={() => { setSelectedAddUser(null); setAddSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                  </div>
                )}

                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Assign Role</label>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {ROLES.map((r) => (
                    <button key={r.value} onClick={() => setSelectedAddRole(r.value)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all duration-200 ${
                        selectedAddRole === r.value ? "border-primary/30 bg-primary/10 text-primary" : "border-white/[0.06] text-muted-foreground hover:border-white/[0.1]"
                      }`}>{r.label}</button>
                  ))}
                </div>

                <button onClick={handleAddUser} disabled={!selectedAddUser}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_hsl(42_78%_55%/0.2)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed">
                  Assign Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
            <div className="relative w-96 bg-card/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.5)] animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Confirm Role Change</h3>
                  <p className="text-xs text-muted-foreground">
                    {confirmAction.action === "add" ? `Assign "${confirmAction.role}" to ${confirmAction.userName}?` : `Remove "${confirmAction.role}" from ${confirmAction.userName}?`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmAction(null)} className="flex-1 h-11 rounded-xl border border-white/[0.06] text-sm font-medium hover:bg-white/[0.03] transition-colors">Cancel</button>
                <button
                  onClick={() => { if (confirmAction.action === "add") assignRole(confirmAction.userId, confirmAction.role); else removeRole(confirmAction.userId, confirmAction.role); }}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    confirmAction.action === "remove" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(42_78%_55%/0.2)]"
                  }`}>
                  {confirmAction.action === "add" ? "Assign Role" : "Remove Role"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRoles;
