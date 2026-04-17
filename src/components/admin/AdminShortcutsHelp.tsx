import { forwardRef, useEffect, useState } from "react";
import { X, Command, Keyboard } from "lucide-react";

/**
 * Press ⌘/ (or Ctrl+/) to open. ESC to close.
 * Self-contained: listens for the shortcut globally so any admin page works.
 * Wrapped in forwardRef so parent layouts that attach refs (e.g. for HMR
 * probing) don't trigger React's "function components cannot be given refs" warning.
 */
export const AdminShortcutsHelp = forwardRef<HTMLDivElement>((_props, _ref) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const SHORTCUTS = [
    { keys: ["⌘", "K"], desc: "Open command palette / global search" },
    { keys: ["⌘", "/"], desc: "Show this shortcuts help" },
    { keys: ["ESC"], desc: "Close any open modal or panel" },
    { keys: ["Right-click"], desc: "Open context menu on table rows" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-[20px] overflow-hidden"
        style={{ background: "#0d0e12", border: "1px solid rgba(200,149,46,0.2)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(200,149,46,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{ background: "rgba(200,149,46,0.15)", border: "1px solid rgba(200,149,46,0.33)" }}>
              <Keyboard className="w-4 h-4" style={{ color: "#c8952e" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-white/40">Power-user navigation</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-white/[0.04] text-white/55">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.desc} className="flex items-center justify-between p-3 rounded-[10px]"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,149,46,0.08)" }}>
              <span className="text-xs text-white/70">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="text-[10px] font-mono px-2 py-1 rounded-[6px] font-semibold"
                    style={{ background: "rgba(200,149,46,0.15)", color: "#d4a84b", border: "1px solid rgba(200,149,46,0.33)" }}>
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminShortcutsHelp;
