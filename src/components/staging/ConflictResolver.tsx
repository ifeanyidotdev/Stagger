import React, { useState, useRef } from 'react';
import { 
  AlertTriangle, 
  UserCheck, 
  GitPullRequest, 
  CheckCircle2, 
  RefreshCw, 
  Columns, 
  FileText,
  ChevronDown, 
  ChevronRight,
  Layers
} from 'lucide-react';
import type { DiffInfo } from '../../types/git';
import { highlightCodeLine } from '../../utils/syntaxHighlight';

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
  const [viewMode, setViewMode] = useState<'side-by-side' | 'diff'>('side-by-side');
  const [isDiffTrayExpanded, setIsDiffTrayExpanded] = useState(false);

  const oursViewerRef = useRef<HTMLDivElement>(null);
  const theirsViewerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<boolean>(false);

  const handleScrollOurs = () => {
    if (isScrollingRef.current) return;
    if (oursViewerRef.current && theirsViewerRef.current) {
      isScrollingRef.current = true;
      theirsViewerRef.current.scrollTop = oursViewerRef.current.scrollTop;
      theirsViewerRef.current.scrollLeft = oursViewerRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    }
  };

  const handleScrollTheirs = () => {
    if (isScrollingRef.current) return;
    if (oursViewerRef.current && theirsViewerRef.current) {
      isScrollingRef.current = true;
      oursViewerRef.current.scrollTop = theirsViewerRef.current.scrollTop;
      oursViewerRef.current.scrollLeft = theirsViewerRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    }
  };

  const oursLines = conflictOursContent !== null ? conflictOursContent.split("\n") : [];
  const theirsLines = conflictTheirsContent !== null ? conflictTheirsContent.split("\n") : [];
  const hunks = conflictDiffInfo?.hunks || [];

  return (
    <div className="conflict-resolver-view">
      {/* Top Header - Mature, single-row layout */}
      <div className="conflict-resolver-header">
        <div className="conflict-file-meta">
          <AlertTriangle size={15} className="conflict-status-icon" />
          <span className="conflict-file-path" title={selectedFile}>{selectedFile}</span>
          {hunks.length > 0 && (
            <span className="conflict-pill-badge">{hunks.length} {hunks.length === 1 ? 'hunk' : 'hunks'}</span>
          )}
        </div>

        {/* View Toggle */}
        <div className="conflict-view-toggle">
          <button 
            className={`conflict-toggle-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setViewMode('side-by-side')}
            title="Side-by-side comparison"
          >
            <Columns size={12} />
            <span>Split</span>
          </button>
          <button 
            className={`conflict-toggle-btn ${viewMode === 'diff' ? 'active' : ''}`}
            onClick={() => setViewMode('diff')}
            title="Unified diff view"
          >
            <FileText size={12} />
            <span>Diff</span>
          </button>
        </div>

        {/* Actions */}
        <div className="conflict-header-actions">
          <button 
            className="conflict-main-btn ours" 
            onClick={() => resolveConflict(selectedFile, "ours")}
            title={`Keep Ours (${currentBranch || 'HEAD'})`}
          >
            <UserCheck size={13} />
            <span>Keep Ours</span>
          </button>

          <button 
            className="conflict-main-btn theirs" 
            onClick={() => resolveConflict(selectedFile, "theirs")}
            title="Keep Theirs (Incoming changes)"
          >
            <GitPullRequest size={13} />
            <span>Keep Theirs</span>
          </button>

          <button 
            className="conflict-main-btn resolve" 
            onClick={() => resolveConflict(selectedFile, "resolved")}
            title="Mark as resolved in git index"
          >
            <CheckCircle2 size={13} />
            <span>Mark Resolved</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Body */}
      <div className="conflict-comparison-body">
        {isLoadingConflict ? (
          <div className="conflict-loading-state">
            <RefreshCw size={22} className="spin-icon" style={{ color: "var(--accent-purple)" }} />
            <span>Loading comparison states…</span>
          </div>
        ) : viewMode === 'side-by-side' ? (
          <div className="conflict-split-pane">
            {/* Ours (Current Branch) Column */}
            <div className="conflict-column ours">
              <div className="conflict-column-header">
                <div className="conflict-column-header-left">
                  <span className="indicator-dot ours" />
                  <span className="conflict-column-title">Ours ({currentBranch || 'HEAD'})</span>
                </div>
                <span className="conflict-line-count">{oursLines.length} lines</span>
              </div>

              <div 
                className="conflict-code-viewer" 
                ref={oursViewerRef}
                onScroll={handleScrollOurs}
              >
                {conflictOursContent !== null ? (
                  oursLines.map((line, i) => {
                    const isDifferent = theirsLines[i] !== undefined && theirsLines[i] !== line;
                    return (
                      <div 
                        key={i} 
                        className={`conflict-code-line ${isDifferent ? "diff-highlight-ours" : ""}`}
                      >
                        <div className="line-num">{i + 1}</div>
                        <div className="line-text">{highlightCodeLine(line)}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="conflict-column-empty">
                    <span>No content in Ours version.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Theirs (Incoming Branch) Column */}
            <div className="conflict-column theirs">
              <div className="conflict-column-header">
                <div className="conflict-column-header-left">
                  <span className="indicator-dot theirs" />
                  <span className="conflict-column-title">Theirs (Incoming)</span>
                </div>
                <span className="conflict-line-count">{theirsLines.length} lines</span>
              </div>

              <div 
                className="conflict-code-viewer" 
                ref={theirsViewerRef}
                onScroll={handleScrollTheirs}
              >
                {conflictTheirsContent !== null ? (
                  theirsLines.map((line, i) => {
                    const isDifferent = oursLines[i] !== undefined && oursLines[i] !== line;
                    return (
                      <div 
                        key={i} 
                        className={`conflict-code-line ${isDifferent ? "diff-highlight-theirs" : ""}`}
                      >
                        <div className="line-num">{i + 1}</div>
                        <div className="line-text">{highlightCodeLine(line)}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="conflict-column-empty">
                    <span>No content in Theirs version.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Unified Diff View */
          <div className="conflict-unified-diff-view">
            {hunks.length > 0 ? (
              <div className="conflict-diff-scroll">
                {hunks.map((hunk, hIdx) => (
                  <div key={hIdx} className="conflict-hunk-block">
                    <div className="diff-hunk-header">{hunk.header}</div>
                    {hunk.lines.map((line, lIdx) => {
                      const isConflictMarker = 
                        line.content.startsWith("<<<<<<<") || 
                        line.content.startsWith("=======") || 
                        line.content.startsWith(">>>>>>>");

                      return (
                        <div 
                          key={lIdx} 
                          className={`diff-line ${
                            isConflictMarker ? "conflict-marker" :
                            line.origin === "+" ? "addition" : 
                            line.origin === "-" ? "deletion" : "context"
                          }`}
                        >
                          <span className="diff-marker">{line.origin}</span>
                          <span className="diff-content">{highlightCodeLine(line.content)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="conflict-column-empty">
                <span>No unified diff hunks available for this file.</span>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Conflict Diff Preview Tray (bottom panel in side-by-side mode) */}
        {viewMode === 'side-by-side' && hunks.length > 0 && (
          <div className={`conflict-diff-tray ${isDiffTrayExpanded ? 'expanded' : 'collapsed'}`}>
            <div 
              className="conflict-diff-tray-header"
              onClick={() => setIsDiffTrayExpanded(!isDiffTrayExpanded)}
            >
              <div className="conflict-diff-tray-title">
                {isDiffTrayExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <Layers size={13} style={{ color: "var(--accent-purple)" }} />
                <span>Conflict Diff Hunks ({hunks.length})</span>
              </div>
              <span className="conflict-diff-tray-hint">
                {isDiffTrayExpanded ? "Collapse" : "Expand diff preview"}
              </span>
            </div>

            {isDiffTrayExpanded && (
              <div className="conflict-diff-scroll">
                {hunks.map((hunk, hIdx) => (
                  <div key={hIdx} className="conflict-hunk-block">
                    <div className="diff-hunk-header">{hunk.header}</div>
                    {hunk.lines.map((line, lIdx) => {
                      const isConflictMarker = 
                        line.content.startsWith("<<<<<<<") || 
                        line.content.startsWith("=======") || 
                        line.content.startsWith(">>>>>>>");

                      return (
                        <div 
                          key={lIdx} 
                          className={`diff-line ${
                            isConflictMarker ? "conflict-marker" :
                            line.origin === "+" ? "addition" : 
                            line.origin === "-" ? "deletion" : "context"
                          }`}
                        >
                          <span className="diff-marker">{line.origin}</span>
                          <span className="diff-content">{highlightCodeLine(line.content)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictResolver;
