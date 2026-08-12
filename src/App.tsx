import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  GitBranch, 
  RefreshCw, 
  Layers, 
  FileCode, 
  GitCommit, 
  History, 
  FileText, 
  Plus, 
  Minus,
  Sparkles,
  GitPullRequest,
  LogOut,
  FolderSync,
  Trash2,
  Users,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Archive,
  Eye,
  GitMerge,
  Globe,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  DownloadCloud,
  X,
  MoreVertical
} from "lucide-react";
import "./App.css";

// --- TYPES & INTERFACES ---
interface GitFileStatus {
  path: string;
  staged_status: string | null;
  unstaged_status: string | null;
}

interface GitStatusResult {
  files: GitFileStatus[];
  current_branch: string;
}

interface BranchInfo {
  name: string;
  is_remote: boolean;
  upstream?: string | null;
}

interface CommitInfo {
  id: string;
  short_id: string;
  author: string;
  email: string;
  timestamp: number;
  message: string;
  parents: string[];
  branches: string[];
}

interface DiffLine {
  origin: string;
  content: string;
  old_line_no: number | null;
  new_line_no: number | null;
}

interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

interface DiffInfo {
  hunks: DiffHunk[];
}

interface GitCliResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

interface HunkNode {
  id: string;
  filePath: string;
  hunkIndex: number;
  hunk: DiffHunk;
  x: number;
  y: number;
  isStaged: boolean;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  clone_url: string;
  private: boolean;
}

interface GitHubPR {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  head: { ref: string };
  base: { ref: string };
}

function App() {
  // --- REPOSITORY & WORKSPACE STATE ---
  const [repoPath, setRepoPath] = useState(() => {
    return localStorage.getItem("sn_current_repo") || "/Users/melodyfidel/Code/projects/StageNode";
  });
  const [workspaces, setWorkspaces] = useState<string[]>(() => {
    const saved = localStorage.getItem("sn_workspaces");
    return saved ? JSON.parse(saved) : ["/Users/melodyfidel/Code/projects/StageNode"];
  });
  const [hasRepo, setHasRepo] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "history">("workspace");
  const [currentBranch, setCurrentBranch] = useState("main");
  const [branchList, setBranchList] = useState<string[]>([]);
  const [isBranchListExpanded, setIsBranchListExpanded] = useState(true);
  const [files, setFiles] = useState<GitFileStatus[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  // --- PANEL RESIZING STATES ---
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filePaneWidth, setFilePaneWidth] = useState(280);
  const [commitDetailsWidth, setCommitDetailsWidth] = useState(340);
  const [activeResizer, setActiveResizer] = useState<'sidebar' | 'filepane' | 'details' | null>(null);

  // --- MERGE CONFLICTS ---
  const [conflictedFiles, setConflictedFiles] = useState<string[]>([]);

  // --- BULK SELECTION AND COLLAPSIBLE GROUPS ---
  const [checkedUnstaged, setCheckedUnstaged] = useState<string[]>([]);
  const [checkedStaged, setCheckedStaged] = useState<string[]>([]);
  const [unstagedCollapsed, setUnstagedCollapsed] = useState(false);
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  
  // --- VIEW SELECTION STATE ---
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [selectedCommitDiffFiles, setSelectedCommitDiffFiles] = useState<string[]>([]);
  const [selectedCommitFileDiff, setSelectedCommitFileDiff] = useState<DiffInfo | null>(null);
  const [selectedCommitDiffFile, setSelectedCommitDiffFile] = useState<string | null>(null);

  // --- STAGE HUNK DETAIL DIALOG OVERLAY ---
  const [activeDetailHunk, setActiveDetailHunk] = useState<DiffHunk | null>(null);

  // --- MESH CANVAS STATE ---
  const [canvasNodes, setCanvasNodes] = useState<HunkNode[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- STASHES STATE ---
  const [stashes, setStashes] = useState<string[]>([]);
  const [isStashListExpanded, setIsStashListExpanded] = useState(true);
  const [selectedStashIndex, setSelectedStashIndex] = useState<number | null>(null);
  const [stashFiles, setStashFiles] = useState<{ path: string; status: string }[]>([]);
  const [stashFileDiff, setStashFileDiff] = useState<string | null>(null);
  const [selectedStashFile, setSelectedStashFile] = useState<string | null>(null);
  const [checkedStashFiles, setCheckedStashFiles] = useState<Set<string>>(new Set());
  const [stashNameInput, setStashNameInput] = useState("");
  
  // --- GITHUB INTEGRATION STATE ---
  const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem("gh_token"));
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [githubPRs, setGithubPRs] = useState<GitHubPR[]>([]);

  // --- WORKSPACE SWAP / DROPDOWN SELECTOR ---
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [pendingWorkspacePath, setPendingWorkspacePath] = useState("");
  const [pendingDeleteBranch, setPendingDeleteBranch] = useState<string | null>(null);
  const [pendingCheckoutBranch, setPendingCheckoutBranch] = useState<string | null>(null);

  // --- COMMIT BUILDER STATE ---
  const [commitTitle, setCommitTitle] = useState("");
  const [commitDesc, setCommitDesc] = useState("");
  const [coAuthor, setCoAuthor] = useState("");
  const [amendCommit, setAmendCommit] = useState(false);

  // --- REMOTE & BRANCH MANAGEMENT STATE ---
  const [allBranches, setAllBranches] = useState<BranchInfo[]>([]);
  const [remoteBranches, setRemoteBranches] = useState<string[]>([]);
  const [hasUpstream, setHasUpstream] = useState<boolean>(false);
  const [upstreamBranchName, setUpstreamBranchName] = useState<string | null>(null);
  const [unpushedCount, setUnpushedCount] = useState<number>(0);
  const [isFetchingRemote, setIsFetchingRemote] = useState<boolean>(false);
  const [isPushingRemote, setIsPushingRemote] = useState<boolean>(false);
  const [isPullingRemote, setIsPullingRemote] = useState<boolean>(false);
  const [isRemoteBranchListExpanded, setIsRemoteBranchListExpanded] = useState<boolean>(true);
  const [isBranchOpsDropdownOpen, setIsBranchOpsDropdownOpen] = useState<boolean>(false);
  const [mergeRebaseMode, setMergeRebaseMode] = useState<"merge" | "rebase">("merge");
  const [targetMergeBranch, setTargetMergeBranch] = useState<string>("");

  // --- POPUPS & INTERACTIVE INPUT STATES ---
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cliOutput, setCliOutput] = useState<GitCliResult | null>(null);
  const [dialogType, setDialogType] = useState<"branch" | "checkout" | "clone" | "publish" | "set-remote" | "pr-create" | "login" | "workspace-add" | "git-init-confirm" | "delete-branch-confirm" | "git-delete-force-confirm" | "checkout-conflict" | "stash-name" | "stash-inspector" | "merge-rebase" | null>(null);
  const [dialogInput, setDialogInput] = useState("");
  const [dialogInput2, setDialogInput2] = useState(""); 

  // --- REMOTE COLLABORATION STATE ---
  const [isCollabActive, setIsCollabActive] = useState(false);
  const [collabPeers, setCollabPeers] = useState<{ name: string; file: string; x: number; y: number }[]>([]);

  // --- CHERRY-PICK STATE ---
  const [draggedCommitSha, setDraggedCommitSha] = useState<string | null>(null);

  // --- RESIZING DIVIDER EVENT LISTENERS ---
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!activeResizer) return;
      if (activeResizer === 'sidebar') {
        const newWidth = Math.max(180, Math.min(450, e.clientX));
        setSidebarWidth(newWidth);
      } else if (activeResizer === 'filepane') {
        const sidebarRealWidth = sidebarCollapsed ? 0 : sidebarWidth;
        const newWidth = Math.max(200, Math.min(600, e.clientX - sidebarRealWidth));
        setFilePaneWidth(newWidth);
      } else if (activeResizer === 'details') {
        const newWidth = Math.max(240, Math.min(600, window.innerWidth - e.clientX));
        setCommitDetailsWidth(newWidth);
      }
    };

    const handleGlobalMouseUp = () => {
      setActiveResizer(null);
    };

    if (activeResizer) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeResizer, sidebarWidth, sidebarCollapsed]);

  // --- COLLAB PEERS POSITIONING TIMER ---
  useEffect(() => {
    let interval: any;
    if (isCollabActive) {
      interval = setInterval(() => {
        setCollabPeers([
          { 
            name: "Alex (Lead Reviewer)", 
            file: files.length > 0 ? files[0].path : "App.tsx",
            x: 250 + Math.sin(Date.now() / 1000) * 120, 
            y: 180 + Math.cos(Date.now() / 1000) * 80 
          }
        ]);
      }, 100);
    } else {
      setCollabPeers([]);
    }
    return () => clearInterval(interval);
  }, [isCollabActive, files]);

  // --- PERSIST ACTIVE REPOSITORY PATH ---
  useEffect(() => {
    localStorage.setItem("sn_current_repo", repoPath);
  }, [repoPath]);

  // --- PRUNE CHECKED SELECTIONS ON FILES CHANGE ---
  useEffect(() => {
    const currentUnstagedPaths = files.filter(f => f.unstaged_status !== null).map(f => f.path);
    setCheckedUnstaged(prev => prev.filter(p => currentUnstagedPaths.includes(p)));

    const currentStagedPaths = files.filter(f => f.staged_status !== null).map(f => f.path);
    setCheckedStaged(prev => prev.filter(p => currentStagedPaths.includes(p)));
  }, [files]);

  // --- WORKSPACE PROJECTS SWAP & ADD FLOW ---
  const selectWorkspace = (path: string) => {
    setRepoPath(path);
    setIsWorkspaceDropdownOpen(false);
    refreshRepository(path);
  };

  const handleWorkspaceAddSubmit = async () => {
    if (!dialogInput) return;
    const targetPath = dialogInput.trim();
    
    try {
      await invoke("get_git_status", { repoPath: targetPath });
      const newList = [...workspaces];
      if (!newList.includes(targetPath)) {
        newList.push(targetPath);
      }
      setWorkspaces(newList);
      localStorage.setItem("sn_workspaces", JSON.stringify(newList));
      setRepoPath(targetPath);
      setDialogType(null);
      setDialogInput("");
      await refreshRepository(targetPath);
    } catch (err: any) {
      setPendingWorkspacePath(targetPath);
      setDialogType("git-init-confirm");
      setDialogInput("");
    }
  };

  const handleInitializeGitWorkspace = async () => {
    if (!pendingWorkspacePath) return;
    try {
      const initRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: pendingWorkspacePath,
        args: ["init"]
      });
      setCliOutput(initRes);
      
      const newList = [...workspaces];
      if (!newList.includes(pendingWorkspacePath)) {
        newList.push(pendingWorkspacePath);
      }
      setWorkspaces(newList);
      localStorage.setItem("sn_workspaces", JSON.stringify(newList));
      setRepoPath(pendingWorkspacePath);
      setDialogType(null);
      setPendingWorkspacePath("");
      await refreshRepository(pendingWorkspacePath);
    } catch (err: any) {
      setErrorMessage("Failed to initialize git: " + err.toString());
      setDialogType(null);
      setPendingWorkspacePath("");
    }
  };

  const handleCloneOptionWorkspace = () => {
    setDialogInput2(pendingWorkspacePath);
    setDialogInput(""); 
    setDialogType("clone");
  };

  const removeWorkspace = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newList = workspaces.filter(w => w !== path);
    setWorkspaces(newList);
    localStorage.setItem("sn_workspaces", JSON.stringify(newList));
    if (repoPath === path && newList.length > 0) {
      setRepoPath(newList[0]);
      refreshRepository(newList[0]);
    } else if (newList.length === 0) {
      setHasRepo(false);
    }
  };

  // --- REPO REFRESH CORE LOGIC ---
  const refreshRepository = async (path: string = repoPath) => {
    if (!path) return;
    try {
      const statusRes = await invoke<GitStatusResult>("get_git_status", { repoPath: path });
      setFiles(statusRes.files);
      setCurrentBranch(statusRes.current_branch);
      setHasRepo(true);
      setErrorMessage(null);

      let branchesList = await invoke<string[]>("get_branches", { repoPath: path });
      if (statusRes.current_branch && !branchesList.includes(statusRes.current_branch)) {
        branchesList = [statusRes.current_branch, ...branchesList];
      }

      // Virtual branch tracker persistence for empty repositories
      const storageKey = `sn_vbranches_${path}`;
      let knownBranches: string[] = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) knownBranches = JSON.parse(saved);
      } catch (_) {}

      knownBranches.forEach(b => {
        if (!branchesList.includes(b)) {
          branchesList.push(b);
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(branchesList));

      setBranchList(branchesList);

      // Fetch all branches (local + remote) and upstream info
      try {
        const allBranchesInfo = await invoke<BranchInfo[]>("get_all_branches", { repoPath: path });
        setAllBranches(allBranchesInfo);
        const remotes = allBranchesInfo.filter(b => b.is_remote).map(b => b.name);
        setRemoteBranches(remotes);

        const currentInfo = allBranchesInfo.find(b => !b.is_remote && b.name === statusRes.current_branch);
        if (currentInfo && currentInfo.upstream) {
          setHasUpstream(true);
          setUpstreamBranchName(currentInfo.upstream);
        } else {
          const upstreamRes = await invoke<GitCliResult>("run_git_cli_cmd", {
            repoPath: path,
            args: ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]
          });
          if (upstreamRes.exit_code === 0 && upstreamRes.stdout.trim()) {
            setHasUpstream(true);
            setUpstreamBranchName(upstreamRes.stdout.trim());
          } else {
            setHasUpstream(false);
            setUpstreamBranchName(null);
          }
        }
      } catch (_) {
        setHasUpstream(false);
        setUpstreamBranchName(null);
      }

      // Check unpushed commits count
      try {
        const unpushedRes = await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath: path,
          args: ["rev-list", "@{u}..HEAD", "--count"]
        });
        if (unpushedRes.exit_code === 0) {
          const count = parseInt(unpushedRes.stdout.trim(), 10);
          setUnpushedCount(isNaN(count) ? 0 : count);
        } else {
          setUnpushedCount(0);
        }
      } catch (_) {
        setUnpushedCount(0);
      }

      const remoteRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: path,
        args: ["remote", "get-url", "origin"]
      });
      if (remoteRes.exit_code === 0) {
        setRemoteUrl(remoteRes.stdout.trim());
      } else {
        setRemoteUrl(null);
      }

      const conflictRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: path,
        args: ["diff", "--name-only", "--diff-filter=U"]
      });
      if (conflictRes.exit_code === 0) {
        setConflictedFiles(conflictRes.stdout.split("\n").filter(Boolean));
      } else {
        setConflictedFiles([]);
      }

      const logRes = await invoke<CommitInfo[]>("get_git_log", { repoPath: path, limit: 100 });
      setCommits(logRes);

      const stashRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: path,
        args: ["stash", "list"]
      });
      if (stashRes.exit_code === 0) {
        setStashes(stashRes.stdout.split("\n").filter(Boolean));
      }

      if (remoteRes.exit_code === 0 && githubToken) {
        fetchGitHubPRs(remoteRes.stdout.trim());
      }

    } catch (err: any) {
      setErrorMessage(err.toString());
      setHasRepo(false);
    }
  };

  // --- GIT REMOTE & MERGE/REBASE ACTIONS ---
  const handleGitFetch = async (allRemotes: boolean = false) => {
    setIsFetchingRemote(true);
    try {
      const args = allRemotes ? ["fetch", "--all", "--prune"] : ["fetch", "origin"];
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args
      });
      setCliOutput(res);
      if (res.exit_code === 0) {
        setErrorMessage(null);
        await refreshRepository();
      } else {
        setErrorMessage(`Fetch failed:\n${res.stderr || res.stdout}`);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    } finally {
      setIsFetchingRemote(false);
    }
  };

  const handleGitPush = async (publish: boolean = false) => {
    if (!remoteUrl) {
      setDialogInput("");
      setDialogType("set-remote");
      return;
    }
    setIsPushingRemote(true);
    try {
      let args = ["push", "origin", currentBranch];
      if (publish || !hasUpstream) {
        args = ["push", "-u", "origin", currentBranch];
      }
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args
      });
      setCliOutput(res);
      if (res.exit_code === 0) {
        setErrorMessage(null);
        await refreshRepository();
      } else {
        if (res.stderr.includes("does not appear to be a git repository") || res.stderr.includes("No such remote") || res.stderr.includes("destination specifier")) {
          setDialogInput("");
          setDialogType("set-remote");
        } else {
          setErrorMessage(`Push failed:\n${res.stderr || res.stdout}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    } finally {
      setIsPushingRemote(false);
    }
  };

  const handleSetRemoteUrl = async () => {
    if (!dialogInput.trim()) return;
    const url = dialogInput.trim();
    try {
      let res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["remote", "add", "origin", url]
      });

      if (res.exit_code !== 0 && res.stderr.includes("already exists")) {
        res = await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath,
          args: ["remote", "set-url", "origin", url]
        });
      }

      if (res.exit_code === 0) {
        setRemoteUrl(url);
        setDialogType(null);
        setDialogInput("");
        await refreshRepository();
        await handleGitPush(true);
      } else {
        setErrorMessage(`Failed to set remote origin:\n${res.stderr || res.stdout}`);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const handleGitPull = async () => {
    setIsPullingRemote(true);
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["pull", "origin", currentBranch]
      });
      setCliOutput(res);
      if (res.exit_code === 0) {
        setErrorMessage(null);
        await refreshRepository();
      } else {
        setErrorMessage(`Pull failed:\n${res.stderr || res.stdout}`);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    } finally {
      setIsPullingRemote(false);
    }
  };

  const openMergeRebaseModal = (initialTarget: string = "", mode: "merge" | "rebase" = "merge") => {
    setMergeRebaseMode(mode);
    const available = branchList.filter(b => b !== currentBranch);
    setTargetMergeBranch(initialTarget || available[0] || remoteBranches[0] || "");
    setDialogType("merge-rebase");
  };

  const handleExecuteMergeOrRebase = async () => {
    if (!targetMergeBranch) return;
    try {
      const args = mergeRebaseMode === "merge"
        ? ["merge", targetMergeBranch]
        : ["rebase", targetMergeBranch];
      
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args
      });
      setCliOutput(res);
      setDialogType(null);
      if (res.exit_code === 0) {
        setErrorMessage(null);
        await refreshRepository();
      } else {
        setErrorMessage(`${mergeRebaseMode === "merge" ? "Merge" : "Rebase"} conflict or error:\n${res.stderr || res.stdout}`);
        await refreshRepository();
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
      setDialogType(null);
    }
  };

  const handleCheckoutRemoteBranch = async (remoteName: string) => {
    const localName = remoteName.replace(/^[^/]+\//, "");
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["checkout", "-b", localName, remoteName]
      });
      if (res.exit_code === 0) {
        await refreshRepository();
      } else {
        const fallbackRes = await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath,
          args: ["checkout", localName]
        });
        if (fallbackRes.exit_code === 0) {
          await refreshRepository();
        } else {
          setErrorMessage(`Failed to checkout remote branch:\n${res.stderr}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- INITIALIZE NEW REPO ---
  const initializeGitRepo = async () => {
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["init"]
      });
      if (res.exit_code === 0) {
        setErrorMessage(null);
        await refreshRepository();
      } else {
        setErrorMessage(res.stderr);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- GIT BRANCH ACTIONS ---
  const startCheckoutBranch = (branchName: string) => {
    if (branchName === currentBranch) return;
    if (commits.length === 0) {
      handleCheckoutBranch(branchName);
      return;
    }
    if (files.length > 0) {
      setPendingCheckoutBranch(branchName);
      setDialogType("checkout-conflict");
    } else {
      handleCheckoutBranch(branchName);
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;
    try {
      let args = ["checkout", branchName];
      if (commits.length === 0) {
        args = ["symbolic-ref", "HEAD", `refs/heads/${branchName}`];
      }
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args
      });
      if (res.exit_code === 0) {
        await refreshRepository();
      } else {
        setErrorMessage(res.stderr);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const handleCheckoutBringChanges = async () => {
    if (!pendingCheckoutBranch) return;
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["checkout", pendingCheckoutBranch]
      });
      if (res.exit_code === 0) {
        setDialogType(null);
        setPendingCheckoutBranch(null);
        await refreshRepository();
      } else {
        setErrorMessage(`Failed to switch branch:\n${res.stderr}`);
        setDialogType(null);
        setPendingCheckoutBranch(null);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
      setDialogType(null);
      setPendingCheckoutBranch(null);
    }
  };

  const handleCheckoutStashChanges = async () => {
    if (!pendingCheckoutBranch) return;
    try {
      const stashRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "push", "-m", `Auto-stashed from StageNode before switching to ${pendingCheckoutBranch}`]
      });
      if (stashRes.exit_code !== 0) {
        setErrorMessage(`Failed to stash changes:\n${stashRes.stderr}`);
        setDialogType(null);
        setPendingCheckoutBranch(null);
        return;
      }
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["checkout", pendingCheckoutBranch]
      });
      if (res.exit_code === 0) {
        setDialogType(null);
        setPendingCheckoutBranch(null);
        await refreshRepository();
      } else {
        setErrorMessage(`Failed to switch branch:\n${res.stderr}`);
        setDialogType(null);
        setPendingCheckoutBranch(null);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
      setDialogType(null);
      setPendingCheckoutBranch(null);
    }
  };

  const startDeleteBranch = (branchName: string) => {
    if (branchName === currentBranch) return;
    setPendingDeleteBranch(branchName);
    setDialogType("delete-branch-confirm");
  };

  const executeDeleteBranch = async (force: boolean = false) => {
    if (!pendingDeleteBranch) return;
    if (commits.length === 0) {
      const storageKey = `sn_vbranches_${repoPath}`;
      let knownBranches: string[] = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) knownBranches = JSON.parse(saved);
      } catch (_) {}
      const newList = knownBranches.filter(b => b !== pendingDeleteBranch);
      localStorage.setItem(storageKey, JSON.stringify(newList));
      setDialogType(null);
      setPendingDeleteBranch(null);
      await refreshRepository();
      return;
    }

    try {
      const args = force ? ["branch", "-D", pendingDeleteBranch] : ["branch", "-d", pendingDeleteBranch];
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args
      });
      if (res.exit_code === 0) {
        setDialogType(null);
        setPendingDeleteBranch(null);
        await refreshRepository();
      } else {
        if (!force) {
          setDialogType("git-delete-force-confirm");
        } else {
          setErrorMessage(`Failed to force delete branch:\n${res.stderr}`);
          setDialogType(null);
          setPendingDeleteBranch(null);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
      setDialogType(null);
      setPendingDeleteBranch(null);
    }
  };

  // --- STASH MANAGEMENT ---
  const startPushStash = () => {
    setStashNameInput("");
    setDialogType("stash-name");
  };

  const pushStash = async (msg?: string) => {
    const stashMsg = msg || "Stashed from StageNode";
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "push", "-m", stashMsg]
      });
      setCliOutput(res);
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const openStashInspector = async (index: number) => {
    setSelectedStashIndex(index);
    setStashFiles([]);
    setStashFileDiff(null);
    setSelectedStashFile(null);
    setCheckedStashFiles(new Set());
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "show", "--name-status", `stash@{${index}}`]
      });
      if (res.exit_code === 0) {
        const parsed = res.stdout
          .split("\n")
          .filter(Boolean)
          .map(line => {
            const parts = line.split(/\t/);
            return { status: parts[0]?.trim() || "M", path: parts[1]?.trim() || line.trim() };
          });
        setStashFiles(parsed);
        setCheckedStashFiles(new Set(parsed.map(f => f.path)));
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
    setDialogType("stash-inspector");
  };

  const fetchStashFileDiff = async (index: number, filePath: string) => {
    setSelectedStashFile(filePath);
    setStashFileDiff(null);
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "show", "-p", `stash@{${index}}`, "--", filePath]
      });
      if (res.exit_code === 0) {
        setStashFileDiff(res.stdout);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const restoreSelectedStashFiles = async () => {
    if (selectedStashIndex === null) return;
    const filesToRestore = Array.from(checkedStashFiles);
    if (filesToRestore.length === 0) return;
    try {
      for (const file of filesToRestore) {
        await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath,
          args: ["checkout", `stash@{${selectedStashIndex}}`, "--", file]
        });
      }
      setDialogType(null);
      setSelectedStashIndex(null);
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const applyStash = async (index: number) => {
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "apply", `stash@{${index}}`]
      });
      setCliOutput(res);
      setDialogType(null);
      setSelectedStashIndex(null);
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const popStash = async (index: number) => {
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "pop", `stash@{${index}}`]
      });
      setCliOutput(res);
      setDialogType(null);
      setSelectedStashIndex(null);
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const dropStash = async (index: number) => {
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "drop", `stash@{${index}}`]
      });
      setCliOutput(res);
      setDialogType(null);
      setSelectedStashIndex(null);
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- CONFLICT RESOLUTION ---
  const resolveConflict = async (file: string, choice: "ours" | "theirs" | "resolved") => {
    try {
      let args: string[] = [];
      if (choice === "ours") {
        args = ["checkout", "--ours", "--", file];
      } else if (choice === "theirs") {
        args = ["checkout", "--theirs", "--", file];
      }
      
      if (args.length > 0) {
        await invoke<GitCliResult>("run_git_cli_cmd", { repoPath, args });
      }

      await invoke("stage_file", { repoPath, filePath: file });
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- GITHUB AUTH & API FLOWS ---
  const fetchGitHubUser = async (token: string) => {
    try {
      const responseStr = await invoke<string>("run_github_api_request", {
        token,
        path: "/user",
        method: "GET",
        body: null
      });
      const user = JSON.parse(responseStr) as GitHubUser;
      setGithubUser(user);
      
      const reposStr = await invoke<string>("run_github_api_request", {
        token,
        path: "/user/repos?per_page=100&sort=updated",
        method: "GET",
        body: null
      });
      setGithubRepos(JSON.parse(reposStr) as GitHubRepo[]);
    } catch (err: any) {
      setErrorMessage("Failed to fetch GitHub Profile: " + err.toString());
    }
  };

  const loginGitHubOAuth = async () => {
    try {
      const clientId = "Ov23ct4Bw9U9543tNode"; 
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:54321/oauth/callback&scope=repo,user`;
      
      await invoke("run_git_cli_cmd", {
        repoPath,
        args: ["-c", "web.browser=open", "help", "--web", authUrl]
      });

      setErrorMessage("OAuth local redirect listener started... browser opened.");
      const code = await invoke<string>("login_with_github");
      
      const responseStr = await invoke<string>("request_github_token", {
        clientId,
        clientSecret: "e9f8a65b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f", 
        code
      });
      const data = JSON.parse(responseStr);
      if (data.access_token) {
        localStorage.setItem("gh_token", data.access_token);
        setGithubToken(data.access_token);
        fetchGitHubUser(data.access_token);
        setErrorMessage(null);
      } else {
        setErrorMessage("Token exchange failed: " + responseStr);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const handlePATLogin = () => {
    if (!dialogInput) return;
    localStorage.setItem("gh_token", dialogInput);
    setGithubToken(dialogInput);
    fetchGitHubUser(dialogInput);
    setDialogType(null);
    setDialogInput("");
  };

  const handleGitHubSignout = () => {
    localStorage.removeItem("gh_token");
    setGithubToken(null);
    setGithubUser(null);
    setGithubRepos([]);
    setGithubPRs([]);
  };

  const parseOwnerRepo = (url: string): { owner: string; repo: string } | null => {
    const match = url.match(/github\.com[/:]([^/]+)\/([^.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  };

  const fetchGitHubPRs = async (url: string) => {
    const ownerRepo = parseOwnerRepo(url);
    if (!ownerRepo || !githubToken) return;
    try {
      const responseStr = await invoke<string>("run_github_api_request", {
        token: githubToken,
        path: `/repos/${ownerRepo.owner}/${ownerRepo.repo}/pulls`,
        method: "GET",
        body: null
      });
      setGithubPRs(JSON.parse(responseStr) as GitHubPR[]);
    } catch (err: any) {
      console.error(err);
    }
  };

  // --- REPO CLONING ---
  const handleCloneRepo = async () => {
    if (!dialogInput || !dialogInput2) return;
    try {
      const folderName = dialogInput.split("/").pop()?.replace(".git", "") || "cloned-repo";
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: dialogInput2, 
        args: ["clone", dialogInput, folderName]
      });
      setCliOutput(res);
      if (res.exit_code === 0) {
        const fullClonedPath = `${dialogInput2}/${folderName}`;
        const newList = [...workspaces];
        if (!newList.includes(fullClonedPath)) {
          newList.push(fullClonedPath);
        }
        setWorkspaces(newList);
        localStorage.setItem("sn_workspaces", JSON.stringify(newList));
        setRepoPath(fullClonedPath);
        setDialogType(null);
        setDialogInput("");
        setDialogInput2("");
        await refreshRepository(fullClonedPath);
      } else {
        setErrorMessage(res.stderr);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- PR CREATION ---
  const handleCreatePR = async () => {
    if (!githubToken || !remoteUrl || !dialogInput) return;
    const ownerRepo = parseOwnerRepo(remoteUrl);
    if (!ownerRepo) return;
    try {
      const body = JSON.stringify({
        title: dialogInput,
        body: dialogInput2 || "Created automatically from StageNode client",
        head: currentBranch,
        base: "main"
      });
      const responseStr = await invoke<string>("run_github_api_request", {
        token: githubToken,
        path: `/repos/${ownerRepo.owner}/${ownerRepo.repo}/pulls`,
        method: "POST",
        body
      });
      const resData = JSON.parse(responseStr);
      if (resData.html_url) {
        setDialogType(null);
        setDialogInput("");
        setDialogInput2("");
        await refreshRepository();
      } else {
        setErrorMessage("PR Creation failed: " + responseStr);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- NODE INTERACTION (DRAGGING) ---
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = canvasNodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    setDraggingNodeId(nodeId);
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;
    dragOffset.current = {
      x: (e.clientX - rect.left + scrollLeft) - node.x,
      y: (e.clientY - rect.top + scrollTop) - node.y
    };
    e.stopPropagation();
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;

    let newX = (e.clientX - rect.left + scrollLeft) - dragOffset.current.x;
    let newY = (e.clientY - rect.top + scrollTop) - dragOffset.current.y;
    newX = Math.max(10, newX);
    newY = Math.max(10, newY);
    setCanvasNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n));
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // --- FILE DIFF & FLOATING HUNK NODES ---
  const selectFileForStaging = async (file: GitFileStatus) => {
    setSelectedFile(file.path);
    try {
      const isStaged = file.staged_status !== null && file.unstaged_status === null;
      const diffRes = await invoke<DiffInfo>("get_file_diff", { 
        repoPath, 
        filePath: file.path, 
        staged: isStaged 
      });

      const newNodes: HunkNode[] = diffRes.hunks.map((hunk, idx) => ({
        id: `${file.path}-hunk-${idx}`,
        filePath: file.path,
        hunkIndex: idx,
        hunk,
        x: 50 + idx * 30,
        y: 80 + idx * 110,
        isStaged: isStaged
      }));
      setCanvasNodes(newNodes);
    } catch (err: any) {
      setErrorMessage(err.toString());
      setCanvasNodes([]);
    }
  };

  // --- STAGING OPERATIONS ---
  const stageWholeFile = async (filePath: string) => {
    try {
      await invoke("stage_file", { repoPath, filePath });
      await refreshRepository();
      if (selectedFile === filePath) {
        setSelectedFile(null);
        setCanvasNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const unstageWholeFile = async (filePath: string) => {
    try {
      await invoke("unstage_file", { repoPath, filePath });
      await refreshRepository();
      if (selectedFile === filePath) {
        setSelectedFile(null);
        setCanvasNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const stageAllUnstaged = async () => {
    try {
      const paths = unstagedFiles.map(f => f.path);
      if (paths.length === 0) return;
      await invoke("stage_files", { repoPath, filePaths: paths });
      setCheckedUnstaged([]);
      await refreshRepository();
      if (selectedFile && paths.includes(selectedFile)) {
        setSelectedFile(null);
        setCanvasNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const stageSelectedUnstaged = async () => {
    try {
      if (checkedUnstaged.length === 0) return;
      await invoke("stage_files", { repoPath, filePaths: checkedUnstaged });
      setCheckedUnstaged([]);
      await refreshRepository();
      if (selectedFile && checkedUnstaged.includes(selectedFile)) {
        setSelectedFile(null);
        setCanvasNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const unstageAllStaged = async () => {
    try {
      const paths = stagedFiles.map(f => f.path);
      if (paths.length === 0) return;
      await invoke("unstage_files", { repoPath, filePaths: paths });
      setCheckedStaged([]);
      await refreshRepository();
      if (selectedFile && paths.includes(selectedFile)) {
        setSelectedFile(null);
        setCanvasNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const unstageSelectedStaged = async () => {
    try {
      if (checkedStaged.length === 0) return;
      await invoke("unstage_files", { repoPath, filePaths: checkedStaged });
      setCheckedStaged([]);
      await refreshRepository();
      if (selectedFile && checkedStaged.includes(selectedFile)) {
        setSelectedFile(null);
        setCanvasNodes([]);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const stageSingleHunk = async (node: HunkNode) => {
    try {
      let patch = `diff --git a/${node.filePath} b/${node.filePath}\n`;
      patch += `--- a/${node.filePath}\n`;
      patch += `+++ b/${node.filePath}\n`;
      patch += `${node.hunk.header}\n`;
      node.hunk.lines.forEach(line => {
        patch += `${line.origin}${line.content}`;
      });

      const res = await invoke<GitCliResult>("apply_patch_to_index", { 
        repoPath, 
        patchContent: patch 
      });

      if (res.exit_code === 0) {
        setCanvasNodes(prev => prev.filter(n => n.id !== node.id));
        await refreshRepository();
      } else {
        setErrorMessage(`Failed to stage hunk:\n${res.stderr}`);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- WRITE / COMMIT ACTION ---
  const handleCommit = async () => {
    if (!commitTitle) return;
    let message = commitTitle;
    if (commitDesc) message += `\n\n${commitDesc}`;
    if (coAuthor) message += `\n\nCo-authored-by: ${coAuthor}`;

    try {
      let args = ["commit"];
      if (amendCommit) {
        args.push("--amend");
        args.push("--no-edit"); 
      } else {
        args.push("-m");
        args.push(message);
      }

      const res = await invoke<GitCliResult>("run_git_cli_cmd", { repoPath, args });
      if (res.exit_code === 0) {
        setCommitTitle("");
        setCommitDesc("");
        setCoAuthor("");
        setAmendCommit(false);
        setCanvasNodes([]);
        setSelectedFile(null);
        await refreshRepository();
      } else {
        setErrorMessage(res.stderr);
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- CHERRY-PICK MERGING ON DRAG & DROP ---
  const handleDragStartCommit = (e: React.DragEvent, sha: string) => {
    e.dataTransfer.setData("text/plain", sha);
    setDraggedCommitSha(sha);
  };

  const handleDragOverBranch = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnBranch = async (e: React.DragEvent) => {
    e.preventDefault();
    const sha = e.dataTransfer.getData("text/plain") || draggedCommitSha;
    if (!sha) return;

    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["cherry-pick", sha]
      });
      setCliOutput(res);
      if (res.exit_code !== 0) {
        setErrorMessage(`Cherry-pick conflicted or failed:\n${res.stderr}`);
      }
      await refreshRepository();
      setDraggedCommitSha(null);
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- DIALOG DIALOGS --
  const handleDialogSubmit = async () => {
    if (!dialogInput) return;
    try {
      if (dialogType === "branch") {
        const res = await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath,
          args: ["checkout", "-b", dialogInput]
        });
        if (res.exit_code !== 0) setErrorMessage(res.stderr);
      } else if (dialogType === "checkout") {
        let args = ["checkout", dialogInput];
        if (commits.length === 0) {
          args = ["symbolic-ref", "HEAD", `refs/heads/${dialogInput}`];
        }
        const res = await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath,
          args
        });
        if (res.exit_code !== 0) setErrorMessage(res.stderr);
      } else if (dialogType === "workspace-add") {
        await handleWorkspaceAddSubmit();
      }
      setDialogType(null);
      setDialogInput("");
      await refreshRepository();
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  // --- HISTORY GRAPH RENDER HELPER ---
  const calculateGraphPaths = (commitsList: CommitInfo[]) => {
    const paths: { id: string; d: string; color: string }[] = [];
    const nodes: { id: string; x: number; y: number; col: number }[] = [];
    const activeColumns: (string | null)[] = [];

    commitsList.forEach((commit, index) => {
      let col = activeColumns.indexOf(commit.id);
      if (col === -1) {
        col = activeColumns.indexOf(null);
        if (col === -1) {
          col = activeColumns.length;
          activeColumns.push(commit.id);
        } else {
          activeColumns[col] = commit.id;
        }
      }

      const nodeX = 30 + col * 18;
      const nodeY = index * 48 + 24;
      nodes.push({ id: commit.id, x: nodeX, y: nodeY, col });

      commit.parents.forEach((parentId) => {
        const parentIdx = commitsList.findIndex(c => c.id === parentId);
        if (parentIdx !== -1) {
          let parentCol = activeColumns.indexOf(parentId);
          if (parentCol === -1) {
            parentCol = activeColumns.indexOf(null);
            if (parentCol === -1) {
              parentCol = activeColumns.length;
              activeColumns.push(parentId);
            } else {
              activeColumns[parentCol] = parentId;
            }
          }

          const parentX = 30 + parentCol * 18;
          const parentY = parentIdx * 48 + 24;

          paths.push({
            id: `${commit.id}-${parentId}`,
            d: `M ${nodeX} ${nodeY} C ${nodeX} ${(nodeY + parentY) / 2}, ${parentX} ${(nodeY + parentY) / 2}, ${parentX} ${parentY}`,
            color: `var(--accent-blue)`
          });
        }
      });

      activeColumns[col] = null;
    });

    return { paths, nodes };
  };

  const selectCommitDetails = async (commit: CommitInfo) => {
    setSelectedCommit(commit);
    setSelectedCommitDiffFiles([]);
    setSelectedCommitFileDiff(null);
    setSelectedCommitDiffFile(null);
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["diff-tree", "--no-commit-id", "--name-only", "-r", commit.id]
      });
      if (res.exit_code === 0) {
        const filesList = res.stdout.split("\n").filter(Boolean);
        setSelectedCommitDiffFiles(filesList);
        if (filesList.length > 0) {
          showCommitFileDiff(commit.id, filesList[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const showCommitFileDiff = async (commitId: string, filePath: string) => {
    setSelectedCommitDiffFile(filePath);
    try {
      const diffRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["diff", `${commitId}~1..${commitId}`, "--", filePath]
      });
      
      if (diffRes.exit_code === 0) {
        const lines = diffRes.stdout.split("\n");
        const hunk: DiffHunk = {
          old_start: 1, old_lines: 0, new_start: 1, new_lines: 0,
          header: "Commit Diff View",
          lines: lines.map((l, i) => {
            let origin = " ";
            if (l.startsWith("+")) origin = "+";
            else if (l.startsWith("-")) origin = "-";
            return {
              origin,
              content: l.substring(1) + "\n",
              old_line_no: i,
              new_line_no: i
            };
          })
        };
        setSelectedCommitFileDiff({ hunks: [hunk] });
      }
    } catch (err: any) {
      setSelectedCommitFileDiff(null);
    }
  };

  // --- AUTO INITIALIZATION ---
  useEffect(() => {
    refreshRepository();
    if (githubToken) {
      fetchGitHubUser(githubToken);
    }
  }, []);

  const stagedFiles = files.filter(f => f.staged_status !== null);
  const unstagedFiles = files.filter(f => f.unstaged_status !== null);
  const { paths: graphPaths, nodes: graphNodes } = calculateGraphPaths(commits);

  // Active workspace directory name
  const activeWorkspaceName = repoPath.split("/").pop() || repoPath;

  return (
    <div className="app-container">
      {/* --- SIDEBAR --- */}
      <div 
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        style={{ width: sidebarCollapsed ? 0 : `${sidebarWidth}px` }}
      >
        {/* Sidebar Header: Relocated Workspace Switcher Dropdown (Replacing static logo) */}
        <div className="sidebar-header" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div className="sidebar-workspace-switcher" style={{ flex: 1 }}>
            <button 
              className="workspace-trigger-btn"
              onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                <Layers className="logo-icon" size={16} style={{ flexShrink: 0 }} />
                <span className="logo-text" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "120px" }}>
                  {activeWorkspaceName}
                </span>
              </div>
              <ChevronRight size={14} style={{ transform: isWorkspaceDropdownOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }} />
            </button>
            
            {isWorkspaceDropdownOpen && (
              <div className="workspace-menu-dropdown">
                <div style={{ padding: "4px 12px 6px 12px", fontSize: "0.7rem", fontWeight: "bold", color: "var(--color-text-muted)" }}>
                  SWITCH WORKSPACE
                </div>
                {workspaces.map(wPath => (
                  <div 
                    key={wPath}
                    className={`workspace-menu-item ${repoPath === wPath ? "active" : ""}`}
                    onClick={() => selectWorkspace(wPath)}
                  >
                    <span className="workspace-menu-item-text" title={wPath}>
                      {wPath.split("/").pop() || wPath}
                    </span>
                    <Minus 
                      size={12} 
                      style={{ color: "var(--color-deleted)", marginLeft: "8px", cursor: "pointer", opacity: 0.7 }}
                      onClick={(e) => removeWorkspace(e, wPath)} 
                    />
                  </div>
                ))}
                
                <div className="workspace-menu-divider" />
                
                <button 
                  className="workspace-menu-add-btn"
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    setDialogType("workspace-add");
                    setDialogInput("");
                  }}
                >
                  <FolderPlus size={14} />
                  Add Workspace Folder
                </button>
              </div>
            )}
          </div>

          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(true)}
            title="Minimize Sidebar"
            style={{ flexShrink: 0 }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="sidebar-content">
          
          {/* Local Branches Section */}
          <div className="sidebar-section">
            <div 
              className="section-title" 
              onClick={() => setIsBranchListExpanded(!isBranchListExpanded)} 
              style={{ cursor: "pointer", userSelect: "none", position: "relative" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ 
                  transform: isBranchListExpanded ? "rotate(90deg)" : "none", 
                  transition: "transform 0.15s ease", 
                  display: "inline-block",
                  fontSize: "0.6rem"
                }}>
                  ▶
                </span>
                <span>Local Branches</span>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span
                  title="Git Operations & Sync Menu"
                  style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", padding: "2px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBranchOpsDropdownOpen(!isBranchOpsDropdownOpen);
                  }}
                >
                  <MoreVertical size={14} />
                </span>
                <span
                  title="New Branch"
                  style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", padding: "2px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDialogType("branch");
                    setDialogInput("");
                  }}
                >
                  <Plus size={14} />
                </span>
              </div>

              {/* SIDEBAR BRANCH & REMOTE OPERATIONS DROPDOWN MENU */}
              {isBranchOpsDropdownOpen && (
                <div 
                  className="branch-ops-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="dropdown-section-header">GIT SYNC & REMOTE</div>
                  
                  <div 
                    className="dropdown-menu-item"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      handleGitFetch(false);
                    }}
                  >
                    <DownloadCloud size={13} style={{ color: "var(--accent-blue)" }} />
                    <span>Fetch Origin</span>
                  </div>

                  <div 
                    className="dropdown-menu-item"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      handleGitFetch(true);
                    }}
                  >
                    <RefreshCcw size={13} style={{ color: "var(--accent-purple)" }} />
                    <span>Refetch All Remote Branches</span>
                  </div>

                  <div 
                    className="dropdown-menu-item"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      handleGitPull();
                    }}
                  >
                    <ArrowDown size={13} className={isPullingRemote ? "spin-icon" : ""} style={{ color: "var(--color-staged)" }} />
                    <span>Pull from Origin</span>
                  </div>

                  {!hasUpstream ? (
                    <div 
                      className="dropdown-menu-item highlight"
                      onClick={() => {
                        setIsBranchOpsDropdownOpen(false);
                        handleGitPush(true);
                      }}
                    >
                      <Globe size={13} className={isPushingRemote ? "spin-icon" : ""} style={{ color: "#61afef" }} />
                      <span>Publish Branch to Origin</span>
                    </div>
                  ) : (
                    <div 
                      className="dropdown-menu-item"
                      onClick={() => {
                        setIsBranchOpsDropdownOpen(false);
                        handleGitPush(false);
                      }}
                    >
                      <ArrowUp size={13} className={isPushingRemote ? "spin-icon" : ""} style={{ color: "var(--color-staged)" }} />
                      <span>Push to {upstreamBranchName || "Origin"}</span>
                    </div>
                  )}

                  <div className="dropdown-divider" />
                  <div className="dropdown-section-header">BRANCH MANAGEMENT</div>

                  <div 
                    className="dropdown-menu-item"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      openMergeRebaseModal();
                    }}
                  >
                    <GitMerge size={13} style={{ color: "var(--color-modified)" }} />
                    <span>Merge / Rebase Branch...</span>
                  </div>

                  <div 
                    className="dropdown-menu-item"
                    onClick={() => {
                      setIsBranchOpsDropdownOpen(false);
                      setDialogType("branch");
                      setDialogInput("");
                    }}
                  >
                    <Plus size={13} style={{ color: "var(--color-text-main)" }} />
                    <span>Create New Branch...</span>
                  </div>
                </div>
              )}
            </div>
            {isBranchListExpanded && (
              <div className="branch-list">
                {branchList.map(bName => (
                  <div 
                    key={bName} 
                    className={`branch-item ${currentBranch === bName ? "active" : ""}`}
                    onDragOver={handleDragOverBranch}
                    onDrop={handleDropOnBranch}
                    onClick={() => startCheckoutBranch(bName)}
                    style={{
                      border: draggedCommitSha ? "1px dashed var(--color-conflict)" : "1px solid transparent"
                    }}
                  >
                    <GitBranch size={14} />
                    <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{bName}</span>
                    {currentBranch === bName ? (
                      <span className="branch-tick" title="Focused Branch">✓</span>
                    ) : draggedCommitSha ? (
                      <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--color-conflict)" }}>Merge Drop</span>
                    ) : (
                      <div className="branch-item-actions" style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "auto" }}>
                        <button
                          className="branch-action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMergeRebaseModal(bName, "merge");
                          }}
                          title={`Merge '${bName}' into '${currentBranch}'`}
                        >
                          <GitMerge size={12} style={{ color: "var(--color-modified)" }} />
                        </button>
                        <button 
                          className="branch-action-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startDeleteBranch(bName);
                          }}
                          title="Delete Branch"
                        >
                          <Trash2 size={12} style={{ color: "var(--color-deleted)", opacity: 0.7 }} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remote Branches Section */}
          {hasRepo && (
            <div className="sidebar-section">
              <div 
                className="section-title" 
                onClick={() => setIsRemoteBranchListExpanded(!isRemoteBranchListExpanded)} 
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ 
                    transform: isRemoteBranchListExpanded ? "rotate(90deg)" : "none", 
                    transition: "transform 0.15s ease", 
                    display: "inline-block",
                    fontSize: "0.6rem"
                  }}>
                    ▶
                  </span>
                  <span>Remote Branches ({remoteBranches.length})</span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span
                    title="Refetch All Remote Branches (git fetch --all --prune)"
                    style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGitFetch(true);
                    }}
                  >
                    <RefreshCcw 
                      size={13} 
                      className={isFetchingRemote ? "spin-icon" : ""}
                    />
                  </span>
                </div>
              </div>
              {isRemoteBranchListExpanded && (
                <div className="branch-list">
                  {remoteBranches.length === 0 ? (
                    <span style={{ fontSize: "0.73rem", color: "var(--color-text-dark)", padding: "4px 8px" }}>No remote branches fetched</span>
                  ) : (
                    remoteBranches.map(rName => (
                      <div 
                        key={rName} 
                        className="branch-item remote-branch-item"
                        onClick={() => handleCheckoutRemoteBranch(rName)}
                        title={`Click to checkout local branch tracking ${rName}`}
                      >
                        <Globe size={13} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
                        <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{rName}</span>
                        <div className="branch-item-actions" style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "auto" }}>
                          <button
                            className="branch-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMergeRebaseModal(rName, "merge");
                            }}
                            title={`Merge '${rName}' into '${currentBranch}'`}
                          >
                            <GitMerge size={12} style={{ color: "var(--color-modified)" }} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pull Requests Section */}
          {githubToken && remoteUrl && (
            <div className="sidebar-section">
              <div className="section-title">
                <span>Pull Requests</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "120px", overflowY: "auto" }}>
                {githubPRs.map(pr => (
                  <a 
                    key={pr.number} 
                    href={pr.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="branch-item" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                      <GitPullRequest size={12} style={{ color: "var(--accent-blue)", marginRight: "6px" }} />
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "150px" }}>
                        #{pr.number} {pr.title}
                      </span>
                    </div>
                  </a>
                ))}
                {githubPRs.length === 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>No active pull requests</span>
                )}
              </div>
            </div>
          )}

          {/* Stash section */}
          {hasRepo && (
            <div className="sidebar-section">
              <div 
                className="section-title" 
                onClick={() => setIsStashListExpanded(!isStashListExpanded)} 
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ 
                    transform: isStashListExpanded ? "rotate(90deg)" : "none", 
                    transition: "transform 0.15s ease", 
                    display: "inline-block",
                    fontSize: "0.6rem"
                  }}>
                    ▶
                  </span>
                  <span>Stashes</span>
                </div>
                <Plus 
                  size={14} 
                  style={{ cursor: "pointer" }} 
                  onClick={(e) => {
                    e.stopPropagation();
                    startPushStash();
                  }} 
                />
              </div>
              {isStashListExpanded && (
                <div className="branch-list">
                  {stashes.map((stash, index) => {
                    const label = stash.replace(/^stash@\{\d+\}:\s*(On [^:]+:\s*)?/, "").trim();
                    return (
                      <div 
                        key={index} 
                        className={`branch-item ${selectedStashIndex === index && dialogType === "stash-inspector" ? "active" : ""}`}
                        onClick={() => openStashInspector(index)}
                      >
                        <Archive size={14} />
                        <span>{label || `stash@{${index}}`}</span>
                        <button 
                          style={{ 
                            background: "none", 
                            border: "none", 
                            cursor: "pointer", 
                            padding: "2px",
                            color: "var(--color-text-muted)",
                            marginLeft: "auto",
                            display: "flex",
                            alignItems: "center"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            dropStash(index);
                          }}
                          title="Delete Stash"
                        >
                          <Trash2 size={12} style={{ color: "var(--color-deleted)", opacity: 0.7 }} />
                        </button>
                      </div>
                    );
                  })}
                  {stashes.length === 0 && (
                    <div className="branch-item" style={{ color: "var(--color-text-muted)", cursor: "default" }}>
                      <span style={{ fontSize: "0.75rem" }}>No stashes</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Collaboration Control */}
          <div className="sidebar-section">
            <div className="section-title">
              <span>Collaboration</span>
            </div>
            <button 
              className="sync-button" 
              style={{ 
                width: "100%", 
                gap: "8px", 
                background: isCollabActive ? "var(--bg-hover)" : "var(--bg-app)", 
                border: "1px solid var(--border-color)" 
              }}
              onClick={() => setIsCollabActive(!isCollabActive)}
            >
              <Users size={14} style={{ color: isCollabActive ? "var(--color-conflict)" : "inherit" }} />
              {isCollabActive ? "Session Room Active" : "Go Multiplayer"}
            </button>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
            {!hasUpstream ? (
              <button 
                className="sync-button" 
                style={{ flex: 1, background: "var(--accent-purple)" }}
                onClick={() => handleGitPush(true)}
                disabled={isPushingRemote}
                title="Publish branch to remote origin"
              >
                <Globe size={14} className={isPushingRemote ? "spin-icon" : ""} />
                {isPushingRemote ? "Publishing..." : "Publish Branch"}
              </button>
            ) : unpushedCount > 0 ? (
              <button 
                className="sync-button" 
                style={{ flex: 1, background: "var(--accent-purple)" }}
                onClick={() => handleGitPush(false)}
                disabled={isPushingRemote}
                title={`Push ${unpushedCount} local commit(s) to origin`}
              >
                <ArrowUp size={14} className={isPushingRemote ? "spin-icon" : ""} />
                {isPushingRemote ? "Pushing..." : `Push Origin (${unpushedCount})`}
              </button>
            ) : (
              <button 
                className="sync-button" 
                style={{ flex: 1 }}
                onClick={() => handleGitFetch(false)}
                disabled={isFetchingRemote}
                title="Fetch updates from origin"
              >
                <RefreshCw size={14} className={isFetchingRemote ? "spin-icon" : ""} />
                {isFetchingRemote ? "Fetching..." : "Fetch Origin"}
              </button>
            )}
          </div>
          {remoteUrl && (
            <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: "6px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              Origin: {remoteUrl}
            </div>
          )}
        </div>
      </div>

      {/* --- SIDEBAR RESIZE HANDLE --- */}
      {!sidebarCollapsed && (
        <div 
          className={`resize-handle ${activeResizer === 'sidebar' ? 'active' : ''}`}
          onMouseDown={() => setActiveResizer('sidebar')}
        />
      )}

      {/* --- MAIN PANEL --- */}
      <div className="main-panel">
        
        {/* Collaborative multiplayer indicator banner */}
        {isCollabActive && (
          <div className="collab-overlay-banner">
            <div className="collab-user-badge">
              <div className="collab-user-dot" />
              <span>Multiplayer Session sharing active with: <strong>Alex (Lead Reviewer)</strong></span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-conflict)", cursor: "pointer" }} onClick={() => setIsCollabActive(false)}>Disconnect</span>
          </div>
        )}

        {/* Topbar navigation */}
        <div className="topbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {sidebarCollapsed && (
              <button 
                className="sidebar-toggle-btn"
                style={{ marginRight: "8px" }}
                onClick={() => setSidebarCollapsed(false)}
                title="Expand Sidebar"
              >
                <ChevronRight size={16} />
              </button>
            )}
            <div className="view-tabs">
              <button 
                className={`tab-button ${activeTab === "workspace" ? "active" : ""}`}
                onClick={() => setActiveTab("workspace")}
              >
                <Layers size={14} />
                <span>Workspace Staging</span>
              </button>
              <button 
                className={`tab-button ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <History size={14} />
                <span>History Graph</span>
              </button>
            </div>
          </div>

          {/* Restored GitHub Auth Badge (Topbar Right-Side) */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            
            {githubToken && remoteUrl && (
              <button 
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  color: "var(--color-text-bright)",
                  fontSize: "0.8rem",
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginRight: "4px"
                }}
                onClick={() => {
                  setDialogType("pr-create");
                  setDialogInput("");
                  setDialogInput2("");
                }}
              >
                <GitPullRequest size={12} />
                Create PR
              </button>
            )}

            {/* GitHub circular avatar connection badge restored */}
            <div className="topbar-auth-section">
              {!githubToken ? (
                <button 
                  className="topbar-link-btn"
                  onClick={() => setDialogType("login")}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                  Connect GitHub
                </button>
              ) : (
                <div className="topbar-auth-badge">
                  {githubUser?.avatar_url ? (
                    <img src={githubUser.avatar_url} className="topbar-avatar" alt="Avatar" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-main)" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                  )}
                  <span className="topbar-username">{githubUser?.name || githubUser?.login || "Syncing..."}</span>
                  
                  <button 
                    className="topbar-link-btn" 
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)", padding: "2px 8px" }}
                    onClick={() => {
                      setDialogType("clone");
                      setDialogInput("");
                      setDialogInput2("/Users/melodyfidel/Code/projects");
                    }}
                    title="Clone Remote Repo"
                  >
                    <FolderSync size={12} />
                  </button>

                  <button 
                    className="topbar-signout-btn" 
                    onClick={handleGitHubSignout}
                    title="Sign Out GitHub"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              )}
            </div>

            <Sparkles size={14} style={{ color: "var(--color-modified)", marginLeft: "4px" }} />
          </div>
        </div>

        {/* View switching */}
        <div className="view-content">
          {errorMessage && (
            <div style={{
              background: "rgba(224, 108, 117, 0.1)",
              borderBottom: "1px solid var(--color-deleted)",
              color: "#f87171",
              padding: "8px 16px",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              whiteSpace: "pre-wrap",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 90
            }}>
              <span>{errorMessage}</span>
              <button 
                style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setErrorMessage(null)}
              >
                ✕
              </button>
            </div>
          )}

          {cliOutput && (
            <div style={{
              background: "var(--bg-panel-secondary)",
              borderBottom: "1px solid var(--border-color)",
              color: "var(--color-text-main)",
              padding: "8px 16px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              whiteSpace: "pre-wrap",
              maxHeight: "120px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "4px", marginBottom: "4px" }}>
                <span style={{ fontWeight: "bold", color: "var(--color-modified)" }}>CLI Output (Exit Code: {cliOutput.exit_code})</span>
                <button style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }} onClick={() => setCliOutput(null)}>✕</button>
              </div>
              <span>{cliOutput.stdout || cliOutput.stderr || "Command executed with no output."}</span>
            </div>
          )}

          {activeTab === "workspace" ? (
            /* --- WORKSPACE VIEW --- */
            <div className="workspace-view">
              
              {/* File Tree Panel */}
              <div 
                className="file-pane"
                style={{ width: `${filePaneWidth}px` }}
              >
                <div className="pane-header">
                  <span className="pane-title">Working Tree</span>
                  <RefreshCw size={12} className="refresh-icon" onClick={() => refreshRepository()} />
                </div>
                <div className="file-list-container">
                  
                  {/* Conflict File Panel */}
                  {conflictedFiles.length > 0 && (
                    <div className="file-group">
                      <div className="file-group-header" style={{ color: "var(--color-conflict)" }}>
                        <span>Merge Conflicts</span>
                        <AlertTriangle size={12} />
                      </div>
                      {conflictedFiles.map(file => (
                        <div key={file} className="conflict-container">
                          <span className="conflict-file-header">{file}</span>
                          <div className="conflict-choices">
                            <div className="conflict-card" onClick={() => resolveConflict(file, "ours")}>
                              <div className="conflict-card-title">Keep Ours</div>
                              <div className="conflict-card-desc">Accept Current</div>
                            </div>
                            <div className="conflict-card" onClick={() => resolveConflict(file, "theirs")}>
                              <div className="conflict-card-title">Keep Theirs</div>
                              <div className="conflict-card-desc">Accept Incoming</div>
                            </div>
                          </div>
                          <button 
                            style={{ width: "100%", padding: "4px", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "white", fontSize: "0.75rem", cursor: "pointer" }}
                            onClick={() => resolveConflict(file, "resolved")}
                          >
                            Mark Resolved
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unstaged Files */}
                  <div className="file-group">
                    <div 
                      className="file-group-header"
                      onClick={() => setUnstagedCollapsed(!unstagedCollapsed)}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {unstagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        <span>Unstaged Changes</span>
                        <span className="badge">{unstagedFiles.length}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                        {unstagedFiles.length > 0 && (
                          <input 
                            type="checkbox"
                            className="header-checkbox"
                            checked={unstagedFiles.length > 0 && checkedUnstaged.length === unstagedFiles.length}
                            ref={el => {
                              if (el) {
                                el.indeterminate = checkedUnstaged.length > 0 && checkedUnstaged.length < unstagedFiles.length;
                              }
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedUnstaged(unstagedFiles.map(f => f.path));
                              } else {
                                setCheckedUnstaged([]);
                              }
                            }}
                            title="Select all unstaged changes"
                          />
                        )}
                        {checkedUnstaged.length > 0 ? (
                          <button 
                            className="stage-action-btn"
                            onClick={stageSelectedUnstaged}
                            title={`Stage ${checkedUnstaged.length} selected file(s)`}
                          >
                            Stage ({checkedUnstaged.length})
                          </button>
                        ) : (
                          unstagedFiles.length > 0 && (
                            <button 
                              className="stage-action-btn"
                              onClick={stageAllUnstaged}
                              title="Stage all changes"
                            >
                              Stage All
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    
                    {!unstagedCollapsed && (
                      <div className="file-list-items" style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                        {unstagedFiles.length === 0 ? (
                          <div className="empty-section-text">No unstaged changes</div>
                        ) : (
                          unstagedFiles.map((file) => (
                            <div 
                              key={file.path} 
                              className={`file-item ${selectedFile === file.path ? "selected" : ""}`}
                              onClick={() => {
                                selectFileForStaging(file);
                                setCheckedUnstaged(prev => 
                                  prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                                );
                              }}
                              onDoubleClick={() => stageWholeFile(file.path)}
                              title="Click to select & view diff, double-click to stage"
                            >
                              <div className="file-item-left" style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                                <input 
                                  type="checkbox"
                                  className="item-checkbox"
                                  checked={checkedUnstaged.includes(file.path)}
                                  readOnly
                                />
                                <div className="file-item-clickable-area">
                                  <FileCode size={12} className="file-icon" style={{ color: "var(--color-modified)" }} />
                                  <span className="file-name" title={file.path}>{file.path}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <span className={`status-badge ${file.unstaged_status === "Untracked" ? "untracked" : "modified"}`}>
                                  {file.unstaged_status === "Untracked" ? "Untr" : "Mod"}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Staged Files */}
                  <div className="file-group">
                    <div 
                      className="file-group-header"
                      onClick={() => setStagedCollapsed(!stagedCollapsed)}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {stagedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        <span>Staged Changes</span>
                        <span className="badge">{stagedFiles.length}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                        {stagedFiles.length > 0 && (
                          <input 
                            type="checkbox"
                            className="header-checkbox"
                            checked={stagedFiles.length > 0 && checkedStaged.length === stagedFiles.length}
                            ref={el => {
                              if (el) {
                                el.indeterminate = checkedStaged.length > 0 && checkedStaged.length < stagedFiles.length;
                              }
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCheckedStaged(stagedFiles.map(f => f.path));
                              } else {
                                setCheckedStaged([]);
                              }
                            }}
                            title="Select all staged changes"
                          />
                        )}
                        {checkedStaged.length > 0 ? (
                          <button 
                            className="stage-action-btn unstage-btn"
                            onClick={unstageSelectedStaged}
                            title={`Unstage ${checkedStaged.length} selected file(s)`}
                          >
                            Unstage ({checkedStaged.length})
                          </button>
                        ) : (
                          stagedFiles.length > 0 && (
                            <button 
                              className="stage-action-btn unstage-btn"
                              onClick={unstageAllStaged}
                              title="Unstage all changes"
                            >
                              Unstage All
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    
                    {!stagedCollapsed && (
                      <div className="file-list-items" style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                        {stagedFiles.length === 0 ? (
                          <div className="empty-section-text">No staged changes</div>
                        ) : (
                          stagedFiles.map((file) => (
                            <div 
                              key={file.path} 
                              className={`file-item ${selectedFile === file.path ? "selected" : ""}`}
                              onClick={() => {
                                selectFileForStaging(file);
                                setCheckedStaged(prev => 
                                  prev.includes(file.path) ? prev.filter(p => p !== file.path) : [...prev, file.path]
                                );
                              }}
                              onDoubleClick={() => unstageWholeFile(file.path)}
                              title="Click to select & view diff, double-click to unstage"
                            >
                              <div className="file-item-left" style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                                <input 
                                  type="checkbox"
                                  className="item-checkbox"
                                  checked={checkedStaged.includes(file.path)}
                                  readOnly
                                />
                                <div className="file-item-clickable-area">
                                  <FileCode size={12} className="file-icon" style={{ color: "var(--color-staged)" }} />
                                  <span className="file-name" title={file.path}>{file.path}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <span className="status-badge staged">Staged</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!hasRepo && (
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <AlertTriangle size={20} style={{ color: "var(--color-untracked)" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Not a Git repository</span>
                    <button className="sync-button" onClick={initializeGitRepo}>Initialize Git</button>
                  </div>
                )}
              </div>
              {/* --- FILE PANE RESIZE HANDLE --- */}
              <div 
                className={`resize-handle ${activeResizer === 'filepane' ? 'active' : ''}`}
                onMouseDown={() => setActiveResizer('filepane')}
              />

              {/* The Mesh (Staging Canvas) */}
              <div className="staging-mesh-pane">
                {(() => {
                  const canvasMinHeight = Math.max(
                    ...canvasNodes.map(n => n.y + 260),
                    600
                  );
                  const canvasMinWidth = Math.max(
                    ...canvasNodes.map(n => n.x + 400),
                    750
                  );

                  return (
                    <div 
                      className="canvas-container" 
                      ref={canvasRef}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                    >
                      <div
                        className="canvas-content-wrapper"
                        style={{
                          minWidth: `${canvasMinWidth}px`,
                          minHeight: `${canvasMinHeight}px`,
                          position: "relative",
                          width: "100%",
                          height: "100%"
                        }}
                      >
                        {/* Collaboration Peer Visual Cursor */}
                        {collabPeers.map((peer, i) => (
                          <div 
                            key={i}
                            className="peer-avatar-cursor"
                            style={{
                              transform: `translate(${peer.x}px, ${peer.y}px)`
                            }}
                          >
                            <UserCheck size={16} style={{ color: "var(--color-conflict)" }} />
                            <span className="peer-cursor-label">{peer.name}</span>
                          </div>
                        ))}

                        <div className="canvas-header">
                          <div className="canvas-instruction">
                            {selectedFile ? `Staging Mesh for ${selectedFile} (${canvasNodes.length} hunk${canvasNodes.length === 1 ? '' : 's'})` : "Select a modified file on the left to see its hunks"}
                          </div>
                        </div>

                        {/* Connections Overlay */}
                        <svg 
                          className="mesh-overlay-svg"
                          style={{
                            width: `${canvasMinWidth}px`,
                            height: `${canvasMinHeight}px`
                          }}
                        >
                          {canvasNodes.map((node) => {
                            const targetX = canvasMinWidth - 180;
                            const targetY = 100;
                            const startX = node.x + 310;
                            const startY = node.y + 55;

                            return (
                              <path
                                key={`link-${node.id}`}
                                className="connector-line"
                                d={`M ${startX} ${startY} C ${(startX + targetX) / 2} ${startY}, ${(startX + targetX) / 2} ${targetY}, ${targetX} ${targetY}`}
                                style={{
                                  stroke: node.isStaged ? "var(--color-staged)" : "var(--border-active)"
                                }}
                              />
                            );
                          })}
                        </svg>

                        {/* Floating Hunk Nodes */}
                        {canvasNodes.map((node) => (
                          <div
                            key={node.id}
                            className="mesh-node"
                            style={{
                              left: `${node.x}px`,
                              top: `${node.y}px`,
                              cursor: draggingNodeId === node.id ? "grabbing" : "grab"
                            }}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                          >
                            <div className="node-header">
                              <span className="node-title">{node.hunk.header}</span>
                              <button 
                                className="node-action"
                                onMouseDown={(e) => e.stopPropagation()} 
                                onClick={() => stageSingleHunk(node)}
                              >
                                Stage Hunk
                              </button>
                            </div>

                            <div 
                              className="node-diff-preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDetailHunk(node.hunk);
                              }}
                              style={{ cursor: "pointer" }}
                              title="Click to view detailed changes"
                            >
                              <div className="diff-hunk-header">{node.hunk.header}</div>
                              <div style={{ maxHeight: "110px", overflowY: "auto" }}>
                                {node.hunk.lines.slice(0, 10).map((line, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`diff-line ${
                                      line.origin === "+" ? "addition" : 
                                      line.origin === "-" ? "deletion" : "context"
                                    }`}
                                  >
                                    <span>{line.origin}</span>
                                    <span>{line.content.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Staged Target Zone Node */}
                        {selectedFile && (
                          <div 
                            className="mesh-node staged-zone"
                            style={{
                              left: `${canvasMinWidth - 200}px`,
                              top: "50px",
                              position: "absolute",
                              width: "160px",
                              pointerEvents: "none"
                            }}
                          >
                            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center", justifyContent: "center", height: "90px" }}>
                              <GitPullRequest size={22} style={{ color: "var(--color-staged)" }} />
                              <span style={{ fontWeight: 550, fontSize: "0.8rem", color: "var(--color-text-bright)" }}>Staging Area</span>
                              <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Drop hunks connection</span>
                            </div>
                          </div>
                        )}

                        {canvasNodes.length === 0 && (
                          <div className="empty-canvas">
                            <Layers size={36} className="empty-canvas-icon" />
                            <span className="empty-canvas-text">Select modified file to stage individual hunks</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Commit Builder Panel */}
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
              </div>
            </div>
          ) : (
            /* --- HISTORY VIEW (COMMIT GRAPH & CHERRY PICK) --- */
            <div className="history-view">
              
              {/* Commit Graph Pane */}
              <div className="graph-pane">
                {commits.length === 0 ? (
                  <div className="empty-canvas">
                    <GitCommit size={36} className="empty-canvas-icon" />
                    <span>No commits found in history</span>
                  </div>
                ) : (
                  <div style={{ position: "relative", minHeight: "100%" }}>
                    
                    {/* SVG Connector Lines */}
                    <svg 
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "120px",
                        height: `${commits.length * 48}px`,
                        pointerEvents: "none",
                        zIndex: 1
                      }}
                    >
                      {graphPaths.map(path => (
                        <path
                          key={path.id}
                          d={path.d}
                          stroke={path.color}
                          strokeWidth={1.5}
                          fill="none"
                          opacity={0.6}
                        />
                      ))}
                    </svg>

                    {/* Commit Rows list */}
                    {commits.map((commit) => {
                      const node = graphNodes.find(n => n.id === commit.id);
                      return (
                        <div 
                          key={commit.id} 
                          className={`commit-row ${selectedCommit?.id === commit.id ? "selected" : ""}`}
                          onClick={() => selectCommitDetails(commit)}
                          draggable={true}
                          onDragStart={(e) => handleDragStartCommit(e, commit.id)}
                          style={{
                            paddingLeft: "110px", 
                            position: "relative"
                          }}
                        >
                          {/* Render node circles */}
                          {node && (
                            <div 
                              style={{
                                position: "absolute",
                                left: `${node.x - 5}px`,
                                top: `${node.y - 5}px`,
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                backgroundColor: draggedCommitSha === commit.id ? "var(--color-conflict)" : "var(--border-active)",
                                border: "2px solid var(--bg-app)",
                                zIndex: 2
                              }}
                            />
                          )}

                          <div style={{ display: "flex", gap: "10px", alignItems: "center", overflow: "hidden", width: "100%" }}>
                            {commit.branches.map(b => (
                              <span 
                                key={b}
                                style={{
                                  background: "var(--bg-active)",
                                  border: "1px solid var(--border-active)",
                                  borderRadius: "2px",
                                  fontSize: "0.7rem",
                                  color: "var(--color-text-bright)",
                                  padding: "0px 4px",
                                  fontWeight: 500,
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {b}
                              </span>
                            ))}
                            <span style={{ 
                              fontSize: "0.8rem", 
                              fontWeight: 500, 
                              whiteSpace: "nowrap", 
                              overflow: "hidden", 
                              textOverflow: "ellipsis",
                              color: selectedCommit?.id === commit.id ? "var(--color-text-bright)" : "var(--color-text-main)"
                            }}>
                              {commit.message}
                            </span>
                            <span style={{ 
                              fontSize: "0.75rem", 
                              color: "var(--color-text-muted)", 
                              marginLeft: "auto", 
                              paddingRight: "16px",
                              flexShrink: 0
                            }}>
                              {commit.author} • {new Date(commit.timestamp * 1000).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                )}
              </div>

              {/* --- DETAILS PANE RESIZE HANDLE --- */}
              <div 
                className={`resize-handle ${activeResizer === 'details' ? 'active' : ''}`}
                onMouseDown={() => setActiveResizer('details')}
              />

              {/* Commit Details Pane */}
              <div 
                className="commit-details-pane"
                style={{ width: `${commitDetailsWidth}px` }}
              >
                {selectedCommit ? (
                  <>
                    <div className="details-header">
                      <div className="commit-sha-badge">{selectedCommit.id.substring(0, 10)}...</div>
                      <div className="commit-msg">{selectedCommit.message}</div>
                      <div className="commit-meta">
                        <span><strong>Author:</strong> {selectedCommit.author} ({selectedCommit.email})</span>
                        <span><strong>Date:</strong> {new Date(selectedCommit.timestamp * 1000).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="details-content">
                      <div className="details-section-header">
                        <span>Files Changed</span>
                        <span className="details-count-badge">{selectedCommitDiffFiles.length}</span>
                      </div>
                      <div className="commit-files-list">
                        {selectedCommitDiffFiles.map(file => {
                          const lastSlash = file.lastIndexOf("/");
                          const dir = lastSlash !== -1 ? file.substring(0, lastSlash + 1) : "";
                          const name = lastSlash !== -1 ? file.substring(lastSlash + 1) : file;
                          return (
                            <div 
                              key={file} 
                              className={`commit-file-item ${selectedCommitDiffFile === file ? "active" : ""}`}
                              onClick={() => showCommitFileDiff(selectedCommit.id, file)}
                            >
                              <FileCode size={14} className="commit-file-icon" />
                              <div className="commit-file-path-container" title={file}>
                                {dir && <span className="commit-file-dir">{dir}</span>}
                                <span className="commit-file-name">{name}</span>
                              </div>
                              <ChevronRight size={13} className="commit-file-arrow" />
                            </div>
                          );
                        })}
                      </div>

                      {selectedCommitFileDiff && (
                        <div>
                          <div className="details-section-header" style={{ marginTop: "12px" }}>
                            <span>Diff Preview</span>
                            {selectedCommitDiffFile && (
                              <span className="commit-file-name" style={{ fontSize: "0.7rem", color: "var(--accent-purple-bright)" }}>
                                {selectedCommitDiffFile.split("/").pop()}
                              </span>
                            )}
                          </div>
                          <div className="node-diff-preview" style={{ maxHeight: "280px", overflowY: "auto" }}>
                            {selectedCommitFileDiff.hunks[0]?.lines.map((line, idx) => (
                              <div 
                                key={idx} 
                                className={`diff-line ${
                                  line.origin === "+" ? "addition" : 
                                  line.origin === "-" ? "deletion" : "context"
                                }`}
                              >
                                <span>{line.origin}</span>
                                <span>{line.content.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-canvas">
                    <FileText size={36} className="empty-canvas-icon" />
                    <span style={{ textAlign: "center", padding: "12px", fontSize: "0.8rem" }}>Select commit.<br/>Drag commit onto active branch badge to cherry-pick.</span>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* --- POPUPS & MODALS --- */}
      {dialogType && (
        <div className="dialog-overlay">
          <div className={`dialog-content${dialogType === "stash-inspector" ? " dialog-content--wide" : ""}`}>
            <div className="dialog-title">
              <span>
                {dialogType === "branch" && "Create Branch"}
                {dialogType === "checkout" && "Checkout Branch"}
                {dialogType === "clone" && "Clone Remote Repository"}
                {(dialogType === "publish" || dialogType === "set-remote") && "Set Remote Repository URL"}
                {dialogType === "pr-create" && "Create GitHub Pull Request"}
                {dialogType === "login" && "Connect GitHub Account"}
                {dialogType === "workspace-add" && "Add Workspace Project"}
                {dialogType === "git-init-confirm" && "Initialize Git Repository?"}
                {dialogType === "delete-branch-confirm" && "Delete Branch?"}
                {dialogType === "git-delete-force-confirm" && "Force Delete Branch?"}
                {dialogType === "checkout-conflict" && "Uncommitted Changes"}
                {dialogType === "stash-name" && "Save Stash"}
                {dialogType === "merge-rebase" && "Merge / Rebase Branch"}
                {dialogType === "stash-inspector" && (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Archive size={15} />
                    {selectedStashIndex !== null ? stashes[selectedStashIndex]?.replace(/^stash@\{\d+\}:\s*(On [^:]+:\s*)?/, "").trim() || `stash@{${selectedStashIndex}}` : "Stash Inspector"}
                  </span>
                )}
              </span>
              <button 
                className="dialog-close-btn"
                onClick={() => {
                  setDialogType(null);
                  setDialogInput("");
                  setDialogInput2("");
                }}
                title="Close"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {/* STASH NAME DIALOG */}
            {dialogType === "stash-name" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Give this stash a memorable name so you can find it later.</span>
                <input
                  className="dialog-input"
                  value={stashNameInput}
                  onChange={e => setStashNameInput(e.target.value)}
                  placeholder="e.g. WIP: header redesign"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      pushStash(stashNameInput || undefined);
                      setDialogType(null);
                    }
                  }}
                />
                <div className="dialog-actions">
                  <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
                  <button
                    className="dialog-button"
                    onClick={() => {
                      pushStash(stashNameInput || undefined);
                      setDialogType(null);
                    }}
                  >
                    Save Stash
                  </button>
                </div>
              </div>
            )}

            {/* STASH INSPECTOR DIALOG */}
            {dialogType === "stash-inspector" && selectedStashIndex !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0", minHeight: "340px", maxHeight: "70vh" }}>
                {/* File list + diff split */}
                <div style={{ display: "flex", flex: 1, gap: "0", overflow: "hidden", minHeight: 0 }}>
                  {/* Left: file list */}
                  <div style={{
                    width: "200px",
                    flexShrink: 0,
                    borderRight: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                  }}>
                    <div style={{ padding: "8px 10px", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--border-color)" }}>
                      Changed Files
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
                      {stashFiles.length === 0 && (
                        <span style={{ fontSize: "0.73rem", color: "var(--color-text-muted)", padding: "8px" }}>Loading…</span>
                      )}
                      {stashFiles.map(f => (
                        <div
                          key={f.path}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "5px 6px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            background: selectedStashFile === f.path ? "var(--bg-active)" : "transparent",
                            border: selectedStashFile === f.path ? "1px solid var(--border-active)" : "1px solid transparent",
                            fontSize: "0.73rem",
                            fontFamily: "var(--font-mono)"
                          }}
                          onClick={() => fetchStashFileDiff(selectedStashIndex, f.path)}
                        >
                          <input
                            type="checkbox"
                            checked={checkedStashFiles.has(f.path)}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const next = new Set(checkedStashFiles);
                              e.target.checked ? next.add(f.path) : next.delete(f.path);
                              setCheckedStashFiles(next);
                            }}
                            style={{ accentColor: "var(--accent-purple)", flexShrink: 0 }}
                          />
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: f.status === "A" ? "var(--color-staged)" : f.status === "D" ? "var(--color-deleted)" : "var(--color-modified)",
                            flexShrink: 0
                          }}>{f.status}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-main)" }} title={f.path}>
                            {f.path.split("/").pop()}
                          </span>
                          <Eye size={11} style={{ marginLeft: "auto", opacity: 0.5, flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: diff view */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {stashFileDiff ? (
                      <pre style={{
                        flex: 1,
                        overflowY: "auto",
                        margin: 0,
                        padding: "10px 12px",
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1.6,
                        background: "var(--bg-app)",
                        color: "var(--color-text-main)",
                        whiteSpace: "pre"
                      }}>
                        {stashFileDiff.split("\n").map((line, i) => (
                          <div key={i} style={{
                            color: line.startsWith("+") && !line.startsWith("++") ? "var(--color-staged)"
                              : line.startsWith("-") && !line.startsWith("--") ? "var(--color-deleted)"
                              : line.startsWith("@@") ? "var(--color-modified)"
                              : "inherit"
                          }}>{line}</div>
                        ))}
                      </pre>
                    ) : (
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
                        <Eye size={24} style={{ opacity: 0.3 }} />
                        <span>Click a file to preview its diff</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions footer */}
                <div style={{ borderTop: "1px solid var(--border-color)", padding: "10px 12px", display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                  <button
                    className="dialog-button"
                    style={{ flex: 1 }}
                    onClick={restoreSelectedStashFiles}
                    disabled={checkedStashFiles.size === 0}
                    title={checkedStashFiles.size === 0 ? "Check at least one file" : `Restore ${checkedStashFiles.size} file(s)`}
                  >
                    Restore Selected ({checkedStashFiles.size})
                  </button>
                  <button className="dialog-button" style={{ flex: 1 }} onClick={() => applyStash(selectedStashIndex)}>Apply All</button>
                  <button className="dialog-button" style={{ flex: 1, background: "var(--color-staged)" }} onClick={() => popStash(selectedStashIndex)}>Pop</button>
                  <button className="dialog-button secondary" onClick={() => { setDialogType(null); setSelectedStashIndex(null); }}>Close</button>
                  <button className="dialog-button" style={{ background: "var(--color-deleted)" }} onClick={() => dropStash(selectedStashIndex)} title="Discard stash permanently">Discard</button>
                </div>
              </div>
            )}

            {/* DELETE BRANCH CONFIRM DIALOG */}
            {dialogType === "delete-branch-confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-main)" }}>
                  Are you sure you want to delete the branch <strong>{pendingDeleteBranch}</strong>? This action cannot be undone.
                </span>
                <div className="dialog-actions" style={{ marginTop: "8px" }}>
                  <button 
                    className="dialog-button secondary" 
                    onClick={() => {
                      setDialogType(null);
                      setPendingDeleteBranch(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="dialog-button" 
                    style={{ background: "var(--color-deleted)", color: "white" }} 
                    onClick={() => executeDeleteBranch(false)}
                  >
                    Delete Branch
                  </button>
                </div>
              </div>
            )}

            {/* FORCE DELETE BRANCH CONFIRM DIALOG */}
            {dialogType === "git-delete-force-confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-main)" }}>
                  The branch <strong>{pendingDeleteBranch}</strong> is not fully merged. Force deleting it will discard any unmerged work.
                </span>
                <div className="dialog-actions" style={{ marginTop: "8px" }}>
                  <button 
                    className="dialog-button secondary" 
                    onClick={() => {
                      setDialogType(null);
                      setPendingDeleteBranch(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="dialog-button" 
                    style={{ background: "var(--color-deleted)", color: "white" }} 
                    onClick={() => executeDeleteBranch(true)}
                  >
                    Force Delete
                  </button>
                </div>
              </div>
            )}

            {/* CHECKOUT CONFLICT DIALOG */}
            {dialogType === "checkout-conflict" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-main)", lineHeight: 1.5, margin: 0 }}>
                  You have uncommitted changes on branch <span className="branch-inline-badge">{currentBranch}</span>. What would you like to do with these changes when switching to <span className="branch-inline-badge">{pendingCheckoutBranch}</span>?
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="conflict-option-card" onClick={handleCheckoutBringChanges}>
                    <div className="conflict-option-icon conflict-option-icon--carry">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                    <div className="conflict-option-text">
                      <span className="conflict-option-title">Bring my changes to {pendingCheckoutBranch}</span>
                      <span className="conflict-option-desc">Your uncommitted files will be carried over to {pendingCheckoutBranch}.</span>
                    </div>
                    <svg className="conflict-option-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>

                  <div className="conflict-option-card" onClick={handleCheckoutStashChanges}>
                    <div className="conflict-option-icon conflict-option-icon--stash">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
                    </div>
                    <div className="conflict-option-text">
                      <span className="conflict-option-title">Leave my changes on {currentBranch} (Stash)</span>
                      <span className="conflict-option-desc">Stash uncommitted changes on {currentBranch} before switching.</span>
                    </div>
                    <svg className="conflict-option-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>

                <div className="dialog-actions">
                  <button 
                    className="dialog-button secondary" 
                    style={{ width: "100%" }}
                    onClick={() => {
                      setDialogType(null);
                      setPendingCheckoutBranch(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* DIRECTORY NOT GIT CONFIRM DIALOG */}
            {dialogType === "git-init-confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-main)" }}>
                  The folder <strong>{pendingWorkspacePath}</strong> is not an active Git repository. What would you like to do?
                </span>
                
                <button 
                  className="sync-button" 
                  style={{ background: "var(--accent-button)" }}
                  onClick={handleInitializeGitWorkspace}
                >
                  Initialize a new Git repository here
                </button>
                
                <button 
                  className="sync-button" 
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)" }}
                  onClick={handleCloneOptionWorkspace}
                >
                  Clone a remote Git repository into this folder
                </button>

                <div className="dialog-actions" style={{ marginTop: "6px" }}>
                  <button 
                    className="dialog-button secondary" 
                    style={{ width: "100%" }}
                    onClick={() => {
                      setDialogType(null);
                      setPendingWorkspacePath("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ADD WORKSPACE PROJECT */}
            {dialogType === "workspace-add" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  Select a local folder on your computer to add as a workspace project, or clone a remote repository:
                </span>
                
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input 
                    className="dialog-input"
                    style={{ flex: 1 }}
                    value={dialogInput}
                    onChange={(e) => setDialogInput(e.target.value)}
                    placeholder="Selected folder path..."
                  />
                  <button 
                    className="dialog-button secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                    type="button"
                    onClick={async () => {
                      try {
                        const folder = await invoke<string | null>("select_folder");
                        if (folder) {
                          setDialogInput(folder);
                        }
                      } catch (err: any) {
                        console.error(err);
                      }
                    }}
                    title="Open native folder picker"
                  >
                    <FolderPlus size={15} />
                    Browse...
                  </button>
                </div>
                
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button 
                    className="sync-button" 
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    onClick={async () => {
                      if (!dialogInput) {
                        try {
                          const folder = await invoke<string | null>("select_folder");
                          if (folder) {
                            setDialogInput(folder);
                            const targetPath = folder;
                            try {
                              await invoke("get_git_status", { repoPath: targetPath });
                              const newList = [...workspaces];
                              if (!newList.includes(targetPath)) {
                                newList.push(targetPath);
                              }
                              setWorkspaces(newList);
                              localStorage.setItem("sn_workspaces", JSON.stringify(newList));
                              setRepoPath(targetPath);
                              setDialogType(null);
                              setDialogInput("");
                              await refreshRepository(targetPath);
                            } catch (err: any) {
                              setPendingWorkspacePath(targetPath);
                              setDialogType("git-init-confirm");
                              setDialogInput("");
                            }
                          }
                        } catch (err: any) {
                          console.error(err);
                        }
                        return;
                      }
                      handleWorkspaceAddSubmit();
                    }}
                  >
                    <FolderPlus size={14} />
                    {dialogInput ? "Open Selected Folder" : "Choose Folder..."}
                  </button>
                  
                  <button 
                    className="sync-button" 
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    onClick={() => {
                      setDialogInput2(dialogInput); // Prefill path if typed or picked
                      setDialogInput("");
                      setDialogType("clone");
                    }}
                  >
                    <FolderSync size={14} />
                    Clone Remote Repo
                  </button>
                </div>
              </div>
            )}

            {/* CONNECT GITHUB ACCOUNT */}
            {dialogType === "login" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button className="sync-button" onClick={loginGitHubOAuth}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                  Authorize via browser (OAuth)
                </button>
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.75rem" }}>— OR —</div>
                <input 
                  className="dialog-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  type="password"
                  placeholder="Paste GitHub Personal Access Token (PAT)"
                />
                <button className="sync-button" style={{ background: "var(--accent-button)" }} onClick={handlePATLogin}>
                  Connect via PAT
                </button>
              </div>
            )}

            {/* CLONE REMOTE REPOS */}
            {dialogType === "clone" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Select a repository, or enter the Git clone HTTPS/SSH URL:</span>
                {githubRepos.length > 0 && (
                  <select 
                    className="dialog-input"
                    value={dialogInput}
                    onChange={(e) => setDialogInput(e.target.value)}
                  >
                    <option value="">-- Choose from your GitHub repositories --</option>
                    {githubRepos.map(repo => (
                      <option key={repo.full_name} value={repo.clone_url}>{repo.full_name}</option>
                    ))}
                  </select>
                )}
                <input 
                  className="dialog-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="Or enter git URL (https://github.com/...)"
                />
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input 
                    className="dialog-input"
                    style={{ flex: 1 }}
                    value={dialogInput2}
                    onChange={(e) => setDialogInput2(e.target.value)}
                    placeholder="Local destination path..."
                  />
                  <button 
                    className="dialog-button secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
                    type="button"
                    onClick={async () => {
                      try {
                        const folder = await invoke<string | null>("select_folder");
                        if (folder) {
                          setDialogInput2(folder);
                        }
                      } catch (err: any) {
                        console.error(err);
                      }
                    }}
                    title="Open native folder picker"
                  >
                    <FolderPlus size={15} />
                    Browse...
                  </button>
                </div>
                <button className="sync-button" onClick={handleCloneRepo}>
                  Clone Repository
                </button>
              </div>
            )}

            {/* CREATE PULL REQUEST */}
            {dialogType === "pr-create" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Create PR to merge branch <strong>{currentBranch}</strong> into base branch <strong>main</strong>.
                </span>
                <input 
                  className="dialog-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="Pull request title..."
                />
                <input 
                  className="dialog-input"
                  value={dialogInput2}
                  onChange={(e) => setDialogInput2(e.target.value)}
                  placeholder="Pull request description..."
                />
                <button className="sync-button" onClick={handleCreatePR}>
                  Publish Pull Request
                </button>
              </div>
            )}

            {/* BASE BRANCH / CHECKOUT */}
            {(dialogType === "branch" || dialogType === "checkout") && (
              <>
                <input 
                  className="dialog-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder={dialogType === "branch" ? "new-branch-name" : "branch-to-checkout"}
                />
                <div className="dialog-actions">
                  <button className="dialog-button secondary" onClick={() => setDialogType(null)}>Cancel</button>
                  <button className="dialog-button primary" onClick={handleDialogSubmit}>Submit</button>
                </div>
              </>
            )}

            {/* MERGE / REBASE BRANCH DIALOG */}
            {dialogType === "merge-rebase" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Mode Selector Tabs */}
                <div style={{
                  display: "flex",
                  background: "var(--bg-app)",
                  borderRadius: "6px",
                  padding: "3px",
                  border: "1px solid var(--border-color)"
                }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      background: mergeRebaseMode === "merge" ? "var(--bg-panel-secondary)" : "transparent",
                      color: mergeRebaseMode === "merge" ? "var(--color-text-bright)" : "var(--color-text-muted)",
                      fontWeight: mergeRebaseMode === "merge" ? 600 : 400,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                    onClick={() => setMergeRebaseMode("merge")}
                  >
                    <GitMerge size={14} style={{ color: "var(--color-modified)" }} />
                    Merge Branch
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "4px",
                      background: mergeRebaseMode === "rebase" ? "var(--bg-panel-secondary)" : "transparent",
                      color: mergeRebaseMode === "rebase" ? "var(--color-text-bright)" : "var(--color-text-muted)",
                      fontWeight: mergeRebaseMode === "rebase" ? 600 : 400,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                    onClick={() => setMergeRebaseMode("rebase")}
                  >
                    <GitCommit size={14} style={{ color: "var(--accent-purple)" }} />
                    Rebase Branch
                  </button>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                  {mergeRebaseMode === "merge" ? (
                    <span>Integrate changes from target branch into current branch (<strong>{currentBranch}</strong>). ({allBranches.length} branches registered)</span>
                  ) : (
                    <span>Reapply commits from current branch (<strong>{currentBranch}</strong>) onto top of target branch. ({allBranches.length} branches registered)</span>
                  )}
                </div>

                {/* Target Branch Dropdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                    Select Target Branch:
                  </label>
                  <select
                    className="dialog-input"
                    value={targetMergeBranch}
                    onChange={(e) => setTargetMergeBranch(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-color)",
                      color: "var(--color-text-bright)",
                      borderRadius: "6px",
                      fontSize: "0.82rem"
                    }}
                  >
                    <optgroup label="Local Branches">
                      {branchList.filter(b => b !== currentBranch).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </optgroup>
                    {remoteBranches.length > 0 && (
                      <optgroup label="Remote Branches">
                        {remoteBranches.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="dialog-actions" style={{ marginTop: "10px" }}>
                  <button
                    className="dialog-button secondary"
                    onClick={() => setDialogType(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="dialog-button"
                    style={{
                      background: mergeRebaseMode === "merge" ? "var(--accent-blue)" : "var(--accent-purple)",
                      color: "white"
                    }}
                    disabled={!targetMergeBranch}
                    onClick={handleExecuteMergeOrRebase}
                  >
                    {mergeRebaseMode === "merge"
                      ? `Merge '${targetMergeBranch}' into '${currentBranch}'`
                      : `Rebase '${currentBranch}' onto '${targetMergeBranch}'`}
                  </button>
                </div>
              </div>
            )}

            {/* SET REMOTE URL / PUBLISH DIALOG */}
            {(dialogType === "set-remote" || dialogType === "publish") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  No remote repository URL is configured for <strong>origin</strong>. Enter the HTTPS or SSH clone URL for your remote repository to publish this branch:
                </span>
                
                <input 
                  className="dialog-input"
                  value={dialogInput}
                  onChange={(e) => setDialogInput(e.target.value)}
                  placeholder="e.g. https://github.com/username/repository.git"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSetRemoteUrl();
                    }
                  }}
                />

                {githubRepos.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Or choose from your GitHub repositories:</span>
                    <select 
                      className="dialog-input"
                      value={dialogInput}
                      onChange={(e) => setDialogInput(e.target.value)}
                    >
                      <option value="">-- Choose GitHub Repository --</option>
                      {githubRepos.map(repo => (
                        <option key={repo.full_name} value={repo.clone_url}>{repo.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="dialog-actions" style={{ marginTop: "6px" }}>
                  <button className="dialog-button secondary" onClick={() => setDialogType(null)}>
                    Cancel
                  </button>
                  <button 
                    className="sync-button" 
                    style={{ background: "var(--accent-button)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    onClick={handleSetRemoteUrl}
                  >
                    <Globe size={14} />
                    Set Remote & Publish
                  </button>
                </div>
              </div>
            )}

            {dialogType !== "branch" && dialogType !== "checkout" && dialogType !== "workspace-add" && dialogType !== "git-init-confirm" && dialogType !== "checkout-conflict" && dialogType !== "delete-branch-confirm" && dialogType !== "git-delete-force-confirm" && dialogType !== "stash-name" && dialogType !== "stash-inspector" && dialogType !== "merge-rebase" && dialogType !== "set-remote" && dialogType !== "publish" && (
              <div className="dialog-actions" style={{ marginTop: "6px" }}>
                <button className="dialog-button secondary" style={{ width: "100%" }} onClick={() => setDialogType(null)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- HUNK DETAILS DIALOG OVERLAY MODAL --- */}
      {activeDetailHunk && (
        <div className="hunk-details-overlay" onClick={() => setActiveDetailHunk(null)}>
          <div className="hunk-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hunk-details-header">
              <span className="hunk-details-title">Staging Hunk Inspector: Detailed Line Changes</span>
              <button 
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.1rem", fontWeight: "bold" }}
                onClick={() => setActiveDetailHunk(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="hunk-details-content">
              <div className="hunk-details-code">
                <div className="diff-hunk-header" style={{ padding: "6px 12px" }}>{activeDetailHunk.header}</div>
                <div style={{ padding: "10px 0" }}>
                  {activeDetailHunk.lines.map((line, idx) => (
                    <div 
                      key={idx} 
                      className={`diff-line ${
                        line.origin === "+" ? "addition" : 
                        line.origin === "-" ? "deletion" : "context"
                      }`}
                      style={{ fontSize: "0.8rem", padding: "3px 14px" }}
                    >
                      <span style={{ width: "16px", display: "inline-block" }}>{line.origin}</span>
                      <span>{line.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hunk-details-actions">
              <button 
                className="dialog-button secondary" 
                onClick={() => setActiveDetailHunk(null)}
                style={{ padding: "8px 18px" }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
