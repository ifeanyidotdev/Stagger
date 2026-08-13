import React, { useState } from 'react';
import { Archive, X, Eye, FileCode, RefreshCw, FolderSync, Trash2, RefreshCcw, FolderPlus, GitMerge, GitCommit, Globe, ChevronDown } from 'lucide-react';
import type { GitHubRepo, DialogType, StashEntry } from '../../types/git';
import { invoke } from '@tauri-apps/api/core';

interface DialogsProps {
  dialogType: DialogType;
  setDialogType: (type: DialogType) => void;
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
}

const Dialogs: React.FC<DialogsProps> = ({
  dialogType,
  setDialogType,
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
  pushStash
}) => {
  const [isRestoreDropdownOpen, setIsRestoreDropdownOpen] = useState(false);

  if (!dialogType) return null;

  return (
    <div className="dialog-overlay">
      <div className={`dialog-content${dialogType === "stash-inspector" ? " dialog-content--wide" : ""}`}>
        <div className="dialog-title">
          <span>
            {dialogType === "branch" && "Create Branch"}
            {dialogType === "checkout" && "Checkout Branch"}
            {dialogType === "clone" && "Clone Remote Repository"}
            {(dialogType === "publish" || dialogType === "set-remote") && "Set Remote Repository URL"}
            {dialogType === "pr-create" && "Create GitHub Pull Request"}
            {dialogType === "login" && "Connect GitHub Account"}
            {dialogType === "workspace-add" && "Add Workspace Project"}
            {dialogType === "git-init-confirm" && "Initialize Git Repository?"}
            {dialogType === "delete-branch-confirm" && "Delete Branch?"}
            {dialogType === "git-delete-force-confirm" && "Force Delete Branch?"}
            {dialogType === "checkout-conflict" && "Uncommitted Changes"}
            {dialogType === "stash-name" && "Save Stash"}
            {dialogType === "merge-rebase" && "Merge / Rebase Branch"}
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
              <button className="dialog-button" style={{ background: "var(--color-deleted)", color: "white" }} onClick={() => executeDeleteBranch(false)}>Delete Branch</button>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button className="sync-button" onClick={loginGitHubOAuth}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              Authorize via browser (OAuth)
            </button>
            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>— OR —</div>
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              type="password"
              placeholder="Paste GitHub Personal Access Token (PAT)"
            />
            <button className="sync-button" style={{ background: "var(--accent-button)" }} onClick={handlePATLogin}>
              Connect via PAT
            </button>
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
            />
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                className="dialog-input"
                style={{ flex: 1 }}
                value={dialogInput2}
                onChange={(e) => setDialogInput2(e.target.value)}
                placeholder="Local destination path..."
              />
              <button 
                className="dialog-button secondary"
                style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                type="button"
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
            <button className="sync-button" onClick={handleCloneRepo}>
              Clone Repository
            </button>
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
            <input 
              className="dialog-input"
              value={dialogInput2}
              onChange={(e) => setDialogInput2(e.target.value)}
              placeholder="Pull request description..."
            />
            <button className="sync-button" onClick={handleCreatePR}>
              Publish Pull Request
            </button>
          </div>
        )}

        {/* BASE BRANCH / CHECKOUT */}
        {(dialogType === "branch" || dialogType === "checkout") && (
          <>
            <input 
              className="dialog-input"
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              placeholder={dialogType === "branch" ? "new-branch-name" : "branch-to-checkout"}
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

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                Select Target Branch:
              </label>
              <select
                className="dialog-input"
                value={targetMergeBranch}
                onChange={(e) => setTargetMergeBranch(e.target.value)}
                style={{
                  padding: "8px 10px",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  color: "var(--color-text-bright)",
                  borderRadius: "6px",
                  fontSize: "0.82rem"
                }}
              >
                <optgroup label="Local Branches">
                  {branchList.filter(b => b !== currentBranch).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </optgroup>
                {remoteBranches.length > 0 && (
                  <optgroup label="Remote Branches">
                    {remoteBranches.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

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

        {dialogType !== "branch" && dialogType !== "checkout" && dialogType !== "workspace-add" && dialogType !== "git-init-confirm" && dialogType !== "checkout-conflict" && dialogType !== "delete-branch-confirm" && dialogType !== "git-delete-force-confirm" && dialogType !== "stash-name" && dialogType !== "stash-inspector" && dialogType !== "merge-rebase" && dialogType !== "set-remote" && dialogType !== "publish" && (
          <div className="dialog-actions" style={{ marginTop: "6px" }}>
            <button className="dialog-button secondary" style={{ width: "100%" }} onClick={() => setDialogType(null)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialogs;
