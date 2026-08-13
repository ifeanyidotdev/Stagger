import React from 'react';
import {
  Layers,
  ChevronRight,
  Minus,
  FolderPlus,
  ChevronLeft,
  MoreVertical,
  Plus,
  DownloadCloud,
  RefreshCcw,
  ArrowDown,
  Globe,
  ArrowUp,
  GitMerge,
  Trash2,
  GitBranch,
  Users,
  Archive,
  RefreshCw
} from "lucide-react";
import type { GitHubPR, StashEntry } from '../../types/git';

interface SidebarProps {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  isWorkspaceDropdownOpen: boolean;
  setIsWorkspaceDropdownOpen: (val: boolean) => void;
  activeWorkspaceName: string;
  workspaces: string[];
  selectWorkspace: (path: string) => void;
  repoPath: string;
  removeWorkspace: (e: React.MouseEvent, path: string) => void;
  setDialogType: (type: any) => void;
  setDialogInput: (val: string) => void;
  setSidebarCollapsed: (val: boolean) => void;
  isBranchListExpanded: boolean;
  setIsBranchListExpanded: (val: boolean) => void;
  isBranchOpsDropdownOpen: boolean;
  setIsBranchOpsDropdownOpen: (val: boolean) => void;
  handleGitFetch: (all: boolean) => void;
  isPullingRemote: boolean;
  handleGitPull: () => void;
  hasUpstream: boolean;
  handleGitPush: (publish: boolean) => void;
  isPushingRemote: boolean;
  upstreamBranchName: string | null;
  openMergeRebaseModal: (target?: string, mode?: "merge" | "rebase") => void;
  branchList: string[];
  currentBranch: string;
  handleDragOverBranch: (e: React.DragEvent) => void;
  handleDropOnBranch: (e: React.DragEvent) => void;
  startCheckoutBranch: (branch: string) => void;
  draggedCommitSha: string | null;
  startDeleteBranch: (branch: string) => void;
  hasRepo: boolean;
  isRemoteBranchListExpanded: boolean;
  setIsRemoteBranchListExpanded: (val: boolean) => void;
  remoteBranches: string[];
  isFetchingRemote: boolean;
  handleCheckoutRemoteBranch: (branch: string) => void;
  githubToken: string | null;
  remoteUrl: string | null;
  githubPRs: GitHubPR[];
  isStashListExpanded: boolean;
  setIsStashListExpanded: (val: boolean) => void;
  startPushStash: () => void;
  stashes: StashEntry[];
  selectedStashIndex: number | null;
  dialogType: string | null;
  openStashInspector: (index: number) => void;
  dropStash: (index: number) => void;
  isCollabActive: boolean;
  setIsCollabActive: (val: boolean) => void;
  unpushedCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  sidebarCollapsed,
  sidebarWidth,
  isWorkspaceDropdownOpen,
  setIsWorkspaceDropdownOpen,
  activeWorkspaceName,
  workspaces,
  selectWorkspace,
  repoPath,
  removeWorkspace,
  setDialogType,
  setDialogInput,
  setSidebarCollapsed,
  isBranchListExpanded,
  setIsBranchListExpanded,
  isBranchOpsDropdownOpen,
  setIsBranchOpsDropdownOpen,
  handleGitFetch,
  isPullingRemote,
  handleGitPull,
  hasUpstream,
  handleGitPush,
  isPushingRemote,
  upstreamBranchName,
  openMergeRebaseModal,
  branchList,
  currentBranch,
  handleDragOverBranch,
  handleDropOnBranch,
  startCheckoutBranch,
  draggedCommitSha,
  startDeleteBranch,
  hasRepo,
  isRemoteBranchListExpanded,
  setIsRemoteBranchListExpanded,
  remoteBranches,
  isFetchingRemote,
  handleCheckoutRemoteBranch,
  githubToken,
  remoteUrl,
  githubPRs,
  isStashListExpanded,
  setIsStashListExpanded,
  startPushStash,
  stashes,
  selectedStashIndex,
  dialogType,
  openStashInspector,
  dropStash,
  isCollabActive,
  setIsCollabActive,
  unpushedCount
}) => {
  return (
    <div 
      className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
      style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
    >
      {/* Sidebar Header: Relocated Workspace Switcher Dropdown (Replacing static logo) */}
      <div className="sidebar-header" data-tauri-drag-region style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div className="sidebar-workspace-switcher" style={{ flex: 1 }}>
          <button 
            className="workspace-trigger-btn"
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
              <Layers className="logo-icon" size={16} style={{ flexShrink: 0 }} />
              <span className="logo-text" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "120px" }}>
                {activeWorkspaceName}
              </span>
            </div>
            <ChevronRight size={14} style={{ transform: isWorkspaceDropdownOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }} />
          </button>
          
          {isWorkspaceDropdownOpen && (
            <div className="workspace-menu-dropdown">
              <div style={{ padding: "4px 12px 6px 12px", fontSize: "0.7rem", fontWeight: "bold", color: "var(--color-text-muted)" }}>
                SWITCH WORKSPACE
              </div>
              {workspaces.map(wPath => (
                <div 
                  key={wPath}
                  className={`workspace-menu-item ${repoPath === wPath ? "active" : ""}`}
                  onClick={() => selectWorkspace(wPath)}
                >
                  <span className="workspace-menu-item-text" title={wPath}>
                    {wPath.split("/").pop() || wPath}
                  </span>
                  <Minus 
                    size={12} 
                    style={{ color: "var(--color-deleted)", marginLeft: "8px", cursor: "pointer", opacity: 0.7 }}
                    onClick={(e) => removeWorkspace(e, wPath)} 
                  />
                </div>
              ))}
              
              <div className="workspace-menu-divider" />
              
              <button 
                className="workspace-menu-add-btn"
                onClick={() => {
                  setIsWorkspaceDropdownOpen(false);
                  setDialogType("workspace-add");
                  setDialogInput("");
                }}
              >
                <FolderPlus size={14} />
                Add Workspace Folder
              </button>
            </div>
          )}
        </div>

        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(true)}
          title="Minimize Sidebar"
          style={{ flexShrink: 0 }}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="sidebar-content">
        
        {/* Local Branches Section */}
        <div className="sidebar-section">
          <div 
            className="section-title" 
            onClick={() => setIsBranchListExpanded(!isBranchListExpanded)} 
            style={{ cursor: "pointer", userSelect: "none", position: "relative" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ 
                transform: isBranchListExpanded ? "rotate(90deg)" : "none", 
                transition: "transform 0.15s ease", 
                display: "inline-block",
                fontSize: "0.6rem"
              }}>
                ▶
              </span>
              <span>Local Branches</span>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span
                title="Git Operations & Sync Menu"
                style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", padding: "2px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBranchOpsDropdownOpen(!isBranchOpsDropdownOpen);
                }}
              >
                <MoreVertical size={14} />
              </span>
              <span
                title="New Branch"
                style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", padding: "2px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDialogType("branch");
                  setDialogInput("");
                }}
              >
                <Plus size={14} />
              </span>
            </div>

            {/* SIDEBAR BRANCH & REMOTE OPERATIONS DROPDOWN MENU */}
            {isBranchOpsDropdownOpen && (
              <div 
                className="branch-ops-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="dropdown-section-header">GIT SYNC & REMOTE</div>
                
                <div 
                  className="dropdown-menu-item"
                  onClick={() => {
                    setIsBranchOpsDropdownOpen(false);
                    handleGitFetch(false);
                  }}
                >
                  <DownloadCloud size={13} style={{ color: "var(--accent-blue)" }} />
                  <span>Fetch Origin</span>
                </div>

                <div 
                  className="dropdown-menu-item"
                  onClick={() => {
                    setIsBranchOpsDropdownOpen(false);
                    handleGitFetch(true);
                  }}
                >
                  <RefreshCcw size={13} style={{ color: "var(--accent-purple)" }} />
                  <span>Refetch All Remote Branches</span>
                </div>

                <div 
                  className="dropdown-menu-item"
                  onClick={() => {
                    setIsBranchOpsDropdownOpen(false);
                    handleGitPull();
                  }}
                >
                  <ArrowDown size={13} className={isPullingRemote ? "spin-icon" : ""} style={{ color: "var(--color-staged)" }} />
                  <span>Pull from Origin</span>
                </div>

                {!hasUpstream ? (
                  <div 
                    className="dropdown-menu-item highlight"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      handleGitPush(true);
                    }}
                  >
                    <Globe size={13} className={isPushingRemote ? "spin-icon" : ""} style={{ color: "#61afef" }} />
                    <span>Publish Branch to Origin</span>
                  </div>
                ) : (
                  <div 
                    className="dropdown-menu-item"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      handleGitPush(false);
                    }}
                  >
                    <ArrowUp size={13} className={isPushingRemote ? "spin-icon" : ""} style={{ color: "var(--color-staged)" }} />
                    <span>Push to {upstreamBranchName || "Origin"}</span>
                  </div>
                )}

                <div className="dropdown-divider" />
                <div className="dropdown-section-header">BRANCH MANAGEMENT</div>

                <div 
                  className="dropdown-menu-item"
                  onClick={() => {
                    setIsBranchOpsDropdownOpen(false);
                    openMergeRebaseModal();
                  }}
                >
                  <GitMerge size={13} style={{ color: "var(--color-modified)" }} />
                  <span>Merge / Rebase Branch...</span>
                </div>

                <div 
                  className="dropdown-menu-item"
                  onClick={() => {
                    setIsBranchOpsDropdownOpen(false);
                    setDialogType("branch");
                    setDialogInput("");
                  }}
                >
                  <Plus size={13} style={{ color: "var(--color-text-main)" }} />
                  <span>Create New Branch...</span>
                </div>
              </div>
            )}
          </div>
          {isBranchListExpanded && (
            <div className="branch-list">
              {branchList.map(bName => (
                <div 
                  key={bName} 
                  className={`branch-item ${currentBranch === bName ? "active" : ""}`}
                  onDragOver={handleDragOverBranch}
                  onDrop={handleDropOnBranch}
                  onClick={() => startCheckoutBranch(bName)}
                  style={{
                    border: draggedCommitSha ? "1px dashed var(--color-conflict)" : "1px solid transparent"
                  }}
                >
                  <GitBranch size={14} />
                  <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{bName}</span>
                  {currentBranch === bName ? (
                    <span className="branch-tick" title="Focused Branch">✓</span>
                  ) : draggedCommitSha ? (
                    <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--color-conflict)" }}>Merge Drop</span>
                  ) : (
                    <div className="branch-item-actions" style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "auto" }}>
                      <button
                        className="branch-action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMergeRebaseModal(bName, "merge");
                        }}
                        title={`Merge '${bName}' into '${currentBranch}'`}
                      >
                        <GitMerge size={12} style={{ color: "var(--color-modified)" }} />
                      </button>
                      <button 
                        className="branch-action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startDeleteBranch(bName);
                        }}
                        title="Delete Branch"
                      >
                        <Trash2 size={12} style={{ color: "var(--color-deleted)", opacity: 0.7 }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remote Branches Section */}
        {hasRepo && (
          <div className="sidebar-section">
            <div 
              className="section-title" 
              onClick={() => setIsRemoteBranchListExpanded(!isRemoteBranchListExpanded)} 
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ 
                  transform: isRemoteBranchListExpanded ? "rotate(90deg)" : "none", 
                  transition: "transform 0.15s ease", 
                  display: "inline-block",
                  fontSize: "0.6rem"
                }}>
                  ▶
                </span>
                <span>Remote Branches ({remoteBranches.length})</span>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span
                  title="Refetch All Remote Branches (git fetch --all --prune)"
                  style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGitFetch(true);
                  }}
                >
                  <RefreshCcw 
                    size={13} 
                    className={isFetchingRemote ? "spin-icon" : ""}
                  />
                </span>
              </div>
            </div>
            {isRemoteBranchListExpanded && (
              <div className="branch-list">
                {remoteBranches.length === 0 ? (
                  <span style={{ fontSize: "0.73rem", color: "var(--color-text-dark)", padding: "4px 8px" }}>No remote branches fetched</span>
                ) : (
                  remoteBranches.map(rName => (
                    <div 
                      key={rName} 
                      className="branch-item remote-branch-item"
                      onClick={() => handleCheckoutRemoteBranch(rName)}
                      title={`Click to checkout local branch tracking ${rName}`}
                    >
                      <Globe size={13} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
                      <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{rName}</span>
                      <div className="branch-item-actions" style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "auto" }}>
                        <button
                          className="branch-action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMergeRebaseModal(rName, "merge");
                          }}
                          title={`Merge '${rName}' into '${currentBranch}'`}
                        >
                          <GitMerge size={12} style={{ color: "var(--color-modified)" }} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Pull Requests Section */}
        {githubToken && remoteUrl && (
          <div className="sidebar-section">
            <div className="section-title">
              <span>Pull Requests</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "120px", overflowY: "auto" }}>
              {githubPRs.map(pr => (
                <a 
                  key={pr.number} 
                  href={pr.html_url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div className="branch-item" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                    <GitBranch size={12} style={{ color: "var(--accent-blue)", marginRight: "6px" }} />
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "150px" }}>
                      #{pr.number} {pr.title}
                    </span>
                  </div>
                </a>
              ))}
              {githubPRs.length === 0 && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>No active pull requests</span>
              )}
            </div>
          </div>
        )}

        {/* Stash section */}
        {hasRepo && (
          <div className="sidebar-section">
            <div 
              className="section-title" 
              onClick={() => setIsStashListExpanded(!isStashListExpanded)} 
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ 
                  transform: isStashListExpanded ? "rotate(90deg)" : "none", 
                  transition: "transform 0.15s ease", 
                  display: "inline-block",
                  fontSize: "0.6rem"
                }}>
                  ▶
                </span>
                <span>Stashes</span>
              </div>
              <Plus 
                size={14} 
                style={{ cursor: "pointer" }} 
                onClick={(e) => {
                  e.stopPropagation();
                  startPushStash();
                }} 
              />
            </div>
            {isStashListExpanded && (
              <div className="branch-list">
                {stashes.map((stash) => {
                  return (
                    <div 
                      key={stash.originalIndex} 
                      className={`branch-item ${selectedStashIndex === stash.originalIndex && dialogType === "stash-inspector" ? "active" : ""}`}
                      onClick={() => openStashInspector(stash.originalIndex)}
                    >
                      <Archive size={14} />
                      <span>{stash.displayTitle}</span>
                      <button 
                        className="branch-action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          dropStash(stash.originalIndex);
                        }}
                        title="Delete Stash"
                        type="button"
                      >
                        <Trash2 size={12} style={{ color: "var(--color-deleted)", opacity: 0.7 }} />
                      </button>
                    </div>
                  );
                })}
                {stashes.length === 0 && (
                  <div className="branch-item" style={{ color: "var(--color-text-muted)", cursor: "default" }}>
                    <span style={{ fontSize: "0.75rem" }}>No stashes</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Collaboration Control */}
        <div className="sidebar-section">
          <div className="section-title">
            <span>Collaboration</span>
          </div>
          <button 
            className="sync-button" 
            style={{ 
              width: "100%", 
              gap: "8px", 
              background: isCollabActive ? "var(--bg-hover)" : "var(--bg-app)", 
              border: "1px solid var(--border-color)" 
            }}
            onClick={() => setIsCollabActive(!isCollabActive)}
          >
            <Users size={14} style={{ color: isCollabActive ? "var(--color-conflict)" : "inherit" }} />
            {isCollabActive ? "Session Room Active" : "Go Multiplayer"}
          </button>
        </div>

      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          {!hasUpstream ? (
            <button 
              className="sync-button" 
              style={{ flex: 1, background: "var(--accent-purple)" }}
              onClick={() => handleGitPush(true)}
              disabled={isPushingRemote}
              title="Publish branch to remote origin"
            >
              <Globe size={14} className={isPushingRemote ? "spin-icon" : ""} />
              {isPushingRemote ? "Publishing..." : "Publish Branch"}
            </button>
          ) : unpushedCount > 0 ? (
            <button 
              className="sync-button" 
              style={{ flex: 1, background: "var(--accent-purple)" }}
              onClick={() => handleGitPush(false)}
              disabled={isPushingRemote}
              title={`Push ${unpushedCount} local commit(s) to origin`}
            >
              <ArrowUp size={14} className={isPushingRemote ? "spin-icon" : ""} />
              {isPushingRemote ? "Pushing..." : `Push Origin (${unpushedCount})`}
            </button>
          ) : (
            <button 
              className="sync-button" 
              style={{ flex: 1 }}
              onClick={() => handleGitFetch(false)}
              disabled={isFetchingRemote}
              title="Fetch updates from origin"
            >
              <RefreshCw size={14} className={isFetchingRemote ? "spin-icon" : ""} />
              {isFetchingRemote ? "Fetching..." : "Fetch Origin"}
            </button>
          )}
        </div>
        {remoteUrl && (
          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "6px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            Origin: {remoteUrl}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
