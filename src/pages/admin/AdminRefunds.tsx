import AdminLayout from "@/components/AdminLayout";
import { RefreshCw } from "lucide-react";

const C = { cardBg: "#0f0720", border: "rgba(139,92,246,0.12)", textPrimary: "#ffffff", textMuted: "rgba(255,255,255,0.3)" };

const AdminRefunds = () => (
  <AdminLayout>
    <div className="p-4 lg:p-8 space-y-6">
      <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Refunds & Disputes</h1>
      <div className="rounded-[16px] p-8 flex flex-col items-center justify-center" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <RefreshCw className="w-12 h-12 mb-4" style={{ color: C.textMuted }} />
        <p className="text-sm font-medium" style={{ color: C.textPrimary }}>No refund requests</p>
        <p className="text-xs mt-1" style={{ color: C.textMuted }}>Refund requests and disputes will appear here</p>
      </div>
    </div>
  </AdminLayout>
);

export default AdminRefunds;
