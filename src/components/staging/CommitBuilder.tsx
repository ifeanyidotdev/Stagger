import React from 'react';
import { GitCommit } from 'lucide-react';
import type { GitFileStatus } from '../../types/git';

interface CommitBuilderProps {
  commitTitle: string;
  setCommitTitle: (val: string) => void;
  commitDesc: string;
  setCommitDesc: (val: string) => void;
  coAuthor: string;
  setCoAuthor: (val: string) => void;
  amendCommit: boolean;
  setAmendCommit: (val: boolean) => void;
  unstagedFiles: GitFileStatus[];
  stagedFiles: GitFileStatus[];
  handleCommit: () => void;
}

const CommitBuilder: React.FC<CommitBuilderProps> = ({
  commitTitle,
  setCommitTitle,
  commitDesc,
  setCommitDesc,
  coAuthor,
  setCoAuthor,
  amendCommit,
  setAmendCommit,
  unstagedFiles,
  stagedFiles,
  handleCommit
}) => {
  return (
    <div className="commit-builder">
      <div className="commit-input-group">
        <input 
          className="commit-summary-input"
          value={commitTitle}
          onChange={(e) => setCommitTitle(e.target.value)}
          placeholder="Commit summary (e.g. refactor: split Rust modules)"
        />
        <textarea 
          className="commit-desc-input"
          value={commitDesc}
          onChange={(e) => setCommitDesc(e.target.value)}
          placeholder="Commit description (optional details...)"
        />
        
        <div className="commit-extras-row">
          <input 
            className="coauthor-input"
            value={coAuthor}
            onChange={(e) => setCoAuthor(e.target.value)}
            placeholder="Co-author (e.g. Name <email>)"
          />
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={amendCommit}
              onChange={(e) => setAmendCommit(e.target.checked)}
            />
            <span>Amend last</span>
          </label>
        </div>
      </div>

      <div className="commit-action-group">
        <div className="commit-stats">
          <div className="commit-stat-item">
            <span>Modified</span>
            <span>{unstagedFiles.length}</span>
          </div>
          <div className="commit-stat-item">
            <span>Staged</span>
            <span style={{ color: "var(--color-staged)" }}>{stagedFiles.length}</span>
          </div>
        </div>

        <button 
          className="commit-button" 
          onClick={handleCommit}
          disabled={!commitTitle || (stagedFiles.length === 0 && !amendCommit)}
        >
          <GitCommit size={14} />
          {amendCommit ? "Amend Commit" : `Commit (${stagedFiles.length})`}
        </button>
      </div>
    </div>
  );
};

export default CommitBuilder;
