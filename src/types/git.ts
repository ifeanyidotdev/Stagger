export interface GitFileStatus {
  path: string;
  staged_status: string | null;
  unstaged_status: string | null;
}

export interface GitStatusResult {
  files: GitFileStatus[];
  current_branch: string;
}

export interface BranchInfo {
  name: string;
  is_remote: boolean;
  upstream?: string | null;
  ahead?: number;
  behind?: number;
  is_gone?: boolean;
}

export interface CommitInfo {
  id: string;
  short_id: string;
  author: string;
  email: string;
  timestamp: number;
  message: string;
  parents: string[];
  branches: string[];
}

export interface DiffLine {
  origin: string;
  content: string;
  old_line_no: number | null;
  new_line_no: number | null;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffInfo {
  hunks: DiffHunk[];
}

export interface GitCliResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface StashEntry {
  originalIndex: number;
  rawText: string;
  displayTitle: string;
  branchName: string;
}

export interface HunkNode {
  id: string;
  filePath: string;
  hunkIndex: number;
  hunk: DiffHunk;
  x: number;
  y: number;
  isStaged: boolean;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  html_url: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  clone_url: string;
  private: boolean;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  draft?: boolean;
  html_url: string;
  user?: { login: string; avatar_url?: string };
  head: { ref: string };
  base: { ref: string };
  provider?: 'github' | 'gitlab' | 'bitbucket' | 'gitea';
}

export type PullRequestItem = GitHubPR;

export interface CreatePullRequestPayload {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'gitea';
  host_url: string;
  owner: string;
  repo: string;
  full_path: string;
  token: string;
  bitbucket_username?: string | null;
  title: string;
  body: string;
  head: string;
  base: string;
  draft: boolean;
}

export interface FetchPullRequestsPayload {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'gitea';
  host_url: string;
  owner: string;
  repo: string;
  full_path: string;
  token: string;
  bitbucket_username?: string | null;
}

export interface PullRequestComment {
  id: number;
  user?: { login: string; avatar_url?: string } | null;
  body: string;
  created_at: string;
  updated_at?: string | null;
}

export interface PullRequestCommit {
  sha: string;
  message: string;
  author: string;
  date?: string | null;
}

export interface PullRequestFileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string | null;
}

export interface PullRequestFullDetail {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  draft?: boolean | null;
  merged: boolean;
  mergeable?: boolean | null;
  mergeable_state?: string | null;
  html_url: string;
  user?: { login: string; avatar_url?: string } | null;
  head_ref: string;
  head_sha: string;
  base_ref: string;
  base_sha: string;
  created_at: string;
  updated_at: string;
  comments: PullRequestComment[];
  commits: PullRequestCommit[];
  files: PullRequestFileChange[];
  total_additions: number;
  total_deletions: number;
  provider: string;
}

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export interface PullRequestDetailPayload {
  provider: string;
  host_url: string;
  owner: string;
  repo: string;
  full_path: string;
  token: string;
  pr_number: number;
  bitbucket_username?: string | null;
}

export interface PostCommentPayload {
  provider: string;
  host_url: string;
  owner: string;
  repo: string;
  full_path: string;
  token: string;
  pr_number: number;
  body: string;
  bitbucket_username?: string | null;
}

export interface MergePullRequestPayload {
  provider: string;
  host_url: string;
  owner: string;
  repo: string;
  full_path: string;
  token: string;
  pr_number: number;
  merge_method: string;
  commit_title?: string | null;
  commit_message?: string | null;
  bitbucket_username?: string | null;
}

export interface UpdatePullRequestStatePayload {
  provider: string;
  host_url: string;
  owner: string;
  repo: string;
  full_path: string;
  token: string;
  pr_number: number;
  state: string;
  bitbucket_username?: string | null;
}

export type DialogType = "branch" | "checkout" | "clone" | "publish" | "set-remote" | "pr-create" | "login" | "workspace-add" | "git-init-confirm" | "delete-branch-confirm" | "git-delete-force-confirm" | "checkout-conflict" | "stash-name" | "stash-inspector" | "merge-rebase" | "push-commit" | "pull-strategy" | "discard-changes-confirm" | "revert-commit-confirm" | "remove-commit-confirm" | "amend-commit" | "create-tag" | null;

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}
