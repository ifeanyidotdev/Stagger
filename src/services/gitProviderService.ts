import { invoke } from '@tauri-apps/api/core';
import type {
  GitHostingProvider,
  GlobalSettings,
  WorkspaceHostingConfig,
} from '../types/settings';
import type {
  GitHubPR,
  PullRequestFullDetail,
  PullRequestComment,
  PullRequestDetailPayload,
  PostCommentPayload,
  MergePullRequestPayload,
  UpdatePullRequestStatePayload,
  FetchPullRequestsPayload,
  MergeMethod,
} from '../types/git';

export interface ParsedRemoteInfo {
  host: string;
  owner: string;
  repo: string;
  fullPath: string;
  webBaseUrl: string;
}

export interface EffectiveHostingConfig {
  provider: GitHostingProvider;
  providerLabel: string;
  term: 'Pull Request' | 'Merge Request';
  shortTerm: 'PR' | 'MR';
  hostUrl: string;
  token: string;
  bitbucketUsername: string;
  defaultBaseBranch: string;
  isWorkspaceOverride: boolean;
  hasToken: boolean;
  remoteInfo: ParsedRemoteInfo | null;
}

export function parseRemoteRepositoryUrl(remoteUrl?: string | null): ParsedRemoteInfo | null {
  if (!remoteUrl || !remoteUrl.trim()) return null;
  const trimmed = remoteUrl.trim().replace(/\/+$/, '');

  let host = '';
  let pathPart = '';

  // Match SCP-style SSH URL: git@host:owner/repo.git
  const scpMatch = trimmed.match(/^(?:[^@]+@)?([^:/]+):(.+)$/);
  if (scpMatch && !trimmed.includes('://')) {
    host = scpMatch[1];
    pathPart = scpMatch[2];
  } else {
    try {
      const parsed = new URL(trimmed);
      host = parsed.host;
      pathPart = parsed.pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
  }

  pathPart = pathPart.replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
  if (!host || !pathPart) return null;

  const segments = pathPart.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const repo = segments[segments.length - 1];
  const owner = segments.slice(0, segments.length - 1).join('/');
  const fullPath = `${owner}/${repo}`;
  const webBaseUrl = `https://${host}/${fullPath}`;

  return {
    host,
    owner,
    repo,
    fullPath,
    webBaseUrl,
  };
}

export function getProviderMeta(provider: GitHostingProvider): {
  label: string;
  term: 'Pull Request' | 'Merge Request';
  shortTerm: 'PR' | 'MR';
  defaultHost: string;
} {
  switch (provider) {
    case 'gitlab':
      return {
        label: 'GitLab',
        term: 'Merge Request',
        shortTerm: 'MR',
        defaultHost: 'https://gitlab.com',
      };
    case 'bitbucket':
      return {
        label: 'Bitbucket',
        term: 'Pull Request',
        shortTerm: 'PR',
        defaultHost: 'https://bitbucket.org',
      };
    case 'gitea':
      return {
        label: 'Gitea / Forgejo',
        term: 'Pull Request',
        shortTerm: 'PR',
        defaultHost: 'https://codeberg.org',
      };
    case 'github':
    default:
      return {
        label: 'GitHub',
        term: 'Pull Request',
        shortTerm: 'PR',
        defaultHost: 'https://github.com',
      };
  }
}

export function resolveEffectiveHostingConfig(
  globalSettings: GlobalSettings | null,
  workspaceHosting: WorkspaceHostingConfig | null,
  remoteUrl?: string | null,
  legacyGithubToken?: string | null
): EffectiveHostingConfig {
  const remoteInfo = parseRemoteRepositoryUrl(remoteUrl);
  const isWorkspaceOverride = Boolean(workspaceHosting?.override_global);

  let provider: GitHostingProvider = 'github';
  if (isWorkspaceOverride && workspaceHosting?.provider) {
    provider = workspaceHosting.provider;
  } else if (globalSettings?.git_hosting_provider) {
    provider = globalSettings.git_hosting_provider;
  } else if (remoteInfo) {
    const h = remoteInfo.host.toLowerCase();
    if (h.includes('gitlab')) provider = 'gitlab';
    else if (h.includes('bitbucket')) provider = 'bitbucket';
    else if (h.includes('codeberg') || h.includes('gitea') || h.includes('forgejo')) provider = 'gitea';
  }

  const meta = getProviderMeta(provider);

  let hostUrl = meta.defaultHost;
  let token = '';
  let bitbucketUsername = '';
  let defaultBaseBranch = 'main';

  if (isWorkspaceOverride && workspaceHosting) {
    hostUrl =
      workspaceHosting.host_url?.trim() ||
      (remoteInfo ? `https://${remoteInfo.host}` : meta.defaultHost);
    token = workspaceHosting.access_token?.trim() || '';
    bitbucketUsername = workspaceHosting.bitbucket_username?.trim() || '';
    defaultBaseBranch =
      workspaceHosting.default_base_branch?.trim() ||
      globalSettings?.default_pr_base_branch?.trim() ||
      globalSettings?.git_default_branch?.trim() ||
      'main';
  } else {
    switch (provider) {
      case 'gitlab':
        hostUrl =
          globalSettings?.gitlab_host?.trim() ||
          (remoteInfo ? `https://${remoteInfo.host}` : 'https://gitlab.com');
        token = globalSettings?.gitlab_token?.trim() || '';
        break;
      case 'bitbucket':
        hostUrl = 'https://bitbucket.org';
        token = globalSettings?.bitbucket_app_password?.trim() || '';
        bitbucketUsername = globalSettings?.bitbucket_username?.trim() || '';
        break;
      case 'gitea':
        hostUrl =
          globalSettings?.gitea_host?.trim() ||
          (remoteInfo ? `https://${remoteInfo.host}` : 'https://codeberg.org');
        token = globalSettings?.gitea_token?.trim() || '';
        break;
      case 'github':
      default:
        hostUrl =
          globalSettings?.github_host?.trim() ||
          (remoteInfo ? `https://${remoteInfo.host}` : 'https://github.com');
        token =
          globalSettings?.github_token?.trim() ||
          legacyGithubToken?.trim() ||
          '';
        break;
    }
    defaultBaseBranch =
      globalSettings?.default_pr_base_branch?.trim() ||
      globalSettings?.git_default_branch?.trim() ||
      'main';
  }

  return {
    provider,
    providerLabel: meta.label,
    term: meta.term,
    shortTerm: meta.shortTerm,
    hostUrl: hostUrl.replace(/\/+$/, ''),
    token,
    bitbucketUsername,
    defaultBaseBranch,
    isWorkspaceOverride,
    hasToken: token.length > 0,
    remoteInfo,
  };
}

export function buildPrefilledBrowserPrUrl(
  config: EffectiveHostingConfig,
  params: {
    base: string;
    head: string;
    title: string;
    body: string;
    draft?: boolean;
  }
): string | null {
  const info = config.remoteInfo;
  if (!info) return null;

  const baseHost = config.hostUrl || `https://${info.host}`;
  const repoWebBase = `${baseHost.replace(/\/+$/, '')}/${info.fullPath}`;
  const encBase = encodeURIComponent(params.base);
  const encHead = encodeURIComponent(params.head);
  const rawTitle =
    params.draft &&
    config.provider !== 'github' &&
    !params.title.toLowerCase().startsWith('draft:')
      ? `Draft: ${params.title}`
      : params.title;
  const encTitle = encodeURIComponent(rawTitle);
  const encBody = encodeURIComponent(params.body);

  switch (config.provider) {
    case 'gitlab':
      return `${repoWebBase}/-/merge_requests/new?merge_request[source_branch]=${encHead}&merge_request[target_branch]=${encBase}&merge_request[title]=${encTitle}&merge_request[description]=${encBody}`;
    case 'bitbucket':
      return `${repoWebBase}/pull-requests/new?source=${encHead}&dest=${encBase}&title=${encTitle}&description=${encBody}`;
    case 'gitea':
      return `${repoWebBase}/compare/${encBase}...${encHead}`;
    case 'github':
    default:
      return `${repoWebBase}/compare/${encBase}...${encHead}?quick_pull=1&title=${encTitle}&body=${encBody}`;
  }
}

function buildBasePayload(config: EffectiveHostingConfig) {
  if (!config.remoteInfo) {
    throw new Error('Repository remote is not configured or could not be parsed.');
  }
  return {
    provider: config.provider,
    host_url: config.hostUrl,
    owner: config.remoteInfo.owner,
    repo: config.remoteInfo.repo,
    full_path: config.remoteInfo.fullPath,
    token: config.token,
    bitbucket_username: config.bitbucketUsername || null,
  };
}

export async function fetchRemotePullRequests(
  config: EffectiveHostingConfig
): Promise<GitHubPR[]> {
  const base = buildBasePayload(config);
  const payload: FetchPullRequestsPayload = {
    provider: base.provider,
    host_url: base.host_url,
    owner: base.owner,
    repo: base.repo,
    full_path: base.full_path,
    token: base.token,
    bitbucket_username: base.bitbucket_username,
  };
  return await invoke<GitHubPR[]>('fetch_pull_requests', { payload });
}

export async function fetchPullRequestDetails(
  config: EffectiveHostingConfig,
  prNumber: number
): Promise<PullRequestFullDetail> {
  const base = buildBasePayload(config);
  const payload: PullRequestDetailPayload = {
    ...base,
    pr_number: prNumber,
  };
  return await invoke<PullRequestFullDetail>('fetch_pull_request_details', { payload });
}

export async function postPullRequestComment(
  config: EffectiveHostingConfig,
  prNumber: number,
  body: string
): Promise<PullRequestComment> {
  const base = buildBasePayload(config);
  const payload: PostCommentPayload = {
    ...base,
    pr_number: prNumber,
    body,
  };
  return await invoke<PullRequestComment>('post_pull_request_comment', { payload });
}

export async function mergePullRequest(
  config: EffectiveHostingConfig,
  prNumber: number,
  mergeMethod: MergeMethod,
  commitTitle?: string,
  commitMessage?: string
): Promise<{ success: boolean; message: string; merged: boolean }> {
  const base = buildBasePayload(config);
  const payload: MergePullRequestPayload = {
    ...base,
    pr_number: prNumber,
    merge_method: mergeMethod,
    commit_title: commitTitle || null,
    commit_message: commitMessage || null,
  };
  const res = await invoke<any>('merge_pull_request', { payload });
  if (typeof res === 'string') {
    return {
      success: true,
      message: res,
      merged: true,
    };
  }
  return {
    success: Boolean(res?.success ?? res?.merged ?? true),
    message: res?.message || 'Merged successfully',
    merged: Boolean(res?.merged ?? true),
  };
}

export async function updatePullRequestState(
  config: EffectiveHostingConfig,
  prNumber: number,
  state: 'open' | 'closed'
): Promise<{ success: boolean; message: string; state: string }> {
  const base = buildBasePayload(config);
  const payload: UpdatePullRequestStatePayload = {
    ...base,
    pr_number: prNumber,
    state,
  };
  const res = await invoke<any>('update_pull_request_state', { payload });
  if (typeof res === 'string') {
    return {
      success: true,
      message: res,
      state,
    };
  }
  return {
    success: Boolean(res?.success ?? true),
    message: res?.message || `State updated to ${state}`,
    state: res?.state || state,
  };
}
