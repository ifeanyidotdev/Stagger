import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Trash2, Copy, Check } from "lucide-react";
import { clearWorkspaceCache } from "../../utils/storageUtils";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
  resetting: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    resetting: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an unhandled React error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetWorkspaces = (): void => {
    this.setState({ resetting: true });
    try {
      clearWorkspaceCache();
    } finally {
      setTimeout(() => {
        window.location.reload();
      }, 150);
    }
  };

  private handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const text = [
      `Stagger Desktop Error Report`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${error?.name}: ${error?.message}`,
      `Stack:\n${error?.stack || "No stack trace"}`,
      `Component Stack:\n${errorInfo?.componentStack || "No component stack"}`,
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (_) {}
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, copied, resetting } = this.state;
      const errorMessage = error?.message || "An unexpected error occurred during rendering.";

      return (
        <div className="error-boundary-screen" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          backgroundColor: "var(--bg-app, #1e1e2e)",
          color: "var(--color-text-main, #cdd6f4)",
          fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
          padding: "24px",
          boxSizing: "border-box",
          overflowY: "auto",
        }}>
          <div className="error-boundary-card" style={{
            maxWidth: "540px",
            width: "100%",
            backgroundColor: "var(--bg-panel, #181825)",
            border: "1px solid var(--border-color, #313244)",
            borderRadius: "14px",
            padding: "32px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
            textAlign: "center",
            boxSizing: "border-box",
          }}>
            {/* Warning Icon Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              backgroundColor: "rgba(243, 139, 168, 0.12)",
              color: "var(--color-conflict, #f38ba8)",
              marginBottom: "16px",
            }}>
              <AlertTriangle size={26} strokeWidth={2.2} />
            </div>

            {/* Title & Description */}
            <h1 style={{
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--color-text-bright, #cdd6f4)",
              margin: "0 0 8px 0",
              letterSpacing: "-0.01em",
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: "0.86rem",
              color: "var(--color-text-muted, #a6adc8)",
              lineHeight: 1.5,
              margin: "0 0 20px 0",
            }}>
              Stagger encountered an unexpected rendering error on startup. Your git repositories and local files remain completely safe.
            </p>

            {/* Error Message Pane with Copy Button */}
            <div style={{
              position: "relative",
              backgroundColor: "var(--bg-input, #11111b)",
              border: "1px solid var(--border-color, #313244)",
              borderRadius: "8px",
              marginBottom: "24px",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 42px 12px 14px",
                fontSize: "0.78rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                color: "var(--color-conflict, #f38ba8)",
                textAlign: "left",
                wordBreak: "break-word",
                maxHeight: "110px",
                overflowY: "auto",
                lineHeight: 1.45,
              }}>
                {errorMessage}
              </div>
              <button
                type="button"
                onClick={this.handleCopyError}
                title={copied ? "Copied to clipboard" : "Copy error message"}
                aria-label="Copy error message"
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "26px",
                  height: "26px",
                  borderRadius: "5px",
                  border: "1px solid var(--border-color, #313244)",
                  backgroundColor: "var(--bg-panel, #181825)",
                  color: copied ? "var(--color-staged, #a6e3a1)" : "var(--color-text-muted, #a6adc8)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  padding: 0,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              <button
                type="button"
                onClick={this.handleReload}
                disabled={resetting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "var(--accent-purple, #cba6f7)",
                  color: "#11111b",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  border: "none",
                  borderRadius: "7px",
                  padding: "8px 18px",
                  cursor: resetting ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s ease",
                }}
              >
                <RotateCcw size={13} />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetWorkspaces}
                disabled={resetting}
                title="Clears saved workspace paths in case a corrupted repository causes the crash"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "transparent",
                  color: "var(--color-conflict, #f38ba8)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  border: "1px solid rgba(243, 139, 168, 0.3)",
                  borderRadius: "7px",
                  padding: "8px 16px",
                  cursor: resetting ? "not-allowed" : "pointer",
                }}
              >
                <Trash2 size={13} />
                <span>{resetting ? "Resetting..." : "Reset Workspace Cache"}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
