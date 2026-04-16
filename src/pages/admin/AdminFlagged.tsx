import AdminLayout from "@/components/AdminLayout";
import { Flag, AlertTriangle } from "lucide-react";

const C = { cardBg: "rgba(13,14,18,0.7)", border: "rgba(200,149,46,0.10)", textPrimary: "#ffffff", textMuted: "rgba(255,255,255,0.3)", primary: "#c8952e" };

const AdminFlagged = () => (
  <AdminLayout>
    <div className="p-4 lg:p-8 space-y-6">
      <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Flagged Accounts</h1>
      <div className="rounded-[16px] p-8 flex flex-col items-center justify-center" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <Flag className="w-12 h-12 mb-4" style={{ color: C.textMuted }} />
        <p className="text-sm font-medium" style={{ color: C.textPrimary }}>No flagged accounts</p>
        <p className="text-xs mt-1" style={{ color: C.textMuted }}>Accounts flagged by admins will appear here for review</p>
      </div>
    </div>
  </AdminLayout>
);

export default AdminFlagged;
