// Parent inbox for pending teen payment approvals.
// Lists pending requests (>₹2,000 from teens linked to this parent) and lets
// the parent Approve or Decline. Decisions invoke the parent-approve-payment
// edge function which validates ownership and updates status.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldCheck, Check, X, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
        toast.error((data as any)?.error || error?.message || "Failed");
        return;
      }
      toast.success(decision === "approved" ? "Payment approved" : "Payment declined");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setActingId(null);
    }
  };

  const fmt = (paise: number) =>
    "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="min-h-[100dvh] font-sora" style={{ background: "#0a0c0f", color: "#fff" }}>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 z-10" style={{ background: "rgba(10,12,15,0.85)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Approval Requests</h1>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Teens need your approval for payments over ₹2,000
          </p>
        </div>
      </div>

      <div className="px-5 pb-24 pt-4 space-y-3">
        {loading && (
          <div className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Loading…</div>
        )}

        {!loading && rows.length === 0 && (
          <div
            className="rounded-[18px] p-8 text-center"
            style={{ background: "rgba(13,14,18,0.7)", border: "1px solid rgba(200,149,46,0.15)" }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <ShieldCheck className="w-6 h-6" style={{ color: "#22c55e" }} />
            </div>
            <h3 className="text-sm font-semibold mb-1">All clear</h3>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              No payment approvals waiting for you.
            </p>
          </div>
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
    </div>
  );
};

export default ParentApprovals;
