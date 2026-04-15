import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Shield, ChevronDown, Crown, UserCheck, User, Search, AlertTriangle } from "lucide-react";

interface UserWithRole {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  appRoles: string[];
}

const ROLES: { value: string; label: string; icon: typeof Crown; color: string; desc: string }[] = [
  { value: "admin", label: "Admin", icon: Crown, color: "text-primary", desc: "Full system access" },
  { value: "moderator", label: "Moderator", icon: Shield, color: "text-accent", desc: "Can review KYC & manage users" },
  { value: "user", label: "User", icon: User, color: "text-muted-foreground", desc: "Standard user access" },
];

const AdminRoles = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; role: string; action: "add" | "remove" } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, role, created_at").order("created_at", { ascending: false });
    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map<string, string[]>();
    (allRoles || []).forEach((r: any) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const enriched = (profiles || []).map((p: any) => ({
      ...p,
      appRoles: roleMap.get(p.id) || [],
    }));

    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(
    (u) => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
  );

  const assignRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) {
      if (error.code === "23505") toast.error("User already has this role");
      else toast.error(error.message);
    } else {
      toast.success(`Role "${role}" assigned successfully`);
    }
    setConfirmAction(null);
    fetchUsers();
  };

  const removeRole = async (userId: string, role: string) => {
    // We need to delete via edge function or RPC since we can't delete with just user_id + role easily
    // Use the admin's ability to manage roles
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) toast.error(error.message);
    else toast.success(`Role "${role}" removed`);
    setConfirmAction(null);
    fetchUsers();
  };

  const handleRoleAction = (userId: string, role: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const hasRole = user.appRoles.includes(role);
    setConfirmAction({ userId, role, action: hasRole ? "remove" : "add" });
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
            <p className="text-xs text-muted-foreground mt-1">Promote, demote, and manage user permissions</p>
          </div>
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
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name or phone..." className="input-auro w-full pl-10" />
        </div>

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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-3 px-4"><div className="h-5 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No users found</td></tr>
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
                        {u.appRoles.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">No roles</span>
                        ) : (
                          u.appRoles.map((role) => (
                            <span key={role} className={getRoleBadgeClass(role)}>
                              {role}
                            </span>
                          ))
                        )}
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
                      ? `Assign "${confirmAction.role}" role to this user?`
                      : `Remove "${confirmAction.role}" role from this user?`
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
                  className="flex-1 h-10 rounded-pill gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
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
