import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  GitPullRequest,
  GitBranch,
  GitCommit,
  FileCode,
  FileText,
  Sparkles,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  Check,
  ChevronDown,
  Search,
  Settings,
  KeyRound
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { CommitInfo, GitCliResult } from '../../types/git';
import type { GlobalSettings, WorkspaceHostingConfig } from '../../types/settings';
import {
  resolveEffectiveHostingConfig,
  buildPrefilledBrowserPrUrl,
  type EffectiveHostingConfig
} from '../../services/gitProviderService';
import { generatePullRequestContent } from '../../services/aiService';

export interface PrDiffFile {
  path: string;
  status: string; // 'M' | 'A' | 'D' | 'R'
  additions: number;
  deletions: number;
}

interface CreatePRModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoPath: string;
  initialSourceBranch?: string;
  currentBranch: string;
  branchList: string[];
  remoteBranches: string[];
  remoteUrl: string | null;
  globalSettings: GlobalSettings | null;
  workspaceHostingConfig: WorkspaceHostingConfig | null;
  onOpenSettings?: () => void;
  onSuccess?: (prUrl: string, prNumber?: number) => void;
  onError?: (msg: string) => void;
  refreshRepository?: () => Promise<void>;
}

export const CreatePRModal: React.FC<CreatePRModalProps> = ({
  isOpen,
  onClose,
  repoPath,
  initialSourceBranch,
  currentBranch,
  branchList,
  remoteBranches,
  remoteUrl,
  globalSettings,
  workspaceHostingConfig,
  onOpenSettings,
  onSuccess,
  onError,
  refreshRepository,
}) => {
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveHostingConfig>(() =>
    resolveEffectiveHostingConfig(globalSettings, workspaceHostingConfig, remoteUrl)
  );

  const [sourceBranch, setSourceBranch] = useState(initialSourceBranch || currentBranch || 'main');
  const [targetBranch, setTargetBranch] = useState(effectiveConfig.defaultBaseBranch || 'main');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  // Active view tab: 'details' | 'diff' | 'commits'
  const [activeTab, setActiveTab] = useState<'details' | 'diff' | 'commits'>('details');

  // Commits between target and source branch
  const [commitsBetween, setCommitsBetween] = useState<CommitInfo[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  // Diffs state
  const [diffFiles, setDiffFiles] = useState<PrDiffFile[]>([]);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [fileDiffContent, setFileDiffContent] = useState<string>('');
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // Branch sync status relative to origin
  const [isSourcePublished, setIsSourcePublished] = useState(true);
  const [unpushedCount, setUnpushedCount] = useState(0);

  // Push confirmation prompt state
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [isPushingBranch, setIsPushingBranch] = useState(false);
  const [pendingActionAfterPush, setPendingActionAfterPush] = useState<'api' | 'browser' | null>(null);

  // Missing token prompt state
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Dropdown states for Target and Source branches
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  // Modal open transition tracker to PREVENT constant flickering and input reset
  const wasOpenRef = useRef(false);

  // Update effective config whenever settings or remote changes
  useEffect(() => {
    const resolved = resolveEffectiveHostingConfig(globalSettings, workspaceHostingConfig, remoteUrl);
    setEffectiveConfig(resolved);
  }, [globalSettings, workspaceHostingConfig, remoteUrl]);

  // Sync initial branches and state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;

      const src = initialSourceBranch || currentBranch || (branchList[0] || 'main');
      setSourceBranch(src);

      const defTarget = effectiveConfig.defaultBaseBranch || 'main';
      const availableTargets = branchList.filter(b => b !== src);
      const chosenTarget = availableTargets.includes(defTarget)
        ? defTarget
        : (availableTargets[0] || 'main');
      setTargetBranch(chosenTarget);

      // Generate clean initial title based on branch name
      const initialTitle = src
        .replace(/[-_]/g, ' ')
        .replace(/^(feature|fix|bugfix|chore|docs|refactor)\//i, '$1: ');
      setTitle(initialTitle);
      setBody('');
      setIsDraft(false);
      setShowPushPrompt(false);
      setShowTokenPrompt(false);
      setPendingActionAfterPush(null);
      setActiveTab('details');
      setDiffFiles([]);
      setSelectedDiffFile(null);
      setFileDiffContent('');
    }
  }, [isOpen, initialSourceBranch, currentBranch, branchList, effectiveConfig.defaultBaseBranch]);

  // Click outside listener for both dropdowns
  useEffect(() => {
    if (!isTargetDropdownOpen && !isSourceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setIsTargetDropdownOpen(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTargetDropdownOpen, isSourceDropdownOpen]);

  // Fetch diff content for a single file
  const fetchFileDiff = async (filePath: string, target: string, source: string) => {
    setIsLoadingDiff(true);
    try {
      const patchRes = await invoke<GitCliResult>('run_git_cli_cmd', {
        repoPath,
        args: ['diff', `${target}...refs/heads/${source}`, '--', filePath],
      });
      if (patchRes.exit_code === 0) {
        setFileDiffContent(patchRes.stdout);
      } else {
        // Fallback to plain diff without refs/heads prefix
        const fallbackRes = await invoke<GitCliResult>('run_git_cli_cmd', {
          repoPath,
          args: ['diff', `${target}...${source}`, '--', filePath],
        });
        setFileDiffContent(fallbackRes.stdout || '');
      }
    } catch {
      setFileDiffContent('');
    } finally {
      setIsLoadingDiff(false);
    }
  };

  // Inspect branch commits, file diffs, and origin sync status
  useEffect(() => {
    if (!isOpen || !repoPath || !sourceBranch || !targetBranch) return;

    let isMounted = true;

    const inspectBranches = async () => {
      setIsLoadingCommits(true);

      try {
        // 1. Fetch commits between targetBranch..sourceBranch
        const logRes = await invoke<GitCliResult>('run_git_cli_cmd', {
          repoPath,
          args: ['log', '--format=%H|%h|%an|%ae|%at|%s', `${targetBranch}..refs/heads/${sourceBranch}`],
        });

        if (isMounted) {
          if (logRes.exit_code === 0 && logRes.stdout.trim()) {
            const parsedCommits: CommitInfo[] = logRes.stdout
              .split('\n')
              .filter(Boolean)
              .map(line => {
                const parts = line.split('|');
                return {
                  id: parts[0] || '',
                  short_id: parts[1] || parts[0]?.substring(0, 7) || '',
                  author: parts[2] || '',
                  email: parts[3] || '',
                  timestamp: parseInt(parts[4] || '0', 10),
                  message: parts.slice(5).join('|') || '',
                  parents: [],
                  branches: [],
                };
              });
            setCommitsBetween(parsedCommits);

            // Only suggest commit message if title is still empty
            setTitle(prev => {
              if (prev.trim()) return prev;
              if (parsedCommits.length === 1) {
                return parsedCommits[0].message;
              }
              return prev;
            });
          } else {
            setCommitsBetween([]);
          }
        }

        // 2. Fetch Changed Files (Diff Stat & Status)
        const [numstatRes, nameStatusRes] = await Promise.all([
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath,
            args: ['diff', '--numstat', `${targetBranch}...refs/heads/${sourceBranch}`],
          }).catch(() => null),
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath,
            args: ['diff', '--name-status', `${targetBranch}...refs/heads/${sourceBranch}`],
          }).catch(() => null),
        ]);

        if (isMounted) {
          const statusMap: Record<string, string> = {};
          if (nameStatusRes && nameStatusRes.exit_code === 0 && nameStatusRes.stdout) {
            nameStatusRes.stdout.split('\n').filter(Boolean).forEach(line => {
              const parts = line.split('\t');
              if (parts.length >= 2) {
                statusMap[parts[1].trim()] = parts[0].trim();
              }
            });
          }

          const files: PrDiffFile[] = [];
          if (numstatRes && numstatRes.exit_code === 0 && numstatRes.stdout) {
            numstatRes.stdout.split('\n').filter(Boolean).forEach(line => {
              const parts = line.split('\t');
              if (parts.length >= 3) {
                const adds = parseInt(parts[0], 10) || 0;
                const dels = parseInt(parts[1], 10) || 0;
                const path = parts[2].trim();
                files.push({
                  path,
                  status: statusMap[path] || 'M',
                  additions: adds,
                  deletions: dels,
                });
              }
            });
          }

          setDiffFiles(files);
          if (files.length > 0) {
            const firstFile = files[0].path;
            setSelectedDiffFile(firstFile);
            fetchFileDiff(firstFile, targetBranch, sourceBranch);
          } else {
            setSelectedDiffFile(null);
            setFileDiffContent('');
          }
        }

        // 3. Check if source branch is published to origin & unpushed commit count
        const verifyRemoteRes = await invoke<GitCliResult>('run_git_cli_cmd', {
          repoPath,
          args: ['rev-parse', '--verify', `origin/${sourceBranch}`],
        });

        if (isMounted) {
          if (verifyRemoteRes.exit_code !== 0) {
            setIsSourcePublished(false);
            setUnpushedCount(0);
          } else {
            setIsSourcePublished(true);
            const countRes = await invoke<GitCliResult>('run_git_cli_cmd', {
              repoPath,
              args: ['rev-list', `origin/${sourceBranch}..refs/heads/${sourceBranch}`, '--count'],
            });
            if (countRes.exit_code === 0) {
              const count = parseInt(countRes.stdout.trim(), 10);
              setUnpushedCount(isNaN(count) ? 0 : count);
            } else {
              setUnpushedCount(0);
            }
          }
        }
      } catch (err) {
        console.warn('Branch inspection error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingCommits(false);
        }
      }
    };

    inspectBranches();

    return () => {
      isMounted = false;
    };
  }, [isOpen, repoPath, sourceBranch, targetBranch]);

  if (!isOpen) return null;

  const handleGenerateAI = async () => {
    if (!globalSettings) return;
    setIsGeneratingAI(true);
    try {
      const result = await generatePullRequestContent(globalSettings, {
        baseBranch: targetBranch,
        headBranch: sourceBranch,
        commits: commitsBetween.map(c => ({
          shortId: c.short_id,
          message: c.message,
          author: c.author,
        })),
        term: effectiveConfig.term,
      });

      if (result.title) setTitle(result.title);
      if (result.body) setBody(result.body);
    } catch (err: any) {
      if (onError) onError(`AI Generation failed: ${err?.message || err}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const executePushBranchToOrigin = async (): Promise<boolean> => {
    setIsPushingBranch(true);
    try {
      const res = await invoke<GitCliResult>('run_git_cli_cmd', {
        repoPath,
        args: ['push', '-u', 'origin', `${sourceBranch}:${sourceBranch}`],
      });
      if (res.exit_code === 0) {
        setIsSourcePublished(true);
        setUnpushedCount(0);
        if (refreshRepository) await refreshRepository();
        return true;
      } else {
        if (onError) onError(`Failed to push branch to origin:\n${res.stderr || res.stdout}`);
        return false;
      }
    } catch (err: any) {
      if (onError) onError(`Push error: ${err?.message || err}`);
      return false;
    } finally {
      setIsPushingBranch(false);
    }
  };

  const handleOpenInBrowser = async () => {
    if (!isSourcePublished || unpushedCount > 0) {
      setPendingActionAfterPush('browser');
      setShowPushPrompt(true);
      return;
    }

    const browserUrl = buildPrefilledBrowserPrUrl(effectiveConfig, {
      base: targetBranch,
      head: sourceBranch,
      title: title.trim() || `Merge ${sourceBranch} into ${targetBranch}`,
      body: body.trim(),
      draft: isDraft,
    });

    if (!browserUrl) {
      if (onError) onError('Could not construct remote repository URL for your browser.');
      return;
    }

    try {
      await openUrl(browserUrl);
      onClose();
    } catch {
      window.open(browserUrl, '_blank');
      onClose();
    }
  };

  const handleCreateInApp = async () => {
    if (!effectiveConfig.hasToken) {
      setShowTokenPrompt(true);
      return;
    }

    if (!isSourcePublished || unpushedCount > 0) {
      setPendingActionAfterPush('api');
      setShowPushPrompt(true);
      return;
    }

    if (!title.trim()) {
      if (onError) onError('Please enter a Pull Request title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        provider: effectiveConfig.provider,
        host_url: effectiveConfig.hostUrl,
        owner: effectiveConfig.remoteInfo?.owner || '',
        repo: effectiveConfig.remoteInfo?.repo || '',
        full_path: effectiveConfig.remoteInfo?.fullPath || '',
        token: effectiveConfig.token,
        bitbucket_username: effectiveConfig.bitbucketUsername || null,
        title: title.trim(),
        body: body.trim(),
        head: sourceBranch,
        base: targetBranch,
        draft: isDraft,
      };

      const result = await invoke<any>('create_pull_request', { payload });
      if (result && result.html_url) {
        if (onSuccess) onSuccess(result.html_url, result.number);
        onClose();
      } else {
        if (onError) onError('Failed to create Pull Request: Unexpected response.');
      }
    } catch (err: any) {
      if (onError) onError(err?.message || String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPushAndProceed = async () => {
    const pushed = await executePushBranchToOrigin();
    if (!pushed) return;
    setShowPushPrompt(false);

    if (pendingActionAfterPush === 'browser') {
      const browserUrl = buildPrefilledBrowserPrUrl(effectiveConfig, {
        base: targetBranch,
        head: sourceBranch,
        title: title.trim() || `Merge ${sourceBranch} into ${targetBranch}`,
        body: body.trim(),
        draft: isDraft,
      });
      if (browserUrl) {
        try {
          await openUrl(browserUrl);
        } catch {
          window.open(browserUrl, '_blank');
        }
        onClose();
      }
    } else if (pendingActionAfterPush === 'api') {
      handleCreateInApp();
    }
  };

  // Filtered branches for target selection dropdown
  const allCandidateTargets = Array.from(new Set([
    ...branchList,
    ...remoteBranches.map((r: string) => r.replace(/^origin\//, '')).filter((r: string) => r !== 'HEAD')
  ]));

  const filteredTargetBranches = allCandidateTargets
    .filter(b => b !== sourceBranch)
    .filter(b => !targetSearchQuery.trim() || b.toLowerCase().includes(targetSearchQuery.toLowerCase()));

  // Filtered branches for source selection dropdown
  const filteredSourceBranches = branchList
    .filter(b => !sourceSearchQuery.trim() || b.toLowerCase().includes(sourceSearchQuery.toLowerCase()));

  const totalAdditions = diffFiles.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = diffFiles.reduce((acc, f) => acc + f.deletions, 0);

  return (
    <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog-content pr-modal-content" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="pr-modal-header">
          <div className="pr-modal-header-left">
            <div className="pr-modal-icon-badge">
              <GitPullRequest size={17} />
            </div>
            <div>
              <div className="pr-modal-title">
                Create {effectiveConfig.term}
              </div>
              <div className="pr-modal-subtitle">
                <span>{effectiveConfig.remoteInfo ? effectiveConfig.remoteInfo.fullPath : 'Remote Repository'}</span>
                <span>•</span>
                <span className="pr-provider-pill">{effectiveConfig.providerLabel}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {effectiveConfig.isWorkspaceOverride && (
              <span className="settings-context-pill" title="Using Project Hosting Override">
                Workspace Override
              </span>
            )}
            <button className="dialog-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Branch Comparison Split Bar */}
        <div className="pr-branch-compare-container">
          {/* Target (Base) Branch */}
          <div className="pr-branch-column" ref={targetDropdownRef}>
            <div className="pr-branch-column-header">
              <span className="pr-branch-role-label">Base</span>
              <span className="pr-branch-desc-label">into which changes merge</span>
            </div>

            <button
              type="button"
              className={`modern-branch-select-trigger ${isTargetDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setIsTargetDropdownOpen(!isTargetDropdownOpen);
                setIsSourceDropdownOpen(false);
              }}
            >
              <div className="modern-branch-select-value">
                <GitBranch size={13} className="modern-branch-icon local" />
                <span className="modern-branch-name">{targetBranch}</span>
              </div>
              <ChevronDown size={13} className={`modern-branch-chevron ${isTargetDropdownOpen ? 'open' : ''}`} />
            </button>

            {isTargetDropdownOpen && (
              <div className="modern-branch-dropdown-menu">
                <div className="modern-branch-search-box">
                  <Search size={12} className="modern-branch-search-icon" />
                  <input
                    type="text"
                    className="modern-branch-search-input"
                    placeholder="Search base branch..."
                    value={targetSearchQuery}
                    onChange={e => setTargetSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {targetSearchQuery && (
                    <button
                      type="button"
                      className="modern-branch-search-clear"
                      onClick={() => setTargetSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="modern-branch-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredTargetBranches.length === 0 ? (
                    <div className="modern-branch-empty">
                      No branches match "{targetSearchQuery}"
                    </div>
                  ) : (
                    filteredTargetBranches.map(b => {
                      const isSelected = b === targetBranch;
                      return (
                        <div
                          key={b}
                          className={`modern-branch-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setTargetBranch(b);
                            setIsTargetDropdownOpen(false);
                            setTargetSearchQuery('');
                          }}
                        >
                          <div className="modern-branch-item-left">
                            <GitBranch size={13} className="modern-branch-icon local" />
                            <span className="modern-branch-item-text">{b}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {b === currentBranch && <span className="modern-branch-badge local">current</span>}
                            {isSelected && <Check size={14} className="modern-branch-check" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Direction Arrow Badge */}
          <div className="pr-compare-arrow-badge" title="Merging into base branch">
            <ArrowRight size={14} />
          </div>

          {/* Source (Compare) Branch */}
          <div className="pr-branch-column" ref={sourceDropdownRef}>
            <div className="pr-branch-column-header">
              <span className="pr-branch-role-label">Compare</span>
              <span className="pr-branch-desc-label">source branch with changes</span>
            </div>

            <button
              type="button"
              className={`modern-branch-select-trigger ${isSourceDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setIsSourceDropdownOpen(!isSourceDropdownOpen);
                setIsTargetDropdownOpen(false);
              }}
            >
              <div className="modern-branch-select-value">
                <GitBranch size={13} className="modern-branch-icon local" />
                <span className="modern-branch-name">{sourceBranch}</span>
                {sourceBranch === currentBranch && (
                  <span className="modern-branch-badge local">current</span>
                )}
              </div>
              <ChevronDown size={13} className={`modern-branch-chevron ${isSourceDropdownOpen ? 'open' : ''}`} />
            </button>

            {isSourceDropdownOpen && (
              <div className="modern-branch-dropdown-menu">
                <div className="modern-branch-search-box">
                  <Search size={12} className="modern-branch-search-icon" />
                  <input
                    type="text"
                    className="modern-branch-search-input"
                    placeholder="Search compare branch..."
                    value={sourceSearchQuery}
                    onChange={e => setSourceSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {sourceSearchQuery && (
                    <button
                      type="button"
                      className="modern-branch-search-clear"
                      onClick={() => setSourceSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="modern-branch-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredSourceBranches.length === 0 ? (
                    <div className="modern-branch-empty">
                      No branches match "{sourceSearchQuery}"
                    </div>
                  ) : (
                    filteredSourceBranches.map(b => {
                      const isSelected = b === sourceBranch;
                      return (
                        <div
                          key={b}
                          className={`modern-branch-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSourceBranch(b);
                            setIsSourceDropdownOpen(false);
                            setSourceSearchQuery('');
                          }}
                        >
                          <div className="modern-branch-item-left">
                            <GitBranch size={13} className="modern-branch-icon local" />
                            <span className="modern-branch-item-text">{b}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {b === currentBranch && <span className="modern-branch-badge local">current</span>}
                            {isSelected && <Check size={14} className="modern-branch-check" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Branch Origin Push Status Banner */}
        {(!isSourcePublished || unpushedCount > 0) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: '0.76rem', color: 'var(--color-text-bright)' }}>
                {!isSourcePublished ? (
                  <>Branch <strong>{sourceBranch}</strong> is not published to <code>origin</code> yet.</>
                ) : (
                  <>Branch <strong>{sourceBranch}</strong> has <strong>{unpushedCount}</strong> unpushed commit{unpushedCount > 1 ? 's' : ''}.</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Segmented Modal Navigation Tabs */}
        <div className="pr-modal-tabs">
          <button
            type="button"
            className={`pr-modal-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FileText size={13} />
            <span>PR Details</span>
          </button>

          <button
            type="button"
            className={`pr-modal-tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('diff')}
          >
            <FileCode size={13} />
            <span>Files Changed</span>
            <span className="pr-tab-count-badge">{diffFiles.length}</span>
            {diffFiles.length > 0 && (
              <span style={{ display: 'flex', gap: '3px', fontSize: '0.66rem', fontFamily: 'var(--font-mono)' }}>
                <span className="pr-stat-add">+{totalAdditions}</span>
                <span className="pr-stat-del">-{totalDeletions}</span>
              </span>
            )}
          </button>

          <button
            type="button"
            className={`pr-modal-tab-btn ${activeTab === 'commits' ? 'active' : ''}`}
            onClick={() => setActiveTab('commits')}
          >
            <GitCommit size={13} />
            <span>Commits</span>
            <span className="pr-tab-count-badge">
              {isLoadingCommits ? '...' : commitsBetween.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PR DETAILS */}
        {activeTab === 'details' && (
          <>
            {/* Title Input */}
            <div className="pr-field-group">
              <div className="pr-field-header">
                <label className="pr-field-label">
                  Title <span style={{ color: 'var(--color-deleted)', fontSize: '0.7rem' }}>*</span>
                </label>
                {title.trim().length > 0 && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {title.length} chars
                  </span>
                )}
              </div>
              <input
                className="pr-field-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. feat: add pull request creation workflow"
                autoFocus
              />
            </div>

            {/* Description Editor with AI Action Button */}
            <div className="pr-field-group">
              <div className="pr-field-header">
                <label className="pr-field-label">
                  Description <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(Markdown)</span>
                </label>
                <button
                  type="button"
                  className="ai-generate-badge-btn"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI || commitsBetween.length === 0}
                  title="Generate PR summary and title from commits using configured AI"
                >
                  <Sparkles size={11} className={isGeneratingAI ? 'spin-icon' : ''} />
                  <span>{isGeneratingAI ? 'Generating with AI...' : '✨ Generate with AI'}</span>
                </button>
              </div>
              <textarea
                className="pr-field-input pr-field-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Describe your changes, rationale, testing plan, or issue links..."
                rows={5}
              />
            </div>

            {/* Options Row */}
            <div className="pr-options-row">
              <label className="pr-draft-toggle">
                <input
                  type="checkbox"
                  checked={isDraft}
                  onChange={e => setIsDraft(e.target.checked)}
                  style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer', width: '15px', height: '15px' }}
                />
                <span>Create as Draft / WIP {effectiveConfig.term}</span>
              </label>
            </div>
          </>
        )}

        {/* TAB 2: FILES CHANGED / DIFF */}
        {activeTab === 'diff' && (
          <div className="pr-diff-viewer-container">
            {diffFiles.length === 0 ? (
              <div className="pr-diff-empty">
                <FileCode size={26} style={{ opacity: 0.35, color: 'var(--accent-purple-bright)' }} />
                <span style={{ fontWeight: 500 }}>No file changes detected</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                  Branch <code>{sourceBranch}</code> has no differences with <code>{targetBranch}</code>
                </span>
              </div>
            ) : (
              <div className="pr-diff-layout">
                {/* Files List Sidebar */}
                <div className="pr-diff-files-sidebar">
                  <div className="pr-diff-sidebar-header">
                    <span>Changed Files</span>
                    <div className="pr-diff-summary-stat">
                      <span className="pr-stat-add">+{totalAdditions}</span>
                      <span className="pr-stat-del">-{totalDeletions}</span>
                    </div>
                  </div>
                  <div className="pr-diff-files-list">
                    {diffFiles.map(file => {
                      const isSelected = file.path === selectedDiffFile;
                      const fileName = file.path.split('/').pop() || file.path;
                      const fileDir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';
                      return (
                        <button
                          key={file.path}
                          type="button"
                          className={`pr-diff-file-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedDiffFile(file.path);
                            fetchFileDiff(file.path, targetBranch, sourceBranch);
                          }}
                          title={file.path}
                        >
                          <span className={`pr-file-status-badge ${file.status.toLowerCase()}`}>
                            {file.status[0]}
                          </span>
                          <div className="pr-file-path-info">
                            <span className="pr-file-name">{fileName}</span>
                            {fileDir && <span className="pr-file-dir">{fileDir}</span>}
                          </div>
                          <div className="pr-file-diff-stat">
                            {file.additions > 0 && <span className="pr-stat-add">+{file.additions}</span>}
                            {file.deletions > 0 && <span className="pr-stat-del">-{file.deletions}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Diff Code Panel */}
                <div className="pr-diff-content-panel">
                  <div className="pr-diff-content-header">
                    <span>{selectedDiffFile || 'Select a file'}</span>
                  </div>
                  <div className="pr-diff-lines-container">
                    {isLoadingDiff ? (
                      <div className="pr-diff-loading">
                        <RefreshCw size={14} className="spin-icon" />
                        <span>Loading diff...</span>
                      </div>
                    ) : fileDiffContent ? (
                      fileDiffContent.split('\n').map((line, idx) => {
                        const isAdd = line.startsWith('+') && !line.startsWith('+++');
                        const isDel = line.startsWith('-') && !line.startsWith('---');
                        const isHunk = line.startsWith('@@');
                        const isHeader = line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ');
                        return (
                          <div
                            key={idx}
                            className={`pr-diff-code-line ${isAdd ? 'addition' : isDel ? 'deletion' : isHunk ? 'hunk' : isHeader ? 'header' : 'context'}`}
                          >
                            <span className="pr-diff-line-marker">
                              {isAdd ? '+' : isDel ? '-' : isHunk ? '@' : ' '}
                            </span>
                            <span className="pr-diff-line-text">{line}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="pr-diff-empty">
                        <span>Select a file from the sidebar to inspect its diff</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMMITS */}
        {activeTab === 'commits' && (
          <div className="pr-diff-viewer-container" style={{ height: '240px' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-bright)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Commits to merge ({commitsBetween.length})</span>
              {isLoadingCommits && <RefreshCw size={12} className="spin-icon" />}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
              {commitsBetween.length === 0 ? (
                <div className="pr-diff-empty">
                  <span>No commits found between {targetBranch} and {sourceBranch}</span>
                </div>
              ) : (
                commitsBetween.map(c => (
                  <div key={c.id} className="pr-commit-item" style={{ padding: '6px 10px', margin: '2px 0' }}>
                    <span className="pr-commit-sha">{c.short_id}</span>
                    <span className="pr-commit-msg" title={c.message}>{c.message}</span>
                    <span className="pr-commit-author">{c.author}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Push Prompt Confirmation Modal Overlay */}
        {showPushPrompt && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--bg-panel-secondary)',
              border: '1px solid var(--accent-purple)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <UploadCloud size={17} style={{ color: 'var(--accent-purple-bright)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                  Push branch to <code>origin</code> first?
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Branch <strong>{sourceBranch}</strong> must exist on remote <code>origin</code> for {effectiveConfig.providerLabel} to open a {effectiveConfig.term}.
                  Would you like Stagger to push <code>{sourceBranch}</code> to <code>origin</code> now and proceed?
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="dialog-button secondary"
                onClick={() => {
                  setShowPushPrompt(false);
                  setPendingActionAfterPush(null);
                }}
                disabled={isPushingBranch}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dialog-button primary pr-submit-primary"
                onClick={handleConfirmPushAndProceed}
                disabled={isPushingBranch}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isPushingBranch ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>Pushing to Origin...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={13} />
                    <span>Push Branch & Proceed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Token Configuration Prompt */}
        {showTokenPrompt && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--bg-panel-secondary)',
              border: '1px solid var(--accent-purple)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <KeyRound size={17} style={{ color: 'var(--accent-purple-bright)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                  {effectiveConfig.providerLabel} Access Token Required
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                  To create a {effectiveConfig.term} directly inside Stagger, you need to configure your {effectiveConfig.providerLabel} Personal Access Token in Settings.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="dialog-button secondary"
                onClick={() => setShowTokenPrompt(false)}
              >
                Dismiss
              </button>
              {onOpenSettings && (
                <button
                  type="button"
                  className="dialog-button primary pr-submit-primary"
                  onClick={() => {
                    setShowTokenPrompt(false);
                    onClose();
                    onOpenSettings();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Settings size={13} />
                  <span>Configure in Settings</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="dialog-actions" style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="dialog-button secondary"
            onClick={onClose}
            disabled={isSubmitting || isPushingBranch}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Universal: Open in Browser */}
            <button
              type="button"
              className="dialog-button secondary"
              onClick={handleOpenInBrowser}
              disabled={isSubmitting || isPushingBranch}
              title="Open pre-filled compare page in your browser"
            >
              <ExternalLink size={13} />
              <span>Open in Browser</span>
            </button>

            {/* In-App API Creation */}
            <button
              type="button"
              className="dialog-button primary pr-submit-primary"
              onClick={handleCreateInApp}
              disabled={isSubmitting || isPushingBranch || !title.trim()}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="spin-icon" />
                  <span>Creating {effectiveConfig.shortTerm}...</span>
                </>
              ) : (
                <>
                  <GitPullRequest size={13} />
                  <span>Create {effectiveConfig.term}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
