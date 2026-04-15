import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Shield, ChevronDown, Crown, UserCheck, User, Search, AlertTriangle, Plus, X, UserPlus } from "lucide-react";

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

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddUser, setSelectedAddUser] = useState<SearchUser | null>(null);
  const [selectedAddRole, setSelectedAddRole] = useState("user");

  const fetchUsersWithRoles = async () => {
    setLoading(true);
    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
    
    if (!allRoles || allRoles.length === 0) {
      setUsersWithRoles([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs that have roles
    const userIdSet = new Set<string>();
    const roleMap = new Map<string, string[]>();
    allRoles.forEach((r: any) => {
      userIdSet.add(r.user_id);
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const userIds = Array.from(userIdSet);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, role, created_at").in("id", userIds);

    const enriched = (profiles || []).map((p: any) => ({
      ...p,
      appRoles: roleMap.get(p.id) || [],
    }));

    setUsersWithRoles(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsersWithRoles(); }, []);

  const filtered = usersWithRoles.filter(
    (u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
  );

  // Search users for add modal
  const searchUsers = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);
    setSearchResults((data || []) as SearchUser[]);
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (addSearch) searchUsers(addSearch); }, 300);
    return () => clearTimeout(timer);
  }, [addSearch]);

  const assignRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) {
      if (error.code === "23505") toast.error("User already has this role");
      else toast.error(error.message);
    } else {
      toast.success(`Role "${role}" assigned successfully`);
    }
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
      case "admin": return "badge-premium text-[10px] px-2 py-0.5 rounded-full";
      case "moderator": return "bg-accent/20 text-accent text-[10px] px-2 py-0.5 rounded-full font-medium";
      default: return "bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-medium";
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold">Role Management</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage system roles — only users with assigned roles appear here</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-pill gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Role Legend */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {ROLES.map((r) => (
            <div key={r.value} className="p-3 rounded-lg bg-card border border-border card-premium">
              <div className="flex items-center gap-2 mb-1">
                <r.icon className={`w-4 h-4 ${r.color}`} />
                <span className="text-sm font-medium">{r.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        {usersWithRoles.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assigned users..." className="input-auro w-full pl-10" />
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-lg bg-card border border-border card-glow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["User", "Phone", "Profile Role", "System Roles", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-3 px-4"><div className="h-5 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                        <Crown className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No users with assigned roles</p>
                      <button onClick={() => setShowAddModal(true)} className="text-xs text-primary hover:underline">
                        + Add a user with a role
                      </button>
                    </div>
                  </td>
                </tr>
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
                      <div className="flex gap-1.5 flex-wrap">
                        {u.appRoles.map((role) => (
                          <span key={role} className={getRoleBadgeClass(role)}>{role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <button
                          onClick={() => setActionUser(actionUser === u.id ? null : u.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:border-border-active transition-colors"
                        >
                          Manage <ChevronDown className="w-3 h-3" />
                        </button>
                        {actionUser === u.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden animate-fade-in-up">
                            {ROLES.map((r) => {
                              const hasRole = u.appRoles.includes(r.value);
                              return (
                                <button
                                  key={r.value}
                                  onClick={() => { handleRoleAction(u.id, r.value); setActionUser(null); }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-muted/30 transition-colors"
                                >
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
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setSelectedAddUser(null); setAddSearch(""); setSearchResults([]); }} />
            <div className="relative w-[440px] max-w-[90vw] bg-card border border-border rounded-lg p-6 card-glow animate-fade-in-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold">Add User to Role Management</h3>
                <button onClick={() => { setShowAddModal(false); setSelectedAddUser(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search for user */}
              <label className="text-xs font-medium text-muted-foreground mb-2 block">SEARCH USER</label>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={addSearch}
                  onChange={(e) => { setAddSearch(e.target.value); setSelectedAddUser(null); }}
                  placeholder="Search by name or phone..."
                  className="input-auro w-full pl-10"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              {addSearch.length >= 2 && !selectedAddUser && (
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg mb-4">
                  {searching ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No users found</div>
                  ) : (
                    searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedAddUser(u); setAddSearch(u.full_name || u.phone || ""); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left border-b border-border/50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
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

              {/* Selected User */}
              {selectedAddUser && (
                <div className="p-3 rounded-lg bg-muted/10 border border-border-active mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground">
                    {selectedAddUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedAddUser.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedAddUser.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedAddUser(null); setAddSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground">
                    Change
                  </button>
                </div>
              )}

              {/* Role Selection */}
              <label className="text-xs font-medium text-muted-foreground mb-2 block">ASSIGN ROLE</label>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedAddRole(r.value)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                      selectedAddRole === r.value
                        ? "border-border-active bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border-active"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAddUser}
                disabled={!selectedAddUser}
                className="w-full h-12 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Assign Role
              </button>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
            <div className="relative w-96 bg-card border border-border rounded-lg p-6 card-glow animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Confirm Role Change</h3>
                  <p className="text-xs text-muted-foreground">
                    {confirmAction.action === "add"
                      ? `Assign "${confirmAction.role}" to ${confirmAction.userName}?`
                      : `Remove "${confirmAction.role}" from ${confirmAction.userName}?`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmAction(null)} className="flex-1 h-10 rounded-pill border border-border text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.action === "add") assignRole(confirmAction.userId, confirmAction.role);
                    else removeRole(confirmAction.userId, confirmAction.role);
                  }}
                  className={`flex-1 h-10 rounded-pill text-sm font-medium hover:opacity-90 transition-colors ${
                    confirmAction.action === "remove" ? "bg-destructive text-destructive-foreground" : "gradient-primary text-primary-foreground"
                  }`}
                >
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
