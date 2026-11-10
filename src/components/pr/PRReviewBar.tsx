import React, { useState, useRef, useEffect } from 'react';
import { 
  GitMerge, 
  GitBranch, 
  ExternalLink, 
  ChevronDown, 
  XCircle, 
  RotateCcw, 
  Check, 
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowLeft
} from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { PullRequestFullDetail, MergeMethod } from '../../types/git';

interface PRReviewBarProps {
  pr: PullRequestFullDetail;
  isCommentsExpanded?: boolean;
  onToggleComments?: () => void;
  onPostComment?: (body: string) => Promise<void>;
  onMergePR: (method: MergeMethod, title?: string, message?: string) => Promise<void>;
  onClosePR: () => Promise<void>;
  onReopenPR: () => Promise<void>;
  onCheckoutBranch: () => Promise<void>;
  onPullBaseBranch?: (baseBranch: string) => Promise<void>;
  onExitPRMode: () => void;
  currentBranch: string;
  isActionLoading: boolean;
}

export const PRReviewBar: React.FC<PRReviewBarProps> = ({
  pr,
  isCommentsExpanded: _isCommentsExpanded,
  onToggleComments: _onToggleComments,
  onPostComment: _onPostComment,
  onMergePR,
  onClosePR,
  onReopenPR,
  onCheckoutBranch,
  onPullBaseBranch,
  onExitPRMode,
  currentBranch,
  isActionLoading,
}) => {
  const [selectedMergeMethod, setSelectedMergeMethod] = useState<MergeMethod>('merge');
  const [isMergeDropdownOpen, setIsMergeDropdownOpen] = useState(false);
  const [isMergeConfirmOpen, setIsMergeConfirmOpen] = useState(false);
  const [mergeCommitTitle, setMergeCommitTitle] = useState(
    `Merge pull request #${pr.number} from ${pr.head_ref}`
  );
  const [mergeCommitMessage, setMergeCommitMessage] = useState(pr.title);

  const mergeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMergeDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mergeDropdownRef.current && !mergeDropdownRef.current.contains(e.target as Node)) {
        setIsMergeDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isMergeDropdownOpen]);

  const isCurrentBranch = currentBranch === pr.head_ref;

  const handleOpenMergeConfirm = (method: MergeMethod) => {
    setSelectedMergeMethod(method);
    setIsMergeDropdownOpen(false);
    if (method === 'squash') {
      setMergeCommitTitle(`${pr.title} (#${pr.number})`);
      setMergeCommitMessage(pr.body || '');
    } else if (method === 'rebase') {
      setMergeCommitTitle('');
      setMergeCommitMessage('');
    } else {
      setMergeCommitTitle(`Merge pull request #${pr.number} from ${pr.head_ref}`);
      setMergeCommitMessage(pr.title);
    }
    setIsMergeConfirmOpen(true);
  };

  const handleExecuteMerge = async () => {
    await onMergePR(selectedMergeMethod, mergeCommitTitle, mergeCommitMessage);
    setIsMergeConfirmOpen(false);
  };

  const handleOpenInBrowser = async () => {
    if (!pr.html_url) return;
    try {
      await openUrl(pr.html_url);
    } catch (e) {
      window.open(pr.html_url, '_blank');
    }
  };

  const mergeMethodLabels: Record<MergeMethod, { title: string; desc: string }> = {
    merge: {
      title: 'Create a merge commit',
      desc: 'All commits from this branch will be added to the base branch via a merge commit.',
    },
    squash: {
      title: 'Squash and merge',
      desc: 'The commits will be combined into one single commit in the base branch.',
    },
    rebase: {
      title: 'Rebase and merge',
      desc: 'The commits will be rebased and added onto the base branch without a merge commit.',
    },
  };

  return (
    <div className="commit-builder pr-review-bar">
      {/* Top Header Row */}
      <div className="pr-bar-summary-row">
        <div className="pr-bar-summary-left">
          <div className="pr-bar-title-line">
            <span className="pr-bar-number">#{pr.number}</span>
            <span className="pr-bar-title" title={pr.title}>{pr.title}</span>
          </div>

          <div className="pr-bar-subinfo">
            {pr.user && (
              <div className="pr-bar-author">
                {pr.user.avatar_url ? (
                  <img src={pr.user.avatar_url} alt={pr.user.login} className="pr-author-avatar" />
                ) : (
                  <div className="pr-author-avatar-fallback">
                    {pr.user.login.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span>{pr.user.login}</span>
              </div>
            )}

            <div className="pr-branch-route-pill">
              <span className="pr-branch-tag">{pr.head_ref}</span>
              <span className="pr-branch-arrow">&rarr;</span>
              <span className="pr-branch-tag base">{pr.base_ref}</span>
            </div>

            {pr.merged ? (
              <span className="pr-mergeable-badge merged" title={`Merged into ${pr.base_ref}`}>
                <GitMerge size={11} /> Merged into {pr.base_ref}
              </span>
            ) : pr.state === 'closed' ? (
              <span className="pr-mergeable-badge closed" title="Pull request is closed">
                <XCircle size={11} /> Closed
              </span>
            ) : (
              pr.mergeable !== undefined && pr.mergeable !== null && (
                <span className={`pr-mergeable-badge ${pr.mergeable ? 'ok' : 'conflict'}`}>
                  {pr.mergeable ? (
                    <>
                      <CheckCircle2 size={11} /> Mergeable
                    </>
                  ) : (
                    <>
                      <AlertCircle size={11} /> Conflicts
                    </>
                  )}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Merge Confirmation Dialog Box (inline) */}
      {isMergeConfirmOpen && (
        <div className="pr-merge-confirm-panel">
          <div className="pr-merge-confirm-header">
            <h4>Confirm {mergeMethodLabels[selectedMergeMethod].title}</h4>
            <button
              type="button"
              className="pr-merge-cancel-btn"
              onClick={() => setIsMergeConfirmOpen(false)}
            >
              Cancel
            </button>
          </div>

          {selectedMergeMethod !== 'rebase' && (
            <div className="pr-merge-inputs">
              <input
                type="text"
                className="commit-summary-input"
                placeholder="Merge commit title"
                value={mergeCommitTitle}
                onChange={(e) => setMergeCommitTitle(e.target.value)}
              />
              <textarea
                className="commit-desc-input"
                placeholder="Optional commit description"
                value={mergeCommitMessage}
                onChange={(e) => setMergeCommitMessage(e.target.value)}
              />
            </div>
          )}

          <div className="pr-merge-confirm-actions">
            <button
              type="button"
              className="smart-commit-btn"
              onClick={handleExecuteMerge}
              disabled={isActionLoading}
            >
              <GitMerge size={13} />
              <span>{isActionLoading ? 'Merging...' : `Confirm Merge (#${pr.number})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="commit-toolbar pr-bar-actions-row">
        {/* Left Actions */}
        <div className="commit-toolbar-left pr-bar-left-actions">
          {isCurrentBranch ? (
            <div className="pr-current-branch-pill" title={`Your working tree is on ${pr.head_ref}`}>
              <Check size={12} style={{ color: 'var(--color-staged)' }} />
              <span>On branch {pr.head_ref}</span>
            </div>
          ) : (
            <button
              type="button"
              className="secondary-btn pr-action-btn"
              onClick={onCheckoutBranch}
              disabled={isActionLoading}
              title={`Fetch and checkout branch "${pr.head_ref}" locally`}
            >
              <GitBranch size={13} />
              <span>Checkout {pr.head_ref}</span>
            </button>
          )}

          <button
            type="button"
            className="secondary-btn pr-action-btn"
            onClick={handleOpenInBrowser}
            title="Open pull request in web browser"
          >
            <ExternalLink size={12} />
            <span>Open in Web</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="commit-toolbar-right pr-bar-right-actions">
          {pr.merged ? (
            <div className="pr-merged-actions-group">
              <span className="pr-state-pill-merged">
                <GitMerge size={13} /> Merged
              </span>

              {onPullBaseBranch && (
                <button
                  type="button"
                  className="smart-commit-btn pr-pull-base-btn"
                  onClick={() => onPullBaseBranch(pr.base_ref)}
                  disabled={isActionLoading}
                  title={`Pull latest ${pr.base_ref} with merged commits`}
                >
                  <Download size={13} />
                  <span>
                    {currentBranch === pr.base_ref 
                      ? `Pull latest ${pr.base_ref}` 
                      : `Checkout & Pull ${pr.base_ref}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                className="secondary-btn pr-action-btn"
                onClick={onExitPRMode}
                title="Exit PR Review Mode and return to Staging"
              >
                <ArrowLeft size={12} />
                <span>Exit Review</span>
              </button>
            </div>
          ) : pr.state === 'closed' ? (
            <div className="pr-closed-actions-group">
              <span className="pr-state-pill-closed">
                <XCircle size={13} /> Closed
              </span>
              <button
                type="button"
                className="secondary-btn pr-action-btn"
                onClick={onReopenPR}
                disabled={isActionLoading}
              >
                <RotateCcw size={13} />
                <span>Reopen PR</span>
              </button>
              <button
                type="button"
                className="secondary-btn pr-action-btn"
                onClick={onExitPRMode}
              >
                <ArrowLeft size={12} />
                <span>Exit Review</span>
              </button>
            </div>
          ) : (
            <>
              {/* Close PR Button */}
              <button
                type="button"
                className="secondary-btn pr-action-btn pr-close-btn"
                onClick={onClosePR}
                disabled={isActionLoading}
                title="Close pull request without merging"
              >
                <XCircle size={13} />
                <span>Close PR</span>
              </button>

              {/* Merge Button with Dropdown */}
              <div className="pr-merge-split-btn-group" ref={mergeDropdownRef}>
                <button
                  type="button"
                  className="smart-commit-btn pr-merge-primary-btn"
                  onClick={() => handleOpenMergeConfirm(selectedMergeMethod)}
                  disabled={isActionLoading || pr.mergeable === false}
                  title={pr.mergeable === false ? 'This PR has conflicts and cannot be merged cleanly.' : undefined}
                >
                  <GitMerge size={13} />
                  <span>{mergeMethodLabels[selectedMergeMethod].title}</span>
                </button>

                <button
                  type="button"
                  className="smart-commit-btn pr-merge-arrow-btn"
                  onClick={() => setIsMergeDropdownOpen(!isMergeDropdownOpen)}
                  disabled={isActionLoading || pr.mergeable === false}
                  title="Choose merge strategy"
                >
                  <ChevronDown 
                    size={13} 
                    style={{ 
                      transform: isMergeDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease'
                    }} 
                  />
                </button>

                {isMergeDropdownOpen && (
                  <div className="pr-merge-dropdown-menu">
                    {(['merge', 'squash', 'rebase'] as MergeMethod[]).map((method) => {
                      const item = mergeMethodLabels[method];
                      const isSelected = selectedMergeMethod === method;
                      return (
                        <div
                          key={method}
                          className={`pr-merge-dropdown-item ${isSelected ? 'active' : ''}`}
                          onClick={() => handleOpenMergeConfirm(method)}
                        >
                          <div className="pr-merge-item-title-row">
                            {isSelected && <Check size={12} className="pr-merge-item-check" />}
                            <span className="pr-merge-item-title">{item.title}</span>
                          </div>
                          <span className="pr-merge-item-desc">{item.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PRReviewBar;
