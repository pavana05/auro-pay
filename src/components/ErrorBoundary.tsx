import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; label?: string; onRetry?: () => void }
interface State { hasError: boolean; error: Error | null }

/**
 * Card-level error boundary. Catches render errors in a section and shows a
 * recoverable retry card instead of crashing the entire page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary]", this.props.label || "section", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-[16px] p-6 flex items-start gap-3"
        style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.25)" }}>
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.33)" }}>
          <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">
            {this.props.label || "This section"} failed to load
          </h4>
          <p className="text-xs mt-1 text-white/55 break-words">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button onClick={this.reset}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
