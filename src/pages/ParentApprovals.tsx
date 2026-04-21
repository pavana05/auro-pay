// Parent inbox for pending teen payment approvals.
// Lists pending requests (>₹2,000 from teens linked to this parent) and lets
// the parent Approve or Decline. Decisions invoke the parent-approve-payment
// edge function which validates ownership and updates status.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldCheck, Check, X, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast";
import { EmptyState, SkeletonRow } from "@/components/feedback";
import ParentBottomNav from "@/components/ParentBottomNav";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";

interface PendingRow {
  id: string;
  teen_id: string;
  amount: number;
  note: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  teen_name?: string;
}

const ParentApprovals = () => {
  const navigate = useNavigate();
  const back = useSafeBack("/parent");
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("pending_payment_approvals")
      .select("id, teen_id, amount, note, status, created_at, expires_at")
      .eq("parent_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const list = (data || []) as PendingRow[];
    if (list.length) {
      const teenIds = Array.from(new Set(list.map((r) => r.teen_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teenIds);
      const map = new Map<string, string>((profs || []).map((p: any) => [p.id, p.full_name]));
      list.forEach((r) => { r.teen_name = map.get(r.teen_id) || "Your teen"; });
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setActingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("parent-approve-payment", {
        body: { approval_id: id, decision },
      });
      if (error || (data as any)?.error) {
        toast.fail("Couldn't process approval", { description: (data as any)?.error || error?.message });
        return;
      }
      toast.ok(decision === "approved" ? "Payment approved" : "Payment declined");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActingId(null);
    }
  };

  const fmt = (paise: number) =>
    "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="min-h-[100dvh] font-sora" style={{ background: "#0a0c0f", color: "#fff" }}>
      <PageHeader
        title="Approval Requests"
        subtitle="Teens need your approval for payments over ₹2,000"
        fallback="/parent"
      />

      <div className="px-5 pb-24 pt-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonRow key={i} className="h-[120px]" />)}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6 text-primary/70" />}
            title="All clear"
            description="No payment approvals waiting for you."
          />
        )}

        {rows.map((r) => {
          const expiresIn = Math.max(0, Math.floor((new Date(r.expires_at).getTime() - Date.now()) / 3600000));
          const expired = expiresIn === 0;
          return (
            <div
              key={r.id}
              className="rounded-[18px] p-4"
              style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.18)", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(200,149,46,0.8)" }}>{r.teen_name}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: "#c8952e" }}>{fmt(r.amount)}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
                  style={{ background: expired ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)", color: expired ? "#ef4444" : "rgba(255,255,255,0.6)" }}>
                  {expired ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {expired ? "Expired" : `${expiresIn}h left`}
                </div>
              </div>
              {r.note && (
                <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)" }}>
                  "{r.note}"
                </p>
              )}
              <div className="flex gap-2">
                <button
                  disabled={actingId === r.id || expired}
                  onClick={() => decide(r.id, "rejected")}
                  className="flex-1 h-10 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
                <button
                  disabled={actingId === r.id || expired}
                  onClick={() => decide(r.id, "approved")}
                  className="flex-1 h-10 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition"
                  style={{ background: "linear-gradient(135deg, #c8952e, #a87a1f)", color: "#0a0c0f", boxShadow: "0 6px 20px rgba(200,149,46,0.3)" }}
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <ParentBottomNav />
    </div>
  );
};

export default ParentApprovals;
