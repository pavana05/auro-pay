import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Link2, Users, Wallet } from "lucide-react";
import { useAdminQuery } from "@/hooks/useAdminQuery";
import { AdminQueryError, AdminQueryLoading, AdminQueryStatus } from "@/components/admin/AdminQueryState";

const C = { cardBg: "rgba(13,14,18,0.7)", border: "rgba(200,149,46,0.10)", primary: "#c8952e", success: "#22c55e", textPrimary: "#ffffff", textSecondary: "rgba(255,255,255,0.55)", textMuted: "rgba(255,255,255,0.3)" };

interface ParentLinksData {
  links: any[];
  stats: { active: number; totalPocketMoney: number; orphaned: number };
}

const AdminParentLinks = () => {
  const { data, loading, error, refetch, lastUpdatedAt } = useAdminQuery<ParentLinksData>(
    async () => {
      const { data, error: linksErr } = await supabase
        .from("parent_teen_links")
        .select("*, parent:profiles!parent_teen_links_parent_id_fkey(full_name, phone), teen:profiles!parent_teen_links_teen_id_fkey(full_name, phone)")
        .order("created_at", { ascending: false });
      if (linksErr) throw linksErr;

      const links = data || [];
      const active = links.filter((l: any) => l.is_active).length;
      const totalPocketMoney = links.reduce((s: number, l: any) => s + (l.pocket_money_amount || 0), 0);

      const { count: totalTeens, error: countErr } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "teen");
      if (countErr) throw countErr;

      const linkedTeens = new Set(links.map((l: any) => l.teen_id));
      const orphaned = (totalTeens || 0) - linkedTeens.size;
      return { links, stats: { active, totalPocketMoney, orphaned } };
    },
    { label: "parent-teen links", refetchInterval: 30_000 }
  );

  const links = data?.links ?? [];
  const stats = data?.stats ?? { active: 0, totalPocketMoney: 0, orphaned: 0 };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Parent-Teen Links</h1>
          <AdminQueryStatus lastUpdatedAt={lastUpdatedAt} loading={loading} onRefresh={() => refetch()} />
        </div>

        {error ? (
          <AdminQueryError error={error} onRetry={refetch} label="parent-teen links" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Active Links", value: stats.active, icon: Link2, color: C.success },
                { label: "Total Pocket Money (Weekly)", value: `₹${(stats.totalPocketMoney / 100).toLocaleString("en-IN")}`, icon: Wallet, color: C.primary },
                { label: "Orphaned Teens", value: stats.orphaned, icon: Users, color: "#f59e0b" },
              ].map((s) => (
                <div key={s.label} className="p-5 rounded-[16px]" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
                  <p className="text-2xl font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                  <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[16px] overflow-hidden" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div className="grid grid-cols-7 gap-2 px-4 py-3" style={{ background: "rgba(200,149,46,0.06)" }}>
                {["Parent", "Teen", "Pocket Money", "Frequency", "Created", "Status", "Actions"].map(h => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>{h}</span>
                ))}
              </div>
              {loading ? (
                <div className="p-4"><AdminQueryLoading rows={5} /></div>
              ) : links.length === 0 ? (
                <div className="p-8 text-center" style={{ color: C.textMuted }}>No parent-teen links found</div>
              ) : (
                links.map((l: any) => (
                  <div key={l.id} className="grid grid-cols-7 gap-2 px-4 py-3 items-center transition-all duration-200" style={{ borderTop: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,149,46,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{l.parent?.full_name || "—"}</p>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>{l.parent?.phone || ""}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{l.teen?.full_name || "—"}</p>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>{l.teen?.phone || ""}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: C.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}>₹{((l.pocket_money_amount || 0) / 100).toLocaleString("en-IN")}</span>
                    <span className="text-xs capitalize" style={{ color: C.textSecondary }}>{l.pocket_money_frequency || "—"}</span>
                    <span className="text-xs" style={{ color: C.textMuted }}>{l.created_at ? new Date(l.created_at).toLocaleDateString("en-IN") : "—"}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block w-fit" style={{ background: l.is_active ? `${C.success}15` : "rgba(239,68,68,0.15)", color: l.is_active ? C.success : "#ef4444" }}>
                      {l.is_active ? "Active" : "Inactive"}
                    </span>
                    <button className="text-[10px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: `${C.primary}15`, color: C.primary }}>View</button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminParentLinks;
