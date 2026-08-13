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
  html_url: string;
  user: { login: string; avatar_url: string };
  head: { ref: string };
  base: { ref: string };
}

export type DialogType = "branch" | "checkout" | "clone" | "publish" | "set-remote" | "pr-create" | "login" | "workspace-add" | "git-init-confirm" | "delete-branch-confirm" | "git-delete-force-confirm" | "checkout-conflict" | "stash-name" | "stash-inspector" | "merge-rebase" | null;
