// Reusable header used by every inner screen. Compact rounded-square back
// button, gold-accent typography, optional subtitle and right-slot. Sticky
// by default with a backdrop blur so long pages keep the header readable.
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import { useSafeBack } from "@/lib/safe-back";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Slot rendered to the right of the title (e.g. action button or icon). */
  right?: ReactNode;
  /** Override default safeBack behaviour. */
  onBack?: () => void;
  /** Override the safeBack fallback path (e.g. "/profile"). */
  fallback?: string;
  /** Hide the back button entirely (for top-of-stack screens). */
  hideBack?: boolean;
  /** Render with sticky-top + backdrop blur. Default true. */
  sticky?: boolean;
  className?: string;
}

const PageHeader = ({
  title,
  subtitle,
  right,
  onBack,
  fallback,
  hideBack = false,
  sticky = true,
  className,
}: PageHeaderProps) => {
  const safeBack = useSafeBack(fallback);
  const handleBack = () => {
    haptic.light();
    (onBack ?? safeBack)();
  };

  return (
    <header
      className={cn(
        // pt-safe respects status-bar inset on Android/iOS; the additional
        // pt-6 keeps the visual rhythm we had before on web.
        "px-5 pt-safe pb-4 flex items-end gap-3 z-20",
        sticky && "sticky top-0 backdrop-blur-xl",
        className,
      )}
      style={{
        ...(sticky ? { background: "rgba(10,12,15,0.85)" } : {}),
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
      }}
    >
      {!hideBack && (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center active:scale-90 transition border border-white/[0.05] shrink-0"
          style={{ background: "hsl(220 15% 8%)" }}
        >
          <ArrowLeft className="w-[18px] h-[18px] text-white/70" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-[19px] font-bold tracking-[-0.5px] text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-white/40 font-medium truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </header>
  );
};

export default PageHeader;
