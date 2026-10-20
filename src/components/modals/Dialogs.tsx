import React, { useState, useRef, useEffect } from 'react';
import { Archive, X, Eye, FileCode, RefreshCw, FolderSync, Trash2, RefreshCcw, FolderPlus, GitMerge, GitCommit, Globe, ChevronDown, GitBranch, Check, Search, ArrowUpCircle, ArrowDown, Settings } from 'lucide-react';
import type { GitHubRepo, DialogType, StashEntry, CommitInfo } from '../../types/git';
import { invoke } from '@tauri-apps/api/core';

interface DialogsProps {
  dialogType: DialogType;
  setDialogType: (type: DialogType) => void;
  targetCommitForBranch?: CommitInfo | null;
  setTargetCommitForBranch?: (commit: CommitInfo | null) => void;
  targetCommitForPush?: CommitInfo | null;
  setTargetCommitForPush?: (commit: CommitInfo | null) => void;
  isPushingCommit?: boolean;
  handleExecutePushCommit?: (commitSha: string, targetBranch: string, remote: string) => Promise<void>;
  commits?: CommitInfo[];
  checkoutNewBranch?: boolean;
  setCheckoutNewBranch?: (val: boolean) => void;
  selectedStashIndex: number | null;
  stashes: StashEntry[];
  stashFiles: { path: string; status: string }[];
  checkedStashFiles: Set<string>;
  setCheckedStashFiles: (val: Set<string>) => void;
  selectedStashFile: string | null;
  fetchStashFileDiff: (index: number, path: string) => void;
  stashFileDiff: string | null;
  stashDiffLoading: boolean;
  applyStash: (index: number) => void;
  popStash: (index: number) => void;
  restoreSelectedStashFiles: () => void;
  dropStash: (index: number) => void;
  setSelectedStashIndex: (val: number | null) => void;
  pendingDeleteBranch: string | null;
  setPendingDeleteBranch: (val: string | null) => void;
  executeDeleteBranch: (force: boolean) => void;
  currentBranch: string;
  pendingCheckoutBranch: string | null;
  setPendingCheckoutBranch: (val: string | null) => void;
  setPendingCheckoutArgs?: (val: string[] | null) => void;
  handleCheckoutBringChanges: () => void;
  handleCheckoutStashChanges: () => void;
  pendingWorkspacePath: string;
  setPendingWorkspacePath: (val: string) => void;
  handleInitializeGitWorkspace: () => void;
  handleCloneOptionWorkspace: () => void;
  workspaces: string[];
  setWorkspaces: (val: string[]) => void;
  setRepoPath: (val: string) => void;
  refreshRepository: (path?: string) => Promise<void>;
  dialogInput: string;
  setDialogInput: (val: string) => void;
  dialogInput2: string;
  setDialogInput2: (val: string) => void;
  handleWorkspaceAddSubmit: () => void;
  loginGitHubOAuth: () => void;
  handlePATLogin: () => void;
  githubRepos: GitHubRepo[];
  isCloningRepo?: boolean;
  handleCloneRepo: () => void;
  handleCreatePR: () => void;
  handleDialogSubmit: () => void;
  mergeRebaseMode: 'merge' | 'rebase';
  setMergeRebaseMode: (val: 'merge' | 'rebase') => void;
  allBranches: any[];
  targetMergeBranch: string;
  setTargetMergeBranch: (val: string) => void;
  branchList: string[];
  remoteBranches: string[];
  handleExecuteMergeOrRebase: () => void;
  handleSetRemoteUrl: () => void;
  stashNameInput: string;
  setStashNameInput: (val: string) => void;
  pushStash: (msg?: string) => void;
  behindCount?: number;
  upstreamBranchName?: string | null;
  handleGitPull?: (mode?: 'merge' | 'rebase') => Promise<void>;
  isPullingRemote?: boolean;
  onOpenSettings?: () => void;
  pendingDiscardFiles?: string[] | null;
  setPendingDiscardFiles?: (files: string[] | null) => void;
  handleExecuteDiscardChanges?: () => void;
}

const Dialogs: React.FC<DialogsProps> = ({
  dialogType,
  setDialogType,
  targetCommitForBranch = null,
  setTargetCommitForBranch,
  targetCommitForPush = null,
  setTargetCommitForPush,
  isPushingCommit = false,
  handleExecutePushCommit,
  commits = [],
  checkoutNewBranch = true,
  setCheckoutNewBranch,
  selectedStashIndex,
  stashes,
  stashFiles,
  checkedStashFiles,
  setCheckedStashFiles,
  selectedStashFile,
  fetchStashFileDiff,
  stashFileDiff,
  stashDiffLoading,
  applyStash,
  popStash,
  restoreSelectedStashFiles,
  dropStash,
  setSelectedStashIndex,
  pendingDeleteBranch,
  setPendingDeleteBranch,
  executeDeleteBranch,
  currentBranch,
  pendingCheckoutBranch,
  setPendingCheckoutBranch,
  setPendingCheckoutArgs,
  handleCheckoutBringChanges,
  handleCheckoutStashChanges,
  pendingWorkspacePath,
  setPendingWorkspacePath,
  handleInitializeGitWorkspace,
  handleCloneOptionWorkspace,
  workspaces,
  setWorkspaces,
  setRepoPath,
  refreshRepository,
  dialogInput,
  setDialogInput,
  dialogInput2,
  setDialogInput2,
  handleWorkspaceAddSubmit,
  loginGitHubOAuth,
  handlePATLogin,
  githubRepos,
  isCloningRepo = false,
  handleCloneRepo,
  handleCreatePR,
  handleDialogSubmit,
  mergeRebaseMode,
  setMergeRebaseMode,
  allBranches,
  targetMergeBranch,
  setTargetMergeBranch,
  branchList,
  remoteBranches,
  handleExecuteMergeOrRebase,
  handleSetRemoteUrl,
  stashNameInput,
  setStashNameInput,
  pushStash,
  behindCount = 0,
  upstreamBranchName = null,
  handleGitPull,
  isPullingRemote = false,
  onOpenSettings,
  pendingDiscardFiles = null,
  setPendingDiscardFiles,
  handleExecuteDiscardChanges
}) => {
  const [rememberPullChoice, setRememberPullChoice] = useState(false);
  const [isRestoreDropdownOpen, setIsRestoreDropdownOpen] = useState(false);
  const [isTargetBranchDropdownOpen, setIsTargetBranchDropdownOpen] = useState(false);
  const [targetBranchSearch, setTargetBranchSearch] = useState('');
  const [pushTargetBranch, setPushTargetBranch] = useState(currentBranch || '');
  const targetBranchDropdownRef = useRef<HTMLDivElement>(null);
  const branchSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (targetCommitForPush) {
      const localWithCommit = targetCommitForPush.branches.filter(b => !b.includes("/") && !b.startsWith("tag:") && !b.startsWith("stash"));
      if (localWithCommit.includes(currentBranch)) {
        setPushTargetBranch(currentBranch);
      } else if (localWithCommit.length > 0) {
        setPushTargetBranch(localWithCommit[0]);
      } else {
        setPushTargetBranch(currentBranch);
      }
    } else {
      setPushTargetBranch(currentBranch);
    }
  }, [targetCommitForPush, currentBranch]);

  useEffect(() => {
    if (!isTargetBranchDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        targetBranchDropdownRef.current &&
        !targetBranchDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTargetBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTargetBranchDropdownOpen]);

  useEffect(() => {
    if (isTargetBranchDropdownOpen) {
      const timer = setTimeout(() => {
        branchSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setTargetBranchSearch('');
    }
  }, [isTargetBranchDropdownOpen]);

  useEffect(() => {
    setIsTargetBranchDropdownOpen(false);
    setTargetBranchSearch('');
  }, [dialogType]);

  if (!dialogType) return null;

  return (
    <div className="dialog-overlay">
      <div className={`dialog-content${dialogType === "stash-inspector" ? " dialog-content--wide" : ""}${dialogType === "merge-rebase" ? " dialog-content--visible-overflow" : ""}`}>
        <div className="dialog-title">
          <span>
            {dialogType === "branch" && (targetCommitForBranch ? "Create Branch from Commit" : "Create Branch")}
            {dialogType === "checkout" && "Checkout Branch"}
            {dialogType === "clone" && "Clone Remote Repository"}
            {(dialogType === "publish" || dialogType === "set-remote") && "Set Remote Repository URL"}
            {dialogType === "pr-create" && "Create GitHub Pull Request"}
            {dialogType === "login" && "Connect GitHub Account"}
            {dialogType === "workspace-add" && "Add Workspace Project"}
            {dialogType === "git-init-confirm" && "Initialize Git Repository?"}
            {dialogType === "delete-branch-confirm" && "Delete Branch?"}
            {dialogType === "git-delete-force-confirm" && "Force Delete Branch?"}
            {dialogType === "discard-changes-confirm" && "Discard Unstaged Changes?"}
            {dialogType === "checkout-conflict" && "Uncommitted Changes"}
            {dialogType === "stash-name" && "Save Stash"}
            {dialogType === "merge-rebase" && "Merge / Rebase Branch"}
            {dialogType === "pull-strategy" && (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ArrowDown size={16} style={{ color: "var(--accent-purple-bright)" }} />
                <span>Integrate Remote Changes</span>
              </span>
            )}
            {dialogType === "push-commit" && (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ArrowUpCircle size={16} style={{ color: "var(--color-staged)" }} />
                <span>Push up to Selected Commit</span>
              </span>
            )}
            {dialogType === "stash-inspector" && (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Archive size={16} style={{ color: "var(--accent-purple-bright)" }} />
                <span>Stash Inspector</span>
                {selectedStashIndex !== null && (
                  <span className="stash-badge" style={{ fontSize: "0.72rem", background: "rgba(168, 85, 247, 0.12)", color: "var(--accent-purple-bright)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.25)", fontFamily: "var(--font-mono)" }}>
                    {stashes.find(s => s.originalIndex === selectedStashIndex)?.displayTitle || `stash@{${selectedStashIndex}}`}
                  </span>
                )}
              </span>
            )}
          </span>
          <button 
            className="dialog-close-btn"
            onClick={() => {
              setDialogType(null);
              setDialogInput("");
              setDialogInput2("");
              if (setTargetCommitForBranch) setTargetCommitForBranch(null);
              if (setTargetCommitForPush) setTargetCommitForPush(null);
              if (setPendingCheckoutBranch) setPendingCheckoutBranch(null);
              if (setPendingCheckoutArgs) setPendingCheckoutArgs(null);
            }}
            title="Close"
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* STASH NAME DIALOG */}
        {dialogType === "stash-name" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Give this stash a memorable name so you can find it later.</span>
            <input
              className="dialog-input"
              value={stashNameInput}
              onChange={e => setStashNameInput(e.target.value)}
              placeholder="e.g. WIP: header redesign"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") {
                  pushStash(stashNameInput || undefined);
                  setDialogType(null);
                }
              }}
            />
            <div className="dialog-actions">
              <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
              <button
                className="dialog-button"
                onClick={() => {
                  pushStash(stashNameInput || undefined);
                  setDialogType(null);
                }}
              >
                Save Stash
              </button>
            </div>
          </div>
        )}

        {/* STASH INSPECTOR DIALOG */}
        {dialogType === "stash-inspector" && selectedStashIndex !== null && (
          <div className="stash-inspector-container">
            <div className="stash-inspector-split">
              {/* Left: file list */}
              <div className="stash-file-sidebar">
                <div className="stash-sidebar-header">
                  <span className="stash-sidebar-title">Changed Files ({stashFiles.length})</span>
                  {stashFiles.length > 0 && (
                    <button 
                      type="button" 
                      className="stash-select-all-btn"
                      onClick={() => {
                        if (checkedStashFiles.size === stashFiles.length) {
                          setCheckedStashFiles(new Set());
                        } else {
                          setCheckedStashFiles(new Set(stashFiles.map(f => f.path)));
                        }
                      }}
                    >
                      {checkedStashFiles.size === stashFiles.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
                <div className="stash-file-list">
                  {stashFiles.length === 0 && (
                    <div className="stash-empty-files">
                      <RefreshCw size={16} className="spin-loader" />
                      <span>Loading stashed files…</span>
                    </div>
                  )}
                  {stashFiles.map(f => {
                    const parts = f.path.split("/");
                    const name = parts.pop();
                    const dir = parts.join("/");
                    const isChecked = checkedStashFiles.has(f.path);
                    const isSelected = selectedStashFile === f.path;

                    return (
                      <div
                        key={f.path}
                        className={`stash-file-item ${isSelected ? "active" : ""} ${isChecked ? "checked" : ""}`}
                        onClick={() => fetchStashFileDiff(selectedStashIndex, f.path)}
                      >
                        <input
                          type="checkbox"
                          className="stash-item-checkbox"
                          checked={isChecked}
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            const next = new Set(checkedStashFiles);
                            e.target.checked ? next.add(f.path) : next.delete(f.path);
                            setCheckedStashFiles(next);
                          }}
                        />
                        
                        <div className="stash-file-details">
                          <span className="stash-file-name" title={f.path}>{name}</span>
                          {dir && <span className="stash-file-path" title={dir}>{dir}</span>}
                        </div>

                        <span className={`stash-status-pill ${f.status === "A" ? "added" : f.status === "D" ? "deleted" : "modified"}`}>
                          {f.status === "A" ? "ADD" : f.status === "D" ? "DEL" : "MOD"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: diff view */}
              <div className="stash-diff-pane">
                <div className="stash-diff-header">
                  {selectedStashFile ? (
                    <>
                      <div className="stash-diff-header-info">
                        <FileCode size={14} className="stash-file-icon" />
                        <span className="stash-diff-filepath" title={selectedStashFile}>{selectedStashFile}</span>
                        <span className={`stash-status-pill ${stashFiles.find(f => f.path === selectedStashFile)?.status === "A" ? "added" : stashFiles.find(f => f.path === selectedStashFile)?.status === "D" ? "deleted" : "modified"}`}>
                          {stashFiles.find(f => f.path === selectedStashFile)?.status === "A" ? "ADDED" : stashFiles.find(f => f.path === selectedStashFile)?.status === "D" ? "DELETED" : "MODIFIED"}
                        </span>
                      </div>
                      {stashFileDiff && (() => {
                        const lines = stashFileDiff.split("\n");
                        const additions = lines.filter(l => l.startsWith("+") && !l.startsWith("+++")).length;
                        const deletions = lines.filter(l => l.startsWith("-") && !l.startsWith("---")).length;
                        return (
                          <div className="stash-diff-stats">
                            <span className="stat-add">+{additions}</span>
                            <span className="stat-del">-{deletions}</span>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <span className="stash-diff-placeholder">No file selected</span>
                  )}
                </div>

                {stashDiffLoading ? (
                  <div className="stash-diff-state-container">
                    <RefreshCw size={24} className="spin-loader" />
                    <span>Fetching stash file diff…</span>
                  </div>
                ) : stashFileDiff ? (
                  <div className="stash-diff-viewer">
                    {(() => {
                      const lines = stashFileDiff.split("\n");
                      let oldLine = 0;
                      let newLine = 0;
                      const hunkHeaderPattern = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
                      return lines.map((line, i) => {
                        const isAddition = line.startsWith("+") && !line.startsWith("+++");
                        const isDeletion = line.startsWith("-") && !line.startsWith("---");
                        const isHunk = line.startsWith("@@");
                        const isFileHeader = line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++");

                        if (isHunk) {
                          const m = line.match(hunkHeaderPattern);
                          if (m) {
                            oldLine = parseInt(m[1], 10) - 1;
                            newLine = parseInt(m[2], 10) - 1;
                          }
                        } else if (isAddition) {
                          newLine++;
                        } else if (isDeletion) {
                          oldLine++;
                        } else if (!isFileHeader) {
                          oldLine++;
                          newLine++;
                        }

                        const lineClass = isAddition ? "addition" : isDeletion ? "deletion" : isHunk ? "hunk" : isFileHeader ? "file-header" : "";

                        return (
                          <div key={i} className={`stash-diff-line ${lineClass}`}>
                            <span className="stash-diff-gutter old-ln">
                              {!isHunk && !isFileHeader && (isDeletion || (!isAddition)) && !isAddition ? (oldLine > 0 ? oldLine : "") : ""}
                            </span>
                            <span className="stash-diff-gutter new-ln">
                              {!isHunk && !isFileHeader && (isAddition || (!isDeletion)) && !isDeletion ? (newLine > 0 ? newLine : "") : ""}
                            </span>
                            <span className="stash-diff-marker">
                              {isAddition ? "+" : isDeletion ? "−" : isHunk ? "" : " "}
                            </span>
                            <span className="stash-diff-content">{line.substring(isAddition || isDeletion ? 1 : 0)}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : selectedStashFile ? (
                  <div className="stash-diff-state-container">
                    <FileCode size={32} />
                    <span>No diff available for this file</span>
                  </div>
                ) : (
                  <div className="stash-diff-state-container">
                    <Eye size={32} />
                    <span>Select a file from the list to view diff</span>
                  </div>
                )}
              </div>
            </div>

            <div className="stash-footer-actions">
              <div className="stash-footer-group left">
                <div className="split-dropdown-container">
                  <button 
                    className="stash-action-btn primary split-main-btn"
                    onClick={() => {
                      if (checkedStashFiles.size > 0 && checkedStashFiles.size < stashFiles.length) {
                        restoreSelectedStashFiles();
                      } else {
                        applyStash(selectedStashIndex);
                      }
                    }}
                    title={checkedStashFiles.size > 0 && checkedStashFiles.size < stashFiles.length ? `Restore ${checkedStashFiles.size} selected file(s)` : "Restore stash changes into working directory"}
                  >
                    <Archive size={14} />
                    <span>
                      {checkedStashFiles.size > 0 && checkedStashFiles.size < stashFiles.length
                        ? `Restore Selected (${checkedStashFiles.size})`
                        : "Restore Stash"}
                    </span>
                  </button>

                  <button 
                    className="stash-action-btn primary split-caret-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRestoreDropdownOpen(!isRestoreDropdownOpen);
                    }}
                    title="More restore options"
                    type="button"
                  >
                    <ChevronDown size={13} />
                  </button>

                  {isRestoreDropdownOpen && (
                    <div className="split-dropdown-menu">
                      <div 
                        className="split-dropdown-item"
                        onClick={() => {
                          if (selectedStashIndex !== null) {
                            applyStash(selectedStashIndex);
                          }
                          setIsRestoreDropdownOpen(false);
                        }}
                      >
                        <Archive size={14} style={{ color: "var(--accent-purple-bright)" }} />
                        <div className="split-dropdown-item-text">
                          <span className="title">Restore & Remove Stash</span>
                          <span className="desc">Restores changes & deletes stash from list</span>
                        </div>
                      </div>

                      <div 
                        className="split-dropdown-item"
                        onClick={() => {
                          if (selectedStashIndex !== null) {
                            popStash(selectedStashIndex);
                          }
                          setIsRestoreDropdownOpen(false);
                        }}
                      >
                        <FolderSync size={14} style={{ color: "var(--accent-blue-bright, #38bdf8)" }} />
                        <div className="split-dropdown-item-text">
                          <span className="title">Pop & Remove Stash</span>
                          <span className="desc">Restores changes & deletes stash from list</span>
                        </div>
                      </div>

                      {checkedStashFiles.size > 0 && (
                        <div 
                          className="split-dropdown-item"
                          onClick={() => {
                            restoreSelectedStashFiles();
                            setIsRestoreDropdownOpen(false);
                          }}
                        >
                          <RefreshCcw size={14} style={{ color: "var(--color-staged)" }} />
                          <div className="split-dropdown-item-text">
                            <span className="title">Restore Selected ({checkedStashFiles.size})</span>
                            <span className="desc">Restores only checked files to working tree</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="stash-footer-group right">
                <button 
                  className="stash-action-btn danger" 
                  onClick={() => dropStash(selectedStashIndex)} 
                  title="Discard stash entry permanently"
                >
                  <Trash2 size={14} />
                  <span>Discard</span>
                </button>
                <button 
                  className="stash-action-btn close" 
                  onClick={() => {
                    setDialogType(null);
                    setSelectedStashIndex(null);
                    setIsRestoreDropdownOpen(false);
                  }}
                >
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE BRANCH CONFIRM DIALOG */}
        {dialogType === "delete-branch-confirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-main)" }}>
              Are you sure you want to delete the branch <strong>{pendingDeleteBranch}</strong>? This action cannot be undone.
            </span>
            <div className="dialog-actions" style={{ marginTop: "8px" }}>
              <button className="dialog-button secondary" onClick={() => { setDialogType(null); setPendingDeleteBranch(null); }}>Cancel</button>
              <button className="dialog-button" style={{ background: "var(--color-deleted)", color: "white" }} onClick={() => executeDeleteBranch(true)}>Delete Branch</button>
            </div>
          </div>
        )}

        {/* FORCE DELETE BRANCH CONFIRM DIALOG */}
        {dialogType === "git-delete-force-confirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-main)" }}>
              The branch <strong>{pendingDeleteBranch}</strong> is not fully merged. Force deleting it will discard any unmerged work.
            </span>
            <div className="dialog-actions" style={{ marginTop: "8px" }}>
              <button className="dialog-button secondary" onClick={() => { setDialogType(null); setPendingDeleteBranch(null); }}>Cancel</button>
              <button className="dialog-button" style={{ background: "var(--color-deleted)", color: "white" }} onClick={() => executeDeleteBranch(true)}>Force Delete</button>
            </div>
          </div>
        )}

        {/* DISCARD CHANGES CONFIRM DIALOG */}
        {dialogType === "discard-changes-confirm" && pendingDiscardFiles && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-text-main)", lineHeight: 1.45 }}>
              Are you sure you want to discard changes in {pendingDiscardFiles.length === 1 ? (
                <><strong>{pendingDiscardFiles[0]}</strong></>
              ) : (
                <><strong>{pendingDiscardFiles.length} files</strong></>
              )}? This will revert modified files to the index and permanently delete untracked files from disk. This action cannot be undone.
            </span>
            {pendingDiscardFiles.length > 1 && (
              <div style={{ maxHeight: "140px", overflowY: "auto", background: "rgba(0, 0, 0, 0.25)", borderRadius: "6px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "4px", border: "1px solid var(--border-color)" }}>
                {pendingDiscardFiles.map(path => (
                  <span key={path} style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                    {path}
                  </span>
                ))}
              </div>
            )}
            <div className="dialog-actions" style={{ marginTop: "8px" }}>
              <button 
                type="button" 
                className="dialog-button secondary" 
                onClick={() => { setDialogType(null); if (setPendingDiscardFiles) setPendingDiscardFiles(null); }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="dialog-button" 
                style={{ background: "var(--color-deleted)", color: "white" }} 
                onClick={handleExecuteDiscardChanges}
              >
                Discard Changes
              </button>
            </div>
          </div>
        )}

        {/* CHECKOUT CONFLICT DIALOG */}
        {dialogType === "checkout-conflict" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-main)", lineHeight: 1.5, margin: 0 }}>
              You have uncommitted changes on branch <span className="branch-inline-badge">{currentBranch}</span>. What would you like to do with these changes when switching to <span className="branch-inline-badge">{pendingCheckoutBranch}</span>?
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="conflict-option-card" onClick={handleCheckoutBringChanges}>
                <div className="conflict-option-icon conflict-option-icon--carry">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div className="conflict-option-text">
                  <span className="conflict-option-title">Bring my changes to {pendingCheckoutBranch}</span>
                  <span className="conflict-option-desc">Your uncommitted files will be carried over to {pendingCheckoutBranch}.</span>
                </div>
                <svg className="conflict-option-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>

              <div className="conflict-option-card" onClick={handleCheckoutStashChanges}>
                <div className="conflict-option-icon conflict-option-icon--stash">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
                </div>
                <div className="conflict-option-text">
                  <span className="conflict-option-title">Leave my changes on {currentBranch} (Stash)</span>
                  <span className="conflict-option-desc">Stash uncommitted changes on {currentBranch} before switching.</span>
                </div>
                <svg className="conflict-option-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </div>

            <div className="dialog-actions">
              <button 
                className="dialog-button secondary" 
                style={{ width: "100%" }}
                onClick={() => {
                  setDialogType(null);
                  setPendingCheckoutBranch(null);
                  if (setPendingCheckoutArgs) setPendingCheckoutArgs(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* DIRECTORY NOT GIT CONFIRM DIALOG */}
        {dialogType === "git-init-confirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-main)" }}>
              The folder <strong>{pendingWorkspacePath}</strong> is not an active Git repository. What would you like to do?
            </span>
            
            <button 
              className="sync-button" 
              style={{ background: "var(--accent-button)" }}
              onClick={handleInitializeGitWorkspace}
            >
              Initialize a new Git repository here
            </button>
            
            <button 
              className="sync-button" 
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)" }}
              onClick={handleCloneOptionWorkspace}
            >
              Clone a remote Git repository into this folder
            </button>

            <div className="dialog-actions" style={{ marginTop: "6px" }}>
              <button 
                className="dialog-button secondary" 
                style={{ width: "100%" }}
                onClick={() => {
                  setDialogType(null);
                  setPendingWorkspacePath("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ADD WORKSPACE PROJECT */}
        {dialogType === "workspace-add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              Select a local folder on your computer to add as a workspace project, or clone a remote repository:
            </span>
            
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                className="dialog-input"
                style={{ flex: 1 }}
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                placeholder="Selected folder path..."
              />
              <button 
                className="dialog-button secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                type="button"
                onClick={async () => {
                  try {
                    const folder = await invoke<string | null>("select_folder");
                    if (folder) {
                      setDialogInput(folder);
                    }
                  } catch (err: any) {
                    console.error(err);
                  }
                }}
                title="Open native folder picker"
              >
                <FolderPlus size={15} />
                Browse...
              </button>
            </div>
            
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button 
                className="sync-button" 
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={async () => {
                  if (!dialogInput) {
                    try {
                      const folder = await invoke<string | null>("select_folder");
                      if (folder) {
                        setDialogInput(folder);
                        const targetPath = folder;
                        try {
                          await invoke("get_git_status", { repoPath: targetPath });
                          const newList = [...workspaces];
                          if (!newList.includes(targetPath)) {
                            newList.push(targetPath);
                          }
                          setWorkspaces(newList);
                          localStorage.setItem("sn_workspaces", JSON.stringify(newList));
                          setRepoPath(targetPath);
                          setDialogType(null);
                          setDialogInput("");
                          await refreshRepository(targetPath);
                        } catch (err: any) {
                          setPendingWorkspacePath(targetPath);
                          setDialogType("git-init-confirm");
                          setDialogInput("");
                        }
                      }
                    } catch (err: any) {
                      console.error(err);
                    }
                    return;
                  }
                  handleWorkspaceAddSubmit();
                }}
              >
                <FolderPlus size={14} />
                {dialogInput ? "Open Selected Folder" : "Choose Folder..."}
              </button>
              
              <button 
                className="sync-button" 
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={() => {
                  setDialogInput2(dialogInput);
                  setDialogInput("");
                  setDialogType("clone");
                }}
              >
                <FolderSync size={14} />
                Clone Remote Repo
              </button>
            </div>
          </div>
        )}

        {/* CONNECT GITHUB ACCOUNT */}
        {dialogType === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button className="sync-button" style={{ background: "var(--accent-button)", padding: "10px 14px", fontWeight: 600 }} onClick={loginGitHubOAuth}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              Authorize via Browser (OAuth)
            </button>
            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.75rem", letterSpacing: "0.05em" }}>— OR USE PERSONAL ACCESS TOKEN —</div>
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              type="password"
              placeholder="Paste GitHub Personal Access Token (PAT)..."
            />
            <div className="dialog-actions">
              <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
              <button className="dialog-button primary" onClick={handlePATLogin} disabled={!dialogInput}>
                Connect via PAT
              </button>
            </div>
          </div>
        )}

        {/* CLONE REMOTE REPOS */}
        {dialogType === "clone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Select a repository, or enter the Git clone HTTPS/SSH URL:</span>
            {githubRepos.length > 0 && (
              <select 
                className="dialog-input"
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
              >
                <option value="">-- Choose from your GitHub repositories --</option>
                {githubRepos.map(repo => (
                  <option key={repo.full_name} value={repo.clone_url}>{repo.full_name}</option>
                ))}
              </select>
            )}
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder="Or enter git URL (https://github.com/...)"
              disabled={isCloningRepo}
            />
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                className="dialog-input"
                style={{ flex: 1 }}
                value={dialogInput2}
                onChange={(e) => setDialogInput2(e.target.value)}
                placeholder="Local destination path..."
                disabled={isCloningRepo}
              />
              <button 
                className="dialog-button secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                type="button"
                disabled={isCloningRepo}
                onClick={async () => {
                  try {
                    const folder = await invoke<string | null>("select_folder");
                    if (folder) {
                      setDialogInput2(folder);
                    }
                  } catch (err: any) {
                    console.error(err);
                  }
                }}
                title="Open native folder picker"
              >
                <FolderPlus size={15} />
                Browse...
              </button>
            </div>
            <div className="dialog-actions">
              <button className="dialog-button secondary" onClick={() => setDialogType(null)} disabled={isCloningRepo}>Cancel</button>
              <button 
                className="dialog-button primary" 
                onClick={handleCloneRepo} 
                disabled={!dialogInput || !dialogInput2 || isCloningRepo}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {isCloningRepo ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>Cloning Repository...</span>
                  </>
                ) : (
                  <span>Clone Repository</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* CREATE PULL REQUEST */}
        {dialogType === "pr-create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Create PR to merge branch <strong>{currentBranch}</strong> into base branch <strong>main</strong>.
            </span>
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder="Pull request title..."
            />
            <textarea 
              className="dialog-input"
              style={{ minHeight: "70px", resize: "vertical" }}
              value={dialogInput2}
              onChange={(e) => setDialogInput2(e.target.value)}
              placeholder="Pull request description..."
            />
            <div className="dialog-actions">
              <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
              <button className="dialog-button primary" onClick={handleCreatePR} disabled={!dialogInput}>
                Publish Pull Request
              </button>
            </div>
          </div>
        )}

        {/* CREATE BRANCH DIALOG */}
        {dialogType === "branch" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {targetCommitForBranch && (
              <div className="dialog-commit-summary-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                  <span className="commit-sha-badge" style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: 0 }}>
                    <GitCommit size={12} style={{ color: "var(--accent-purple-bright)" }} />
                    <span>{targetCommitForBranch.short_id || targetCommitForBranch.id.substring(0, 8)}</span>
                  </span>
                  <span style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                    {targetCommitForBranch.author}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-bright)", fontWeight: 500, lineHeight: 1.4, wordBreak: "break-word" }}>
                  {targetCommitForBranch.message}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.76rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                New Branch Name
              </label>
              <input 
                className="dialog-input"
                autoFocus
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dialogInput.trim()) {
                    handleDialogSubmit();
                  }
                }}
                placeholder={targetCommitForBranch ? "e.g. feature/my-branch" : "new-branch-name"}
              />
            </div>

            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              fontSize: "0.78rem", 
              color: "var(--color-text-main)", 
              cursor: "pointer",
              userSelect: "none"
            }}>
              <input 
                type="checkbox"
                checked={checkoutNewBranch}
                onChange={(e) => setCheckoutNewBranch?.(e.target.checked)}
                style={{ accentColor: "var(--accent-purple)", cursor: "pointer" }}
              />
              <span>Checkout branch after creating</span>
            </label>

            <div className="dialog-actions" style={{ marginTop: "4px" }}>
              <button 
                type="button"
                className="dialog-button secondary" 
                onClick={() => {
                  setDialogType(null);
                  if (setTargetCommitForBranch) setTargetCommitForBranch(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="dialog-button primary" 
                onClick={handleDialogSubmit}
                disabled={!dialogInput.trim()}
              >
                <GitBranch size={13} />
                <span>Create Branch</span>
              </button>
            </div>
          </div>
        )}

        {/* CHECKOUT BRANCH DIALOG */}
        {dialogType === "checkout" && (
          <>
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder="branch-to-checkout"
            />
            <div className="dialog-actions">
              <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
              <button className="dialog-button primary" onClick={handleDialogSubmit}>Submit</button>
            </div>
          </>
        )}

        {/* MERGE / REBASE BRANCH DIALOG */}
        {dialogType === "merge-rebase" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{
              display: "flex",
              background: "var(--bg-app)",
              borderRadius: "6px",
              padding: "3px",
              border: "1px solid var(--border-color)"
            }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "4px",
                  background: mergeRebaseMode === "merge" ? "var(--bg-panel-secondary)" : "transparent",
                  color: mergeRebaseMode === "merge" ? "var(--color-text-bright)" : "var(--color-text-muted)",
                  fontWeight: mergeRebaseMode === "merge" ? 600 : 400,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
                onClick={() => setMergeRebaseMode("merge")}
              >
                <GitMerge size={14} style={{ color: "var(--color-modified)" }} />
                Merge Branch
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "4px",
                  background: mergeRebaseMode === "rebase" ? "var(--bg-panel-secondary)" : "transparent",
                  color: mergeRebaseMode === "rebase" ? "var(--color-text-bright)" : "var(--color-text-muted)",
                  fontWeight: mergeRebaseMode === "rebase" ? 600 : 400,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
                onClick={() => setMergeRebaseMode("rebase")}
              >
                <GitCommit size={14} style={{ color: "var(--accent-purple)" }} />
                Rebase Branch
              </button>
            </div>

            <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
              {mergeRebaseMode === "merge" ? (
                <span>Integrate changes from target branch into current branch (<strong>{currentBranch}</strong>). ({allBranches.length} branches registered)</span>
              ) : (
                <span>Reapply commits from current branch (<strong>{currentBranch}</strong>) onto top of target branch. ({allBranches.length} branches registered)</span>
              )}
            </div>

            {(() => {
              const query = targetBranchSearch.trim().toLowerCase();
              const availableLocal = branchList.filter(b => b !== currentBranch);
              const filteredLocal = availableLocal.filter(b => !query || b.toLowerCase().includes(query));
              const filteredRemote = remoteBranches.filter(r => !query || r.toLowerCase().includes(query));
              const isTargetRemote = remoteBranches.includes(targetMergeBranch);

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Select Target Branch:</span>
                    {targetMergeBranch && (
                      <span style={{ fontSize: "0.7rem", color: isTargetRemote ? "var(--accent-blue)" : "var(--accent-purple-bright)", fontFamily: "var(--font-mono)" }}>
                        {isTargetRemote ? "remote" : "local"}
                      </span>
                    )}
                  </label>

                  <div className="modern-branch-select-container" ref={targetBranchDropdownRef}>
                    <button
                      type="button"
                      className={`modern-branch-select-trigger ${isTargetBranchDropdownOpen ? 'active' : ''}`}
                      onClick={() => setIsTargetBranchDropdownOpen(prev => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={isTargetBranchDropdownOpen}
                    >
                      <div className="modern-branch-select-value">
                        {isTargetRemote ? (
                          <Globe size={14} className="modern-branch-icon remote" />
                        ) : (
                          <GitBranch size={14} className="modern-branch-icon local" />
                        )}
                        <span className="modern-branch-name">
                          {targetMergeBranch || "Select a branch..."}
                        </span>
                        {targetMergeBranch && (
                          <span className={`modern-branch-badge ${isTargetRemote ? 'remote' : 'local'}`}>
                            {isTargetRemote ? "remote" : "local"}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`modern-branch-chevron ${isTargetBranchDropdownOpen ? 'open' : ''}`}
                      />
                    </button>

                    {isTargetBranchDropdownOpen && (
                      <div className="modern-branch-dropdown-menu" role="listbox">
                        <div className="modern-branch-search-box">
                          <Search size={13} className="modern-branch-search-icon" />
                          <input
                            ref={branchSearchInputRef}
                            type="text"
                            className="modern-branch-search-input"
                            placeholder="Filter branches..."
                            value={targetBranchSearch}
                            onChange={(e) => setTargetBranchSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setIsTargetBranchDropdownOpen(false);
                              }
                            }}
                          />
                          {targetBranchSearch && (
                            <button
                              type="button"
                              className="modern-branch-search-clear"
                              onClick={() => setTargetBranchSearch('')}
                              title="Clear search"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        <div className="modern-branch-list">
                          {filteredLocal.length === 0 && filteredRemote.length === 0 ? (
                            <div className="modern-branch-empty">
                              No branches match "{targetBranchSearch}"
                            </div>
                          ) : (
                            <>
                              {filteredLocal.length > 0 && (
                                <div className="modern-branch-group">
                                  <div className="modern-branch-group-header">
                                    <span>Local Branches</span>
                                    <span className="modern-branch-count">{filteredLocal.length}</span>
                                  </div>
                                  {filteredLocal.map(b => {
                                    const isSelected = b === targetMergeBranch;
                                    return (
                                      <div
                                        key={b}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`modern-branch-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                          setTargetMergeBranch(b);
                                          setIsTargetBranchDropdownOpen(false);
                                        }}
                                      >
                                        <div className="modern-branch-item-left">
                                          <GitBranch size={13} className="modern-branch-icon local" />
                                          <span className="modern-branch-item-text">{b}</span>
                                        </div>
                                        {isSelected && <Check size={14} className="modern-branch-check" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {filteredRemote.length > 0 && (
                                <div className="modern-branch-group">
                                  <div className="modern-branch-group-header">
                                    <span>Remote Branches</span>
                                    <span className="modern-branch-count">{filteredRemote.length}</span>
                                  </div>
                                  {filteredRemote.map(r => {
                                    const isSelected = r === targetMergeBranch;
                                    return (
                                      <div
                                        key={r}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`modern-branch-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                          setTargetMergeBranch(r);
                                          setIsTargetBranchDropdownOpen(false);
                                        }}
                                      >
                                        <div className="modern-branch-item-left">
                                          <Globe size={13} className="modern-branch-icon remote" />
                                          <span className="modern-branch-item-text">{r}</span>
                                        </div>
                                        {isSelected && <Check size={14} className="modern-branch-check" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="dialog-actions" style={{ marginTop: "10px" }}>
              <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
              <button
                className="dialog-button"
                style={{
                  background: mergeRebaseMode === "merge" ? "var(--accent-blue)" : "var(--accent-purple)",
                  color: "white"
                }}
                disabled={!targetMergeBranch}
                onClick={handleExecuteMergeOrRebase}
              >
                {mergeRebaseMode === "merge"
                  ? `Merge '${targetMergeBranch}' into '${currentBranch}'`
                  : `Rebase '${currentBranch}' onto '${targetMergeBranch}'`}
              </button>
            </div>
          </div>
        )}

        {/* PULL STRATEGY DIALOG (REBASE OR FULLY MERGE) */}
        {dialogType === "pull-strategy" && (
          <div className="pull-strategy-container">
            <div className="pull-strategy-header">
              Remote <strong style={{ color: "var(--color-text-bright)" }}>{upstreamBranchName || `origin/${currentBranch}`}</strong> has{" "}
              <strong style={{ color: "#fbbf24" }}>{behindCount > 0 ? behindCount : 1} new commit{(behindCount > 1 || behindCount === 0) ? "s" : ""}</strong> ready to integrate into your local branch <strong style={{ color: "var(--color-text-bright)" }}>{currentBranch}</strong>.
              <br />Choose your integration strategy:
            </div>

            <div className="pull-strategy-cards">
              {/* Option 1: Fully Merge */}
              <div 
                className={`pull-strategy-card ${mergeRebaseMode === "merge" ? "selected" : ""}`}
                onClick={() => setMergeRebaseMode("merge")}
              >
                <div className="pull-strategy-icon-box">
                  <GitMerge size={17} />
                </div>
                <div className="pull-strategy-card-body">
                  <div className="pull-strategy-card-title-row">
                    <span className="pull-strategy-card-title">Fully Merge</span>
                  </div>
                  <span className="pull-strategy-card-desc">
                    Integrates remote commits with a merge commit. Preserves exact history, branch topology, and full commit context. Recommended for shared or public branches.
                  </span>
                </div>
              </div>

              {/* Option 2: Rebase */}
              <div 
                className={`pull-strategy-card ${mergeRebaseMode === "rebase" ? "selected" : ""}`}
                onClick={() => setMergeRebaseMode("rebase")}
              >
                <div className="pull-strategy-icon-box">
                  <GitCommit size={17} />
                </div>
                <div className="pull-strategy-card-body">
                  <div className="pull-strategy-card-title-row">
                    <span className="pull-strategy-card-title">Rebase Local Commits</span>
                  </div>
                  <span className="pull-strategy-card-desc">
                    Replays your unpushed local commits on top of incoming remote commits. Keeps history clean, linear, and avoids redundant merge commits.
                  </span>
                </div>
              </div>
            </div>

            {/* Preference Option & Settings Link */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px', marginTop: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.76rem', color: 'var(--color-text-muted)', userSelect: 'none' }}>
                <input 
                  type="checkbox"
                  checked={rememberPullChoice}
                  onChange={e => setRememberPullChoice(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                />
                <span>Set as default pull strategy in Settings</span>
              </label>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setDialogType(null);
                    onOpenSettings();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-purple-bright)',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  title="Open Settings to customize pull behavior"
                >
                  <Settings size={12} />
                  <span>Configure Settings</span>
                </button>
              )}
            </div>

            <div className="dialog-actions" style={{ marginTop: "6px" }}>
              <button 
                type="button"
                className="dialog-button secondary" 
                onClick={() => setDialogType(null)}
                disabled={isPullingRemote}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-button primary"
                disabled={isPullingRemote}
                onClick={async () => {
                  if (rememberPullChoice) {
                    localStorage.setItem('stagenode_pull_strategy', mergeRebaseMode);
                    invoke('save_global_settings', {
                      settings: {
                        default_pull_strategy: mergeRebaseMode
                      }
                    }).catch(() => {});
                  }
                  setDialogType(null);
                  if (handleGitPull) {
                    await handleGitPull(mergeRebaseMode);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {isPullingRemote ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>Pulling...</span>
                  </>
                ) : mergeRebaseMode === "rebase" ? (
                  <>
                    <GitCommit size={13} />
                    <span>Pull with Rebase</span>
                  </>
                ) : (
                  <>
                    <GitMerge size={13} />
                    <span>Pull with Merge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SET REMOTE URL / PUBLISH DIALOG */}
        {(dialogType === "set-remote" || dialogType === "publish") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              No remote repository URL is configured for <strong>origin</strong>. Enter the HTTPS or SSH clone URL for your remote repository to publish this branch:
            </span>
            
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder="e.g. https://github.com/username/repository.git"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSetRemoteUrl();
                }
              }}
            />

            {githubRepos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Or choose from your GitHub repositories:</span>
                <select 
                  className="dialog-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                >
                  <option value="">-- Choose GitHub Repository --</option>
                  {githubRepos.map(repo => (
                    <option key={repo.full_name} value={repo.clone_url}>{repo.clone_url}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="dialog-actions" style={{ marginTop: "6px" }}>
              <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
              <button 
                className="sync-button" 
                style={{ background: "var(--accent-button)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={handleSetRemoteUrl}
              >
                <Globe size={14} />
                Set Remote & Publish
              </button>
            </div>
          </div>
        )}

        {/* PUSH UP TO SELECTED COMMIT DIALOG */}
        {dialogType === "push-commit" && targetCommitForPush && (() => {
          const targetCommitIdx = commits ? commits.findIndex(c => c.id === targetCommitForPush.id) : -1;
          const commitsRemainingLocal = targetCommitIdx > 0 ? commits.slice(0, targetCommitIdx) : [];
          const isAlreadyRemote = targetCommitForPush.branches.some(b => b === `origin/${pushTargetBranch}` || b.startsWith("origin/"));
          const isHead = targetCommitIdx === 0;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                Push your repository history up to this selected commit to remote. Any commits made after this commit will remain purely local and unpushed.
              </div>

              {/* Target Commit Summary Card */}
              <div className="dialog-commit-summary-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="commit-sha-badge" style={{ marginBottom: 0 }}>
                    {targetCommitForPush.short_id || targetCommitForPush.id.substring(0, 8)}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                    {new Date(targetCommitForPush.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-bright)", marginBottom: "4px" }}>
                  {targetCommitForPush.message}
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                  Author: <strong>{targetCommitForPush.author}</strong>
                </div>
              </div>

              {/* Remote & Branch Selection */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-bright)" }}>
                  Target Remote Branch:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    padding: "6px 10px",
                    background: "var(--bg-panel-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <Globe size={13} style={{ color: "var(--accent-blue)" }} />
                    <span>origin /</span>
                  </div>
                  <select
                    className="dialog-input"
                    style={{ flex: 1, padding: "6px 10px" }}
                    value={pushTargetBranch}
                    onChange={(e) => setPushTargetBranch(e.target.value)}
                  >
                    {branchList.map(b => (
                      <option key={b} value={b}>{b} {b === currentBranch ? "(current)" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Impact Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{
                  padding: "10px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-staged)", fontSize: "0.74rem", fontWeight: 600 }}>
                    <ArrowUpCircle size={14} />
                    <span>Pushed to Remote</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-bright)", fontWeight: 500 }}>
                    Up to {targetCommitForPush.short_id || targetCommitForPush.id.substring(0, 8)}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                    {isHead ? "Includes all commits on this branch." : "Remote branch will update to this commit."}
                  </div>
                </div>

                <div style={{
                  padding: "10px",
                  background: commitsRemainingLocal.length > 0 ? "rgba(245, 158, 11, 0.08)" : "rgba(255, 255, 255, 0.03)",
                  border: commitsRemainingLocal.length > 0 ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid var(--border-color)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: commitsRemainingLocal.length > 0 ? "var(--color-untracked)" : "var(--color-text-muted)", fontSize: "0.74rem", fontWeight: 600 }}>
                    <Archive size={14} />
                    <span>Remaining Local</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-bright)", fontWeight: 500 }}>
                    {commitsRemainingLocal.length} {commitsRemainingLocal.length === 1 ? "commit" : "commits"}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                    {commitsRemainingLocal.length > 0 ? "Kept unpushed on your local branch." : "No subsequent commits."}
                  </div>
                </div>
              </div>

              {/* List remaining unpushed commits preview if any */}
              {commitsRemainingLocal.length > 0 && (
                <div style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  fontSize: "0.72rem",
                  maxHeight: "110px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.68rem", textTransform: "uppercase" }}>
                    Commits that will stay local (not pushed):
                  </span>
                  {commitsRemainingLocal.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-main)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-purple-bright)", fontSize: "0.68rem" }}>
                        {c.short_id || c.id.substring(0, 7)}
                      </span>
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {c.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isAlreadyRemote && (
                <div style={{
                  padding: "8px 10px",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <Globe size={14} />
                  <span>Notice: This commit already has a remote pointer pointing to it.</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="dialog-actions" style={{ marginTop: "4px" }}>
                <button 
                  type="button" 
                  className="dialog-button secondary" 
                  onClick={() => {
                    setDialogType(null);
                    if (setTargetCommitForPush) setTargetCommitForPush(null);
                  }}
                  disabled={isPushingCommit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="sync-button"
                  style={{
                    background: "var(--color-staged)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "6px 14px"
                  }}
                  disabled={isPushingCommit || !pushTargetBranch}
                  onClick={() => {
                    if (handleExecutePushCommit && targetCommitForPush && pushTargetBranch) {
                      handleExecutePushCommit(targetCommitForPush.id, pushTargetBranch, "origin");
                    }
                  }}
                >
                  <ArrowUpCircle size={14} className={isPushingCommit ? "spin-icon" : ""} />
                  <span>{isPushingCommit ? "Pushing to Remote..." : `Push up to ${targetCommitForPush.short_id || targetCommitForPush.id.substring(0, 8)}`}</span>
                </button>
              </div>
            </div>
          );
        })()}


      </div>
    </div>
  );
};

export default Dialogs;
