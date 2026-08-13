import React from 'react';
import { History, GitCommit, GitBranch, Archive, Globe, FileCode, ChevronRight, FileText } from 'lucide-react';
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
  selectedCommitFileDiff
}) => {
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
                        <span style={{ 
                          fontSize: "0.8rem", 
                          fontWeight: 500, 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          color: selectedCommit?.id === commit.id ? "var(--color-text-bright)" : "var(--color-text-main)"
                        }}>
                          {commit.message}
                        </span>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          color: "var(--color-text-muted)", 
                          marginLeft: "auto", 
                          paddingRight: "16px",
                          flexShrink: 0
                        }}>
                          {commit.author} • {new Date(commit.timestamp * 1000).toLocaleDateString()}
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
              <div className="commit-sha-badge">{selectedCommit.id.substring(0, 10)}...</div>
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
                      >
                        <span>{line.origin}</span>
                        <span>{line.content.trim()}</span>
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
            <span style={{ textAlign: "center", padding: "12px", fontSize: "0.8rem" }}>Select commit.<br/>Drag commit onto active branch badge to cherry-pick.</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default HistoryView;
