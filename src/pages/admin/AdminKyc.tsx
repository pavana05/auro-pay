import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface KycRequest {
  id: string;
  user_id: string;
  aadhaar_number: string | null;
  aadhaar_name: string | null;
  status: string | null;
  submitted_at: string | null;
  profile?: { full_name: string | null; phone: string | null };
}

const AdminKyc = () => {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase.from("kyc_requests").select("*").order("submitted_at", { ascending: false });
    if (statusFilter !== "All") query = query.eq("status", statusFilter.toLowerCase());
    const { data } = await query;

    // Enrich with profile data
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

  const approve = async (req: KycRequest) => {
    await supabase.from("kyc_requests").update({ status: "verified", verified_at: new Date().toISOString() }).eq("id", req.id);
    await supabase.from("profiles").update({ kyc_status: "verified", aadhaar_verified: true }).eq("id", req.user_id);
    toast.success("KYC approved");
    fetchRequests();
  };

  const reject = async () => {
    if (!rejectId) return;
    await supabase.from("kyc_requests").update({ status: "rejected" }).eq("id", rejectId);
    await supabase.from("profiles").update({ kyc_status: "rejected" }).eq("id", requests.find(r => r.id === rejectId)?.user_id || "");
    toast.success("KYC rejected");
    setRejectId(null);
    setRejectReason("");
    fetchRequests();
  };

  const maskAadhaar = (num: string | null) => {
    if (!num) return "—";
    return `XXXX XXXX ${num.slice(-4)}`;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-[22px] font-semibold mb-6">KYC Requests</h1>

        <div className="flex gap-3 mb-6">
          {["All", "Pending", "Verified", "Rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-pill text-xs font-medium transition-all duration-200 ${
                statusFilter === f ? "gradient-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-border-active"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="rounded-lg bg-card border border-border card-glow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["User", "Phone", "Aadhaar", "Submitted", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-4"><div className="h-5 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No KYC requests</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{r.profile?.full_name || r.aadhaar_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{r.profile?.phone || "—"}</td>
                    <td className="py-3 px-4 font-mono text-xs">{maskAadhaar(r.aadhaar_number)}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-pill ${
                        r.status === "verified" ? "bg-success/20 text-success" :
                        r.status === "rejected" ? "bg-destructive/20 text-destructive" :
                        "bg-warning/20 text-warning"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <button onClick={() => approve(r)} className="p-1.5 rounded-lg bg-success/10 hover:bg-success/20 transition-colors" title="Approve">
                            <Check className="w-3.5 h-3.5 text-success" />
                          </button>
                          <button onClick={() => setRejectId(r.id)} className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors" title="Reject">
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

        {/* Reject Modal */}
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setRejectId(null)} />
            <div className="relative w-96 bg-card border border-border rounded-lg p-6 card-glow animate-fade-in-up">
              <h3 className="text-base font-semibold mb-4">Reject KYC Request</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="input-auro w-full h-24 resize-none py-3"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRejectId(null)} className="flex-1 h-10 rounded-pill border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={reject} className="flex-1 h-10 rounded-pill bg-destructive text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors">Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminKyc;
