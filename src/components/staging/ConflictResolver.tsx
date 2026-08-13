import React from 'react';
import { AlertTriangle, UserCheck, GitPullRequest, CheckCircle2, RefreshCw } from 'lucide-react';
import type { DiffInfo } from '../../types/git';

interface ConflictResolverProps {
  selectedFile: string;
  resolveConflict: (file: string, action: "ours" | "theirs" | "resolved") => void;
  currentBranch: string;
  isLoadingConflict: boolean;
  conflictOursContent: string | null;
  conflictTheirsContent: string | null;
  conflictDiffInfo: DiffInfo | null;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  selectedFile,
  resolveConflict,
  currentBranch,
  isLoadingConflict,
  conflictOursContent,
  conflictTheirsContent,
  conflictDiffInfo
}) => {
  return (
    <div className="conflict-resolver-view">
      <div className="conflict-resolver-header">
        <div className="conflict-header-title">
          <AlertTriangle size={20} style={{ color: "var(--color-conflict)", flexShrink: 0 }} />
          <div style={{ overflow: "hidden" }}>
            <div className="conflict-filename">{selectedFile}</div>
            <div className="conflict-subtext">Conflicting changes detected. Compare Ours vs Theirs and choose which version to keep.</div>
          </div>
        </div>

        <div className="conflict-header-actions">
          <button 
            className="conflict-btn ours" 
            onClick={() => resolveConflict(selectedFile, "ours")}
            title="Keep version from current branch"
          >
            <UserCheck size={14} />
            Keep Ours ({currentBranch})
          </button>

          <button 
            className="conflict-btn theirs" 
            onClick={() => resolveConflict(selectedFile, "theirs")}
            title="Keep version from incoming branch"
          >
            <GitPullRequest size={14} />
            Keep Theirs (Incoming)
          </button>

          <button 
            className="conflict-btn resolve" 
            onClick={() => resolveConflict(selectedFile, "resolved")}
            title="Mark file as resolved"
          >
            <CheckCircle2 size={14} />
            Mark Resolved
          </button>
        </div>
      </div>

      <div className="conflict-comparison-body">
        {isLoadingConflict ? (
          <div className="conflict-loading">
            <RefreshCw size={24} className="spin-icon" style={{ color: "var(--accent-purple)" }} />
            <span>Loading file conflict versions…</span>
          </div>
        ) : (
          <div className="conflict-split-pane">
            {/* Ours (Current Branch) Column */}
            <div className="conflict-column ours">
              <div className="conflict-column-header">
                <span className="badge-title">Ours (HEAD / {currentBranch})</span>
                <span className="badge-sub">Current branch state</span>
              </div>
              <div className="conflict-code-viewer">
                {conflictOursContent !== null ? (
                  conflictOursContent.split("\n").map((line, i) => (
                    <div key={i} className="conflict-code-line">
                      <span className="line-num">{i + 1}</span>
                      <span className="line-text">{line}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--color-text-muted)", padding: "16px", textAlign: "center" }}>No content in Ours version (or file created/deleted)</div>
                )}
              </div>
            </div>

            {/* Theirs (Incoming Branch) Column */}
            <div className="conflict-column theirs">
              <div className="conflict-column-header">
                <span className="badge-title">Theirs (Incoming)</span>
                <span className="badge-sub">Incoming branch state</span>
              </div>
              <div className="conflict-code-viewer">
                {conflictTheirsContent !== null ? (
                  conflictTheirsContent.split("\n").map((line, i) => (
                    <div key={i} className="conflict-code-line">
                      <span className="line-num">{i + 1}</span>
                      <span className="line-text">{line}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "var(--color-text-muted)", padding: "16px", textAlign: "center" }}>No content in Theirs version (or file created/deleted)</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conflict Patch Diff Preview Hunks */}
        {conflictDiffInfo && conflictDiffInfo.hunks && conflictDiffInfo.hunks.length > 0 && (
          <div className="conflict-diff-preview-section">
            <div className="conflict-diff-label">Conflict Patch Diff Preview ({conflictDiffInfo.hunks.length} hunk{conflictDiffInfo.hunks.length === 1 ? '' : 's'})</div>
            <div className="node-diff-preview" style={{ maxHeight: "160px", overflowY: "auto" }}>
              {conflictDiffInfo.hunks.map((hunk, hIdx) => (
                <div key={hIdx}>
                  <div className="diff-hunk-header">{hunk.header}</div>
                  {hunk.lines.map((line, lIdx) => (
                    <div 
                      key={lIdx} 
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictResolver;
