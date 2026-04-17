import { createContext, useContext, useState, ReactNode, useCallback } from "react";
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

/** The slide-in panel itself; mounted by AdminLayout */
export const AdminContextPanelSurface = () => {
  const { open, data, hide } = useContextPanel();

  return (
    <>
      {/* Mobile/tablet overlay backdrop (xl: hidden — desktop uses inline column) */}
      {open && (
        <div
          className="fixed inset-0 z-40 xl:hidden"
          style={{ background: "rgba(5,6,9,0.5)", backdropFilter: "blur(8px)", animation: "fade-in 0.2s ease-out" }}
          onClick={hide}
        />
      )}

      <aside
        className={`
          fixed xl:sticky top-0 right-0 h-screen xl:h-[calc(100vh-64px)] xl:top-16
          w-[340px] max-w-[92vw] z-50 xl:z-10
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${open ? "translate-x-0" : "translate-x-full xl:translate-x-0 xl:hidden"}
        `}
        style={{
          background: "rgba(12,14,19,0.85)",
          backdropFilter: "blur(28px) saturate(1.4)",
          borderLeft: "1px solid rgba(200,149,46,0.12)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {data && (
          <div className="h-full flex flex-col">
            <div className="px-5 h-16 flex items-center justify-between border-b shrink-0" style={{ borderColor: "rgba(200,149,46,0.08)" }}>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white font-sora truncate">{data.title}</h3>
                {data.subtitle && <p className="text-[10px] text-white/40 font-sora truncate">{data.subtitle}</p>}
              </div>
              <button
                onClick={hide}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{data.body}</div>
          </div>
        )}
      </aside>
    </>
  );
};
