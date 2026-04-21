import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import AppCrashShell from "@/components/AppCrashShell";

interface Props {
  children: ReactNode;
  label?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack || "" });
    console.error("[ErrorBoundary]", this.props.label || "section", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, componentStack: "" });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fullScreen) {
      return <AppCrashShell label={this.props.label || "App"} error={this.state.error} onRetry={this.reset} />;
    }

    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-card-foreground">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">{this.props.label || "This section"} failed to load</h4>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          {this.state.componentStack && (
            <details className="mt-3 rounded-sm border border-border bg-card/70 p-3 text-[11px] text-muted-foreground">
              <summary className="cursor-pointer list-none font-medium text-card-foreground">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.componentStack}</pre>
            </details>
          )}
          <button
            onClick={this.reset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
