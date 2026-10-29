import React, { useRef, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  PanelLeft, Layers, History, FolderSync, LogOut, Settings, 
  ArrowDown, ArrowUp, ArrowUpCircle, ArrowDownToLine, RefreshCw, 
  Folder, ChevronDown, Check, X, FolderPlus, GitBranch 
} from 'lucide-react';
import type { GitHubUser } from '../../types/git';
import type { AppUpdateInfo, UpdateStatus, UpdateDownloadProgress, SystemGitConfig, WorkspaceSettings } from '../../types/settings';

interface TopbarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  activeWorkspaceName?: string;
  workspaces?: string[];
  selectWorkspace?: (path: string) => void;
  repoPath?: string;
  removeWorkspace?: (e: React.MouseEvent, path: string) => void;
  isWorkspaceDropdownOpen?: boolean;
  setIsWorkspaceDropdownOpen?: (val: boolean) => void;
  activeTab: 'workspace' | 'history';
  setActiveTab: (val: 'workspace' | 'history') => void;
  currentBranch?: string;
  upstreamBranchName?: string | null;
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
  activeWorkspaceName,
  workspaces = [],
  selectWorkspace,
  repoPath,
  removeWorkspace,
  isWorkspaceDropdownOpen = false,
  setIsWorkspaceDropdownOpen,
  activeTab,
  setActiveTab,
  currentBranch,
  upstreamBranchName: _upstreamBranchName,
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
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [gitIdentity, setGitIdentity] = useState<{ name: string; email: string; avatarUrl?: string; handle?: string | null } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchIdentity = async () => {
      try {
        let name = '';
        let email = '';

        if (repoPath) {
          try {
            const ws = await invoke<WorkspaceSettings>('get_workspace_settings', { repoPath });
            if (ws.local_user_name) name = ws.local_user_name.trim();
            if (ws.local_user_email) email = ws.local_user_email.trim();
          } catch (_) {}
        }

        if (!name || !email) {
          try {
            const sys = await invoke<SystemGitConfig>('get_system_git_config');
            if (!name && sys.user_name) name = sys.user_name.trim();
            if (!email && sys.user_email) email = sys.user_email.trim();
          } catch (_) {}
        }

        if (!name && !email) {
          if (isMounted) setGitIdentity(null);
          return;
        }

        let avatarUrl = '';
        let handle: string | null = null;
        if (email) {
          const ghMatch = email.match(/(?:^|\+)([a-zA-Z0-9-]+)@users\.noreply\.github\.com$/i);
          if (ghMatch) {
            handle = ghMatch[1];
            avatarUrl = `https://github.com/${ghMatch[1]}.png`;
          } else {
            try {
              const clean = email.toLowerCase();
              const msgBuffer = new TextEncoder().encode(clean);
              const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              avatarUrl = `https://gravatar.com/avatar/${hashHex}?d=retro`;
            } catch (_) {}
          }
        }

        if (isMounted) {
          setAvatarLoadError(false);
          setGitIdentity({ name, email, avatarUrl, handle });
        }
      } catch (_) {
        if (isMounted) setGitIdentity(null);
      }
    };

    fetchIdentity();
    return () => { isMounted = false; };
  }, [repoPath]);

  const activeAuthor = githubUser ? {
    fullName: githubUser.name || githubUser.login,
    displayName: (githubUser.name ? githubUser.name.split(' ')[0] : githubUser.login),
    avatarUrl: githubUser.avatar_url,
    initial: (githubUser.name || githubUser.login || 'U').slice(0, 1).toUpperCase(),
    badgeLabel: `@${githubUser.login}`,
  } : gitIdentity ? {
    fullName: gitIdentity.name || (gitIdentity.handle ? `@${gitIdentity.handle}` : 'Git Author'),
    displayName: gitIdentity.name ? gitIdentity.name.split(' ')[0] : (gitIdentity.handle || 'Git User'),
    avatarUrl: gitIdentity.avatarUrl,
    initial: (gitIdentity.name || gitIdentity.handle || 'G').slice(0, 1).toUpperCase(),
    badgeLabel: gitIdentity.handle ? `@${gitIdentity.handle}` : 'Git Author',
  } : null;

  useEffect(() => {
    if (!isWorkspaceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        workspaceDropdownRef.current && 
        !workspaceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsWorkspaceDropdownOpen?.(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current && 
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handleTitlebarMouseDown = async (e: React.MouseEvent) => {
    // Only primary (left) mouse button
    if (e.button !== 0) return;
    
    // Check if clicked element or its parent is an interactive control or popover
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, .ant-dropdown-popover, .ant-profile-popover, .workspace-menu-dropdown')) {
      return;
    }

    if (e.detail === 2) {
      // Native macOS behavior: double clicking titlebar toggles maximize
      try {
        await getCurrentWindow().toggleMaximize();
      } catch (_) {}
    } else {
      try {
        await getCurrentWindow().startDragging();
      } catch (_) {}
    }
  };

  return (
    <div 
      className="topbar ant-titlebar" 
      data-tauri-drag-region
      onMouseDown={handleTitlebarMouseDown}
    >
      {/* Left side: Beside traffic lights: Sidebar toggle, Workspace Switcher, Separator, Branch */}
      <div className="ant-titlebar-left" data-tauri-drag-region>
        <button
          type="button"
          className="ant-icon-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <PanelLeft size={14} strokeWidth={2} />
        </button>

        {/* Workspace Switcher */}
        <div className="ant-workspace-wrap" ref={workspaceDropdownRef}>
          <button 
            type="button"
            className="ant-workspace-trigger"
            onClick={() => setIsWorkspaceDropdownOpen?.(!isWorkspaceDropdownOpen)}
            title="Switch Workspace Project"
          >
            <span className="ant-workspace-name">
              {activeWorkspaceName || "No Workspace"}
            </span>
            <ChevronDown size={11} className="ant-chevron" />
          </button>
          
          {isWorkspaceDropdownOpen && workspaces.length > 0 && (
            <div className="workspace-menu-dropdown ant-dropdown-popover">
              <div className="workspace-menu-header">
                <span>Workspaces</span>
                <span className="details-count-badge">{workspaces.length}</span>
              </div>
              <div className="workspace-menu-list">
                {workspaces.map(wPath => {
                  const name = wPath.split("/").pop() || wPath;
                  const isActive = repoPath === wPath;
                  return (
                    <div 
                      key={wPath}
                      className={`workspace-menu-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        selectWorkspace?.(wPath);
                        setIsWorkspaceDropdownOpen?.(false);
                      }}
                    >
                      <div className="workspace-item-content">
                        <Folder size={13} style={{ color: isActive ? "var(--accent-purple-bright)" : "var(--color-text-muted)", flexShrink: 0 }} />
                        <span className="workspace-menu-item-text" title={wPath}>
                          {name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {isActive && (
                          <Check size={12} style={{ color: "var(--color-staged)", flexShrink: 0 }} />
                        )}
                        {workspaces.length > 1 && (
                          <button 
                            className="workspace-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeWorkspace?.(e, wPath);
                            }}
                            title="Remove workspace from list"
                            type="button"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="workspace-menu-divider" />
              
              <button 
                className="workspace-menu-add-btn"
                type="button"
                onClick={() => {
                  setIsWorkspaceDropdownOpen?.(false);
                  setDialogType("workspace-add");
                  setDialogInput("");
                }}
              >
                <FolderPlus size={13} />
                <span>Add Workspace Folder...</span>
              </button>
            </div>
          )}
        </div>

        <span className="ant-separator">/</span>

        {/* Active Branch Display */}
        {hasRepo && currentBranch && (
          <div 
            className="ant-branch-wrap" 
            title={`Active Branch: ${currentBranch}${behindCount > 0 ? ` • Remote is ahead by ${behindCount} commit(s)` : ""}${unpushedCount > 0 ? ` • ${unpushedCount} unpushed commit(s)` : ""}`}
          >
            <span className="ant-branch-local">
              <GitBranch size={11} strokeWidth={2.2} className="ant-branch-icon" />
              <span className="ant-branch-name" title={currentBranch}>{currentBranch}</span>
            </span>

            {behindCount > 0 && (
              <span className="ant-sync-tag behind" title={`Remote origin is ahead by ${behindCount} commit(s)`}>
                <ArrowDown size={9} />
                <span>{behindCount}</span>
              </span>
            )}
            {unpushedCount > 0 && (
              <span className="ant-sync-tag ahead" title={`${unpushedCount} unpushed commit(s) ready to push`}>
                <ArrowUp size={9} />
                <span>{unpushedCount}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Flexible Drag Spacer */}
      <div className="ant-titlebar-spacer" data-tauri-drag-region />

      {/* Center: View Tabs */}
      <div className="ant-titlebar-center">
        <div className="ant-view-tabs">
          <button 
            type="button"
            className={`ant-tab-btn ${activeTab === "workspace" ? "active" : ""}`}
            onClick={() => setActiveTab("workspace")}
          >
            <Layers size={12} strokeWidth={2} />
            <span>Workspace Staging</span>
          </button>
          <button 
            type="button"
            className={`ant-tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={12} strokeWidth={2} />
            <span>History Graph</span>
          </button>
        </div>
      </div>

      {/* Flexible Drag Spacer */}
      <div className="ant-titlebar-spacer" data-tauri-drag-region />

      {/* Right side: Update notification, Settings icon & Profile Avatar / Sign In */}
      <div className="ant-titlebar-right">
        {updateStatus === 'ready' && (
          <button
            type="button"
            className="ant-action-btn ant-update-btn"
            onClick={onRestartApp}
            title={availableUpdate?.version ? `Stagger v${availableUpdate.version} ready. Click to restart.` : 'Update ready! Click to restart.'}
          >
            <RefreshCw size={11} className="spin-icon-hover" />
            <span>Restart</span>
          </button>
        )}

        {updateStatus === 'downloading' && (
          <span className="ant-downloading-text" title="Downloading update...">
            <ArrowDownToLine size={11} className="spin-icon" />
            <span>{updateProgress?.percentage !== undefined ? `${updateProgress.percentage}%` : '...'}</span>
          </span>
        )}

        {updateStatus !== 'ready' && updateStatus !== 'downloading' && availableUpdate?.available && (
          <button
            type="button"
            className="ant-action-btn"
            onClick={onStartDownload}
            title={`Download v${availableUpdate.version}`}
          >
            <ArrowUpCircle size={11} style={{ color: "var(--accent-purple-bright)" }} />
            <span>Update</span>
          </button>
        )}

        {/* Global Settings icon */}
        <button 
          type="button"
          className="ant-icon-btn"
          onClick={() => onOpenSettings?.()}
          title="Global Settings (Git Identity, Appearance, Pull Strategy, AI Keys)"
        >
          <Settings size={13} strokeWidth={2} />
        </button>

        {/* Git Author Profile Avatar (from Git Config or GitHub integration) */}
        {activeAuthor && (
          <div className="ant-profile-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="ant-profile-trigger"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title={activeAuthor.fullName}
            >
              {activeAuthor.avatarUrl && !avatarLoadError ? (
                <img 
                  src={activeAuthor.avatarUrl} 
                  className="ant-avatar-img" 
                  alt="Avatar" 
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <div className="ant-avatar-fallback">
                  {activeAuthor.initial}
                </div>
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="ant-profile-popover">
                <div className="ant-profile-header">
                  {activeAuthor.avatarUrl && !avatarLoadError ? (
                    <img 
                      src={activeAuthor.avatarUrl} 
                      className="ant-profile-header-avatar" 
                      alt="Avatar" 
                    />
                  ) : (
                    <div className="ant-profile-header-fallback">
                      {activeAuthor.initial}
                    </div>
                  )}
                  <div className="ant-profile-header-info">
                    <span className="ant-profile-header-name">{activeAuthor.fullName}</span>
                    <span className="ant-profile-header-badge">{activeAuthor.badgeLabel}</span>
                  </div>
                </div>

                <div 
                  className="ant-profile-menu-item"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenSettings?.('global-identity');
                  }}
                >
                  <Settings size={13} style={{ opacity: 0.8 }} />
                  <span>Git Identity Settings...</span>
                </div>
                <div 
                  className="ant-profile-menu-item"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setDialogType("clone");
                    setDialogInput("");
                    setDialogInput2("");
                  }}
                >
                  <FolderSync size={13} style={{ opacity: 0.8 }} />
                  <span>Clone Remote Repo...</span>
                </div>
                {githubToken && (
                  <div 
                    className="ant-profile-menu-item danger"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleGitHubSignout();
                    }}
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;
