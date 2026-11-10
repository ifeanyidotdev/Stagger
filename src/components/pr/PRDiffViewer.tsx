import React, { useMemo, useState } from 'react';
import { 
  Columns, 
  FileText, 
  Copy, 
  Check, 
  FileCode, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { PullRequestFileChange } from '../../types/git';
import { highlightCodeLine } from '../../utils/syntaxHighlight';

interface PRDiffViewerProps {
  file: PullRequestFileChange | null;
  diffMode: 'unified' | 'split';
  onChangeDiffMode: (mode: 'unified' | 'split') => void;
}

interface ParsedDiffLine {
  id: string;
  type: 'header' | 'add' | 'delete' | 'context';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

interface SplitDiffRow {
  id: string;
  isHeader?: boolean;
  headerContent?: string;
  left?: {
    lineNumber: number | null;
    content: string;
    type: 'delete' | 'context' | 'empty';
  };
  right?: {
    lineNumber: number | null;
    content: string;
    type: 'add' | 'context' | 'empty';
  };
}

export const PRDiffViewer: React.FC<PRDiffViewerProps> = ({
  file,
  diffMode,
  onChangeDiffMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyPath = () => {
    if (!file) return;
    navigator.clipboard.writeText(file.filename);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse unified git patch
  const unifiedLines: ParsedDiffLine[] = useMemo(() => {
    if (!file || !file.patch) return [];

    const lines = file.patch.split('\n');
    const result: ParsedDiffLine[] = [];

    let currentOld = 0;
    let currentNew = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('@@')) {
        // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s*\+(\d+)(?:,\d+)?\s*@@/);
        if (match) {
          currentOld = parseInt(match[1], 10);
          currentNew = parseInt(match[2], 10);
        }
        result.push({
          id: `hunk-${i}`,
          type: 'header',
          oldLineNumber: null,
          newLineNumber: null,
          content: line,
        });
        continue;
      }

      if (line.startsWith('+')) {
        result.push({
          id: `line-${i}`,
          type: 'add',
          oldLineNumber: null,
          newLineNumber: currentNew,
          content: line.slice(1),
        });
        currentNew++;
      } else if (line.startsWith('-')) {
        result.push({
          id: `line-${i}`,
          type: 'delete',
          oldLineNumber: currentOld,
          newLineNumber: null,
          content: line.slice(1),
        });
        currentOld++;
      } else {
        // Context line
        const content = line.startsWith(' ') ? line.slice(1) : line;
        result.push({
          id: `line-${i}`,
          type: 'context',
          oldLineNumber: currentOld,
          newLineNumber: currentNew,
          content,
        });
        currentOld++;
        currentNew++;
      }
    }

    return result;
  }, [file]);

  // Construct paired split diff rows
  const splitRows: SplitDiffRow[] = useMemo(() => {
    if (!unifiedLines.length) return [];

    const rows: SplitDiffRow[] = [];
    let i = 0;

    while (i < unifiedLines.length) {
      const line = unifiedLines[i];

      if (line.type === 'header') {
        rows.push({
          id: line.id,
          isHeader: true,
          headerContent: line.content,
        });
        i++;
        continue;
      }

      if (line.type === 'context') {
        rows.push({
          id: line.id,
          left: {
            lineNumber: line.oldLineNumber,
            content: line.content,
            type: 'context',
          },
          right: {
            lineNumber: line.newLineNumber,
            content: line.content,
            type: 'context',
          },
        });
        i++;
        continue;
      }

      // Collect contiguous deletes and adds in this change block
      const deletes: ParsedDiffLine[] = [];
      const adds: ParsedDiffLine[] = [];

      while (i < unifiedLines.length && (unifiedLines[i].type === 'delete' || unifiedLines[i].type === 'add')) {
        if (unifiedLines[i].type === 'delete') {
          deletes.push(unifiedLines[i]);
        } else {
          adds.push(unifiedLines[i]);
        }
        i++;
      }

      const maxCount = Math.max(deletes.length, adds.length);
      for (let k = 0; k < maxCount; k++) {
        const delItem = deletes[k];
        const addItem = adds[k];

        rows.push({
          id: `split-blk-${i}-${k}`,
          left: delItem
            ? {
                lineNumber: delItem.oldLineNumber,
                content: delItem.content,
                type: 'delete',
              }
            : {
                lineNumber: null,
                content: '',
                type: 'empty',
              },
          right: addItem
            ? {
                lineNumber: addItem.newLineNumber,
                content: addItem.content,
                type: 'add',
              }
            : {
                lineNumber: null,
                content: '',
                type: 'empty',
              },
        });
      }
    }

    return rows;
  }, [unifiedLines]);

  if (!file) {
    return (
      <div className="pr-diff-viewer pr-diff-empty-container">
        <div className="pr-diff-empty-state">
          <FileCode size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3>No file selected</h3>
          <p>Select a file from the changed files list on the left to review its diff.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pr-diff-viewer ${isExpanded ? 'fullscreen-view' : ''}`}>
      {/* Diff Header */}
      <div className="pr-diff-header">
        <div className="pr-diff-header-fileinfo">
          <FileCode size={13} style={{ color: "var(--accent-purple-bright)", flexShrink: 0 }} />
          <span className="pr-diff-filename" title={file.filename}>
            {file.filename}
          </span>
          <button
            type="button"
            className="pr-diff-copy-btn"
            onClick={handleCopyPath}
            title="Copy file path"
          >
            {copied ? <Check size={12} style={{ color: 'var(--color-staged)' }} /> : <Copy size={12} />}
          </button>
          <div className="pr-diff-stats">
            {file.additions > 0 && (
              <span className="pr-diff-stat-add">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="pr-diff-stat-del">-{file.deletions}</span>
            )}
          </div>
        </div>

        <div className="pr-diff-header-actions">
          {/* View mode toggle */}
          <div className="conflict-view-toggle">
            <button
              type="button"
              className={`conflict-toggle-btn ${diffMode === 'unified' ? 'active' : ''}`}
              onClick={() => onChangeDiffMode('unified')}
              title="Unified single-column diff"
            >
              <FileText size={12} />
              <span>Unified</span>
            </button>
            <button
              type="button"
              className={`conflict-toggle-btn ${diffMode === 'split' ? 'active' : ''}`}
              onClick={() => onChangeDiffMode('split')}
              title="Side-by-side split diff"
            >
              <Columns size={12} />
              <span>Split</span>
            </button>
          </div>

          <button
            type="button"
            className="pr-diff-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize diff viewer' : 'Expand diff viewer'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Diff Canvas / Content */}
      <div className="pr-diff-content">
        {!file.patch ? (
          <div className="pr-diff-no-patch">
            <Info size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
            <h4>No patch available for this file</h4>
            <p>This file might be a binary file, large asset, or was renamed without content changes.</p>
          </div>
        ) : diffMode === 'unified' ? (
          <div className="pr-diff-unified-table">
            {unifiedLines.map((line) => {
              if (line.type === 'header') {
                return (
                  <div key={line.id} className="pr-diff-hunk-header">
                    <span className="pr-diff-hunk-text">{line.content}</span>
                  </div>
                );
              }

              const rowClass =
                line.type === 'add'
                  ? 'pr-diff-row-add'
                  : line.type === 'delete'
                  ? 'pr-diff-row-del'
                  : 'pr-diff-row-ctx';

              return (
                <div key={line.id} className={`pr-diff-row ${rowClass}`}>
                  <div className="pr-diff-line-num pr-diff-old-num">
                    {line.oldLineNumber || ''}
                  </div>
                  <div className="pr-diff-line-num pr-diff-new-num">
                    {line.newLineNumber || ''}
                  </div>
                  <div className="pr-diff-marker">
                    {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                  </div>
                  <div className="pr-diff-code-line">
                    {highlightCodeLine(line.content)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pr-diff-split-table">
            {splitRows.map((row) => {
              if (row.isHeader) {
                return (
                  <div key={row.id} className="pr-diff-hunk-header split-span">
                    <span className="pr-diff-hunk-text">{row.headerContent}</span>
                  </div>
                );
              }

              const leftClass =
                row.left?.type === 'delete'
                  ? 'pr-split-del'
                  : row.left?.type === 'empty'
                  ? 'pr-split-empty'
                  : 'pr-split-ctx';

              const rightClass =
                row.right?.type === 'add'
                  ? 'pr-split-add'
                  : row.right?.type === 'empty'
                  ? 'pr-split-empty'
                  : 'pr-split-ctx';

              return (
                <div key={row.id} className="pr-split-row">
                  {/* Left Column (Old) */}
                  <div className={`pr-split-cell pr-split-left ${leftClass}`}>
                    <div className="pr-split-num">
                      {row.left?.lineNumber || ''}
                    </div>
                    <div className="pr-split-marker">
                      {row.left?.type === 'delete' ? '-' : ' '}
                    </div>
                    <div className="pr-split-code">
                      {row.left?.content ? highlightCodeLine(row.left.content) : <span> </span>}
                    </div>
                  </div>

                  {/* Right Column (New) */}
                  <div className={`pr-split-cell pr-split-right ${rightClass}`}>
                    <div className="pr-split-num">
                      {row.right?.lineNumber || ''}
                    </div>
                    <div className="pr-split-marker">
                      {row.right?.type === 'add' ? '+' : ' '}
                    </div>
                    <div className="pr-split-code">
                      {row.right?.content ? highlightCodeLine(row.right.content) : <span> </span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PRDiffViewer;
