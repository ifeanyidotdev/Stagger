import React from 'react';
import { ChevronRight, Layers, History, GitPullRequest, FolderSync, LogOut, Sparkles } from 'lucide-react';
import type { GitHubUser } from '../../types/git';

interface TopbarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  activeTab: any;
  setActiveTab: (val: any) => void;
  githubToken: string | null;
  remoteUrl: string | null;
  setDialogType: (val: any) => void;
  setDialogInput: (val: string) => void;
  setDialogInput2: (val: string) => void;
  githubUser: GitHubUser | null;
  handleGitHubSignout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  activeTab,
  setActiveTab,
  githubToken,
  remoteUrl,
  setDialogType,
  setDialogInput,
  setDialogInput2,
  githubUser,
  handleGitHubSignout
}) => {
  return (
    <div className={`topbar ${sidebarCollapsed ? "sidebar-collapsed-topbar" : ""}`} data-tauri-drag-region>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {sidebarCollapsed && (
          <button 
            className="sidebar-toggle-btn"
            style={{ marginRight: "8px" }}
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
      </div>

      {/* Restored GitHub Auth Badge (Topbar Right-Side) */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        
        {githubToken && remoteUrl && (
          <button 
            style={{
              background: "var(--bg-app)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--color-text-bright)",
              fontSize: "0.8rem",
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginRight: "4px"
            }}
            onClick={() => {
              setDialogType("pr-create");
              setDialogInput("");
              setDialogInput2("");
            }}
          >
            <GitPullRequest size={12} />
            Create PR
          </button>
        )}

        {/* GitHub circular avatar connection badge restored */}
        <div className="topbar-auth-section">
          {!githubToken ? (
            <button 
              className="topbar-link-btn"
              onClick={() => setDialogType("login")}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              Connect GitHub
            </button>
          ) : (
            <div className="topbar-auth-badge">
              {githubUser?.avatar_url ? (
                <img src={githubUser.avatar_url} className="topbar-avatar" alt="Avatar" />
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-main)" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              )}
              <span className="topbar-username">{githubUser?.name || githubUser?.login || "Syncing..."}</span>
              
              <button 
                className="topbar-link-btn" 
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)", padding: "2px 8px" }}
                onClick={() => {
                  setDialogType("clone");
                  setDialogInput("");
                  setDialogInput2("/Users/melodyfidel/Code/projects");
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
          )}
        </div>

        <Sparkles size={14} style={{ color: "var(--color-modified)", marginLeft: "4px" }} />
      </div>
    </div>
  );
};

export default Topbar;
