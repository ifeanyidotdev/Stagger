import React from 'react';
import { GitCommit, UserPlus, X } from 'lucide-react';
import type { GitFileStatus } from '../../types/git';

interface CommitBuilderProps {
  commitTitle: string;
  setCommitTitle: (val: string) => void;
  commitDesc: string;
  setCommitDesc: (val: string) => void;
  amendCommit: boolean;
  setAmendCommit: (val: boolean) => void;
  coAuthors: string[];
  setCoAuthors: (authors: string[]) => void;
  showCoAuthorInput: boolean;
  setShowCoAuthorInput: (show: boolean) => void;
  coAuthorInput: string;
  setCoAuthorInput: (val: string) => void;
  unstagedFiles: GitFileStatus[];
  stagedFiles: GitFileStatus[];
  handleCommit: () => void;
}

const CommitBuilder: React.FC<CommitBuilderProps> = ({
  commitTitle,
  setCommitTitle,
  commitDesc,
  setCommitDesc,
  amendCommit,
  setAmendCommit,
  coAuthors,
  setCoAuthors,
  showCoAuthorInput,
  setShowCoAuthorInput,
  coAuthorInput,
  setCoAuthorInput,
  unstagedFiles: _unstagedFiles,
  stagedFiles,
  handleCommit
}) => {
  const isCommitReady = Boolean(commitTitle.trim() && (stagedFiles.length > 0 || amendCommit));

  return (
    <div className="commit-builder">
      <div className="commit-inputs-wrapper">
        <input 
          className="commit-summary-input"
          value={commitTitle}
          onChange={(e) => setCommitTitle(e.target.value)}
          placeholder="Commit summary (e.g. feat: add branch switcher)"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoComplete="off"
        />
        <textarea 
          className="commit-desc-input"
          value={commitDesc}
          onChange={(e) => setCommitDesc(e.target.value)}
          placeholder="Add optional commit description..."
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoComplete="off"
        />
        
        {(showCoAuthorInput || coAuthors.length > 0) && (
          <div className="coauthors-tag-bar">
            <span className="coauthors-label">Co-Authors</span>
            <div className="coauthors-chips-list">
              {coAuthors.map((author, index) => (
                <div key={index} className="coauthor-chip">
                  <span>{author}</span>
                  <X 
                    size={12} 
                    className="coauthor-chip-remove" 
                    onClick={() => setCoAuthors(coAuthors.filter((_, i) => i !== index))} 
                  />
                </div>
              ))}
              <input 
                className="coauthor-tag-input"
                value={coAuthorInput}
                onChange={(e) => setCoAuthorInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && coAuthorInput.trim()) {
                    e.preventDefault();
                    const val = coAuthorInput.trim().replace(/,/g, "");
                    if (val && !coAuthors.includes(val)) {
                      setCoAuthors([...coAuthors, val]);
                    }
                    setCoAuthorInput("");
                  } else if (e.key === "Backspace" && !coAuthorInput && coAuthors.length > 0) {
                    setCoAuthors(coAuthors.slice(0, -1));
                  }
                }}
                placeholder="Name <email> or @username..."
                autoFocus={showCoAuthorInput && coAuthors.length === 0}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        )}
      </div>

      <div className="commit-toolbar">
        <div className="commit-toolbar-left">
          <button 
            className={`coauthor-icon-btn ${showCoAuthorInput || coAuthors.length > 0 ? "active" : ""}`}
            onClick={() => setShowCoAuthorInput(!showCoAuthorInput)}
            title="Add Co-authors"
            type="button"
          >
            <UserPlus size={14} />
            {coAuthors.length > 0 && <span className="coauthor-count-badge">{coAuthors.length}</span>}
          </button>

          <label className="checkbox-label commit-amend-label">
            <input 
              type="checkbox" 
              checked={amendCommit}
              onChange={(e) => setAmendCommit(e.target.checked)}
            />
            <span>Amend last commit</span>
          </label>
        </div>

        <button 
          className="smart-commit-btn"
          onClick={handleCommit}
          disabled={!isCommitReady}
        >
          <GitCommit size={15} />
          <span>
            {amendCommit 
              ? "Amend Commit" 
              : stagedFiles.length > 0 
                ? `Commit (${stagedFiles.length})` 
                : "Commit"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default CommitBuilder;
