import React, { useState, useEffect } from 'react';
import { History, GitCommit, GitBranch, Archive, Globe, FileCode, ChevronRight, FileText, Copy, ArrowUpCircle } from 'lucide-react';
import type { CommitInfo, DiffInfo } from '../../types/git';
import type { GraphPath, GraphNode } from '../../utils/graphUtils';

interface HistoryViewProps {
  filteredCommits: CommitInfo[];
  commits: CommitInfo[];
  historySearchQuery: string;
  setHistorySearchQuery: (val: string) => void;
  graphPaths: GraphPath[];
  graphNodes: GraphNode[];
  selectedCommit: CommitInfo | null;
  selectCommitDetails: (commit: CommitInfo) => void;
  handleDragStartCommit: (e: React.DragEvent, id: string) => void;
  draggedCommitSha: string | null;
  openStashInspector: (index: number) => void;
  activeResizer: any;
  setActiveResizer: (val: any) => void;
  commitDetailsWidth: number;
  selectedCommitDiffFiles: string[];
  selectedCommitDiffFile: string | null;
  showCommitFileDiff: (commitId: string, file: string) => void;
  selectedCommitFileDiff: DiffInfo | null;
  onOpenCreateBranchFromCommit?: (commit: CommitInfo) => void;
  onOpenPushToCommit?: (commit: CommitInfo) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  filteredCommits,
  commits,
  historySearchQuery,
  setHistorySearchQuery,
  graphPaths,
  graphNodes,
  selectedCommit,
  selectCommitDetails,
  handleDragStartCommit,
  draggedCommitSha,
  openStashInspector,
  activeResizer,
  setActiveResizer,
  commitDetailsWidth,
  selectedCommitDiffFiles,
  selectedCommitDiffFile,
  showCommitFileDiff,
  selectedCommitFileDiff,
  onOpenCreateBranchFromCommit,
  onOpenPushToCommit
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    commit: CommitInfo;
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
    <div className="history-view">
      
      {/* Commit Graph Pane */}
      <div className="graph-pane" style={{ display: "flex", flexDirection: "column" }}>
        {/* Search & Filter Toolbar */}
        <div style={{
          padding: "8px 14px",
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexShrink: 0,
          zIndex: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "420px" }}>
            <input
              className="dialog-input"
              style={{ padding: "6px 12px", fontSize: "0.76rem", width: "100%" }}
              placeholder="Search commits by message, author, SHA, branch, or stash..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            <History size={14} style={{ color: "var(--accent-purple-bright)" }} />
            <span>Showing <strong>{filteredCommits.length}</strong> of <strong>{commits.length}</strong> commits</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {filteredCommits.length === 0 ? (
            <div className="empty-canvas">
              <GitCommit size={36} className="empty-canvas-icon" />
              <span>No commits found matching filter</span>
            </div>
          ) : (
            <div style={{ position: "relative", minHeight: "100%" }}>
              
              {/* SVG Connector Lines */}
              <svg 
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "120px",
                  height: `${filteredCommits.length * 48}px`,
                  pointerEvents: "none",
                  zIndex: 1
                }}
              >
                {graphPaths.map(path => (
                  <path
                    key={path.id}
                    d={path.d}
                    stroke={path.color}
                    strokeWidth={1.5}
                    fill="none"
                    opacity={0.6}
                  />
                ))}
              </svg>

              {/* Commit Rows list */}
              {filteredCommits.map((commit) => {
                  const node = graphNodes.find(n => n.id === commit.id);
                  return (
                    <div 
                      key={commit.id} 
                      className={`commit-row ${selectedCommit?.id === commit.id ? "selected" : ""}`}
                      onClick={() => selectCommitDetails(commit)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        selectCommitDetails(commit);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          commit
                        });
                      }}
                      draggable={true}
                      onDragStart={(e) => handleDragStartCommit(e, commit.id)}
                      style={{
                        paddingLeft: "110px", 
                        position: "relative"
                      }}
                    >
                      {/* Render node circles */}
                      {node && (
                        <div 
                          style={{
                            position: "absolute",
                            left: `${node.x - 5}px`,
                            top: `${node.y - 5}px`,
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: draggedCommitSha === commit.id ? "var(--color-conflict)" : "var(--border-active)",
                            border: "2px solid var(--bg-app)",
                            zIndex: 2
                          }}
                        />
                      )}

                      <div style={{ display: "flex", gap: "10px", alignItems: "center", overflow: "hidden", width: "100%" }}>
                        {commit.branches.map(b => {
                          const isRemote = b.includes("/");
                          const isStash = b.startsWith("stash");
                          const isTag = b.startsWith("tag:");
                          return (
                            <span 
                              key={b}
                              onClick={(e) => {
                                if (isStash) {
                                  e.stopPropagation();
                                  const match = b.match(/\d+/);
                                  const idx = match ? parseInt(match[0], 10) : 0;
                                  openStashInspector(idx);
                                }
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: isStash ? "rgba(244, 63, 94, 0.15)" : isTag ? "rgba(245, 158, 11, 0.15)" : isRemote ? "rgba(56, 189, 248, 0.15)" : "rgba(168, 85, 247, 0.15)",
                                border: isStash ? "1px solid rgba(244, 63, 94, 0.35)" : isTag ? "1px solid rgba(245, 158, 11, 0.35)" : isRemote ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid rgba(168, 85, 247, 0.35)",
                                color: isStash ? "var(--color-conflict)" : isTag ? "var(--color-untracked)" : isRemote ? "var(--color-modified)" : "var(--accent-purple-bright)",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                padding: "1px 6px",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                cursor: isStash ? "pointer" : "default"
                              }}
                              title={isStash ? "Click to open Stash Inspector" : b}
                            >
                              {isStash ? <Archive size={10} /> : isRemote ? <Globe size={10} /> : <GitBranch size={10} />}
                              {b}
                            </span>
                          );
                        })}
                        <span 
                          className="commit-row-message"
                          style={{ 
                            flex: 1,
                            minWidth: 0,
                            fontSize: "0.82rem", 
                            fontWeight: 500, 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            color: selectedCommit?.id === commit.id ? "var(--color-text-bright)" : "var(--color-text-main)"
                          }}
                          title={commit.message}
                        >
                          {commit.message}
                        </span>
                        <span className="commit-row-meta">
                          <span className="commit-author-meta" title={`${commit.author} • ${new Date(commit.timestamp * 1000).toLocaleString()}`}>
                            <span className="commit-author-name">{commit.author.split(' ')[0] || commit.author}</span>
                            <span className="commit-meta-dot">•</span>
                            <span className="commit-meta-date">{new Date(commit.timestamp * 1000).toLocaleDateString()}</span>
                          </span>
                          {onOpenCreateBranchFromCommit && (
                            <button
                              type="button"
                              className="commit-row-branch-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectCommitDetails(commit);
                                onOpenCreateBranchFromCommit(commit);
                              }}
                              title="Create branch from this commit"
                            >
                              <GitBranch size={11} />
                              <span>Branch</span>
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}

            </div>
          )}
        </div>
      </div>

      {/* --- DETAILS PANE RESIZE HANDLE --- */}
      <div 
        className={`resize-handle ${activeResizer === 'details' ? 'active' : ''}`}
        onMouseDown={() => setActiveResizer('details')}
      />

      {/* Commit Details Pane */}
      <div 
        className="commit-details-pane"
        style={{ width: `${commitDetailsWidth}px` }}
      >
        {selectedCommit ? (
          <>
            <div className="details-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                <div className="commit-sha-badge" style={{ marginBottom: 0 }}>{selectedCommit.id.substring(0, 10)}...</div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  {onOpenPushToCommit && (
                    <button
                      type="button"
                      className="commit-header-icon-btn push-btn"
                      onClick={() => onOpenPushToCommit(selectedCommit)}
                      title={`Push up to this commit (${selectedCommit.id.substring(0, 8)})`}
                    >
                      <ArrowUpCircle size={14} />
                    </button>
                  )}
                  {onOpenCreateBranchFromCommit && (
                    <button
                      type="button"
                      className="commit-header-icon-btn branch-btn"
                      onClick={() => onOpenCreateBranchFromCommit(selectedCommit)}
                      title={`Create branch starting at commit ${selectedCommit.id.substring(0, 8)}`}
                    >
                      <GitBranch size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="commit-msg">{selectedCommit.message}</div>
              <div className="commit-meta">
                <span><strong>Author:</strong> {selectedCommit.author} ({selectedCommit.email})</span>
                <span><strong>Date:</strong> {new Date(selectedCommit.timestamp * 1000).toLocaleString()}</span>
              </div>
            </div>

            <div className="details-content">
              <div className="details-section-header">
                <span>Files Changed</span>
                <span className="details-count-badge">{selectedCommitDiffFiles.length}</span>
              </div>
              <div className="commit-files-list">
                {selectedCommitDiffFiles.map(file => {
                  const lastSlash = file.lastIndexOf("/");
                  const dir = lastSlash !== -1 ? file.substring(0, lastSlash + 1) : "";
                  const name = lastSlash !== -1 ? file.substring(lastSlash + 1) : file;
                  return (
                    <div 
                      key={file} 
                      className={`commit-file-item ${selectedCommitDiffFile === file ? "active" : ""}`}
                      onClick={() => showCommitFileDiff(selectedCommit.id, file)}
                    >
                      <FileCode size={14} className="commit-file-icon" />
                      <div className="commit-file-path-container" title={file}>
                        {dir && <span className="commit-file-dir">{dir}</span>}
                        <span className="commit-file-name">{name}</span>
                      </div>
                      <ChevronRight size={13} className="commit-file-arrow" />
                    </div>
                  );
                })}
              </div>

              {selectedCommitFileDiff && (
                <div>
                  <div className="details-section-header" style={{ marginTop: "12px" }}>
                    <span>Diff Preview</span>
                    {selectedCommitDiffFile && (
                      <span className="commit-file-name" style={{ fontSize: "0.7rem", color: "var(--accent-purple-bright)" }}>
                        {selectedCommitDiffFile.split("/").pop()}
                      </span>
                    )}
                  </div>
                  <div className="node-diff-preview" style={{ maxHeight: "280px", overflowY: "auto" }}>
                    {selectedCommitFileDiff.hunks[0]?.lines.map((line, idx) => (
                      <div 
                        key={idx} 
                        className={`diff-line ${
                          line.origin === "+" ? "addition" : 
                          line.origin === "-" ? "deletion" : "context"
                        }`}
                        style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", padding: "2px 8px", display: "flex", gap: "8px" }}
                      >
                        <span style={{ width: "14px", display: "inline-block", userSelect: "none", opacity: 0.6 }}>{line.origin}</span>
                        <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{line.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-canvas">
            <FileText size={36} className="empty-canvas-icon" />
            <span style={{ textAlign: "center", padding: "12px", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              {commits.length === 0 ? (
                "No commits in this repository yet."
              ) : (
                <>
                  Select a commit to view details and diff.
                  <br />
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-dark)" }}>
                    Drag commit onto active branch badge to cherry-pick.
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <div 
          className="commit-context-menu"
          style={{
            position: "fixed",
            left: `${Math.min(contextMenu.x, window.innerWidth - 230)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="commit-sha-badge" style={{ marginBottom: 0 }}>
              {contextMenu.commit.short_id || contextMenu.commit.id.substring(0, 8)}
            </span>
          </div>
          {onOpenPushToCommit && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onOpenPushToCommit(contextMenu.commit);
                setContextMenu(null);
              }}
            >
              <ArrowUpCircle size={13} style={{ color: "var(--color-staged)" }} />
              <span>Push up to this commit...</span>
            </button>
          )}
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              if (onOpenCreateBranchFromCommit) {
                onOpenCreateBranchFromCommit(contextMenu.commit);
              }
              setContextMenu(null);
            }}
          >
            <GitBranch size={13} style={{ color: "var(--accent-purple-bright)" }} />
            <span>Create Branch from Commit...</span>
          </button>
          <div className="context-menu-divider" />
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.commit.id);
              setContextMenu(null);
            }}
          >
            <Copy size={13} />
            <span>Copy Commit SHA</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.commit.message);
              setContextMenu(null);
            }}
          >
            <FileText size={13} />
            <span>Copy Commit Message</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default HistoryView;
