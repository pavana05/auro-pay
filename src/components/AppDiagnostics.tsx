import { useEffect, useState } from "react";
import { Activity, Bug, ChevronDown, ChevronUp, Route, ShieldCheck, UserRound } from "lucide-react";
import { useAppDiagnostics } from "@/lib/app-diagnostics";
import { Button } from "@/components/ui/button";

const fmtTime = (value: number) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card/70 px-3 py-2 text-[11px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground">{value}</span>
  </div>
);

export default function AppDiagnostics() {
  const diagnostics = useAppDiagnostics();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("diag") === "1") {
      setEnabled(true);
      setOpen(true);
    }
  }, []);

  if (!enabled) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setEnabled(true);
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-[120] h-9 rounded-sm border border-border bg-card/85 px-3 text-xs shadow-lg"
      >
        <Bug className="h-3.5 w-3.5" /> Debug
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[120] w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border bg-background/95 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-border bg-card/80 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" /> App diagnostics
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-3 p-3 text-xs">
          <div className="grid gap-2">
            <StatRow label="Route" value={diagnostics.route} />
            <StatRow label="Phase" value={diagnostics.phase} />
            <StatRow label="Auth" value={`${diagnostics.auth.state}${diagnostics.auth.detail ? ` · ${diagnostics.auth.detail}` : ""}`} />
            <StatRow label="Session" value={diagnostics.sessionResolved ? "resolved" : "pending"} />
            <StatRow label="Onboarding" value={diagnostics.onboardingSeen === null ? "unknown" : diagnostics.onboardingSeen ? "seen" : "not seen"} />
          </div>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><Route className="h-3.5 w-3.5" /> Gates</div>
            <div className="grid gap-2">
              {Object.entries(diagnostics.gates).length ? Object.entries(diagnostics.gates).map(([key, value]) => (
                <StatRow key={key} label={key} value={`${value.state}${value.detail ? ` · ${value.detail}` : ""}${value.updatedAt ? ` · ${fmtTime(value.updatedAt)}` : ""}`} />
              )) : <StatRow label="status" value="No gate events yet" />}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Data fetches</div>
            <div className="grid gap-2">
              {Object.entries(diagnostics.fetches).length ? Object.entries(diagnostics.fetches).map(([key, value]) => (
                <StatRow key={key} label={key} value={`${value.state}${value.detail ? ` · ${value.detail}` : ""}${value.updatedAt ? ` · ${fmtTime(value.updatedAt)}` : ""}`} />
              )) : <StatRow label="status" value="No fetches recorded yet" />}
            </div>
          </section>

          <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {diagnostics.userId ?? "anonymous"}</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setEnabled(false)}>Hide</Button>
          </div>
        </div>
      )}
    </div>
  );
}