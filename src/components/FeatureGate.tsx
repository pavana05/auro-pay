import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSettings, type AppSettingKey } from "@/hooks/useAppSettings";
import { Sparkles, ArrowLeft, ShieldOff } from "lucide-react";

interface Props {
  /** The toggle key. If this setting is OFF, the children are NOT rendered. */
  flag: AppSettingKey;
  /** Friendly label for the unavailable screen. */
  label: string;
  children: ReactNode;
}

/**
 * Wrap a route's children with a feature flag. While settings are still loading
 * we render nothing (very brief) to avoid a flash. When OFF we show a polished
 * "Feature unavailable" screen instead of the real page.
 */
export const FeatureGate = ({ flag, label, children }: Props) => {
  const { isOn, loading } = useAppSettings();
  const navigate = useNavigate();

  if (loading) return null;
  if (isOn(flag)) return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center font-sora"
      style={{ background: "#0a0c0f" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[460px] h-[460px] rounded-full blur-[120px] opacity-25"
          style={{ top: "-15%", left: "-10%", background: "radial-gradient(circle, hsl(42 78% 55% / 0.5), transparent 70%)" }}
        />
        <div
          className="absolute w-[460px] h-[460px] rounded-full blur-[120px] opacity-20"
          style={{ bottom: "-15%", right: "-10%", background: "radial-gradient(circle, hsl(38 80% 45% / 0.5), transparent 70%)" }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-sm rounded-[24px] p-7"
        style={{
          background: "rgba(13,14,18,0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(200,149,46,0.18)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(200,149,46,0.15)", border: "1px solid rgba(200,149,46,0.35)" }}
        >
          <ShieldOff className="w-6 h-6" style={{ color: "#c8952e" }} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{label} unavailable</h1>
        <p className="text-[13px] text-white/60 leading-relaxed">
          This feature is currently disabled by administrators. It will be back as soon as it's re-enabled.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="mt-6 w-full h-11 rounded-xl flex items-center justify-center gap-2 font-semibold text-[13px] active:scale-[0.97] transition"
          style={{
            background: "linear-gradient(135deg, #c8952e, #a87a1f)",
            color: "#0a0c0f",
            boxShadow: "0 6px 20px rgba(200,149,46,0.35)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>
      </div>
    </div>
  );
};

export default FeatureGate;
