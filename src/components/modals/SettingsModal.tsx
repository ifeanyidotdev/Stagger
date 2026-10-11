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
  Terminal, 
  Globe, 
  User, 
  UserCheck, 
  Folder, 
  Copy, 
  CheckCheck,
  CheckCircle2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import type { GlobalSettings, SystemGitConfig, WorkspaceSettings } from '../../types/settings';
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
  onSettingsSaved?: (settings: GlobalSettings) => void;
  onRemoteUrlUpdated?: (newUrl: string) => void;
}

type ContextType = 'global' | 'workspace';
type GlobalTab = 'global-git' | 'global-gitignore' | 'global-ai';
type WorkspaceTab = 'workspace-remote' | 'workspace-identity' | 'workspace-overview';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  repoPath = '',
  currentBranch = 'main',
  onSettingsSaved,
  onRemoteUrlUpdated,
}) => {
  // Primary Context Switcher (Global vs Workspace)
  const [activeContext, setActiveContext] = useState<ContextType>('global');
  const [activeGlobalTab, setActiveGlobalTab] = useState<GlobalTab>('global-git');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('workspace-remote');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // System Git Config
  const [systemGit, setSystemGit] = useState<SystemGitConfig | null>(null);

  // Global Git Settings
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [syncSystemGit, setSyncSystemGit] = useState(true);

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

  // Workspace Specific Settings
  const [workspaceData, setWorkspaceData] = useState<WorkspaceSettings | null>(null);
  const [workspaceRemoteUrl, setWorkspaceRemoteUrl] = useState('');
  const [isApplyingRemote, setIsApplyingRemote] = useState(false);
  const [remoteApplyNotice, setRemoteApplyNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingRemote, setIsTestingRemote] = useState(false);
  const [remoteTestResult, setRemoteTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [overrideWorkspaceIdentity, setOverrideWorkspaceIdentity] = useState(false);
  const [workspaceUserName, setWorkspaceUserName] = useState('');
  const [workspaceUserEmail, setWorkspaceUserEmail] = useState('');

  // Copy Tooltip Feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const workspaceName = repoPath ? (repoPath.split('/').filter(Boolean).pop() || 'Current Project') : 'No Workspace';

  // Load all settings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoading(true);
    setSaveStatus(null);
    setAiTestResult(null);
    setRemoteTestResult(null);
    setRemoteApplyNotice(null);
    setGlobalGitignoreNotice(null);

    const loadData = async () => {
      try {
        const [settings, sysGit] = await Promise.all([
          invoke<GlobalSettings>('get_global_settings'),
          invoke<SystemGitConfig>('get_system_git_config').catch(() => null),
        ]);

        if (!mounted) return;

        if (sysGit) setSystemGit(sysGit);

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
        if (repoPath) {
          try {
            const ws = await invoke<WorkspaceSettings>('get_workspace_settings', { repoPath });
            if (mounted) {
              setWorkspaceData(ws);
              setWorkspaceRemoteUrl(ws.remote_url || '');
              setOverrideWorkspaceIdentity(ws.has_local_identity);
              setWorkspaceUserName(ws.local_user_name || '');
              setWorkspaceUserEmail(ws.local_user_email || '');
            }
          } catch (err) {
            console.warn('Could not load workspace settings:', err);
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
  }, [isOpen, repoPath]);

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

  // Test Remote URL access via git ls-remote
  const handleTestRemoteConnection = async () => {
    if (!repoPath || !workspaceRemoteUrl.trim()) return;
    setIsTestingRemote(true);
    setRemoteTestResult(null);

    try {
      const res = await invoke<GitCliResult>('run_git_cli_cmd', {
        repoPath,
        args: ['ls-remote', '--heads', workspaceRemoteUrl.trim()],
      });

      if (res.exit_code === 0) {
        setRemoteTestResult({
          success: true,
          message: 'Origin connection verified! Remote is reachable and authenticated.',
        });
      } else {
        setRemoteTestResult({
          success: false,
          message: res.stderr || res.stdout || 'Failed to authenticate with remote origin.',
        });
      }
    } catch (err: any) {
      setRemoteTestResult({
        success: false,
        message: err?.message || 'Failed to execute remote connection check.',
      });
    } finally {
      setIsTestingRemote(false);
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
      };

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
    <div className="settings-window-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-window">
        {/* Top Header with Context Switcher */}
        <div className="settings-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple-bright)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
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
            <button
              type="button"
              className={`settings-context-tab ${activeContext === 'workspace' ? 'active' : ''}`}
              onClick={() => {
                if (repoPath) {
                  setActiveContext('workspace');
                }
              }}
              disabled={!repoPath}
              title={repoPath ? `Workspace settings for ${workspaceName}` : 'No active workspace'}
            >
              <Folder size={14} />
              <span>Workspace: <strong>{workspaceName}</strong></span>
              {repoPath && <span className="settings-context-pill">Active</span>}
            </button>
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
            {activeContext === 'global' ? (
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
                  <span>AI Models & BYOK</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                          Global Git Identity
                        </h3>
                        <p className="settings-field-hint">
                          Default author signature attached to commits across all repositories on this machine.
                        </p>
                      </div>

                      {systemGit && (systemGit.user_name || systemGit.user_email) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (systemGit.user_name) setUserName(systemGit.user_name);
                            if (systemGit.user_email) setUserEmail(systemGit.user_email);
                            if (systemGit.default_branch) setDefaultBranch(systemGit.default_branch);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--color-text-main)',
                            fontSize: '0.72rem',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Terminal size={12} />
                          <span>Import System .gitconfig</span>
                        </button>
                      )}
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
                        alignItems: 'flex-start',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                      }}
                    >
                      <input
                        id="sync-sys-git"
                        type="checkbox"
                        checked={syncSystemGit}
                        onChange={e => setSyncSystemGit(e.target.checked)}
                        style={{ marginTop: '3px', cursor: 'pointer' }}
                      />
                      <label htmlFor="sync-sys-git" style={{ cursor: 'pointer', flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                          Auto-sync with System Git (<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>git config --global</code>)
                        </div>
                        <div className="settings-field-hint" style={{ marginTop: '2px' }}>
                          Synchronizes these values directly with your machine&apos;s global git configuration so external CLI tools and IDEs stay in harmony.
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {/* 2. UNIVERSAL GITIGNORE */}
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                          Insert common universal patterns:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['.DS_Store', 'Thumbs.db', 'desktop.ini'], setGlobalGitignoreContent)}
                            className="dialog-button secondary"
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            + OS Junk (.DS_Store)
                          </button>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['node_modules/', '.pnp*', 'dist/', '*.log'], setGlobalGitignoreContent)}
                            className="dialog-button secondary"
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            + Node / Build outputs
                          </button>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['.vscode/', '.idea/', '*.swp'], setGlobalGitignoreContent)}
                            className="dialog-button secondary"
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            + IDEs (.vscode, .idea)
                          </button>
                          <button
                            type="button"
                            onClick={() => addTemplateToContent(['.env', '.env.local', '*.pem'], setGlobalGitignoreContent)}
                            className="dialog-button secondary"
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            + Secrets (.env)
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

                {/* 3. AI MODELS & BYOK (VERCEL AI SDK) */}
                {activeContext === 'global' && activeGlobalTab === 'global-ai' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        AI Models & Bring-Your-Own-Key (BYOK)
                      </h3>
                      <p className="settings-field-hint">
                        Powered by <strong>Vercel AI SDK</strong>. Keys are stored locally on your device in <code style={{ fontFamily: 'var(--font-mono)' }}>~/.stagenode/settings.json</code>.
                      </p>
                    </div>

                    {/* Provider Toggle Cards */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => { setAiProvider('gemini'); setAiTestResult(null); }}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: aiProvider === 'gemini' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: aiProvider === 'gemini' ? '1px solid var(--accent-purple-bright)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>Google Gemini</span>
                          {aiProvider === 'gemini' && <Check size={14} style={{ color: 'var(--accent-purple-bright)' }} />}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Gemini 2.5 Flash, 2.5 Pro, 2.0. Multimodal & ultra fast.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setAiProvider('openai'); setAiTestResult(null); }}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: aiProvider === 'openai' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: aiProvider === 'openai' ? '1px solid var(--accent-purple-bright)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>OpenAI</span>
                          {aiProvider === 'openai' && <Check size={14} style={{ color: 'var(--accent-purple-bright)' }} />}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>GPT-4o, GPT-4o-mini, o1, o3-mini. Custom endpoint support.</span>
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
                          <label className="settings-field-label">
                            <Globe size={13} />
                            <span>Remote Origin URL</span>
                          </label>
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
                            style={{
                              background: 'var(--accent-purple)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#fff',
                              padding: '0 14px',
                              fontSize: '0.78rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap',
                              opacity: workspaceRemoteUrl.trim() ? 1 : 0.5,
                            }}
                          >
                            <Save size={13} />
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

                      {/* Connection Test */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <button
                          type="button"
                          onClick={handleTestRemoteConnection}
                          disabled={isTestingRemote || !workspaceRemoteUrl.trim()}
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
                            opacity: workspaceRemoteUrl.trim() ? 1 : 0.5,
                          }}
                        >
                          <RefreshCw size={13} className={isTestingRemote ? 'spin-icon' : ''} />
                          <span>{isTestingRemote ? 'Verifying access...' : 'Test Connection (ls-remote)'}</span>
                        </button>
                        <span className="settings-field-hint">
                          Tests SSH / HTTPS read access with the remote repository.
                        </span>
                      </div>

                      {remoteTestResult && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: remoteTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: remoteTestResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.76rem',
                            color: remoteTestResult.success ? 'var(--color-added)' : 'var(--color-deleted)',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{remoteTestResult.message}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 2. WORKSPACE: PROJECT GIT AUTHOR */}
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input
                          id="override-identity-toggle"
                          type="checkbox"
                          checked={overrideWorkspaceIdentity}
                          onChange={e => setOverrideWorkspaceIdentity(e.target.checked)}
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <label htmlFor="override-identity-toggle" style={{ cursor: 'pointer', flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                            Override Author Identity for this Repository
                          </div>
                          <div className="settings-field-hint">
                            Ideal for distinguishing between work and personal email addresses.
                          </div>
                        </label>
                      </div>

                      {!overrideWorkspaceIdentity ? (
                        <div 
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
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
              className="dialog-button"
              onClick={handleSaveAll}
              disabled={isSaving || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent-purple)',
              }}
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
