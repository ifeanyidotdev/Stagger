import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  GitBranch, 
  Shield, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  FolderOpen, 
  Save, 
  ExternalLink, 
  RefreshCw, 
  FileCode, 
  Globe, 
  User, 
  UserCheck, 
  Folder, 
  Copy, 
  CheckCheck,
  CheckCircle2,
  Zap,
  GitMerge,
  GitCommit,
  GitPullRequest,
  Workflow,
  Palette,
  ArrowDownToLine,
  ArrowUpCircle
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import type { 
  GlobalSettings, 
  SystemGitConfig, 
  WorkspaceSettings, 
  AppTheme,
  AppBuildInfo,
  AppUpdateInfo,
  UpdateDownloadProgress
} from '../../types/settings';
import type { GitCliResult } from '../../types/git';
import { 
  GEMINI_MODELS, 
  OPENAI_MODELS, 
  testAIConnection 
} from '../../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoPath?: string;
  currentBranch?: string;
  initialTab?: GlobalTab;
  cachedUpdateInfo?: AppUpdateInfo | null;
  onSettingsSaved?: (settings: GlobalSettings) => void;
  onRemoteUrlUpdated?: (newUrl: string) => void;
}

type ContextType = 'global' | 'workspace';
type GlobalTab = 'global-git' | 'global-appearance' | 'global-pull' | 'global-gitignore' | 'global-ai' | 'global-updates';
type WorkspaceTab = 'workspace-remote' | 'workspace-pull' | 'workspace-identity' | 'workspace-overview';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  repoPath = '',
  currentBranch = 'main',
  initialTab,
  cachedUpdateInfo,
  onSettingsSaved,
  onRemoteUrlUpdated,
}) => {
  // Primary Context Switcher (Global vs Workspace)
  const [activeContext, setActiveContext] = useState<ContextType>('global');
  const [activeGlobalTab, setActiveGlobalTab] = useState<GlobalTab>(initialTab || 'global-git');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('workspace-remote');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveContext('global');
      setActiveGlobalTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Appearance & Theme Settings
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('stagenode_theme') as AppTheme) || 'catppuccin-mocha';
  });

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', newTheme);
    }
    localStorage.setItem('stagenode_theme', newTheme);
  };

  // Global Git Settings
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [syncSystemGit, setSyncSystemGit] = useState(true);

  // Pull & Integration Strategy Settings
  const [defaultPullStrategy, setDefaultPullStrategy] = useState<'prompt' | 'merge' | 'rebase'>('prompt');
  const [autoOpenPullDialog, setAutoOpenPullDialog] = useState<boolean>(true);
  const [defaultPrMergeMethod, setDefaultPrMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge');

  // Workspace Pull Strategy
  const [workspacePullStrategy, setWorkspacePullStrategy] = useState<'inherit' | 'prompt' | 'merge' | 'rebase'>('inherit');

  // Universal Gitignore
  const [globalGitignorePath, setGlobalGitignorePath] = useState('~/.gitignore_global');
  const [globalGitignoreContent, setGlobalGitignoreContent] = useState('');
  const [globalGitignoreExists, setGlobalGitignoreExists] = useState(false);
  const [isSavingGlobalGitignore, setIsSavingGlobalGitignore] = useState(false);
  const [globalGitignoreNotice, setGlobalGitignoreNotice] = useState<string | null>(null);

  // AI & API Keys (BYOK) - Global
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // AI Connection Test
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);

  // App Updates & Version Channel
  const [appBuildInfo, setAppBuildInfo] = useState<AppBuildInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(cachedUpdateInfo || null);
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress | null>(null);
  const [updateInstalledReady, setUpdateInstalledReady] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedUpdateInfo) {
      setUpdateInfo(cachedUpdateInfo);
    }
  }, [cachedUpdateInfo]);

  // Workspace Specific Settings
  const [workspaceData, setWorkspaceData] = useState<WorkspaceSettings | null>(null);
  const [workspaceRemoteUrl, setWorkspaceRemoteUrl] = useState('');
  const [isApplyingRemote, setIsApplyingRemote] = useState(false);
  const [remoteApplyNotice, setRemoteApplyNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [overrideWorkspaceIdentity, setOverrideWorkspaceIdentity] = useState(false);
  const [workspaceUserName, setWorkspaceUserName] = useState('');
  const [workspaceUserEmail, setWorkspaceUserEmail] = useState('');

  // Copy Tooltip Feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasWorkspace = Boolean(repoPath && repoPath.trim().length > 0);
  const workspaceName = hasWorkspace ? (repoPath.split('/').filter(Boolean).pop() || 'Current Project') : 'No Workspace';

  // Ensure activeContext stays in 'global' if no workspace is active
  useEffect(() => {
    if (!hasWorkspace && activeContext === 'workspace') {
      setActiveContext('global');
    }
  }, [hasWorkspace, activeContext]);

  // Load all settings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoading(true);
    setSaveStatus(null);
    setAiTestResult(null);
    setRemoteApplyNotice(null);
    setGlobalGitignoreNotice(null);

    if (!hasWorkspace) {
      setActiveContext('global');
      setWorkspaceData(null);
      setWorkspaceRemoteUrl('');
      setOverrideWorkspaceIdentity(false);
      setWorkspaceUserName('');
      setWorkspaceUserEmail('');
    }

    const loadData = async () => {
      try {
        const [settings, sysGit] = await Promise.all([
          invoke<GlobalSettings>('get_global_settings'),
          invoke<SystemGitConfig>('get_system_git_config').catch(() => null),
        ]);

        if (!mounted) return;

        setUserName(settings.git_user_name || sysGit?.user_name || '');
        setUserEmail(settings.git_user_email || sysGit?.user_email || '');
        setDefaultBranch(settings.git_default_branch || sysGit?.default_branch || 'main');
        setSyncSystemGit(settings.sync_git_global_config ?? true);

        const loadedGitignorePath = settings.global_gitignore_path || sysGit?.excludes_file || '~/.gitignore_global';
        setGlobalGitignorePath(loadedGitignorePath);

        setAiProvider(settings.ai_provider || 'gemini');
        setGeminiApiKey(settings.gemini_api_key || '');
        setGeminiModel(settings.gemini_model || 'gemini-2.5-flash');
        setOpenaiApiKey(settings.openai_api_key || '');
        setOpenaiModel(settings.openai_model || 'gpt-4o');
        setOpenaiBaseUrl(settings.openai_base_url || '');

        // Load Pull Strategy & PR Settings
        const storedPull = localStorage.getItem('stagenode_pull_strategy');
        const loadedPullStrategy = settings.default_pull_strategy || (storedPull as any) || (sysGit?.pull_rebase === 'true' ? 'rebase' : sysGit?.pull_rebase === 'false' ? 'merge' : 'prompt');
        setDefaultPullStrategy(loadedPullStrategy);

        const autoPromptStored = localStorage.getItem('stagenode_auto_open_pull_dialog');
        setAutoOpenPullDialog(settings.auto_open_pull_dialog ?? (autoPromptStored !== null ? autoPromptStored === 'true' : true));

        const storedPr = localStorage.getItem('stagenode_pr_merge_method');
        const loadedPrMethod = settings.default_pr_merge_method || (storedPr as any) || 'merge';
        setDefaultPrMergeMethod(loadedPrMethod);

        // Load Theme
        const storedTheme = (localStorage.getItem('stagenode_theme') as AppTheme) || settings.theme || 'catppuccin-mocha';
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);
        if (document.body) {
          document.body.setAttribute('data-theme', storedTheme);
        }

        // Load App Build & Updater Configuration
        try {
          const bInfo = await invoke<AppBuildInfo>('get_app_build_info').catch(() => null);
          if (mounted && bInfo) {
            setAppBuildInfo(bInfo);
          }
        } catch (e) {
          console.warn('Failed to fetch build info:', e);
        }

        // Load universal gitignore content
        if (loadedGitignorePath) {
          try {
            const content = await invoke<string>('read_file_content', { path: loadedGitignorePath });
            if (mounted) {
              setGlobalGitignoreContent(content);
              setGlobalGitignoreExists(true);
            }
          } catch {
            if (mounted) setGlobalGitignoreExists(false);
          }
        }

        // Load Workspace Specific Settings if a repository is open
        if (hasWorkspace) {
          try {
            const ws = await invoke<WorkspaceSettings>('get_workspace_settings', { repoPath });
            if (mounted) {
              setWorkspaceData(ws);
              setWorkspaceRemoteUrl(ws.remote_url || '');
              setOverrideWorkspaceIdentity(ws.has_local_identity);
              setWorkspaceUserName(ws.local_user_name || '');
              setWorkspaceUserEmail(ws.local_user_email || '');
            }

            // Load workspace-specific pull strategy
            const wsStratStored = localStorage.getItem('stagenode_pull_strategy_' + repoPath);
            if (wsStratStored && (wsStratStored === 'inherit' || wsStratStored === 'prompt' || wsStratStored === 'merge' || wsStratStored === 'rebase')) {
              if (mounted) setWorkspacePullStrategy(wsStratStored as any);
            } else {
              try {
                const localRebaseRes = await invoke<GitCliResult>('run_git_cli_cmd', {
                  repoPath,
                  args: ['config', '--local', 'pull.rebase'],
                });
                if (mounted) {
                  if (localRebaseRes.exit_code === 0) {
                    const val = localRebaseRes.stdout.trim().toLowerCase();
                    if (val === 'true') setWorkspacePullStrategy('rebase');
                    else if (val === 'false') setWorkspacePullStrategy('merge');
                    else setWorkspacePullStrategy('inherit');
                  } else {
                    setWorkspacePullStrategy('inherit');
                  }
                }
              } catch {
                if (mounted) setWorkspacePullStrategy('inherit');
              }
            }
          } catch (err) {
            console.warn('Could not load workspace settings:', err);
          }
        } else {
          if (mounted) {
            setWorkspaceData(null);
            setWorkspaceRemoteUrl('');
            setOverrideWorkspaceIdentity(false);
            setWorkspaceUserName('');
            setWorkspaceUserEmail('');
            setWorkspacePullStrategy('inherit');
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [isOpen, repoPath, hasWorkspace]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Browse file for global gitignore
  const handleBrowseGlobalGitignore = async () => {
    try {
      const selected = await invoke<string | null>('select_file', {
        title: 'Select Global .gitignore File',
        defaultPath: globalGitignorePath || undefined,
      });

      if (selected) {
        setGlobalGitignorePath(selected);
        const content = await invoke<string>('read_file_content', { path: selected });
        setGlobalGitignoreContent(content);
        setGlobalGitignoreExists(true);
        setGlobalGitignoreNotice('Loaded selected .gitignore file.');
      }
    } catch (err: any) {
      console.error('Failed to select file:', err);
    }
  };

  // Save global gitignore directly to disk
  const handleSaveGlobalGitignore = async () => {
    if (!globalGitignorePath.trim()) return;
    setIsSavingGlobalGitignore(true);
    setGlobalGitignoreNotice(null);
    try {
      await invoke('write_file_content', {
        path: globalGitignorePath.trim(),
        content: globalGitignoreContent,
      });
      setGlobalGitignoreExists(true);
      setGlobalGitignoreNotice('Global .gitignore file successfully saved!');
      setTimeout(() => setGlobalGitignoreNotice(null), 3500);
    } catch (err: any) {
      setGlobalGitignoreNotice(`Error saving file: ${err?.message || err}`);
    } finally {
      setIsSavingGlobalGitignore(false);
    }
  };

  // Template inject helper
  const addTemplateToContent = (
    rules: string[], 
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(prev => {
      let result = prev ? prev.trim() + '\n\n' : '';
      result += rules.join('\n') + '\n';
      return result;
    });
  };

  // Test AI Connection via Vercel AI SDK
  const handleTestAI = async () => {
    setIsTestingAI(true);
    setAiTestResult(null);

    const testPayload: GlobalSettings = {
      ai_provider: aiProvider,
      gemini_api_key: geminiApiKey,
      gemini_model: geminiModel,
      openai_api_key: openaiApiKey,
      openai_model: openaiModel,
      openai_base_url: openaiBaseUrl,
    };

    try {
      const result = await testAIConnection(testPayload);
      setAiTestResult(result);
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err?.message || 'Connection test failed',
      });
    } finally {
      setIsTestingAI(false);
    }
  };

  // Listen to background download progress events
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<UpdateDownloadProgress>('update-progress', (event) => {
      setDownloadProgress(event.payload);
    }).then((fn) => {
      unlisten = fn;
    }).catch(err => {
      console.warn('Could not register update-progress listener:', err);
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Check for updates against build's default channel
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckError(null);
    setUpdateInstalledReady(false);
    setInstallError(null);
    setDownloadProgress(null);

    try {
      const result = await invoke<AppUpdateInfo>('check_app_update', {
        channel: null,
      });
      setUpdateInfo(result);
    } catch (err: any) {
      setUpdateCheckError(err?.message || String(err));
      setUpdateInfo(null);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Download and install available update
  const handleInstallUpdate = async () => {
    if (!updateInfo?.available) return;
    setIsInstallingUpdate(true);
    setInstallError(null);
    setUpdateInstalledReady(false);

    try {
      await invoke('download_and_install_update', {
        channel: null,
      });
      setUpdateInstalledReady(true);
    } catch (err: any) {
      setInstallError(err?.message || String(err));
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  // Relaunch the app to apply the installed update
  const handleRestartApp = async () => {
    try {
      await invoke('restart_app');
    } catch (err) {
      console.error('Failed to restart app:', err);
    }
  };

  // Apply & Update Remote Origin URL
  const handleApplyRemoteUrl = async () => {
    if (!repoPath || !workspaceRemoteUrl.trim()) return;
    setIsApplyingRemote(true);
    setRemoteApplyNotice(null);

    const targetUrl = workspaceRemoteUrl.trim();
    try {
      const savedWs = await invoke<WorkspaceSettings>('save_workspace_settings', {
        repoPath,
        remoteUrl: targetUrl,
        localUserName: overrideWorkspaceIdentity ? (workspaceUserName.trim() || null) : null,
        localUserEmail: overrideWorkspaceIdentity ? (workspaceUserEmail.trim() || null) : null,
      });

      setWorkspaceData(savedWs);

      if (onRemoteUrlUpdated) {
        onRemoteUrlUpdated(targetUrl);
      }

      setRemoteApplyNotice({
        success: true,
        message: 'Remote origin URL updated successfully!',
      });
      setTimeout(() => setRemoteApplyNotice(null), 4000);
    } catch (err: any) {
      setRemoteApplyNotice({
        success: false,
        message: `Failed to update remote URL: ${err?.message || err}`,
      });
    } finally {
      setIsApplyingRemote(false);
    }
  };

  // Save all settings (Global and Workspace)
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      // 1. Save Global Settings
      const updatedGlobal: GlobalSettings = {
        git_user_name: userName.trim() || null,
        git_user_email: userEmail.trim() || null,
        git_default_branch: defaultBranch.trim() || 'main',
        global_gitignore_path: globalGitignorePath.trim() || null,
        sync_git_global_config: syncSystemGit,
        ai_provider: aiProvider,
        gemini_api_key: geminiApiKey.trim() || null,
        gemini_model: geminiModel.trim() || 'gemini-2.5-flash',
        openai_api_key: openaiApiKey.trim() || null,
        openai_model: openaiModel.trim() || 'gpt-4o',
        openai_base_url: openaiBaseUrl.trim() || null,
        default_pull_strategy: defaultPullStrategy,
        auto_open_pull_dialog: autoOpenPullDialog,
        default_pr_merge_method: defaultPrMergeMethod,
        theme: theme,
        update_channel: (appBuildInfo?.default_channel as 'main' | 'dev') || 'main',
        auto_check_updates: true,
      };

      localStorage.setItem('stagenode_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (document.body) {
        document.body.setAttribute('data-theme', theme);
      }
      localStorage.setItem('stagenode_pull_strategy', defaultPullStrategy);
      localStorage.setItem('stagenode_auto_open_pull_dialog', JSON.stringify(autoOpenPullDialog));
      localStorage.setItem('stagenode_pr_merge_method', defaultPrMergeMethod);

      if (syncSystemGit) {
        if (defaultPullStrategy === 'rebase') {
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath: repoPath || '',
            args: ['config', '--global', 'pull.rebase', 'true'],
          }).catch(() => {});
        } else if (defaultPullStrategy === 'merge') {
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath: repoPath || '',
            args: ['config', '--global', 'pull.rebase', 'false'],
          }).catch(() => {});
        }
      }

      const savedGlobal = await invoke<GlobalSettings>('save_global_settings', {
        settings: updatedGlobal,
      });

      // 2. Save Workspace Settings if workspace is active
      if (repoPath) {
        const savedWs = await invoke<WorkspaceSettings>('save_workspace_settings', {
          repoPath,
          remoteUrl: workspaceRemoteUrl.trim() || null,
          localUserName: overrideWorkspaceIdentity ? (workspaceUserName.trim() || null) : null,
          localUserEmail: overrideWorkspaceIdentity ? (workspaceUserEmail.trim() || null) : null,
        });

        setWorkspaceData(savedWs);

        // Save workspace pull strategy override
        if (workspacePullStrategy === 'rebase') {
          localStorage.setItem('stagenode_pull_strategy_' + repoPath, 'rebase');
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath,
            args: ['config', '--local', 'pull.rebase', 'true'],
          }).catch(() => {});
        } else if (workspacePullStrategy === 'merge') {
          localStorage.setItem('stagenode_pull_strategy_' + repoPath, 'merge');
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath,
            args: ['config', '--local', 'pull.rebase', 'false'],
          }).catch(() => {});
        } else if (workspacePullStrategy === 'prompt') {
          localStorage.setItem('stagenode_pull_strategy_' + repoPath, 'prompt');
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath,
            args: ['config', '--local', '--unset', 'pull.rebase'],
          }).catch(() => {});
        } else {
          localStorage.removeItem('stagenode_pull_strategy_' + repoPath);
          invoke<GitCliResult>('run_git_cli_cmd', {
            repoPath,
            args: ['config', '--local', '--unset', 'pull.rebase'],
          }).catch(() => {});
        }

        if (onRemoteUrlUpdated && workspaceRemoteUrl.trim()) {
          onRemoteUrlUpdated(workspaceRemoteUrl.trim());
        }
      }

      setSaveStatus({
        success: true,
        message: 'Settings saved successfully!',
      });

      if (onSettingsSaved) {
        onSettingsSaved(savedGlobal);
      }

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setSaveStatus({
        success: false,
        message: `Save failed: ${err?.message || err}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-window-overlay" data-theme={theme} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-window" data-theme={theme}>
        {/* Top Header with Context Switcher */}
        <div className="settings-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--bg-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple-bright)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Settings size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                Settings
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Switch context between Global configuration and Active Project.
              </div>
            </div>
          </div>

          {/* Prominent Context Switcher */}
          <div className="settings-context-switcher">
            <button
              type="button"
              className={`settings-context-tab ${activeContext === 'global' ? 'active' : ''}`}
              onClick={() => setActiveContext('global')}
            >
              <Globe size={14} />
              <span>Global Settings</span>
            </button>
            {hasWorkspace ? (
              <button
                type="button"
                className={`settings-context-tab ${activeContext === 'workspace' ? 'active' : ''}`}
                onClick={() => setActiveContext('workspace')}
                title={`Workspace settings for ${workspaceName}`}
              >
                <Folder size={14} />
                <span>Workspace: <strong>{workspaceName}</strong></span>
                <span className="settings-context-pill">Active</span>
              </button>
            ) : (
              <div 
                className="settings-context-tab disabled"
                title="No active workspace. Add or open a Git repository to configure project settings."
                style={{ opacity: 0.45, cursor: 'not-allowed', userSelect: 'none' }}
              >
                <Folder size={14} />
                <span>No Workspace Active</span>
              </div>
            )}
          </div>

          <button 
            type="button"
            className="dialog-close-btn"
            onClick={onClose}
            title="Close Settings (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Body */}
        <div className="settings-body">
          {/* Left Navigation Sidebar */}
          <div className="settings-sidebar">
            {activeContext === 'global' || !hasWorkspace ? (
              <div className="settings-nav-group">
                <div className="settings-nav-group-title">
                  <span>Global Preferences</span>
                </div>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeGlobalTab === 'global-git' ? 'active' : ''}`}
                  onClick={() => setActiveGlobalTab('global-git')}
                >
                  <GitBranch size={15} className="settings-nav-icon" />
                  <span>Git Identity</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeGlobalTab === 'global-appearance' ? 'active' : ''}`}
                  onClick={() => setActiveGlobalTab('global-appearance')}
                >
                  <Palette size={15} className="settings-nav-icon" style={{ color: 'var(--accent-purple-bright)' }} />
                  <span>Appearance</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeGlobalTab === 'global-pull' ? 'active' : ''}`}
                  onClick={() => setActiveGlobalTab('global-pull')}
                >
                  <GitMerge size={15} className="settings-nav-icon" style={{ color: 'var(--accent-purple-bright)' }} />
                  <span>Pull & Sync Strategy</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeGlobalTab === 'global-gitignore' ? 'active' : ''}`}
                  onClick={() => setActiveGlobalTab('global-gitignore')}
                >
                  <Shield size={15} className="settings-nav-icon" />
                  <span>Universal .gitignore</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeGlobalTab === 'global-ai' ? 'active' : ''}`}
                  onClick={() => setActiveGlobalTab('global-ai')}
                >
                  <Sparkles size={15} className="settings-nav-icon" style={{ color: 'var(--color-modified)' }} />
                  <span>AI Settings</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeGlobalTab === 'global-updates' ? 'active' : ''}`}
                  onClick={() => setActiveGlobalTab('global-updates')}
                >
                  <ArrowDownToLine size={15} className="settings-nav-icon" style={{ color: 'var(--color-added)' }} />
                  <span>App Updates</span>
                </button>
              </div>
            ) : (
              <div className="settings-nav-group">
                <div className="settings-nav-group-title">
                  <span>Project Settings</span>
                  <span className="settings-workspace-badge">{workspaceName}</span>
                </div>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeWorkspaceTab === 'workspace-remote' ? 'active' : ''}`}
                  onClick={() => setActiveWorkspaceTab('workspace-remote')}
                >
                  <Globe size={15} className="settings-nav-icon" />
                  <span>Remote & Origin URL</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeWorkspaceTab === 'workspace-pull' ? 'active' : ''}`}
                  onClick={() => setActiveWorkspaceTab('workspace-pull')}
                >
                  <GitMerge size={15} className="settings-nav-icon" style={{ color: 'var(--accent-purple-bright)' }} />
                  <span>Project Pull Strategy</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeWorkspaceTab === 'workspace-identity' ? 'active' : ''}`}
                  onClick={() => setActiveWorkspaceTab('workspace-identity')}
                >
                  <UserCheck size={15} className="settings-nav-icon" />
                  <span>Project Git Author</span>
                </button>

                <button
                  type="button"
                  className={`settings-nav-btn ${activeWorkspaceTab === 'workspace-overview' ? 'active' : ''}`}
                  onClick={() => setActiveWorkspaceTab('workspace-overview')}
                >
                  <Folder size={15} className="settings-nav-icon" />
                  <span>Workspace Details</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Content Pane */}
          <div className="settings-content-pane">
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: 'var(--color-text-muted)' }}>
                <RefreshCw size={18} className="spin-icon" />
                <span>Loading configuration...</span>
              </div>
            ) : (
              <>
                {/* ========================================================
                    GLOBAL CONTEXT TABS
                   ======================================================== */}

                {/* 1. GLOBAL GIT IDENTITY */}
                {activeContext === 'global' && activeGlobalTab === 'global-git' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Global Git Identity
                      </h3>
                      <p className="settings-field-hint">
                        Default author signature attached to commits across all repositories on this machine.
                      </p>
                    </div>

                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="settings-field-label">
                          <User size={13} />
                          <span>Author Name</span>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(user.name)</span>
                        </label>
                        <input
                          className="dialog-input"
                          type="text"
                          placeholder="e.g. John Doe"
                          value={userName}
                          onChange={e => setUserName(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="settings-field-label">
                          <User size={13} />
                          <span>Author Email</span>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(user.email)</span>
                        </label>
                        <input
                          className="dialog-input"
                          type="email"
                          placeholder="e.g. john@example.com"
                          value={userEmail}
                          onChange={e => setUserEmail(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="settings-field-label">
                          <GitBranch size={13} />
                          <span>Default Initial Branch</span>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(init.defaultBranch)</span>
                        </label>
                        <input
                          className="dialog-input"
                          type="text"
                          placeholder="main"
                          value={defaultBranch}
                          onChange={e => setDefaultBranch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div 
                      className="settings-card"
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        background: 'var(--bg-panel-secondary)',
                        padding: '16px 20px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                          Auto-sync with System Git (<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>git config --global</code>)
                        </div>
                        <div className="settings-field-hint" style={{ marginTop: '3px' }}>
                          Synchronizes these values directly with your machine&apos;s global git configuration so external CLI tools and IDEs stay in harmony.
                        </div>
                      </div>
                      <label className="settings-switch" title="Toggle system git synchronization">
                        <input
                          type="checkbox"
                          checked={syncSystemGit}
                          onChange={e => setSyncSystemGit(e.target.checked)}
                        />
                        <span className="settings-switch-slider" />
                      </label>
                    </div>
                  </>
                )}

                {/* APPEARANCE & THEME */}
                {activeContext === 'global' && activeGlobalTab === 'global-appearance' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Appearance
                      </h3>
                      <p className="settings-field-hint">
                        Choose the color theme and visual style for StageNode. Changes apply immediately.
                      </p>
                    </div>

                    <div className="settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                            Active Theme
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                            Configures background surfaces, borders, git staging status colors, and accent highlights.
                          </div>
                        </div>
                      </div>

                      <div className="settings-theme-grid">
                        
                        {/* Option 1: Catppuccin Mocha (Default) */}
                        <div 
                          onClick={() => handleThemeChange('catppuccin-mocha')}
                          className={`settings-theme-card ${theme === 'catppuccin-mocha' ? 'active' : ''}`}
                        >
                          <div className="settings-theme-card-header">
                            <span className="settings-theme-card-title">
                              Catppuccin Mocha
                            </span>
                            {theme === 'catppuccin-mocha' && (
                              <span className="settings-theme-card-check">
                                <CheckCircle2 size={16} />
                              </span>
                            )}
                          </div>
                          <p className="settings-theme-card-desc">
                            Official soothing cool-dark palette with mauve, lavender, and mint accents on comfortable navy-slate surfaces.
                          </p>
                          <div className="settings-theme-swatches">
                            <span className="settings-swatch" style={{ background: '#1e1e2e' }} title="Base #1e1e2e" />
                            <span className="settings-swatch" style={{ background: '#181825' }} title="Mantle #181825" />
                            <span className="settings-swatch" style={{ background: '#cba6f7' }} title="Mauve #cba6f7" />
                            <span className="settings-swatch" style={{ background: '#a6e3a1' }} title="Green #a6e3a1" />
                            <span className="settings-swatch" style={{ background: '#fab387' }} title="Peach #fab387" />
                          </div>
                        </div>

                        {/* Option 2: Catppuccin Latte */}
                        <div 
                          onClick={() => handleThemeChange('catppuccin-latte')}
                          className={`settings-theme-card ${theme === 'catppuccin-latte' ? 'active' : ''}`}
                        >
                          <div className="settings-theme-card-header">
                            <span className="settings-theme-card-title">
                              Catppuccin Latte
                            </span>
                            {theme === 'catppuccin-latte' && (
                              <span className="settings-theme-card-check">
                                <CheckCircle2 size={16} />
                              </span>
                            )}
                          </div>
                          <p className="settings-theme-card-desc">
                            Official crisp and light flavor with soothing pastel accents on clean paper surfaces.
                          </p>
                          <div className="settings-theme-swatches">
                            <span className="settings-swatch" style={{ background: '#eff1f5' }} title="Base #eff1f5" />
                            <span className="settings-swatch" style={{ background: '#ccd0da' }} title="Surface #ccd0da" />
                            <span className="settings-swatch" style={{ background: '#8839ef' }} title="Mauve #8839ef" />
                            <span className="settings-swatch" style={{ background: '#40a02b' }} title="Green #40a02b" />
                            <span className="settings-swatch" style={{ background: '#1e66f5' }} title="Blue #1e66f5" />
                          </div>
                        </div>

                        {/* Option 3: Cosmic Charcoal */}
                        <div 
                          onClick={() => handleThemeChange('cosmic-dark')}
                          className={`settings-theme-card ${theme === 'cosmic-dark' ? 'active' : ''}`}
                        >
                          <div className="settings-theme-card-header">
                            <span className="settings-theme-card-title">
                              Cosmic Charcoal
                            </span>
                            {theme === 'cosmic-dark' && (
                              <span className="settings-theme-card-check">
                                <CheckCircle2 size={16} />
                              </span>
                            )}
                          </div>
                          <p className="settings-theme-card-desc">
                            Legacy high-contrast cold charcoal background with vivid violet accents and emerald diff lines.
                          </p>
                          <div className="settings-theme-swatches">
                            <span className="settings-swatch" style={{ background: '#0c0d12' }} title="Charcoal #0c0d12" />
                            <span className="settings-swatch" style={{ background: '#15161f' }} title="Panel #15161f" />
                            <span className="settings-swatch" style={{ background: '#7c3aed' }} title="Violet #7c3aed" />
                            <span className="settings-swatch" style={{ background: '#22c55e' }} title="Emerald #22c55e" />
                            <span className="settings-swatch" style={{ background: '#60a5fa' }} title="Blue #60a5fa" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </>
                )}

                {/* PULL & INTEGRATION STRATEGY */}
                {activeContext === 'global' && activeGlobalTab === 'global-pull' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Pull & Integration Strategy
                      </h3>
                      <p className="settings-field-hint">
                        Configure how StageNode integrates remote commits when pulling changes, and set your default GitHub PR merge method.
                      </p>
                    </div>

                    {/* Pull Integration Options */}
                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label className="settings-field-label">
                          <GitMerge size={13} />
                          <span>Default Pull Integration Method</span>
                        </label>
                        <span className="settings-field-hint">
                          How StageNode settles incoming commits when pulling or synchronizing with origin.
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {/* Option 1: Always Prompt */}
                        <div
                          className={`settings-radio-row ${defaultPullStrategy === 'prompt' ? 'selected' : ''}`}
                          onClick={() => setDefaultPullStrategy('prompt')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: 'var(--accent-purple-bright)' }}>
                            <Workflow size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Always Prompt (Interactive)
                              </span>
                              <span className="settings-tag-pill">Default</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Opens a dialog to choose between Merge or Rebase whenever remote commits are incoming.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {defaultPullStrategy === 'prompt' && <div className="settings-radio-dot" />}
                          </div>
                        </div>

                        {/* Option 2: Fully Merge */}
                        <div
                          className={`settings-radio-row ${defaultPullStrategy === 'merge' ? 'selected' : ''}`}
                          onClick={() => setDefaultPullStrategy('merge')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: '#61afef' }}>
                            <GitMerge size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Always Merge
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Creates a merge commit to join remote commits into your branch. Preserves full history.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {defaultPullStrategy === 'merge' && <div className="settings-radio-dot" />}
                          </div>
                        </div>

                        {/* Option 3: Rebase */}
                        <div
                          className={`settings-radio-row ${defaultPullStrategy === 'rebase' ? 'selected' : ''}`}
                          onClick={() => setDefaultPullStrategy('rebase')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: 'var(--accent-purple-bright)' }}>
                            <GitCommit size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Always Rebase
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Replays your local commits on top of incoming remote commits. Produces a clean linear history.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {defaultPullStrategy === 'rebase' && <div className="settings-radio-dot" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Prompt on Fetch Switch */}
                    <div 
                      className="settings-card"
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        background: 'var(--bg-panel-secondary)',
                        padding: '16px 20px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                          Prompt automatically when new remote commits are fetched
                        </div>
                        <div className="settings-field-hint" style={{ marginTop: '2px' }}>
                          When fetching detects that origin has newer commits, automatically open the integration options dialog.
                        </div>
                      </div>
                      <label className="settings-switch" title="Toggle auto-prompt on fetch">
                        <input
                          type="checkbox"
                          checked={autoOpenPullDialog}
                          onChange={e => setAutoOpenPullDialog(e.target.checked)}
                        />
                        <span className="settings-switch-slider" />
                      </label>
                    </div>

                    {/* GitHub Pull Request Merge Preference */}
                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label className="settings-field-label">
                          <GitPullRequest size={13} />
                          <span>GitHub Pull Request Default Integration</span>
                          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(for completing PRs)</span>
                        </label>
                        <span className="settings-field-hint">
                          Default merge behavior when closing and merging GitHub pull requests.
                        </span>
                      </div>

                      <div className="settings-segmented-group">
                        <button
                          type="button"
                          className={`settings-segmented-btn ${defaultPrMergeMethod === 'merge' ? 'selected' : ''}`}
                          onClick={() => setDefaultPrMergeMethod('merge')}
                        >
                          <GitMerge size={14} />
                          <span>Merge Commit</span>
                        </button>
                        <button
                          type="button"
                          className={`settings-segmented-btn ${defaultPrMergeMethod === 'squash' ? 'selected' : ''}`}
                          onClick={() => setDefaultPrMergeMethod('squash')}
                        >
                          <GitCommit size={14} />
                          <span>Squash & Merge</span>
                        </button>
                        <button
                          type="button"
                          className={`settings-segmented-btn ${defaultPrMergeMethod === 'rebase' ? 'selected' : ''}`}
                          onClick={() => setDefaultPrMergeMethod('rebase')}
                        >
                          <Workflow size={14} />
                          <span>Rebase & Merge</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. UNIVERSAL GITIGNORE */}
                {activeContext === 'global' && activeGlobalTab === 'global-gitignore' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Universal Global .gitignore
                      </h3>
                      <p className="settings-field-hint">
                        Rules specified here are automatically respected by every single project and workspace opened in StageNode.
                      </p>
                    </div>

                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="settings-field-label">
                          <Shield size={13} />
                          <span>Global Ignore File Location</span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            className="dialog-input"
                            type="text"
                            placeholder="~/.gitignore_global"
                            value={globalGitignorePath}
                            onChange={e => setGlobalGitignorePath(e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                          />
                          <button
                            type="button"
                            onClick={handleBrowseGlobalGitignore}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              color: 'var(--color-text-bright)',
                              padding: '0 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <FolderOpen size={13} />
                            <span>Browse...</span>
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.72rem', color: globalGitignoreExists ? 'var(--color-added)' : 'var(--color-modified)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {globalGitignoreExists ? <Check size={12} /> : <AlertCircle size={12} />}
                            {globalGitignoreExists ? 'File active & respected by all projects' : 'File will be created on save'}
                          </span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                          Insert common universal patterns:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['.DS_Store', 'Thumbs.db', 'desktop.ini'], setGlobalGitignoreContent)}
                            className="settings-chip"
                          >
                            <span>+ OS Junk (.DS_Store)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['node_modules/', '.pnp*', 'dist/', '*.log'], setGlobalGitignoreContent)}
                            className="settings-chip"
                          >
                            <span>+ Node / Build outputs</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['.vscode/', '.idea/', '*.swp'], setGlobalGitignoreContent)}
                            className="settings-chip"
                          >
                            <span>+ IDEs (.vscode, .idea)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['.env', '.env.local', '*.pem'], setGlobalGitignoreContent)}
                            className="settings-chip"
                          >
                            <span>+ Secrets (.env)</span>
                          </button>
                        </div>
                      </div>

                      {/* Editor */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label className="settings-field-label">
                            <FileCode size={13} />
                            <span>Global Ignore Rules Editor</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSaveGlobalGitignore}
                            disabled={isSavingGlobalGitignore}
                            style={{
                              background: 'rgba(139, 92, 246, 0.15)',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              color: 'var(--accent-purple-bright)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                            }}
                          >
                            <Save size={12} />
                            <span>{isSavingGlobalGitignore ? 'Saving...' : 'Save File'}</span>
                          </button>
                        </div>

                        <textarea
                          value={globalGitignoreContent}
                          onChange={e => setGlobalGitignoreContent(e.target.value)}
                          placeholder="# Universal patterns&#10;.DS_Store&#10;node_modules/&#10;*.log"
                          rows={8}
                          style={{
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--color-text-bright)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            padding: '10px 12px',
                            resize: 'vertical',
                            outline: 'none',
                          }}
                        />

                        {globalGitignoreNotice && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--color-added)', marginTop: '2px' }}>
                            {globalGitignoreNotice}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* 3. AI SETTINGS */}
                {activeContext === 'global' && activeGlobalTab === 'global-ai' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        AI Settings
                      </h3>
                      <p className="settings-field-hint">
                        Configure your AI providers and API keys for smart commit messages and assistance.
                      </p>
                    </div>

                    {/* Provider Toggle Cards */}
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <button
                        type="button"
                        className={`settings-provider-card ${aiProvider === 'gemini' ? 'active' : ''}`}
                        onClick={() => { setAiProvider('gemini'); setAiTestResult(null); }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div 
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '7px', 
                                background: 'rgba(139, 92, 246, 0.18)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: 'var(--accent-purple-bright)' 
                              }}
                            >
                              <Sparkles size={15} />
                            </div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                              Google Gemini
                            </span>
                          </div>
                          {aiProvider === 'gemini' && (
                            <span className="settings-context-pill">Active</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          Gemini 2.5 Flash, 2.5 Pro, 2.0 Flash. Ultra-fast multimodal reasoning via Vercel AI SDK.
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`settings-provider-card ${aiProvider === 'openai' ? 'active openai' : ''}`}
                        onClick={() => { setAiProvider('openai'); setAiTestResult(null); }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div 
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '7px', 
                                background: 'rgba(16, 185, 129, 0.18)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#10b981' 
                              }}
                            >
                              <Zap size={15} />
                            </div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                              OpenAI
                            </span>
                          </div>
                          {aiProvider === 'openai' && (
                            <span 
                              className="settings-context-pill" 
                              style={{ 
                                background: 'rgba(16, 185, 129, 0.15)', 
                                color: '#10b981', 
                                borderColor: 'rgba(16, 185, 129, 0.3)' 
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          GPT-4o, GPT-4o-mini, o1, o3-mini. Supports custom endpoints (OpenRouter, Ollama, Azure).
                        </span>
                      </button>
                    </div>

                    <div className="settings-card">
                      {aiProvider === 'gemini' ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label className="settings-field-label">Gemini API Key</label>
                              <button
                                type="button"
                                onClick={() => openUrl('https://aistudio.google.com/app/apikey').catch(() => window.open('https://aistudio.google.com/app/apikey', '_blank'))}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple-bright)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>Get API Key</span>
                                <ExternalLink size={11} />
                              </button>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                className="dialog-input"
                                type={showGeminiKey ? 'text' : 'password'}
                                placeholder="AIzaSy..."
                                value={geminiApiKey}
                                onChange={e => setGeminiApiKey(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)', paddingRight: '36px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowGeminiKey(!showGeminiKey)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                              >
                                {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="settings-field-label">Model</label>
                            <select
                              className="dialog-input"
                              value={geminiModel}
                              onChange={e => setGeminiModel(e.target.value)}
                            >
                              {GEMINI_MODELS.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.recommended ? '(Recommended)' : ''} - {m.description}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label className="settings-field-label">OpenAI API Key</label>
                              <button
                                type="button"
                                onClick={() => openUrl('https://platform.openai.com/api-keys').catch(() => window.open('https://platform.openai.com/api-keys', '_blank'))}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple-bright)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <span>Get API Key</span>
                                <ExternalLink size={11} />
                              </button>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <input
                                className="dialog-input"
                                type={showOpenaiKey ? 'text' : 'password'}
                                placeholder="sk-proj-..."
                                value={openaiApiKey}
                                onChange={e => setOpenaiApiKey(e.target.value)}
                                style={{ fontFamily: 'var(--font-mono)', paddingRight: '36px' }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                              >
                                {showOpenaiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="settings-field-label">Model</label>
                            <select
                              className="dialog-input"
                              value={openaiModel}
                              onChange={e => setOpenaiModel(e.target.value)}
                            >
                              {OPENAI_MODELS.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.recommended ? '(Recommended)' : ''} - {m.description}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="settings-field-label">
                              <span>Custom Base URL</span>
                              <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(Optional - for OpenRouter, Ollama, Azure)</span>
                            </label>
                            <input
                              className="dialog-input"
                              type="text"
                              placeholder="https://api.openai.com/v1"
                              value={openaiBaseUrl}
                              onChange={e => setOpenaiBaseUrl(e.target.value)}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                            />
                          </div>
                        </>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={handleTestAI}
                          disabled={isTestingAI || (aiProvider === 'gemini' ? !geminiApiKey.trim() : !openaiApiKey.trim())}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--color-text-bright)',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            opacity: (aiProvider === 'gemini' ? !geminiApiKey.trim() : !openaiApiKey.trim()) ? 0.5 : 1,
                          }}
                        >
                          <RefreshCw size={13} className={isTestingAI ? 'spin-icon' : ''} />
                          <span>{isTestingAI ? 'Connecting...' : 'Test Connection (Vercel AI SDK)'}</span>
                        </button>
                      </div>

                      {aiTestResult && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: aiTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: aiTestResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.76rem',
                            color: aiTestResult.success ? 'var(--color-added)' : 'var(--color-deleted)',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{aiTestResult.message}</div>
                          {aiTestResult.response && (
                            <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                              Sample Reply: &quot;{aiTestResult.response}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 6. APP UPDATES & CHANNELS */}
                {activeContext === 'global' && activeGlobalTab === 'global-updates' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Application Updates
                      </h3>
                      <p className="settings-field-hint">
                        Ensure your desktop application is running the latest features, improvements, and fixes.
                      </p>
                    </div>

                    {/* Current Version Card */}
                    <div className="settings-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(59, 130, 246, 0.16) 100%)',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--accent-purple-bright)',
                              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.15)',
                            }}
                          >
                            <ArrowDownToLine size={20} strokeWidth={2.2} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                              {appBuildInfo?.app_name || 'Stagger'}
                            </span>
                            <span
                              className="settings-context-pill"
                              style={{
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: 'var(--accent-purple-bright)',
                                borderColor: 'rgba(139, 92, 246, 0.3)',
                                fontWeight: 600,
                                fontSize: '0.74rem',
                              }}
                            >
                              v{appBuildInfo?.version || '0.1.1'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCheckForUpdates()}
                          disabled={isCheckingUpdate || isInstallingUpdate}
                          style={{
                            background: 'var(--accent-purple-bright)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: isCheckingUpdate || isInstallingUpdate ? 'not-allowed' : 'pointer',
                            opacity: isCheckingUpdate || isInstallingUpdate ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
                          }}
                        >
                          <RefreshCw size={14} className={isCheckingUpdate ? 'spin-icon' : ''} />
                          <span>{isCheckingUpdate ? 'Checking Releases...' : 'Check for Updates'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Update Result / Download Status Card */}
                    {(updateCheckError || updateInfo || isInstallingUpdate || updateInstalledReady) && (
                      <div className="settings-card" style={{ borderLeft: updateCheckError ? '3px solid var(--color-deleted)' : updateInfo?.available ? '3px solid var(--accent-purple-bright)' : '3px solid var(--color-added)' }}>
                        {updateCheckError ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--color-deleted)' }}>
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>Update Check Notice</div>
                              <div style={{ fontSize: '0.76rem', marginTop: '2px', opacity: 0.9 }}>{updateCheckError}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                This usually indicates no releases have been published to this channel yet, or the network is unavailable.
                              </div>
                            </div>
                          </div>
                        ) : updateInfo?.available ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ArrowUpCircle size={18} style={{ color: 'var(--color-added)' }} />
                                  <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                                    New Version Available: v{updateInfo.version}
                                  </span>
                                  {updateInfo.date && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                      ({updateInfo.date.split('T')[0]})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                  Currently installed: v{updateInfo.current_version}
                                </div>
                              </div>

                              {updateInstalledReady ? (
                                <button
                                  type="button"
                                  onClick={handleRestartApp}
                                  style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  <RefreshCw size={14} />
                                  <span>Restart App to Apply</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleInstallUpdate}
                                  disabled={isInstallingUpdate}
                                  style={{
                                    background: 'var(--accent-purple-bright)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    cursor: isInstallingUpdate ? 'not-allowed' : 'pointer',
                                    opacity: isInstallingUpdate ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <ArrowDownToLine size={14} strokeWidth={2.2} />
                                  <span>{isInstallingUpdate ? 'Downloading & Installing...' : 'Download & Install Update'}</span>
                                </button>
                              )}
                            </div>

                            {/* Release notes if available */}
                            {updateInfo.body && (
                              <div style={{ background: 'var(--bg-active)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)', maxHeight: '160px', overflowY: 'auto' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Release Notes
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-bright)', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: 'var(--font-mono)' }}>
                                  {updateInfo.body}
                                </div>
                              </div>
                            )}

                            {/* Download Progress Bar */}
                            {isInstallingUpdate && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                  <span>Downloading package and verifying signature...</span>
                                  <span>{downloadProgress?.percentage ? `${downloadProgress.percentage}%` : `${((downloadProgress?.downloaded || 0) / 1048576).toFixed(1)} MB`}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'var(--bg-active)', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      background: 'var(--accent-purple-bright)',
                                      width: `${downloadProgress?.percentage || 30}%`,
                                      transition: 'width 0.2s ease',
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {installError && (
                              <div style={{ color: 'var(--color-deleted)', fontSize: '0.76rem' }}>
                                Installation error: {installError}
                              </div>
                            )}

                            {updateInstalledReady && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-added)', fontSize: '0.78rem', fontWeight: 500 }}>
                                <CheckCircle2 size={16} />
                                <span>Update downloaded and verified successfully! Click &quot;Restart App to Apply&quot; to finish updating.</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle2 size={18} style={{ color: 'var(--color-added)', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                                You&apos;re up to date!
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                Version {updateInfo?.current_version || appBuildInfo?.version} is the latest release.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ========================================================
                    WORKSPACE CONTEXT TABS (NO AI & NO GITIGNORE AS REQUESTED)
                   ======================================================== */}

                {/* 1. WORKSPACE: REMOTE & ORIGIN URL */}
                {activeContext === 'workspace' && activeWorkspaceTab === 'workspace-remote' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Remote Origin URL Configuration
                      </h3>
                      <p className="settings-field-hint">
                        Manage or change the primary <code style={{ fontFamily: 'var(--font-mono)' }}>origin</code> remote for project: <strong>{workspaceName}</strong>.
                      </p>
                    </div>

                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="settings-field-label">
                              <Globe size={13} />
                              <span>Remote Origin URL</span>
                            </label>
                            {workspaceRemoteUrl.trim() && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <span className="settings-context-pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple-bright)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                                  {workspaceRemoteUrl.includes('github.com') ? 'GitHub' : workspaceRemoteUrl.includes('gitlab.com') ? 'GitLab' : workspaceRemoteUrl.includes('bitbucket.org') ? 'Bitbucket' : 'Git'}
                                </span>
                                <span className="settings-context-pill" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--color-text-main)', borderColor: 'var(--border-color)' }}>
                                  {workspaceRemoteUrl.startsWith('git@') || workspaceRemoteUrl.startsWith('ssh://') ? 'SSH' : 'HTTPS'}
                                </span>
                              </div>
                            )}
                          </div>
                          {workspaceRemoteUrl && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(workspaceRemoteUrl, 'remote-url')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-text-muted)',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {copiedField === 'remote-url' ? <CheckCheck size={12} style={{ color: 'var(--color-added)' }} /> : <Copy size={12} />}
                                <span>{copiedField === 'remote-url' ? 'Copied' : 'Copy'}</span>
                              </button>

                              {(workspaceRemoteUrl.includes('github.com') || workspaceRemoteUrl.includes('gitlab.com')) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cleanUrl = workspaceRemoteUrl
                                      .replace(/^git@github\.com:/, 'https://github.com/')
                                      .replace(/^git@gitlab\.com:/, 'https://gitlab.com/')
                                      .replace(/\.git$/, '');
                                    openUrl(cleanUrl).catch(() => window.open(cleanUrl, '_blank'));
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--accent-purple-bright)',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <span>Open in Web</span>
                                  <ExternalLink size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Input with dedicated Change/Apply button */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            className="dialog-input"
                            type="text"
                            placeholder="e.g. git@github.com:owner/repo.git or https://github.com/owner/repo.git"
                            value={workspaceRemoteUrl}
                            onChange={e => setWorkspaceRemoteUrl(e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleApplyRemoteUrl}
                            disabled={isApplyingRemote || !workspaceRemoteUrl.trim()}
                            className="settings-btn-primary"
                            style={{
                              padding: '0 14px',
                              height: '34px',
                              fontSize: '0.78rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isApplyingRemote ? <RefreshCw size={13} className="spin-icon" /> : <Save size={13} />}
                            <span>{isApplyingRemote ? 'Updating...' : 'Update Remote URL'}</span>
                          </button>
                        </div>

                        <span className="settings-field-hint">
                          Updating this field changes <code style={{ fontFamily: 'var(--font-mono)' }}>origin</code> in <code style={{ fontFamily: 'var(--font-mono)' }}>.git/config</code>.
                        </span>

                        {remoteApplyNotice && (
                          <div 
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: '6px', 
                              background: remoteApplyNotice.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              border: remoteApplyNotice.success ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              color: remoteApplyNotice.success ? 'var(--color-staged)' : 'var(--color-deleted)',
                              fontSize: '0.76rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {remoteApplyNotice.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            <span>{remoteApplyNotice.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* WORKSPACE: PULL & INTEGRATION STRATEGY */}
                {activeContext === 'workspace' && activeWorkspaceTab === 'workspace-pull' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Project Pull & Integration Strategy
                      </h3>
                      <p className="settings-field-hint">
                        Configure pull and rebase preferences specifically for <strong>{workspaceName}</strong> ({repoPath}).
                      </p>
                    </div>

                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <label className="settings-field-label">
                          <GitMerge size={13} />
                          <span>Project Pull Behavior</span>
                        </label>
                        <span className="settings-field-hint">
                          Overrides machine-wide settings for this specific repository.
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {/* Option: Inherit Global */}
                        <div
                          className={`settings-radio-row ${workspacePullStrategy === 'inherit' ? 'selected' : ''}`}
                          onClick={() => setWorkspacePullStrategy('inherit')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: 'var(--accent-purple-bright)' }}>
                            <Globe size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Inherit Global Strategy
                              </span>
                              <span className="settings-tag-pill">
                                Default: {defaultPullStrategy === 'prompt' ? 'Prompt' : defaultPullStrategy === 'merge' ? 'Merge' : 'Rebase'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Follows your machine-wide default configuration.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {workspacePullStrategy === 'inherit' && <div className="settings-radio-dot" />}
                          </div>
                        </div>

                        {/* Option: Always Prompt */}
                        <div
                          className={`settings-radio-row ${workspacePullStrategy === 'prompt' ? 'selected' : ''}`}
                          onClick={() => setWorkspacePullStrategy('prompt')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: 'var(--accent-purple-bright)' }}>
                            <Workflow size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Always Prompt for this project
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Always show the Integrate Remote Changes dialog when pulling in this repository.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {workspacePullStrategy === 'prompt' && <div className="settings-radio-dot" />}
                          </div>
                        </div>

                        {/* Option: Force Merge */}
                        <div
                          className={`settings-radio-row ${workspacePullStrategy === 'merge' ? 'selected' : ''}`}
                          onClick={() => setWorkspacePullStrategy('merge')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: '#61afef' }}>
                            <GitMerge size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Always Merge
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Always merge incoming remote commits into this repository.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {workspacePullStrategy === 'merge' && <div className="settings-radio-dot" />}
                          </div>
                        </div>

                        {/* Option: Force Rebase */}
                        <div
                          className={`settings-radio-row ${workspacePullStrategy === 'rebase' ? 'selected' : ''}`}
                          onClick={() => setWorkspacePullStrategy('rebase')}
                        >
                          <div className="settings-radio-row-icon" style={{ color: 'var(--accent-purple-bright)' }}>
                            <GitCommit size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-bright)' }}>
                                Always Rebase
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Always rebase unpushed commits on top of incoming remote commits.
                            </div>
                          </div>
                          <div className="settings-radio-circle">
                            {workspacePullStrategy === 'rebase' && <div className="settings-radio-dot" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. WORKSPACE: PROJECT GIT AUTHOR */}
                {activeContext === 'workspace' && activeWorkspaceTab === 'workspace-identity' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Project Git Author Override
                      </h3>
                      <p className="settings-field-hint">
                        Customize author credentials specifically for <strong>{workspaceName}</strong> without altering your global machine defaults.
                      </p>
                    </div>

                    <div className="settings-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                            Override Author Identity for this Repository
                          </div>
                          <div className="settings-field-hint" style={{ marginTop: '3px' }}>
                            Ideal for distinguishing between work and personal email addresses for this project.
                          </div>
                        </div>
                        <label className="settings-switch" title="Toggle project author override">
                          <input
                            type="checkbox"
                            checked={overrideWorkspaceIdentity}
                            onChange={e => setOverrideWorkspaceIdentity(e.target.checked)}
                          />
                          <span className="settings-switch-slider" />
                        </label>
                      </div>

                      {!overrideWorkspaceIdentity ? (
                        <div 
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: 'var(--bg-panel-secondary)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.78rem',
                          }}
                        >
                          <User size={15} style={{ color: 'var(--color-text-muted)' }} />
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Inheriting Global Author: </span>
                            <strong style={{ color: 'var(--color-text-bright)' }}>
                              {userName || 'Not set'} &lt;{userEmail || 'Not set'}&gt;
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="settings-field-label">
                              <span>Project Author Name</span>
                            </label>
                            <input
                              className="dialog-input"
                              type="text"
                              placeholder="e.g. Work Identity Name"
                              value={workspaceUserName}
                              onChange={e => setWorkspaceUserName(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="settings-field-label">
                              <span>Project Author Email</span>
                            </label>
                            <input
                              className="dialog-input"
                              type="email"
                              placeholder="e.g. work@company.com"
                              value={workspaceUserEmail}
                              onChange={e => setWorkspaceUserEmail(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 3. WORKSPACE: OVERVIEW DETAILS */}
                {activeContext === 'workspace' && activeWorkspaceTab === 'workspace-overview' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        Workspace Details & Diagnostics
                      </h3>
                      <p className="settings-field-hint">
                        Repository environment properties for <strong>{workspaceName}</strong>.
                      </p>
                    </div>

                    <div className="settings-card">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Project Name</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>{workspaceName}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Working Directory Path</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-text-bright)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {repoPath}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(repoPath, 'repo-path')}
                            className="dialog-button secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          >
                            {copiedField === 'repo-path' ? 'Copied!' : 'Copy Path'}
                          </button>
                          <button
                            type="button"
                            onClick={() => revealItemInDir(repoPath).catch(() => {})}
                            className="dialog-button secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                          >
                            Reveal in Finder
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Active Branch</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--accent-purple-bright)', fontFamily: 'var(--font-mono)' }}>
                          <GitBranch size={13} />
                          {currentBranch}
                        </span>
                      </div>

                      {workspaceData && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Configuration State</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-bright)' }}>
                            {workspaceData.has_local_identity ? 'Custom project author active' : 'Inheriting global Git author'} • {workspaceData.remote_url ? 'Origin remote configured' : 'No origin remote configured'}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Empty Workspace Fallback */}
                {!hasWorkspace && activeContext === 'workspace' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-active)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-text-muted)' }}>
                      <Folder size={24} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-bright)', marginBottom: '8px' }}>
                      No Workspace Open
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: '400px', lineHeight: 1.5, marginBottom: '20px' }}>
                      Open or clone a Git repository to configure project-specific settings such as remote origin URLs, repository author signatures, and workspace overview details.
                    </p>
                    <button
                      type="button"
                      className="settings-btn-primary"
                      onClick={() => setActiveContext('global')}
                      style={{ padding: '8px 18px', fontSize: '0.8rem' }}
                    >
                      Return to Global Settings
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="settings-footer">
          <div>
            {saveStatus && (
              <span 
                style={{ 
                  fontSize: '0.78rem', 
                  color: saveStatus.success ? 'var(--color-added)' : 'var(--color-deleted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {saveStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
                {saveStatus.message}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="dialog-button secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="settings-btn-primary"
              onClick={handleSaveAll}
              disabled={isSaving || isLoading}
            >
              {isSaving ? <RefreshCw size={14} className="spin-icon" /> : <Save size={14} />}
              <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
