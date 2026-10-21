import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, ChevronRight, ChevronDown, FileCode, CheckCircle2, Check, Trash2, Copy, Minus } from 'lucide-react';
import type { GitFileStatus } from '../../types/git';

interface FilePaneProps {
  filePaneWidth: number;
  refreshRepository: () => void;
  conflictedFiles: string[];
  resolveConflict: (file: string, action: "ours" | "theirs" | "resolved") => void;
  unstagedCollapsed: boolean;
  setUnstagedCollapsed: (val: boolean) => void;
  unstagedFiles: GitFileStatus[];
  checkedUnstaged: string[];
  setCheckedUnstaged: React.Dispatch<React.SetStateAction<string[]>>;
  stageSelectedUnstaged: () => void;
  stageAllUnstaged: () => void;
  selectedFile: string | null;
  selectFileForStaging: (file: GitFileStatus) => void;
  stageWholeFile: (file: string) => void;
  stagedCollapsed: boolean;
  setStagedCollapsed: (val: boolean) => void;
  stagedFiles: GitFileStatus[];
  checkedStaged: string[];
  setCheckedStaged: React.Dispatch<React.SetStateAction<string[]>>;
  unstageSelectedStaged: () => void;
  unstageAllStaged: () => void;
  unstageWholeFile: (file: string) => void;
  requestDiscardFile: (filePath: string) => void;
  requestDiscardSelected: () => void;
  hasRepo: boolean;
  initializeGitRepo: () => void;
}

const FilePane: React.FC<FilePaneProps> = ({
  filePaneWidth,
  refreshRepository,
  conflictedFiles,
  resolveConflict,
  unstagedCollapsed,
  setUnstagedCollapsed,
  unstagedFiles,
  checkedUnstaged,
  setCheckedUnstaged,
  stageSelectedUnstaged,
  stageAllUnstaged,
  selectedFile,
  selectFileForStaging,
  stageWholeFile,
  stagedCollapsed,
  setStagedCollapsed,
  stagedFiles,
  checkedStaged,
  setCheckedStaged,
  unstageSelectedStaged,
  unstageAllStaged,
  unstageWholeFile,
  requestDiscardFile,
  requestDiscardSelected,
  hasRepo,
  initializeGitRepo
}) => {
  const isWorkingTreeClean = hasRepo && unstagedFiles.length === 0 && stagedFiles.length === 0 && conflictedFiles.length === 0;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: GitFileStatus;
    type: 'unstaged' | 'staged';
  } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    if (contextMenu) {
      window.addEventListener('click', handleCloseMenu);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);
  return (
    <div 
      className="file-pane"
      style={{ width: `${filePaneWidth}px` }}
    >
      <div className="pane-header">
        <span className="pane-title">Working Tree</span>
        <RefreshCw size={12} className="refresh-icon" onClick={() => refreshRepository()} />
      </div>
      <div className="file-list-container">
        {isWorkingTreeClean ? (
          <div className="working-tree-clean">
            <div className="clean-tree-icon-wrapper">
              <CheckCircle2 size={24} className="clean-tree-icon" />
            </div>
            <div className="clean-tree-title">Working Tree Clean</div>
            <div className="clean-tree-desc">No unstaged or staged changes detected</div>
          </div>
        ) : (
          <>
            {/* Conflict File Panel */}
            {conflictedFiles.length > 0 && (
              <div className="file-group">
                <div className="file-group-header" style={{ color: "var(--color-conflict)" }}>
                  <span>Merge Conflicts</span>
                  <AlertTriangle size={12} />
                </div>
                {conflictedFiles.map(file => (
                  <div key={file} className="conflict-container">
                    <span className="conflict-file-header">{file}</span>
                    <div className="conflict-choices">
                      <div className="conflict-card" onClick={() => resolveConflict(file, "ours")}>
                        <div className="conflict-card-title">Keep Ours</div>
                        <div className="conflict-card-desc">Accept Current</div>
                      </div>
                      <div className="conflict-card" onClick={() => resolveConflict(file, "theirs")}>
                        <div className="conflict-card-title">Keep Theirs</div>
                        <div className="conflict-card-desc">Accept Incoming</div>
                      </div>
                    </div>
                    <button 
                      style={{ width: "100%", padding: "4px", background: "var(--bg-active)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--color-text-bright)", fontSize: "0.75rem", cursor: "pointer" }}
                      onClick={() => resolveConflict(file, "resolved")}
                    >
                      Mark Resolved
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Unstaged Files */}
            <div className="file-group">
              <div 
                className="file-group-header"
                onClick={() => setUnstagedCollapsed(!unstagedCollapsed)}
              >
                <div className="file-group-header-left">
                  {unstagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="file-group-header-title">Unstaged Changes</span>
                  <span className="badge">{unstagedFiles.length}</span>
                </div>
                <div className="file-group-header-right" onClick={(e) => e.stopPropagation()}>
                  {unstagedFiles.length > 0 && (
                    <input 
                      type="checkbox"
                      className="header-checkbox"
                      checked={unstagedFiles.length > 0 && checkedUnstaged.length === unstagedFiles.length}
                      ref={el => {
                        if (el) {
                          el.indeterminate = checkedUnstaged.length > 0 && checkedUnstaged.length < unstagedFiles.length;
                        }
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedUnstaged(unstagedFiles.map(f => f.path));
                        } else {
                          setCheckedUnstaged([]);
                        }
                      }}
                      title="Select all unstaged changes"
                    />
                  )}
                  {checkedUnstaged.length === 0 && unstagedFiles.length > 0 && (
                    <button 
                      className="stage-action-btn"
                      onClick={stageAllUnstaged}
                      title="Stage all changes"
                    >
                      Stage All
                    </button>
                  )}
                </div>
              </div>

              {checkedUnstaged.length > 0 && !unstagedCollapsed && (
                <div className="file-selection-bar">
                  <span className="file-selection-count">
                    {checkedUnstaged.length} selected
                  </span>
                  <div className="file-selection-actions">
                    <button 
                      className="file-selection-btn discard"
                      onClick={requestDiscardSelected}
                      title={`Discard ${checkedUnstaged.length} selected change(s)`}
                    >
                      <Trash2 size={11} />
                      <span>Discard</span>
                    </button>
                    <button 
                      className="file-selection-btn stage"
                      onClick={stageSelectedUnstaged}
                      title={`Stage ${checkedUnstaged.length} selected file(s)`}
                    >
                      <Check size={11} />
                      <span>Stage</span>
                    </button>
                  </div>
                </div>
              )}
              
              {!unstagedCollapsed && (
                <div className="file-list-items" style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                  {unstagedFiles.length === 0 ? (
                    <div className="empty-section-row">
                      <Check size={12} className="empty-section-icon" />
                      <span>No unstaged changes</span>
                    </div>
                  ) : (
                    unstagedFiles.map((file) => (
                      <div 
                        key={file.path} 
                        className={`file-item ${selectedFile === file.path ? "selected" : ""}`}
                        onClick={() => {
                          selectFileForStaging(file);
                          setCheckedUnstaged(prev => 
                            prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                          );
                        }}
                        onDoubleClick={() => stageWholeFile(file.path)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            file,
                            type: 'unstaged',
                          });
                        }}
                        title="Click to select & view diff, double-click to stage, right-click for options"
                      >
                        <div className="file-item-left" style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <input 
                            type="checkbox"
                            className="item-checkbox"
                            checked={checkedUnstaged.includes(file.path)}
                            readOnly
                          />
                          <div className="file-item-clickable-area">
                            <FileCode size={12} className="file-icon" style={{ color: "var(--color-modified)" }} />
                            <span className="file-name" title={file.path}>{file.path}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span className={`status-badge ${file.unstaged_status === "Untracked" ? "untracked" : "modified"}`}>
                            {file.unstaged_status === "Untracked" ? "Untr" : "Mod"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Staged Files */}
            <div className="file-group">
              <div 
                className="file-group-header"
                onClick={() => setStagedCollapsed(!stagedCollapsed)}
              >
                <div className="file-group-header-left">
                  {stagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="file-group-header-title">Staged Changes</span>
                  <span className="badge">{stagedFiles.length}</span>
                </div>
                <div className="file-group-header-right" onClick={(e) => e.stopPropagation()}>
                  {stagedFiles.length > 0 && (
                    <input 
                      type="checkbox"
                      className="header-checkbox"
                      checked={stagedFiles.length > 0 && checkedStaged.length === stagedFiles.length}
                      ref={el => {
                        if (el) {
                          el.indeterminate = checkedStaged.length > 0 && checkedStaged.length < stagedFiles.length;
                        }
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedStaged(stagedFiles.map(f => f.path));
                        } else {
                          setCheckedStaged([]);
                        }
                      }}
                      title="Select all staged changes"
                    />
                  )}
                  {checkedStaged.length === 0 && stagedFiles.length > 0 && (
                    <button 
                      className="stage-action-btn unstage-btn"
                      onClick={unstageAllStaged}
                      title="Unstage all changes"
                    >
                      Unstage All
                    </button>
                  )}
                </div>
              </div>

              {checkedStaged.length > 0 && !stagedCollapsed && (
                <div className="file-selection-bar">
                  <span className="file-selection-count">
                    {checkedStaged.length} selected
                  </span>
                  <div className="file-selection-actions">
                    <button 
                      className="file-selection-btn unstage"
                      onClick={unstageSelectedStaged}
                      title={`Unstage ${checkedStaged.length} selected file(s)`}
                    >
                      <Minus size={11} />
                      <span>Unstage</span>
                    </button>
                  </div>
                </div>
              )}
              
              {!stagedCollapsed && (
                <div className="file-list-items" style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                  {stagedFiles.length === 0 ? (
                    <div className="empty-section-row">
                      <Check size={12} className="empty-section-icon" />
                      <span>No staged changes</span>
                    </div>
                  ) : (
                    stagedFiles.map((file) => (
                      <div 
                        key={file.path} 
                        className={`file-item ${selectedFile === file.path ? "selected" : ""}`}
                        onClick={() => {
                          selectFileForStaging(file);
                          setCheckedStaged(prev => 
                            prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                          );
                        }}
                        onDoubleClick={() => unstageWholeFile(file.path)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            file,
                            type: 'staged',
                          });
                        }}
                        title="Click to select & view diff, double-click to unstage, right-click for options"
                      >
                        <div className="file-item-left" style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <input 
                            type="checkbox"
                            className="item-checkbox"
                            checked={checkedStaged.includes(file.path)}
                            readOnly
                          />
                          <div className="file-item-clickable-area">
                            <FileCode size={12} className="file-icon" style={{ color: "var(--color-staged)" }} />
                            <span className="file-name" title={file.path}>{file.path}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span className="status-badge staged">Staged</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* File Right-Click Context Menu */}
      {contextMenu && (
        <div 
          className="commit-context-menu"
          style={{
            position: "fixed",
            left: `${Math.min(contextMenu.x, window.innerWidth - 240)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span 
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                color: "var(--color-text-bright)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "200px"
              }}
              title={contextMenu.file.path}
            >
              {contextMenu.file.path}
            </span>
          </div>

          {contextMenu.type === 'unstaged' ? (
            <>
              <button
                type="button"
                className="context-menu-item danger"
                onClick={() => {
                  const filePath = contextMenu.file.path;
                  setContextMenu(null);
                  requestDiscardFile(filePath);
                }}
              >
                <Trash2 size={13} style={{ color: "var(--color-conflict)" }} />
                <span>Remove Changes...</span>
              </button>

              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  const filePath = contextMenu.file.path;
                  setContextMenu(null);
                  stageWholeFile(filePath);
                }}
              >
                <FileCode size={13} style={{ color: "var(--color-staged)" }} />
                <span>Stage Changes</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                const filePath = contextMenu.file.path;
                setContextMenu(null);
                unstageWholeFile(filePath);
              }}
            >
              <FileCode size={13} style={{ color: "var(--color-conflict)" }} />
              <span>Unstage Changes</span>
            </button>
          )}

          <div className="context-menu-divider" />

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              setContextMenu(null);
              refreshRepository();
            }}
          >
            <RefreshCw size={13} />
            <span>Reload Status</span>
          </button>

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.file.path);
              setContextMenu(null);
            }}
          >
            <Copy size={13} />
            <span>Copy File Path</span>
          </button>
        </div>
      )}

      {!hasRepo && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <AlertTriangle size={20} style={{ color: "var(--color-untracked)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Not a Git repository</span>
          <button className="sync-button" onClick={initializeGitRepo}>Initialize Git</button>
        </div>
      )}
    </div>
  );
};

export default FilePane;
