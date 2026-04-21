import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppCrashShell({
  label,
  error,
  onRetry,
}: {
  label: string;
  error?: Error | null;
  onRetry?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-md border border-destructive/40 bg-card/95 p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-card-foreground">{label} crashed</h1>
            <p className="mt-1 text-sm text-muted-foreground">{error?.message || "An unexpected error stopped the app from rendering."}</p>
          </div>
        </div>

        {error?.stack && (
          <pre className="max-h-60 overflow-auto rounded-sm border border-border bg-secondary/70 p-3 text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {error.stack}
          </pre>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={onRetry} className="rounded-sm">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
          <Button type="button" variant="outline" className="rounded-sm" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}