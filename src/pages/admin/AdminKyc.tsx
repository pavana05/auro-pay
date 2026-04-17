import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { useContextPanel } from "@/components/admin/AdminContextPanel";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, AlertTriangle, CheckCircle2, XCircle, Eye, LayoutGrid, List,
  ChevronLeft, ChevronRight, X, Zap, RefreshCw, User as UserIcon, Calendar, Hash, Copy, FileText,
  Image as ImageIcon, Download, Loader2, Maximize2,
} from "lucide-react";

const C = {
  primary: "#c8952e", secondary: "#d4a84b",
  success: "#22c55e", danger: "#ef4444", warning: "#f59e0b",
  info: "#3b82f6", cyan: "#06b6d4",
};

const REJECT_REASONS = [
  "Aadhaar number does not match",
  "Aadhaar image unclear / unreadable",
  "Name mismatch with profile",
  "Date of birth mismatch",
  "Suspected fraudulent document",
  "Underage (must be 13+)",
  "Duplicate KYC submission",
  "Other (see note)",
];

interface KycRow {
  id: string;
  user_id: string;
  aadhaar_number: string | null;
  aadhaar_name: string | null;
  date_of_birth: string | null;
  status: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  digio_request_id: string | null;
  profile?: { full_name: string | null; phone: string | null; avatar_url: string | null };
}

const STATUSES = ["pending", "in_review", "verified", "rejected"] as const;
type StatusKey = typeof STATUSES[number];

const AdminKyc = () => {
  const ctxPanel = useContextPanel();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table">("kanban");

  // Modals
  const [approveTarget, setApproveTarget] = useState<KycRow | null>(null);
  const [approveText, setApproveText] = useState("");
  const [rejectTarget, setRejectTarget] = useState<KycRow | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectNote, setRejectNote] = useState("");
  const [detail, setDetail] = useState<KycRow | null>(null);

  // Bulk review
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkIdx, setBulkIdx] = useState(0);
  const [bulkList, setBulkList] = useState<KycRow[]>([]);

  // Kanban drag
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<StatusKey | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("kyc_requests")
      .select("*")
      .order("submitted_at", { ascending: false });

    const userIds = Array.from(new Set((data || []).map((r) => r.user_id)));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, phone, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const profMap = new Map((profs || []).map((p) => [p.id, p]));
    const enriched: KycRow[] = (data || []).map((r) => ({ ...r, profile: profMap.get(r.user_id) || undefined }));
    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("admin-kyc-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kyc_requests" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  /* ─────────── Helpers ─────────── */
  const maskAadhaar = (n: string | null) => n ? `XXXX XXXX ${n.slice(-4)}` : "—";
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const queueTime = (d: string | null) => {
    if (!d) return { label: "—", hot: false };
    const ms = Date.now() - new Date(d).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return { label, hot: ms > 24 * 3600000 };
  };

  const logAudit = async (action: string, targetId: string, details: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ admin_user_id: user.id, action, target_type: "kyc", target_id: targetId, details });
  };

  /* ─────────── Stats ─────────── */
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayMs = today.getTime();

    const pending = rows.filter((r) => r.status === "pending").length;
    const inReview = rows.filter((r) => r.status === "in_review").length;
    const approvedToday = rows.filter((r) => r.status === "verified" && r.verified_at && new Date(r.verified_at).getTime() >= todayMs).length;
    const rejectedToday = rows.filter((r) => r.status === "rejected" && r.verified_at && new Date(r.verified_at).getTime() >= todayMs).length;

    const reviewed = rows.filter((r) => r.verified_at && r.submitted_at);
    const avgReviewMs = reviewed.length > 0
      ? reviewed.reduce((s, r) => s + (new Date(r.verified_at!).getTime() - new Date(r.submitted_at!).getTime()), 0) / reviewed.length
      : 0;
    const avgReviewLabel = avgReviewMs > 0
      ? avgReviewMs > 3600000
        ? `${(avgReviewMs / 3600000).toFixed(1)}h`
        : `${Math.round(avgReviewMs / 60000)}m`
      : "—";

    const totalVerified = rows.filter((r) => r.status === "verified").length;
    const kycRate = rows.length > 0 ? Math.round((totalVerified / rows.length) * 100) : 0;

    return { pending, inReview, approvedToday, rejectedToday, avgReviewLabel, kycRate };
  }, [rows]);

  /* ─────────── Kanban groups ─────────── */
  const groups: Record<StatusKey, KycRow[]> = useMemo(() => ({
    pending: rows.filter((r) => (r.status || "pending") === "pending"),
    in_review: rows.filter((r) => r.status === "in_review"),
    verified: rows.filter((r) => r.status === "verified"),
    rejected: rows.filter((r) => r.status === "rejected"),
  }), [rows]);

  /* ─────────── Actions ─────────── */
  const moveToInReview = async (r: KycRow) => {
    if (r.status === "in_review") return;
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "in_review" } : x));
    const { error } = await supabase.from("kyc_requests").update({ status: "in_review" }).eq("id", r.id);
    if (error) { toast.error(error.message); fetchAll(); return; }
    await supabase.from("profiles").update({ kyc_status: "in_review" }).eq("id", r.user_id);
    await logAudit("kyc_in_review", r.id, { user_id: r.user_id });
    toast.success("Marked as under review");
  };

  const approveNow = async (r: KycRow) => {
    const { error } = await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return false; }
    await supabase.from("profiles").update({ kyc_status: "verified", aadhaar_verified: true }).eq("id", r.user_id);
    await supabase.from("notifications").insert({
      user_id: r.user_id,
      title: "✅ KYC Verified",
      body: "Your identity verification was approved. You now have full access to PayVibe.",
      type: "kyc_approved",
    });
    await logAudit("kyc_approve", r.id, { user_name: r.aadhaar_name });
    toast.success(`KYC approved for ${r.aadhaar_name || "user"} 🎉`);
    return true;
  };

  const rejectNow = async (r: KycRow, reason: string, note: string) => {
    const { error } = await supabase.from("kyc_requests").update({ status: "rejected", verified_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return false; }
    await supabase.from("profiles").update({ kyc_status: "rejected" }).eq("id", r.user_id);
    await supabase.from("notifications").insert({
      user_id: r.user_id,
      title: "❌ KYC Rejected",
      body: `Reason: ${reason}${note ? ` — ${note}` : ""}. Please re-submit your documents.`,
      type: "kyc_rejected",
    });
    await logAudit("kyc_reject", r.id, { reason, note, user_name: r.aadhaar_name });
    toast.success("KYC rejected");
    return true;
  };

  const handleApproveSubmit = async () => {
    if (!approveTarget || approveText.trim().toUpperCase() !== "APPROVE") return;
    const ok = await approveNow(approveTarget);
    if (ok) { setApproveTarget(null); setApproveText(""); fetchAll(); }
  };
  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    const ok = await rejectNow(rejectTarget, rejectReason, rejectNote.trim());
    if (ok) { setRejectTarget(null); setRejectReason(REJECT_REASONS[0]); setRejectNote(""); fetchAll(); }
  };

  /* ─────────── Drag and drop ─────────── */
  const onDragStart = (id: string) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setDragOver(null); };
  const onDrop = (col: StatusKey) => {
    const r = rows.find((x) => x.id === dragId);
    if (!r) return;
    setDragId(null); setDragOver(null);
    if (col === "in_review") moveToInReview(r);
    else if (col === "verified" || col === "rejected") {
      if (r.status === "verified" || r.status === "rejected") { toast.info("Already finalised"); return; }
      if (col === "verified") setApproveTarget(r);
      else setRejectTarget(r);
    } else if (col === "pending") {
      // Move back to pending
      supabase.from("kyc_requests").update({ status: "pending" }).eq("id", r.id).then(() => fetchAll());
    }
  };

  /* ─────────── Bulk Review ─────────── */
  const startBulkReview = () => {
    const queue = [...groups.pending, ...groups.in_review];
    if (queue.length === 0) { toast.info("No KYC in queue"); return; }
    setBulkList(queue);
    setBulkIdx(0);
    setBulkOpen(true);
  };
  const bulkAdvance = () => {
    if (bulkIdx >= bulkList.length - 1) { setBulkOpen(false); fetchAll(); toast.success("Review session complete"); }
    else setBulkIdx((i) => i + 1);
  };
  const bulkApprove = async () => {
    const r = bulkList[bulkIdx];
    if (await approveNow(r)) bulkAdvance();
  };
  const bulkReject = async () => {
    const r = bulkList[bulkIdx];
    if (await rejectNow(r, "Quick review rejection", "")) bulkAdvance();
  };

  /* ─────────── Context panel ─────────── */
  const openKycPanel = (r: KycRow) => {
    ctxPanel.show({
      title: r.profile?.full_name || r.aadhaar_name || "KYC request",
      subtitle: `Submitted ${fmtDateTime(r.submitted_at)}`,
      body: (
        <KycPanelBody
          r={r}
          maskAadhaar={maskAadhaar}
          fmtDate={fmtDate}
          fmtDateTime={fmtDateTime}
          queueTime={queueTime}
          onApprove={() => { setApproveTarget(r); ctxPanel.hide(); }}
          onReject={() => { setRejectTarget(r); ctxPanel.hide(); }}
          onMoveReview={() => moveToInReview(r)}
        />
      ),
    });
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-5 min-h-full relative">
        <div className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-[0.04] blur-[150px]" style={{ background: `radial-gradient(circle, ${C.primary}, transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div>
            <h1 className="text-xl lg:text-[22px] font-bold text-white font-sora flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" style={{ color: C.primary }} /> KYC Management
            </h1>
            <p className="text-[11px] text-white/40 font-sora mt-0.5">Review identity verification requests</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.04] border border-white/[0.06]" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" }}>
              <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={LayoutGrid} label="Kanban" />
              <ViewBtn active={view === "table"} onClick={() => setView("table")} icon={List} label="Table" />
            </div>
            <button
              onClick={startBulkReview}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[11px] font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, boxShadow: `0 0 20px ${C.primary}30` }}
            >
              <Zap className="w-3.5 h-3.5" /> Review All Pending ({stats.pending + stats.inReview})
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat icon={Clock} label="Pending" value={stats.pending.toString()} color={C.warning} />
          <Stat icon={CheckCircle2} label="Approved Today" value={stats.approvedToday.toString()} color={C.success} />
          <Stat icon={XCircle} label="Rejected Today" value={stats.rejectedToday.toString()} color={C.danger} />
          <Stat icon={Clock} label="Avg Review Time" value={stats.avgReviewLabel} color={C.cyan} />
          <Stat icon={ShieldCheck} label="KYC Rate" value={`${stats.kycRate}%`} color={C.primary} />
        </div>

        {loading ? (
          <div className="py-20 text-center"><div className="w-10 h-10 mx-auto rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>
        ) : view === "kanban" ? (
          /* ─────────── KANBAN ─────────── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KanbanCol
              title="Pending" status="pending" count={groups.pending.length} accent={C.warning}
              dragOver={dragOver === "pending"} onDragOver={(e) => { e.preventDefault(); setDragOver("pending"); }} onDrop={() => onDrop("pending")}
            >
              {groups.pending.map((r) => <Card key={r.id} r={r} dragId={dragId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => openKycPanel(r)} accent={C.warning} maskAadhaar={maskAadhaar} queueTime={queueTime} />)}
              {groups.pending.length === 0 && <Empty label="No pending" />}
            </KanbanCol>

            <KanbanCol
              title="In Review" status="in_review" count={groups.in_review.length} accent={C.info}
              dragOver={dragOver === "in_review"} onDragOver={(e) => { e.preventDefault(); setDragOver("in_review"); }} onDrop={() => onDrop("in_review")}
            >
              {groups.in_review.map((r) => <Card key={r.id} r={r} dragId={dragId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => openKycPanel(r)} accent={C.info} maskAadhaar={maskAadhaar} queueTime={queueTime} />)}
              {groups.in_review.length === 0 && <Empty label="Drag here to review" />}
            </KanbanCol>

            <KanbanCol
              title="Completed" status="verified" count={groups.verified.length + groups.rejected.length} accent={C.success}
              dragOver={dragOver === "verified" || dragOver === "rejected"} onDragOver={(e) => { e.preventDefault(); setDragOver("verified"); }} onDrop={() => onDrop("verified")}
            >
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-sora mb-1.5">Drop to approve · use ⋮ to reject</p>
              {[...groups.verified, ...groups.rejected].slice(0, 30).map((r) => (
                <Card key={r.id} r={r} dragId={dragId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => openKycPanel(r)}
                  accent={r.status === "verified" ? C.success : C.danger} maskAadhaar={maskAadhaar} queueTime={queueTime} done />
              ))}
              {groups.verified.length + groups.rejected.length === 0 && <Empty label="Nothing completed yet" />}
            </KanbanCol>
          </div>
        ) : (
          /* ─────────── TABLE ─────────── */
          <div className="rounded-[16px] border overflow-hidden" style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="hidden md:grid grid-cols-[1.6fr_1fr_120px_140px_120px_100px_140px] gap-3 px-4 h-11 items-center border-b text-[9px] uppercase tracking-wider text-white/30 font-sora" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <span>User</span><span>Aadhaar</span><span>DOB</span><span>Submitted</span><span>In queue</span><span>Status</span><span className="text-right">Actions</span>
            </div>
            {rows.length === 0 ? (
              <div className="py-16 text-center text-[12px] text-white/40 font-sora">No KYC requests</div>
            ) : rows.map((r) => {
              const q = queueTime(r.submitted_at);
              const isHot = q.hot && (r.status === "pending" || r.status === "in_review");
              const initials = (r.profile?.full_name || r.aadhaar_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={r.id} onClick={() => openKycPanel(r)} className="group grid grid-cols-1 md:grid-cols-[1.6fr_1fr_120px_140px_120px_100px_140px] gap-3 px-4 py-3 items-center border-b text-[12px] hover:bg-white/[0.025] transition-colors cursor-pointer" style={{ borderColor: "rgba(255,255,255,0.025)" }}>
                  <button onClick={(e) => { e.stopPropagation(); openKycPanel(r); }} className="flex items-center gap-2.5 text-left min-w-0">
                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} alt="" className="w-8 h-8 rounded-[8px] object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initials}</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate font-sora">{r.profile?.full_name || r.aadhaar_name || "Unnamed"}</p>
                      <p className="text-[10px] text-white/40 font-mono truncate">{r.profile?.phone || "—"}</p>
                    </div>
                  </button>
                  <span className="text-white/70 font-mono truncate hidden md:block">{maskAadhaar(r.aadhaar_number)}</span>
                  <span className="text-white/60 font-sora hidden md:block">{fmtDate(r.date_of_birth)}</span>
                  <span className="text-white/60 font-mono text-[11px] hidden md:block">{fmtDateTime(r.submitted_at)}</span>
                  <span className="hidden md:flex items-center gap-1 font-mono text-[11px] font-semibold" style={{ color: isHot ? C.warning : "rgba(255,255,255,0.6)" }}>
                    {isHot && <AlertTriangle className="w-3 h-3" />}
                    {q.label}
                  </span>
                  <span className="hidden md:inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-fit" style={{
                    background: r.status === "verified" ? "rgba(34,197,94,0.1)" : r.status === "rejected" ? "rgba(239,68,68,0.1)" : r.status === "in_review" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
                    color: r.status === "verified" ? C.success : r.status === "rejected" ? C.danger : r.status === "in_review" ? C.info : C.warning,
                  }}>{(r.status || "pending").replace("_", " ")}</span>
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openKycPanel(r)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.04]" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {(r.status === "pending" || r.status === "in_review") && (
                      <>
                        <button onClick={() => setApproveTarget(r)} className="p-1.5 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: C.success }} title="Approve">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setRejectTarget(r)} className="p-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: C.danger }} title="Reject">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────── Detail modal ─────────── */}
      {detail && (
        <Modal onClose={() => setDetail(null)} title="KYC Details">
          <KycDetailBody r={detail} maskAadhaar={maskAadhaar} fmtDate={fmtDate} fmtDateTime={fmtDateTime} />
          {(detail.status === "pending" || detail.status === "in_review") && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setRejectTarget(detail); setDetail(null); }} className="flex-1 h-10 rounded-[10px] border border-destructive/30 text-[12px] font-semibold text-destructive hover:bg-destructive/5 transition-colors font-sora">
                Reject
              </button>
              <button onClick={() => { setApproveTarget(detail); setDetail(null); }} className="flex-1 h-10 rounded-[10px] text-[12px] font-semibold text-white font-sora" style={{ background: `linear-gradient(135deg, ${C.success}, #16a34a)` }}>
                Approve
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* ─────────── Approve modal ─────────── */}
      {approveTarget && (
        <Modal onClose={() => { setApproveTarget(null); setApproveText(""); }} title="Confirm KYC Approval" accent={C.success}>
          <div className="rounded-xl p-3 border mb-3" style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.2)" }}>
            <p className="text-[12px] text-white font-sora">
              You are approving KYC for <span className="font-semibold" style={{ color: C.success }}>{approveTarget.aadhaar_name || approveTarget.profile?.full_name || "this user"}</span>.
            </p>
            <p className="text-[11px] text-white/60 font-sora mt-1">This grants full platform access including payments, transfers and card usage.</p>
          </div>
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-sora block mb-1">Type APPROVE to confirm</label>
          <input
            type="text" value={approveText} onChange={(e) => setApproveText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && approveText.trim().toUpperCase() === "APPROVE") handleApproveSubmit(); }}
            placeholder="APPROVE" autoFocus
            className="w-full h-10 px-3 rounded-[10px] text-[13px] font-mono font-bold text-white tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-success/40"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setApproveTarget(null); setApproveText(""); }} className="flex-1 h-10 rounded-[10px] border border-white/10 text-[12px] font-medium text-white/70 hover:bg-white/5 font-sora">Cancel</button>
            <button
              onClick={handleApproveSubmit}
              disabled={approveText.trim().toUpperCase() !== "APPROVE"}
              className="flex-1 h-10 rounded-[10px] text-[12px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed font-sora"
              style={{ background: `linear-gradient(135deg, ${C.success}, #16a34a)` }}
            >
              ✓ Approve KYC
            </button>
          </div>
        </Modal>
      )}

      {/* ─────────── Reject modal ─────────── */}
      {rejectTarget && (
        <Modal onClose={() => { setRejectTarget(null); setRejectNote(""); }} title="Reject KYC Request" accent={C.danger}>
          <p className="text-[12px] text-white/70 font-sora mb-3">
            Rejecting <span className="font-semibold text-white">{rejectTarget.aadhaar_name || rejectTarget.profile?.full_name || "this user"}</span>'s KYC.
          </p>
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-sora block mb-1">Reason</label>
          <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full h-10 px-3 rounded-[10px] text-[12px] text-white font-sora focus:outline-none mb-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" }}>
            {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-sora block mb-1">Optional note</label>
          <textarea
            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
            placeholder="Additional context for the user…"
            className="w-full p-3 rounded-[10px] text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-destructive/40 font-sora resize-none"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setRejectTarget(null); setRejectNote(""); }} className="flex-1 h-10 rounded-[10px] border border-white/10 text-[12px] font-medium text-white/70 hover:bg-white/5 font-sora">Cancel</button>
            <button onClick={handleRejectSubmit} className="flex-1 h-10 rounded-[10px] text-[12px] font-semibold text-white font-sora" style={{ background: `linear-gradient(135deg, ${C.danger}, #dc2626)` }}>
              Reject KYC
            </button>
          </div>
        </Modal>
      )}

      {/* ─────────── Bulk Review Mode ─────────── */}
      {bulkOpen && bulkList.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setBulkOpen(false)} />
          <div className="relative w-full max-w-[560px] rounded-[20px] border overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]" style={{ background: "rgba(15,17,22,0.98)", borderColor: "rgba(200,149,46,0.2)", animation: "scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both" }}>
            {/* Progress */}
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: C.primary }} />
                <span className="text-[12px] font-semibold text-white font-sora">Bulk Review</span>
                <span className="text-[11px] text-white/50 font-mono">{bulkIdx + 1} of {bulkList.length} reviewed</span>
              </div>
              <button onClick={() => setBulkOpen(false)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full transition-all duration-300" style={{ width: `${((bulkIdx + 1) / bulkList.length) * 100}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})` }} />
            </div>

            {/* Card */}
            <div className="p-6">
              <KycDetailBody r={bulkList[bulkIdx]} maskAadhaar={maskAadhaar} fmtDate={fmtDate} fmtDateTime={fmtDateTime} compact />

              <div className="grid grid-cols-2 gap-2 mt-5">
                <button onClick={bulkReject} className="h-12 rounded-[12px] border border-destructive/30 text-[13px] font-semibold text-destructive hover:bg-destructive/5 flex items-center justify-center gap-2 font-sora">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={bulkApprove} className="h-12 rounded-[12px] text-[13px] font-semibold text-white flex items-center justify-center gap-2 font-sora" style={{ background: `linear-gradient(135deg, ${C.success}, #16a34a)` }}>
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <button onClick={() => setBulkIdx((i) => Math.max(0, i - 1))} disabled={bulkIdx === 0} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white disabled:opacity-30 font-sora">
                  <ChevronLeft className="w-3 h-3" /> Previous
                </button>
                <button onClick={() => bulkAdvance()} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white font-sora">
                  Skip <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes kpi-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes scale-in { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes card-in { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
    </AdminLayout>
  );
};

/* ─────────── Sub-components ─────────── */

const ViewBtn = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium font-sora transition-all" style={{ background: active ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.5)" }}>
    <Icon className="w-3 h-3" /> <span className="hidden sm:inline">{label}</span>
  </button>
);

const Stat = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <div className="rounded-[14px] p-4 border relative overflow-hidden" style={{ background: "rgba(13,14,18,0.7)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.05)", animation: "kpi-in 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color, boxShadow: `0 0 10px ${color}80` }} />
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <p className="text-[9px] uppercase tracking-wider text-white/40 font-sora">{label}</p>
    </div>
    <p className="text-2xl font-bold font-mono text-white">{value}</p>
  </div>
);

const KanbanCol = ({ title, count, accent, dragOver, onDragOver, onDrop, children }: { title: string; status: StatusKey; count: number; accent: string; dragOver: boolean; onDragOver: (e: React.DragEvent) => void; onDrop: () => void; children: React.ReactNode }) => (
  <div
    onDragOver={onDragOver} onDrop={onDrop}
    className="rounded-[16px] border p-3 min-h-[400px] transition-all"
    style={{
      background: dragOver ? `${accent}08` : "rgba(13,14,18,0.7)",
      backdropFilter: "blur(20px)",
      borderColor: dragOver ? `${accent}40` : "rgba(255,255,255,0.05)",
      boxShadow: dragOver ? `0 0 30px ${accent}20, inset 0 0 30px ${accent}05` : "none",
    }}
  >
    <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
        <h3 className="text-[12px] font-semibold text-white font-sora">{title}</h3>
      </div>
      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full" style={{ background: `${accent}12`, color: accent }}>{count}</span>
    </div>
    <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">{children}</div>
  </div>
);

const Card = ({ r, dragId, onDragStart, onDragEnd, onClick, accent, maskAadhaar, queueTime, done = false }: {
  r: KycRow; dragId: string | null; onDragStart: (id: string) => void; onDragEnd: () => void; onClick: () => void; accent: string;
  maskAadhaar: (n: string | null) => string; queueTime: (d: string | null) => { label: string; hot: boolean }; done?: boolean;
}) => {
  const initials = (r.profile?.full_name || r.aadhaar_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const q = queueTime(r.submitted_at);
  const isDragging = dragId === r.id;
  return (
    <div
      draggable={!done}
      onDragStart={() => onDragStart(r.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="group relative rounded-[12px] p-3 border cursor-pointer transition-all hover:border-primary/30"
      style={{
        background: "rgba(255,255,255,0.025)",
        borderColor: isDragging ? `${accent}50` : "rgba(255,255,255,0.06)",
        opacity: isDragging ? 0.4 : 1,
        animation: "card-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
        boxShadow: isDragging ? `0 0 20px ${accent}40` : "none",
      }}
    >
      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full" style={{ background: accent, boxShadow: `0 0 4px ${accent}80` }} />
      <div className="flex items-start gap-2.5 pl-1">
        {r.profile?.avatar_url ? (
          <img src={r.profile.avatar_url} alt="" className="w-9 h-9 rounded-[8px] object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initials}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white truncate font-sora">{r.profile?.full_name || r.aadhaar_name || "Unnamed"}</p>
          <p className="text-[10px] text-white/50 font-mono truncate">{maskAadhaar(r.aadhaar_number)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pl-1">
        <span className="text-[9px] text-white/40 font-mono">{r.profile?.phone || "—"}</span>
        {!done ? (
          <span className="flex items-center gap-1 text-[9px] font-mono font-semibold" style={{ color: q.hot ? C.warning : "rgba(255,255,255,0.5)" }}>
            {q.hot && <AlertTriangle className="w-2.5 h-2.5" />}
            {q.label}
          </span>
        ) : (
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full font-sora" style={{ background: `${accent}12`, color: accent }}>
            {r.status}
          </span>
        )}
      </div>
    </div>
  );
};

const Empty = ({ label }: { label: string }) => (
  <div className="text-center py-10 text-[10px] text-white/25 font-sora border border-dashed rounded-[12px]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
    {label}
  </div>
);

const Modal = ({ onClose, title, accent = C.primary, children }: { onClose: () => void; title: string; accent?: string; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full max-w-[480px] rounded-[18px] border p-5 shadow-[0_30px_80px_rgba(0,0,0,0.6)]" style={{ background: "rgba(15,17,22,0.98)", borderColor: `${accent}30`, animation: "scale-in 0.2s cubic-bezier(0.22,1,0.36,1) both" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-white font-sora">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const KycDetailBody = ({ r, maskAadhaar, fmtDate, fmtDateTime, compact = false }: { r: KycRow; maskAadhaar: (n: string | null) => string; fmtDate: (d: string | null) => string; fmtDateTime: (d: string | null) => string; compact?: boolean }) => {
  const initials = (r.profile?.full_name || r.aadhaar_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: `linear-gradient(135deg, ${C.primary}10, transparent)`, borderColor: `${C.primary}20` }}>
        {r.profile?.avatar_url ? (
          <img src={r.profile.avatar_url} alt="" className={`${compact ? "w-12 h-12" : "w-14 h-14"} rounded-xl object-cover`} />
        ) : (
          <div className={`${compact ? "w-12 h-12" : "w-14 h-14"} rounded-xl flex items-center justify-center text-sm font-bold text-white`} style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initials}</div>
        )}
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white truncate font-sora">{r.profile?.full_name || r.aadhaar_name || "Unnamed"}</p>
          <p className="text-[11px] text-white/50 font-mono truncate">{r.profile?.phone || r.user_id}</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        <DetailRow icon={UserIcon} label="Aadhaar Name" value={r.aadhaar_name || "—"} />
        <DetailRow icon={Hash} label="Aadhaar Number" value={maskAadhaar(r.aadhaar_number)} mono />
        <DetailRow icon={Calendar} label="Date of Birth" value={fmtDate(r.date_of_birth)} />
        <DetailRow icon={Clock} label="Submitted" value={fmtDateTime(r.submitted_at)} />
        {r.digio_request_id && <DetailRow icon={Hash} label="Digio Request" value={r.digio_request_id} mono />}
        {r.verified_at && <DetailRow icon={CheckCircle2} label="Decided" value={fmtDateTime(r.verified_at)} last />}
      </div>
    </div>
  );
};
const DetailRow = ({ icon: Icon, label, value, mono = false, last = false }: { icon: any; label: string; value: string; mono?: boolean; last?: boolean }) => (
  <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${last ? "" : "border-b"}`} style={{ borderColor: "rgba(255,255,255,0.04)" }}>
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-white/40" />
      <span className="text-[10px] uppercase tracking-wider text-white/40 font-sora">{label}</span>
    </div>
    <span className={`text-[12px] text-white text-right ${mono ? "font-mono" : "font-sora"}`}>{value}</span>
  </div>
);

/* ─────────── Context-panel body ─────────── */
const KycPanelBody = ({
  r, maskAadhaar, fmtDate, fmtDateTime, queueTime, onApprove, onReject, onMoveReview,
}: {
  r: KycRow;
  maskAadhaar: (n: string | null) => string;
  fmtDate: (d: string | null) => string;
  fmtDateTime: (d: string | null) => string;
  queueTime: (d: string | null) => { label: string; hot: boolean };
  onApprove: () => void;
  onReject: () => void;
  onMoveReview: () => void;
}) => {
  const q = queueTime(r.submitted_at);
  const status = r.status || "pending";
  const canDecide = status === "pending" || status === "in_review";
  const initials = (r.profile?.full_name || r.aadhaar_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  const statusColor = status === "verified" ? C.success : status === "rejected" ? C.danger : status === "in_review" ? C.info : C.warning;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl p-4 border" style={{ background: `linear-gradient(135deg, ${statusColor}10, rgba(255,255,255,0.01))`, borderColor: `${statusColor}30` }}>
        <div className="flex items-center gap-3">
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})` }}>{initials}</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white truncate font-sora">{r.profile?.full_name || r.aadhaar_name || "Unnamed"}</p>
            <p className="text-[11px] text-white/50 font-mono truncate">{r.profile?.phone || "—"}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${statusColor}15`, color: statusColor }}>{status.replace("_", " ")}</span>
              {canDecide && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-semibold" style={{ color: q.hot ? C.warning : "rgba(255,255,255,0.5)" }}>
                  {q.hot && <AlertTriangle className="w-2.5 h-2.5" />}{q.label} in queue
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decision actions */}
      {canDecide && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onApprove} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95" style={{ background: `${C.success}10`, borderColor: `${C.success}25` }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: C.success }} />
            <span className="text-[10px] font-semibold font-sora" style={{ color: C.success }}>Approve</span>
          </button>
          <button onClick={onReject} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95" style={{ background: `${C.danger}10`, borderColor: `${C.danger}25` }}>
            <XCircle className="w-4 h-4" style={{ color: C.danger }} />
            <span className="text-[10px] font-semibold font-sora" style={{ color: C.danger }}>Reject</span>
          </button>
          <button onClick={onMoveReview} disabled={status === "in_review"} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: `${C.info}10`, borderColor: `${C.info}25` }}>
            <Clock className="w-4 h-4" style={{ color: C.info }} />
            <span className="text-[10px] font-semibold font-sora" style={{ color: C.info }}>In review</span>
          </button>
        </div>
      )}

      {/* Aadhaar document preview */}
      <AadhaarImagePreview kycId={r.id} hasDigio={!!r.digio_request_id} />

      {/* Identity details */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        <DetailRow icon={UserIcon} label="Aadhaar Name" value={r.aadhaar_name || "—"} />
        <DetailRow icon={Hash} label="Aadhaar Number" value={maskAadhaar(r.aadhaar_number)} mono />
        <DetailRow icon={Calendar} label="Date of Birth" value={fmtDate(r.date_of_birth)} />
        <DetailRow icon={Clock} label="Submitted" value={fmtDateTime(r.submitted_at)} />
        {r.digio_request_id && <DetailRow icon={Hash} label="Digio Request" value={r.digio_request_id} mono />}
        {r.verified_at && <DetailRow icon={CheckCircle2} label="Decided" value={fmtDateTime(r.verified_at)} last />}
      </div>

      {/* IDs */}
      <div className="rounded-xl p-3 border space-y-2" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-sora flex items-center gap-1.5"><FileText className="w-3 h-3" /> References</p>
        <button onClick={() => copy(r.id, "Request ID")} className="w-full flex items-center justify-between text-[11px] hover:text-white text-white/60 group">
          <span className="font-sora">Request ID</span>
          <span className="font-mono flex items-center gap-1.5">{r.id.slice(0, 8)}…{r.id.slice(-6)} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" /></span>
        </button>
        <button onClick={() => copy(r.user_id, "User ID")} className="w-full flex items-center justify-between text-[11px] hover:text-white text-white/60 group">
          <span className="font-sora">User ID</span>
          <span className="font-mono flex items-center gap-1.5">{r.user_id.slice(0, 8)}…{r.user_id.slice(-6)} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" /></span>
        </button>
      </div>
    </div>
  );
};

/* ─────────── Aadhaar document preview ─────────── */
const AadhaarImagePreview = ({ kycId, hasDigio }: { kycId: string; hasDigio: boolean }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const fetchImage = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("digio-fetch-document", {
        body: { kyc_request_id: kycId },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      if (!data?.image_url) throw new Error("No image returned");
      setImageUrl(data.image_url);
      setIsMock(!!data.mock);
    } catch (e: any) {
      setError(e.message || "Failed to fetch document");
      toast.error(e.message || "Failed to fetch document");
    } finally {
      setLoading(false);
    }
  };

  if (!hasDigio) {
    return (
      <div className="rounded-xl border p-4 text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        <ImageIcon className="w-6 h-6 mx-auto text-white/20 mb-1.5" />
        <p className="text-[10px] text-white/40 font-sora">No Digio request linked — document preview unavailable</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3 h-3 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-sora">Aadhaar document</span>
            {isMock && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: `${C.warning}15`, color: C.warning }}>Mock</span>}
          </div>
          {imageUrl && (
            <button onClick={() => setZoomed(true)} className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 font-sora">
              <Maximize2 className="w-2.5 h-2.5" /> Expand
            </button>
          )}
        </div>

        {!imageUrl && !loading && !error && (
          <div className="p-5 text-center">
            <ImageIcon className="w-8 h-8 mx-auto text-white/20 mb-2" />
            <p className="text-[11px] text-white/50 font-sora mb-3">View the actual Aadhaar document submitted via Digio</p>
            <button onClick={fetchImage}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold font-sora transition-all"
              style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30` }}>
              <Download className="w-3 h-3" /> Load document
            </button>
          </div>
        )}

        {loading && (
          <div className="p-8 text-center">
            <Loader2 className="w-5 h-5 mx-auto text-white/40 animate-spin mb-2" />
            <p className="text-[10px] text-white/40 font-sora">Fetching from Digio…</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-5 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" style={{ color: C.danger }} />
            <p className="text-[11px] font-sora mb-2" style={{ color: C.danger }}>{error}</p>
            <button onClick={fetchImage} className="text-[10px] text-white/60 hover:text-white underline font-sora">Retry</button>
          </div>
        )}

        {imageUrl && (
          <button onClick={() => setZoomed(true)} className="block w-full">
            <img src={imageUrl} alt="Aadhaar document" className="w-full h-auto cursor-zoom-in" />
          </button>
        )}
      </div>

      {zoomed && imageUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.92)", animation: "fade-in 0.2s ease-out" }} onClick={() => setZoomed(false)}>
          <button onClick={() => setZoomed(false)} className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
            <X className="w-5 h-5" />
          </button>
          <img src={imageUrl} alt="Aadhaar document (zoomed)" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default AdminKyc;
