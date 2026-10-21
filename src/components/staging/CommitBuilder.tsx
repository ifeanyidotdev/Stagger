import React from 'react';
import { GitCommit, UserPlus, Users, Plus, X } from 'lucide-react';
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

  const handleAddAuthor = () => {
    const val = coAuthorInput.trim().replace(/,/g, "");
    if (val && !coAuthors.includes(val)) {
      setCoAuthors([...coAuthors, val]);
    }
    setCoAuthorInput("");
  };

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
        
        {showCoAuthorInput && (
          <div className="coauthors-tag-bar">
            <div className="coauthors-header">
              <div className="coauthors-header-left">
                <Users size={12} className="coauthors-header-icon" />
                <span className="coauthors-label">Co-Authors</span>
                {coAuthors.length > 0 && (
                  <span className="coauthors-badge">{coAuthors.length}</span>
                )}
              </div>
              <button 
                type="button" 
                className="coauthors-close-btn"
                onClick={() => setShowCoAuthorInput(false)}
                title="Hide co-authors"
              >
                <X size={12} />
              </button>
            </div>

            <div className="coauthors-input-container">
              <div className="coauthors-chips-list">
                {coAuthors.map((author, index) => (
                  <div key={index} className="coauthor-chip">
                    <span className="coauthor-chip-name">{author}</span>
                    <button
                      type="button"
                      className="coauthor-chip-remove"
                      onClick={() => setCoAuthors(coAuthors.filter((_, i) => i !== index))}
                      title={`Remove ${author}`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <input 
                  className="coauthor-tag-input"
                  value={coAuthorInput}
                  onChange={(e) => setCoAuthorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && coAuthorInput.trim()) {
                      e.preventDefault();
                      handleAddAuthor();
                    } else if (e.key === "Backspace" && !coAuthorInput && coAuthors.length > 0) {
                      setCoAuthors(coAuthors.slice(0, -1));
                    }
                  }}
                  placeholder={coAuthors.length === 0 ? "Name <email@example.com> or username..." : "Add another..."}
                  autoFocus={showCoAuthorInput && coAuthors.length === 0}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              {coAuthorInput.trim() && (
                <button 
                  type="button" 
                  className="coauthor-add-btn"
                  onClick={handleAddAuthor}
                  title="Add co-author"
                >
                  <Plus size={11} />
                  <span>Add</span>
                </button>
              )}
            </div>

            <div className="coauthors-hint">
              <span>Press <kbd>Enter</kbd> or <kbd>,</kbd> to add</span>
              <span>•</span>
              <span>Appends standard <code>Co-authored-by: Name &lt;email&gt;</code> trailer</span>
            </div>
          </div>
        )}
      </div>

      <div className="commit-toolbar">
        <div className="commit-toolbar-left">
          <button 
            className={`coauthor-icon-btn ${showCoAuthorInput || coAuthors.length > 0 ? "active" : ""}`}
            onClick={() => setShowCoAuthorInput(!showCoAuthorInput)}
            title={coAuthors.length > 0 ? `Co-authors (${coAuthors.length}): ${coAuthors.join(', ')}` : "Add co-authors"}
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
