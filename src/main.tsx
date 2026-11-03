import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { safeGetItem } from "./utils/storageUtils";

// Initialize application theme from saved preferences or default to Catppuccin Mocha
const savedTheme = safeGetItem("stagenode_theme") || "catppuccin-mocha";
try {
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (document.body) {
    document.body.setAttribute("data-theme", savedTheme);
  }
} catch (_) {}

// Global emergency fallback to catch any module-level, network, or async failures outside React
function renderEmergencyFallback(errorTitle: string, errorMessage: string) {
  const root = document.getElementById("root");
  if (!root) return;
  // If React already rendered, let React's ErrorBoundary handle it
  if (root.children.length > 0 && !root.querySelector(".emergency-fatal-error")) return;

  root.innerHTML = `
    <div class="emergency-fatal-error" style="display:flex;align-items:center;justify-content:center;height:100vh;width:100vw;background-color:#1e1e2e;color:#cdd6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;box-sizing:border-box;">
      <div style="max-width:520px;width:100%;background:#181825;border:1px solid #313244;border-radius:14px;padding:32px;box-shadow:0 16px 40px rgba(0,0,0,0.45);text-align:center;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(243,139,168,0.15);color:#f38ba8;margin-bottom:16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <h2 style="font-size:1.15rem;font-weight:600;margin:0 0 8px 0;color:#cdd6f4;">${errorTitle}</h2>
        <p style="font-size:0.84rem;color:#a6adc8;line-height:1.5;margin:0 0 16px 0;">Stagger encountered a fatal error during initialization. Your git repositories remain unaffected.</p>
        <div style="background:#11111b;border:1px solid #313244;border-radius:6px;padding:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:0.75rem;color:#f38ba8;text-align:left;word-break:break-all;margin-bottom:20px;max-height:140px;overflow-y:auto;">
          ${errorMessage}
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button id="btn-emergency-reload" style="background:#cba6f7;color:#11111b;border:none;border-radius:7px;padding:8px 16px;font-size:0.82rem;font-weight:600;cursor:pointer;">
            Reload App
          </button>
          <button id="btn-emergency-clear" style="background:transparent;color:#f38ba8;border:1px solid rgba(243,139,168,0.3);border-radius:7px;padding:8px 14px;font-size:0.82rem;font-weight:500;cursor:pointer;">
            Reset Workspace Cache
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-emergency-reload")?.addEventListener("click", () => {
    window.location.reload();
  });
  document.getElementById("btn-emergency-clear")?.addEventListener("click", () => {
    try {
      localStorage.removeItem("sn_workspaces");
      localStorage.removeItem("sn_current_repo");
    } catch (_) {}
    window.location.reload();
  });
}

window.addEventListener("error", (event) => {
  console.error("Global startup error caught:", event.error || event.message);
  renderEmergencyFallback("Application Startup Error", event.error?.message || event.message || "An unhandled script error occurred.");
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Global unhandled rejection caught:", event.reason);
  renderEmergencyFallback("Initialization Error", event.reason?.message || String(event.reason) || "An unhandled promise rejection occurred.");
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
