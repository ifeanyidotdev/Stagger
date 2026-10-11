import React, { useRef, useEffect } from 'react';
import {
  Layers,
  ChevronDown,
  FolderPlus,
  Folder,
  Check,
  X,
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
  const branchOpsMenuRef = useRef<HTMLDivElement>(null);
  const branchOpsBtnRef = useRef<HTMLSpanElement>(null);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBranchOpsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        branchOpsMenuRef.current && 
        !branchOpsMenuRef.current.contains(e.target as Node) &&
        branchOpsBtnRef.current &&
        !branchOpsBtnRef.current.contains(e.target as Node)
      ) {
        setIsBranchOpsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isBranchOpsDropdownOpen, setIsBranchOpsDropdownOpen]);

  useEffect(() => {
    if (!isWorkspaceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        workspaceDropdownRef.current && 
        !workspaceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen]);

  return (
    <div 
      className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
      style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
    >
      {/* Sidebar Header: Relocated Workspace Switcher Dropdown (Replacing static logo) */}
      <div className="sidebar-header" data-tauri-drag-region style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div className="sidebar-workspace-switcher" ref={workspaceDropdownRef} style={{ flex: 1 }}>
          <button 
            className="workspace-trigger-btn"
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            title="Switch Workspace Project"
          >
            <div className="workspace-trigger-icon-wrap">
              <Layers size={13} />
            </div>
            <div className="workspace-trigger-info">
              <span className="workspace-trigger-name">
                {activeWorkspaceName}
              </span>
            </div>
            <ChevronDown 
              size={13} 
              style={{ 
                color: "var(--color-text-muted)",
                transform: isWorkspaceDropdownOpen ? "rotate(180deg)" : "none", 
                transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)", 
                flexShrink: 0 
              }} 
            />
          </button>
          
          {isWorkspaceDropdownOpen && (
            <div className="workspace-menu-dropdown">
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
                        selectWorkspace(wPath);
                        setIsWorkspaceDropdownOpen(false);
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
                              removeWorkspace(e, wPath);
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
                onClick={() => {
                  setIsWorkspaceDropdownOpen(false);
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
                ref={branchOpsBtnRef}
                title="Git Operations & Sync Menu"
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  cursor: "pointer", 
                  padding: "2px",
                  borderRadius: "4px",
                  background: isBranchOpsDropdownOpen ? "var(--bg-hover)" : "transparent",
                  color: isBranchOpsDropdownOpen ? "var(--color-text-bright)" : "inherit"
                }}
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
                ref={branchOpsMenuRef}
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
            className={`collab-toggle-btn ${isCollabActive ? "active" : ""}`}
            onClick={() => setIsCollabActive(!isCollabActive)}
          >
            <Users size={14} style={{ color: isCollabActive ? "var(--color-conflict)" : "inherit" }} />
            <span>{isCollabActive ? "Session Room Active" : "Go Multiplayer"}</span>
          </button>
        </div>

      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          {!hasUpstream ? (
            <button 
              className="sync-button sync-button--primary" 
              onClick={() => handleGitPush(true)}
              disabled={isPushingRemote}
              title="Publish branch to remote origin"
            >
              <Globe size={14} className={isPushingRemote ? "spin-icon" : ""} />
              <span>{isPushingRemote ? "Publishing..." : "Publish Branch"}</span>
            </button>
          ) : unpushedCount > 0 ? (
            <button 
              className="sync-button sync-button--primary" 
              onClick={() => handleGitPush(false)}
              disabled={isPushingRemote}
              title={`Push ${unpushedCount} local commit(s) to origin`}
            >
              <ArrowUp size={14} className={isPushingRemote ? "spin-icon" : ""} />
              <span>{isPushingRemote ? "Pushing..." : `Push Origin (${unpushedCount})`}</span>
            </button>
          ) : (
            <button 
              className="sync-button sync-button--secondary" 
              onClick={() => handleGitFetch(false)}
              disabled={isFetchingRemote}
              title="Fetch updates from origin"
            >
              <RefreshCw size={14} className={isFetchingRemote ? "spin-icon" : ""} />
              <span>{isFetchingRemote ? "Fetching..." : "Fetch Origin"}</span>
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
