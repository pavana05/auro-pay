import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Check, X, ShieldCheck, Clock, Filter, Eye, User, FileText } from "lucide-react";

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

  const approve = async (req: KycRequest) => {
    await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", req.id);
    await supabase.from("profiles").update({ kyc_status: "verified", aadhaar_verified: true }).eq("id", req.user_id);
    await logAudit("kyc_approve", req.id, { user_name: req.aadhaar_name });
    toast.success("KYC approved");
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
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-xs text-muted-foreground mt-1">Review and manage identity verification requests</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending Review", value: pendingCount, color: "text-warning", bg: "bg-warning/10" },
            { label: "Verified", value: verifiedCount, color: "text-success", bg: "bg-success/10" },
            { label: "Rejected", value: rejectedCount, color: "text-destructive", bg: "bg-destructive/10" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-white/[0.02] rounded-xl w-fit border border-white/[0.04]">
          {["All", "Pending", "Verified", "Rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                statusFilter === f
                  ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(42_78%_55%/0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["User", "Phone", "Aadhaar", "Submitted", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3.5 px-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-4 px-5"><div className="h-5 bg-white/[0.03] rounded-lg animate-pulse" /></td></tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No KYC requests found</p>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedKyc(r)}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-[11px] font-semibold text-primary">
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
                        r.status === "verified" ? "bg-success/10 text-success" :
                        r.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5" onClick={e => e.stopPropagation()}>
                      {r.status === "pending" && (
                        <div className="flex gap-1.5">
                          <button onClick={() => approve(r)} className="p-2 rounded-xl bg-success/10 hover:bg-success/20 transition-all duration-200 active:scale-90" title="Approve">
                            <Check className="w-3.5 h-3.5 text-success" />
                          </button>
                          <button onClick={() => setRejectId(r.id)} className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-all duration-200 active:scale-90" title="Reject">
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

        {/* KYC Detail Drawer */}
        {selectedKyc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={() => setSelectedKyc(null)} />
            <div className="relative w-[480px] max-w-[92vw] bg-card border border-white/[0.06] rounded-2xl p-6 animate-scale-in shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
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

              <div className="space-y-0 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden mb-6">
                {[
                  { label: "Full Name", value: selectedKyc.aadhaar_name || "—" },
                  { label: "Aadhaar", value: maskAadhaar(selectedKyc.aadhaar_number) },
                  { label: "Phone", value: selectedKyc.profile?.phone || "—" },
                  { label: "Submitted", value: formatDate(selectedKyc.submitted_at) },
                  { label: "Status", value: selectedKyc.status || "—" },
                  { label: "Verified At", value: formatDate(selectedKyc.verified_at ?? null) },
                ].map((item, idx) => (
                  <div key={item.label} className={`flex justify-between items-center px-4 py-3 ${idx < 5 ? "border-b border-white/[0.04]" : ""}`}>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {selectedKyc.status === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => setRejectId(selectedKyc.id)} className="flex-1 h-11 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">
                    Reject
                  </button>
                  <button onClick={() => approve(selectedKyc)} className="flex-1 h-11 rounded-xl bg-success text-success-foreground text-sm font-semibold hover:opacity-90 transition-opacity" style={{ color: "white" }}>
                    Approve KYC
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
            <div className="relative w-96 bg-card border border-white/[0.06] rounded-2xl p-6 animate-scale-in shadow-2xl">
              <h3 className="text-base font-bold mb-4">Reject KYC Request</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/40 transition-colors"
              />
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
