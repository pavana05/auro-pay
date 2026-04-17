import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Wrench, ShieldCheck } from "lucide-react";

/**
 * Site-wide gate that shows a maintenance splash to all non-admin users
 * when `maintenance_mode` is on. Admins, /reset-password, and /admin/* are
 * always allowed through so the toggle remains accessible.
 */
export const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { isOn, loading: settingsLoading } = useAppSettings();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const location = useLocation();

  if (settingsLoading || adminLoading) return <>{children}</>;

  const maintenance = isOn("maintenance_mode");
  const allowedPath =
    location.pathname === "/reset-password" ||
    location.pathname.startsWith("/admin");

  if (!maintenance || isAdmin || allowedPath) return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center font-sora"
      style={{ background: "#0a0c0f" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[520px] h-[520px] rounded-full blur-[140px] opacity-30"
          style={{ top: "-15%", left: "-10%", background: "radial-gradient(circle, hsl(42 78% 55% / 0.5), transparent 70%)" }}
        />
        <div
          className="absolute w-[520px] h-[520px] rounded-full blur-[140px] opacity-25"
          style={{ bottom: "-15%", right: "-10%", background: "radial-gradient(circle, hsl(38 80% 45% / 0.5), transparent 70%)" }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-sm rounded-[24px] p-8"
        style={{
          background: "rgba(13,14,18,0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(200,149,46,0.18)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(200,149,46,0.15)", border: "1px solid rgba(200,149,46,0.35)" }}
        >
          <Wrench className="w-7 h-7" style={{ color: "#c8952e" }} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">We'll be right back</h1>
        <p className="text-[13px] text-white/60 leading-relaxed">
          AuroPay is undergoing scheduled maintenance. Your wallet and money are safe.
          Check back in a few minutes.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
          <ShieldCheck className="w-3 h-3" /> Funds protected
        </div>
      </div>
    </div>
  );
};

export default MaintenanceGate;
