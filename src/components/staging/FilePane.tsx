import React from 'react';
import { RefreshCw, AlertTriangle, ChevronRight, ChevronDown, FileCode } from 'lucide-react';
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
  hasRepo,
  initializeGitRepo
}) => {
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
                  style={{ width: "100%", padding: "4px", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "white", fontSize: "0.75rem", cursor: "pointer" }}
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
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {unstagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>Unstaged Changes</span>
              <span className="badge">{unstagedFiles.length}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
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
              {checkedUnstaged.length > 0 ? (
                <button 
                  className="stage-action-btn"
                  onClick={stageSelectedUnstaged}
                  title={`Stage ${checkedUnstaged.length} selected file(s)`}
                >
                  Stage ({checkedUnstaged.length})
                </button>
              ) : (
                unstagedFiles.length > 0 && (
                  <button 
                    className="stage-action-btn"
                    onClick={stageAllUnstaged}
                    title="Stage all changes"
                  >
                    Stage All
                  </button>
                )
              )}
            </div>
          </div>
          
          {!unstagedCollapsed && (
            <div className="file-list-items" style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
              {unstagedFiles.length === 0 ? (
                <div className="empty-section-text">No unstaged changes</div>
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
                    title="Click to select & view diff, double-click to stage"
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
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {stagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>Staged Changes</span>
              <span className="badge">{stagedFiles.length}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
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
              {checkedStaged.length > 0 ? (
                <button 
                  className="stage-action-btn unstage-btn"
                  onClick={unstageSelectedStaged}
                  title={`Unstage ${checkedStaged.length} selected file(s)`}
                >
                  Unstage ({checkedStaged.length})
                </button>
              ) : (
                stagedFiles.length > 0 && (
                  <button 
                    className="stage-action-btn unstage-btn"
                    onClick={unstageAllStaged}
                    title="Unstage all changes"
                  >
                    Unstage All
                  </button>
                )
              )}
            </div>
          </div>
          
          {!stagedCollapsed && (
            <div className="file-list-items" style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
              {stagedFiles.length === 0 ? (
                <div className="empty-section-text">No staged changes</div>
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
                    title="Click to select & view diff, double-click to unstage"
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
      </div>

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
