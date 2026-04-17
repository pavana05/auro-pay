import { useEffect, useState, ReactNode, MouseEvent } from "react";
import { createPortal } from "react-dom";

export interface ContextAction {
  label: string;
  icon?: any;
  onClick: () => void;
  destructive?: boolean;
  divider?: boolean;
}

interface Props {
  actions: ContextAction[];
  children: (handlers: { onContextMenu: (e: MouseEvent) => void }) => ReactNode;
}

/**
 * Right-click context menu wrapper. Pass actions and a render-prop child that
 * spreads the onContextMenu handler onto the row element.
 */
export const AdminContextMenu = ({ actions, children }: Props) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  const handleOpen = (e: MouseEvent) => {
    e.preventDefault();
    // Clamp to viewport
    const W = 200, H = actions.length * 36 + 8;
    const x = Math.min(e.clientX, window.innerWidth - W - 8);
    const y = Math.min(e.clientY, window.innerHeight - H - 8);
    setPos({ x, y });
  };

  return (
    <>
      {children({ onContextMenu: handleOpen })}
      {pos && createPortal(
        <div
          className="fixed z-[70] py-1 rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95"
          style={{
            left: pos.x, top: pos.y, minWidth: 200,
            background: "#0d0e12",
            border: "1px solid rgba(200,149,46,0.2)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {actions.map((a, i) => {
            if (a.divider) return <div key={i} className="my-1 mx-2 h-px" style={{ background: "rgba(200,149,46,0.1)" }} />;
            const Icon = a.icon;
            return (
              <button
                key={i}
                onClick={() => { a.onClick(); setPos(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors hover:bg-white/[0.04]"
                style={{ color: a.destructive ? "#ef4444" : "rgba(255,255,255,0.85)" }}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default AdminContextMenu;
