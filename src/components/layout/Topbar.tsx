import React from 'react';
import { ChevronRight, Layers, History, FolderSync, LogOut, Sparkles, Settings, ArrowDown, ArrowUp, ArrowUpCircle, ArrowDownToLine, RefreshCw } from 'lucide-react';
import type { GitHubUser } from '../../types/git';
import type { AppUpdateInfo, UpdateStatus, UpdateDownloadProgress } from '../../types/settings';

interface TopbarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  activeTab: any;
  setActiveTab: (val: any) => void;
  currentBranch?: string;
  hasRepo?: boolean;
  unpushedCount?: number;
  behindCount?: number;
  githubToken: string | null;
  remoteUrl: string | null;
  setDialogType: (val: any) => void;
  setDialogInput: (val: string) => void;
  setDialogInput2: (val: string) => void;
  githubUser: GitHubUser | null;
  handleGitHubSignout: () => void;
  availableUpdate?: AppUpdateInfo | null;
  updateStatus?: UpdateStatus;
  updateProgress?: UpdateDownloadProgress | null;
  onStartDownload?: () => void;
  onRestartApp?: () => void;
  onOpenSettings?: (tab?: any) => void;
}

const Topbar: React.FC<TopbarProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  activeTab,
  setActiveTab,
  currentBranch,
  hasRepo,
  unpushedCount = 0,
  behindCount = 0,
  githubToken,
  remoteUrl: _remoteUrl,
  setDialogType,
  setDialogInput,
  setDialogInput2,
  githubUser,
  handleGitHubSignout,
  availableUpdate,
  updateStatus = 'idle',
  updateProgress,
  onStartDownload,
  onRestartApp,
  onOpenSettings,
}) => {
  return (
    <div className={`topbar ${sidebarCollapsed ? "sidebar-collapsed-topbar" : ""}`} data-tauri-drag-region>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
        {sidebarCollapsed && (
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(false)}
            title="Expand Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <div className="view-tabs">
          <button 
            className={`tab-button ${activeTab === "workspace" ? "active" : ""}`}
            onClick={() => setActiveTab("workspace")}
          >
            <Layers size={14} />
            <span>Workspace Staging</span>
          </button>
          <button 
            className={`tab-button ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={14} />
            <span>History Graph</span>
          </button>
        </div>

        {hasRepo && currentBranch && (
          <div 
            className="topbar-branch-pill" 
            title={`Active Branch: ${currentBranch}${behindCount > 0 ? ` • Origin is ahead by ${behindCount} commit(s)` : ""}${unpushedCount > 0 ? ` • ${unpushedCount} unpushed commit(s)` : ""}`}
          >
            <div className="topbar-branch-dot" />
            <span className="topbar-branch-name">{currentBranch}</span>
            {behindCount > 0 && (
              <span className="topbar-sync-tag behind" title={`Remote origin is ahead by ${behindCount} commit(s). Pull to update.`}>
                <ArrowDown size={10} />
                <span>{behindCount}</span>
              </span>
            )}
            {unpushedCount > 0 && (
              <span className="topbar-sync-tag ahead" title={`${unpushedCount} unpushed commit(s) ready to push.`}>
                <ArrowUp size={10} />
                <span>{unpushedCount}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Restored GitHub Auth Badge & Global Settings (Topbar Right-Side) */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* Update Indicators & Restart Trigger */}
        {updateStatus === 'ready' && (
          <button
            type="button"
            className="topbar-action-btn topbar-restart-btn"
            onClick={onRestartApp}
            title={availableUpdate?.version ? `Stagger v${availableUpdate.version} is downloaded and ready! Click to restart and apply update now.` : 'Update is downloaded and ready! Click to restart and apply update now.'}
          >
            <RefreshCw size={13} className="spin-icon-hover" />
            <span>Restart to Apply Update</span>
            {availableUpdate?.version && (
              <span className="topbar-update-version-tag">v{availableUpdate.version}</span>
            )}
          </button>
        )}

        {updateStatus === 'downloading' && (
          <button
            type="button"
            className="topbar-action-btn topbar-downloading-btn"
            title={`Downloading update v${availableUpdate?.version || ''} in background...`}
            style={{ cursor: "default" }}
          >
            <ArrowDownToLine size={13} className="spin-icon" />
            <span>
              Downloading{availableUpdate?.version ? ` v${availableUpdate.version}` : ''}
              {updateProgress?.percentage !== undefined && updateProgress?.percentage !== null ? ` (${updateProgress.percentage}%)` : '...'}
            </span>
          </button>
        )}

        {updateStatus !== 'ready' && updateStatus !== 'downloading' && availableUpdate?.available && (
          <button
            type="button"
            className="topbar-action-btn"
            onClick={onStartDownload}
            title={`A new update (v${availableUpdate.version}) is available. Click to download in background.`}
            style={{
              borderColor: "var(--accent-purple)",
            }}
          >
            <ArrowUpCircle size={13} style={{ color: "var(--accent-purple)" }} />
            <span>Update v{availableUpdate.version}</span>
          </button>
        )}

        {/* Global Settings Trigger */}
        <button 
          className="topbar-action-btn"
          onClick={() => onOpenSettings?.()}
          title="Global Settings (Git Identity, Appearance, Pull Strategy, AI Keys)"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Settings size={13} />
          <span>Settings</span>
        </button>

        {/* GitHub circular avatar connection badge */}
        {githubToken && (
          <div className="topbar-auth-section">
            <div className="topbar-auth-badge">
              {githubUser?.avatar_url ? (
                <img src={githubUser.avatar_url} className="topbar-avatar" alt="Avatar" />
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-main)" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              )}
              <span className="topbar-username">{githubUser?.name || githubUser?.login || "Syncing..."}</span>
              
              <button 
                className="topbar-link-btn" 
                style={{ background: "var(--bg-active)", border: "1px solid var(--border-color)", padding: "2px 8px" }}
                onClick={() => {
                  setDialogType("clone");
                  setDialogInput("");
                  setDialogInput2("");
                }}
                title="Clone Remote Repo"
              >
                <FolderSync size={12} />
              </button>

              <button 
                className="topbar-signout-btn" 
                onClick={handleGitHubSignout}
                title="Sign Out GitHub"
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        )}

        <Sparkles size={14} style={{ color: "var(--color-modified)", marginLeft: "4px" }} />
      </div>
    </div>
  );
};

export default Topbar;
