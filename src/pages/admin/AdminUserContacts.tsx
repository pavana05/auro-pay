import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { ArrowLeft, Search, Download, ShieldAlert, Users as UsersIcon, Phone, AtSign } from "lucide-react";

interface ContactRow {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_upi_id: string | null;
  avatar_emoji: string | null;
  last_paid_at: string | null;
  created_at: string | null;
  owner_name: string | null;
  owner_phone: string | null;
}

const C = { primary: "#c8952e" };

const AdminUserContacts = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: favs, error } = await supabase
          .from("quick_pay_favorites")
          .select("id, user_id, contact_name, contact_phone, contact_upi_id, avatar_emoji, last_paid_at, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const userIds = Array.from(new Set((favs ?? []).map((f) => f.user_id)));
        let owners: Record<string, { name: string | null; phone: string | null }> = {};
        if (userIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .in("id", userIds);
          (profiles ?? []).forEach((p: any) => {
            owners[p.id] = { name: p.full_name, phone: p.phone };
          });
        }

        setRows(
          (favs ?? []).map((f: any) => ({
            ...f,
            owner_name: owners[f.user_id]?.name ?? null,
            owner_phone: owners[f.user_id]?.phone ?? null,
          })),
        );
      } catch (err: any) {
        console.error("[AdminUserContacts] load failed", err);
        toast.error("Failed to load contacts", { description: err?.message });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.contact_name.toLowerCase().includes(q) ||
        (r.contact_phone || "").toLowerCase().includes(q) ||
        (r.contact_upi_id || "").toLowerCase().includes(q) ||
        (r.owner_name || "").toLowerCase().includes(q) ||
        (r.owner_phone || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ContactRow[]>();
    filtered.forEach((r) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r);
      map.set(r.user_id, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const exportCsv = () => {
    const header = ["owner_name", "owner_phone", "contact_name", "contact_phone", "contact_upi_id", "last_paid_at", "created_at"];
    const data = filtered.map((r) => [
      r.owner_name || "",
      r.owner_phone || "",
      r.contact_name,
      r.contact_phone || "",
      r.contact_upi_id || "",
      r.last_paid_at || "",
      r.created_at || "",
    ]);
    const csv = [header, ...data].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} contacts`);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/users")}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center border border-white/10 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
            <div>
              <h1 className="text-[20px] font-bold text-white">User Contacts</h1>
              <p className="text-[12px] text-white/50">Quick Pay favorites users have saved in-app</p>
            </div>
          </div>
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[11px] font-medium border border-primary/20 disabled:opacity-40"
            style={{ background: "rgba(200,149,46,0.12)", color: C.primary }}
          >
            <Download className="w-3.5 h-3.5" /> Export {filtered.length}
          </button>
        </div>

        {/* Privacy notice */}
        <div
          className="flex items-start gap-3 p-3 rounded-[12px] border border-amber-500/20"
          style={{ background: "rgba(245,158,11,0.06)" }}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-white/70">
            <strong className="text-white">Privacy:</strong> This view shows only payment contacts that users
            explicitly saved as Quick Pay favorites inside the app. AuroPay does not read users' device address
            books. Access is logged.
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by contact name, phone, UPI, or owner…"
            className="w-full h-10 pl-10 pr-3 rounded-[10px] bg-white/[0.03] border border-white/10 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-[12px] bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Total contacts</p>
            <p className="text-[22px] font-bold text-white mt-1">{rows.length.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-4 rounded-[12px] bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Users with contacts</p>
            <p className="text-[22px] font-bold text-white mt-1">{new Set(rows.map((r) => r.user_id)).size.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-4 rounded-[12px] bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Showing</p>
            <p className="text-[22px] font-bold text-white mt-1">{filtered.length.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-[10px] bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center text-white/40">
            <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-[13px]">No contacts found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([userId, contacts]) => {
              const owner = contacts[0];
              return (
                <div key={userId} className="rounded-[14px] bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-white">{owner.owner_name || "Unnamed user"}</p>
                      <p className="text-[11px] text-white/40 font-mono">
                        {owner.owner_phone || "—"} · {userId.slice(0, 8)}…
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ background: "rgba(200,149,46,0.12)", color: C.primary }}
                    >
                      {contacts.length} contact{contacts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {contacts.map((c) => (
                      <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] shrink-0"
                          style={{ background: "rgba(200,149,46,0.10)" }}
                        >
                          {c.avatar_emoji || "👤"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-white truncate">{c.contact_name}</p>
                          <div className="flex items-center gap-3 text-[11px] text-white/50 mt-0.5">
                            {c.contact_phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {c.contact_phone}
                              </span>
                            )}
                            {c.contact_upi_id && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <AtSign className="w-3 h-3" /> {c.contact_upi_id}
                              </span>
                            )}
                          </div>
                        </div>
                        {c.last_paid_at && (
                          <span className="text-[10px] text-white/40 shrink-0">
                            {new Date(c.last_paid_at).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserContacts;
