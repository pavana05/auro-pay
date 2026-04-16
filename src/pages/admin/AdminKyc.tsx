import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Check, X, ShieldCheck, Clock, User, AlertTriangle } from "lucide-react";

interface KycRequest {
  id: string;
  user_id: string;
  aadhaar_number: string | null;
  aadhaar_name: string | null;
  status: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  profile?: { full_name: string | null; phone: string | null };
}

const AdminKyc = () => {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedKyc, setSelectedKyc] = useState<KycRequest | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase.from("kyc_requests").select("*").order("submitted_at", { ascending: false });
    if (statusFilter !== "All") query = query.eq("status", statusFilter.toLowerCase());
    const { data } = await query;
    const enriched = await Promise.all(
      ((data || []) as KycRequest[]).map(async (r) => {
        const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", r.user_id).single();
        return { ...r, profile: p || undefined };
      })
    );
    setRequests(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel("admin-kyc")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kyc_requests" }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [statusFilter]);

  const logAudit = async (action: string, targetId: string, details: Record<string, any> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ admin_user_id: user.id, action, target_type: "kyc", target_id: targetId, details });
  };

  // Confetti burst
  const triggerConfetti = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 2500);
  }, []);

  const approve = async (req: KycRequest) => {
    await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", req.id);
    await supabase.from("profiles").update({ kyc_status: "verified", aadhaar_verified: true }).eq("id", req.user_id);
    await logAudit("kyc_approve", req.id, { user_name: req.aadhaar_name });
    triggerConfetti();
    toast.success("KYC approved successfully! 🎉");
    setSelectedKyc(null);
    fetchRequests();
  };

  const reject = async () => {
    if (!rejectId) return;
    const req = requests.find(r => r.id === rejectId);
    await supabase.from("kyc_requests").update({ status: "rejected" }).eq("id", rejectId);
    await supabase.from("profiles").update({ kyc_status: "rejected" }).eq("id", req?.user_id || "");
    await logAudit("kyc_reject", rejectId, { reason: rejectReason, user_name: req?.aadhaar_name });
    toast.success("KYC rejected");
    setRejectId(null);
    setRejectReason("");
    setSelectedKyc(null);
    fetchRequests();
  };

  const maskAadhaar = (num: string | null) => num ? `XXXX XXXX ${num.slice(-4)}` : "—";
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const verifiedCount = requests.filter(r => r.status === "verified").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 relative">
        {/* Ambient */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-0 w-[250px] h-[250px] rounded-full bg-teal-500/[0.02] blur-[100px] pointer-events-none" />

        {/* Confetti overlay */}
        {confettiActive && (
          <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  background: ['#c8952e', '#5a9e6f', '#e8c56d', '#e06060', '#60a5fa', '#d4a84b'][i % 6],
                  animation: `confetti-fall ${1.5 + Math.random() * 1.5}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }} />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="relative z-10" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-xs text-muted-foreground mt-1">Review and manage identity verification requests</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending Review", value: pendingCount, color: "text-warning", icon: Clock, glow: "hover:shadow-[0_0_30px_hsl(45_93%_47%/0.08)]" },
            { label: "Verified", value: verifiedCount, color: "text-success", icon: ShieldCheck, glow: "hover:shadow-[0_0_30px_hsl(142_71%_45%/0.08)]" },
            { label: "Rejected", value: rejectedCount, color: "text-destructive", icon: AlertTriangle, glow: "hover:shadow-[0_0_30px_hsl(0_84%_60%/0.08)]" },
          ].map((s, i) => (
            <div key={s.label}
              className={`group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-primary/15 transition-all duration-500 ${s.glow} relative overflow-hidden`}
              style={{ animation: `slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.08 + i * 0.06}s both` }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.color} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl w-fit border border-white/[0.04]" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.25s both" }}>
          {["All", "Pending", "Verified", "Rejected"].map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                statusFilter === f ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(42_78%_55%/0.1)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden backdrop-blur-sm" style={{ animation: "slide-up-spring 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["User", "Phone", "Aadhaar", "Submitted", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-4 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td colSpan={6} className="py-4 px-5">
                      <div className="h-5 rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0 bg-white/[0.03]" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" style={{ animation: "admin-shimmer 2s infinite" }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No KYC requests found</p>
                </td></tr>
              ) : (
                requests.map((r, i) => (
                  <tr key={r.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedKyc(r)}
                    style={{ animation: `slide-up-spring 0.4s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 0.03, 0.3)}s both` }}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-[11px] font-semibold text-primary group-hover:scale-105 transition-transform duration-300">
                          {(r.profile?.full_name || r.aadhaar_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{r.profile?.full_name || r.aadhaar_name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-muted-foreground text-xs">{r.profile?.phone || "—"}</td>
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">{maskAadhaar(r.aadhaar_number)}</td>
                    <td className="py-3.5 px-5 text-xs text-muted-foreground">{formatDate(r.submitted_at)}</td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        r.status === "verified" ? "bg-success/10 text-success border border-success/20" :
                        r.status === "rejected" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                        "bg-warning/10 text-warning border border-warning/20"
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
                      {r.status === "pending" && (
                        <div className="flex gap-1.5">
                          <button onClick={() => approve(r)} className="p-2.5 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 hover:border-success/30 transition-all duration-200 active:scale-90 hover:shadow-[0_0_15px_hsl(142_71%_45%/0.15)]" title="Approve">
                            <Check className="w-3.5 h-3.5 text-success" />
                          </button>
                          <button onClick={() => setRejectId(r.id)} className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/30 transition-all duration-200 active:scale-90 hover:shadow-[0_0_15px_hsl(0_84%_60%/0.15)]" title="Reject">
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* KYC Detail Modal */}
        {selectedKyc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setSelectedKyc(null)} />
            <div className="relative w-[480px] max-w-[92vw] bg-card/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.5)] animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent rounded-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">KYC Details</h3>
                    <p className="text-xs text-muted-foreground">{selectedKyc.profile?.full_name || "User"}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedKyc(null)} className="p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-0 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden mb-6 relative z-10">
                {[
                  { label: "Full Name", value: selectedKyc.aadhaar_name || "—" },
                  { label: "Aadhaar", value: maskAadhaar(selectedKyc.aadhaar_number) },
                  { label: "Phone", value: selectedKyc.profile?.phone || "—" },
                  { label: "Submitted", value: formatDate(selectedKyc.submitted_at) },
                  { label: "Status", value: selectedKyc.status || "—" },
                  { label: "Verified At", value: formatDate(selectedKyc.verified_at ?? null) },
                ].map((item, idx) => (
                  <div key={item.label} className={`flex justify-between items-center px-4 py-3 hover:bg-white/[0.02] transition-colors ${idx < 5 ? "border-b border-white/[0.04]" : ""}`}>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {selectedKyc.status === "pending" && (
                <div className="flex gap-3 relative z-10">
                  <button onClick={() => setRejectId(selectedKyc.id)} className="flex-1 h-11 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-all duration-300">
                    Reject
                  </button>
                  <button onClick={() => approve(selectedKyc)} className="flex-1 h-11 rounded-xl bg-success text-sm font-semibold hover:shadow-[0_0_30px_hsl(142_71%_45%/0.2)] transition-all duration-300" style={{ color: "white" }}>
                    ✓ Approve KYC
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setRejectId(null)} />
            <div className="relative w-96 bg-card/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.5)] animate-scale-in">
              <h3 className="text-base font-bold mb-4">Reject KYC Request</h3>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..."
                className="w-full h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/40 transition-colors" />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRejectId(null)} className="flex-1 h-11 rounded-xl border border-white/[0.06] text-sm font-medium hover:bg-white/[0.03] transition-colors">Cancel</button>
                <button onClick={reject} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminKyc;
