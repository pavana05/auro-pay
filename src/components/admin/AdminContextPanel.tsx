import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { X } from "lucide-react";

export interface ContextPanelData {
  title: string;
  subtitle?: string;
  body: ReactNode;
}

interface Ctx {
  open: boolean;
  data: ContextPanelData | null;
  show: (d: ContextPanelData) => void;
  hide: () => void;
}

const PanelCtx = createContext<Ctx>({ open: false, data: null, show: () => {}, hide: () => {} });

export const useContextPanel = () => useContext(PanelCtx);

export const AdminContextPanelProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<ContextPanelData | null>(null);
  const show = useCallback((d: ContextPanelData) => setData(d), []);
  const hide = useCallback(() => setData(null), []);

  return (
    <PanelCtx.Provider value={{ open: !!data, data, show, hide }}>
      {children}
    </PanelCtx.Provider>
  );
};

/** Slide-in panel — always fixed, works reliably on every viewport. */
export const AdminContextPanelSurface = () => {
  const { open, data, hide } = useContextPanel();

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  if (!data) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(5,6,9,0.55)", backdropFilter: "blur(8px)" }}
        onClick={hide}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-screen w-[380px] max-w-[92vw] z-[61] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "rgba(12,14,19,0.96)",
          backdropFilter: "blur(28px) saturate(1.4)",
          borderLeft: "1px solid rgba(200,149,46,0.18)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-full flex flex-col">
          <div
            className="px-5 h-16 flex items-center justify-between border-b shrink-0"
            style={{ borderColor: "rgba(200,149,46,0.12)" }}
          >
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white font-sora truncate">{data.title}</h3>
              {data.subtitle && (
                <p className="text-[10px] text-white/40 font-sora truncate">{data.subtitle}</p>
              )}
            </div>
            <button
              onClick={hide}
              className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
              title="Close (Esc)"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{data.body}</div>
        </div>
      </aside>
    </>
  );
};
