import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  GitPullRequest, 
  GitMerge, 
  XCircle, 
  FileCode, 
  GitCommit, 
  Search, 
  X,
  FileCheck2,
  Calendar,
  User
} from 'lucide-react';
import type { PullRequestFullDetail, PullRequestFileChange, PullRequestCommit } from '../../types/git';

interface PRFilesPaneProps {
  pr: PullRequestFullDetail;
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
  onExitPRMode: () => void;
  width: number;
}

export const PRFilesPane: React.FC<PRFilesPaneProps> = ({
  pr,
  selectedFile,
  onSelectFile,
  onExitPRMode,
  width,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'commits'>('files');
  const [searchQuery, setSearchQuery] = useState('');

  const activeFilename = selectedFile || pr.files[0]?.filename;

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return pr.files;
    const q = searchQuery.toLowerCase();
    return pr.files.filter(f => f.filename.toLowerCase().includes(q));
  }, [pr.files, searchQuery]);

  const filteredCommits = useMemo(() => {
    if (!searchQuery.trim()) return pr.commits;
    const q = searchQuery.toLowerCase();
    return pr.commits.filter(
      c => c.message.toLowerCase().includes(q) || c.author.toLowerCase().includes(q) || c.sha.toLowerCase().includes(q)
    );
  }, [pr.commits, searchQuery]);

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let label = 'M';
    let className = 'pr-file-badge-modified';
    if (s.includes('add') || s === 'a') {
      label = 'A';
      className = 'pr-file-badge-added';
    } else if (s.includes('del') || s.includes('remov') || s === 'd') {
      label = 'D';
      className = 'pr-file-badge-deleted';
    } else if (s.includes('renam') || s === 'r') {
      label = 'R';
      className = 'pr-file-badge-renamed';
    }
    return <span className={`pr-file-status-badge ${className}`}>{label}</span>;
  };

  const renderStateBadge = () => {
    if (pr.merged) {
      return (
        <span className="pr-state-badge pr-state-merged">
          <GitMerge size={10} />
          <span>Merged</span>
        </span>
      );
    }
    if (pr.state === 'closed') {
      return (
        <span className="pr-state-badge pr-state-closed">
          <XCircle size={10} />
          <span>Closed</span>
        </span>
      );
    }
    return (
      <span className="pr-state-badge pr-state-open">
        <GitPullRequest size={10} />
        <span>{pr.draft ? 'Draft' : 'Open'}</span>
      </span>
    );
  };

  return (
    <div className="file-pane pr-files-pane" style={{ width: `${width}px` }}>
      {/* Sleek Unified Header */}
      <div className="pr-files-header-compact">
        <div className="pr-files-header-top">
          <button 
            type="button" 
            className="pr-exit-btn"
            onClick={onExitPRMode}
            title="Exit PR Review Mode and return to Staging"
          >
            <ArrowLeft size={11} />
            <span>Exit Review</span>
          </button>

          <div className="pr-header-right-badges">
            {renderStateBadge()}
            <div className="pr-stats-pill" title={`+${pr.total_additions} additions, -${pr.total_deletions} deletions`}>
              <span className="pr-stat-additions">+{pr.total_additions}</span>
              <span className="pr-stat-deletions">-{pr.total_deletions}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="pr-tabs-compact">
          <button
            type="button"
            className={`pr-tab-btn-compact ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FileCode size={12} />
            <span>Files ({pr.files.length})</span>
          </button>
          <button
            type="button"
            className={`pr-tab-btn-compact ${activeTab === 'commits' ? 'active' : ''}`}
            onClick={() => setActiveTab('commits')}
          >
            <GitCommit size={12} />
            <span>Commits ({pr.commits.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="pr-search-bar-compact">
          <Search size={11} className="pr-search-icon" />
          <input
            type="text"
            className="pr-search-input-compact"
            placeholder={activeTab === 'files' ? 'Filter changed files...' : 'Filter commits...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="pr-search-clear" onClick={() => setSearchQuery('')}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Content list */}
      <div className="file-list-container pr-list-container">
        {activeTab === 'files' ? (
          filteredFiles.length === 0 ? (
            <div className="pr-empty-list">
              <FileCheck2 size={22} style={{ opacity: 0.35, marginBottom: '6px' }} />
              <span>No matching changed files</span>
            </div>
          ) : (
            <div className="pr-files-list">
              {filteredFiles.map((file: PullRequestFileChange) => {
                const isSelected = activeFilename === file.filename;
                const pathParts = file.filename.split('/');
                const baseName = pathParts.pop() || file.filename;
                const dirPath = pathParts.join('/');

                return (
                  <div
                    key={file.filename}
                    className={`pr-file-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectFile(file.filename)}
                    title={file.filename}
                  >
                    <div className="pr-file-row-left">
                      {renderStatusBadge(file.status)}
                      <div className="pr-file-name-container">
                        <span className="pr-file-basename">{baseName}</span>
                        {dirPath && <span className="pr-file-dir">{dirPath}/</span>}
                      </div>
                    </div>
                    <div className="pr-file-row-right">
                      {file.additions > 0 && (
                        <span className="pr-file-add-stat">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="pr-file-del-stat">-{file.deletions}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredCommits.length === 0 ? (
            <div className="pr-empty-list">
              <GitCommit size={22} style={{ opacity: 0.35, marginBottom: '6px' }} />
              <span>No matching commits</span>
            </div>
          ) : (
            <div className="pr-commits-list">
              {filteredCommits.map((commit: PullRequestCommit) => (
                <div key={commit.sha} className="pr-commit-row">
                  <div className="pr-commit-top">
                    <span className="pr-commit-sha">{commit.sha.slice(0, 7)}</span>
                    <span className="pr-commit-message" title={commit.message}>
                      {commit.message.split('\n')[0]}
                    </span>
                  </div>
                  <div className="pr-commit-bottom">
                    <span className="pr-commit-author">
                      <User size={10} style={{ marginRight: '3px' }} />
                      {commit.author}
                    </span>
                    {commit.date && (
                      <span className="pr-commit-date">
                        <Calendar size={10} style={{ marginRight: '3px' }} />
                        {commit.date.split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default PRFilesPane;
