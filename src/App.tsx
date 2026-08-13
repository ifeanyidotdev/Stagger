import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// --- Types & Interfaces ---
import type { 
  GitFileStatus, GitStatusResult, BranchInfo, CommitInfo, 
  DiffHunk, DiffInfo, GitCliResult, HunkNode, 
  GitHubUser, GitHubRepo, GitHubPR 
} from "./types/git";
import { isRealBranch } from "./utils/graphUtils";

// --- Extracted Components ---
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import FilePane from "./components/staging/FilePane";
import ConflictResolver from "./components/staging/ConflictResolver";
import StagingCanvas from "./components/staging/StagingCanvas";
import CommitBuilder from "./components/staging/CommitBuilder";
import HistoryView from "./components/history/HistoryView";
import Dialogs from "./components/modals/Dialogs";

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
  const [conflictOursContent, setConflictOursContent] = useState<string | null>(null);
  const [conflictTheirsContent, setConflictTheirsContent] = useState<string | null>(null);
  const [conflictDiffInfo, setConflictDiffInfo] = useState<DiffInfo | null>(null);
  const [isLoadingConflict, setIsLoadingConflict] = useState<boolean>(false);

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
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");

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
  const [stashDiffLoading, setStashDiffLoading] = useState(false);
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

  // --- CONFLICT INSPECTION HELPER ---
  const isConflictFile = (filePath: string | null): boolean => {
    if (!filePath) return false;
    if (conflictedFiles.includes(filePath)) return true;
    const status = files.find(f => f.path === filePath);
    if (status && (status.staged_status === "Conflict" || status.unstaged_status === "Conflict")) return true;
    return false;
  };

  const selectConflictFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setIsLoadingConflict(true);
    setConflictOursContent(null);
    setConflictTheirsContent(null);
    setConflictDiffInfo(null);

    try {
      // Fetch Ours stage (:2:)
      const oursRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["show", `:2:${filePath}`]
      });
      if (oursRes.exit_code === 0) {
        setConflictOursContent(oursRes.stdout);
      }

      // Fetch Theirs stage (:3:)
      const theirsRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["show", `:3:${filePath}`]
      });
      if (theirsRes.exit_code === 0) {
        setConflictTheirsContent(theirsRes.stdout);
      }

      // Fetch diff
      try {
        const diffRes = await invoke<DiffInfo>("get_file_diff", {
          repoPath,
          filePath,
          staged: false
        });
        setConflictDiffInfo(diffRes);
      } catch (_) {
        setConflictDiffInfo(null);
      }
    } catch (err: any) {
      console.error("Error loading conflict details:", err);
    } finally {
      setIsLoadingConflict(false);
    }
  };

  useEffect(() => {
    if (conflictedFiles.length > 0 && (!selectedFile || !isConflictFile(selectedFile))) {
      selectConflictFile(conflictedFiles[0]);
    } else if (selectedFile && isConflictFile(selectedFile)) {
      if (conflictOursContent === null && conflictTheirsContent === null && !isLoadingConflict) {
        selectConflictFile(selectedFile);
      }
    }
  }, [selectedFile, conflictedFiles, files]);

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

      let rawBranches = await invoke<string[]>("get_branches", { repoPath: path });
      let branchesList = rawBranches.filter(isRealBranch);
      if (statusRes.current_branch && isRealBranch(statusRes.current_branch) && !branchesList.includes(statusRes.current_branch)) {
        branchesList = [statusRes.current_branch, ...branchesList];
      }

      // Virtual branch tracker persistence for empty repositories
      const storageKey = `sn_vbranches_${path}`;
      let knownBranches: string[] = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            knownBranches = parsed.filter(isRealBranch);
          }
        }
      } catch (_) {}

      knownBranches.forEach(b => {
        if (isRealBranch(b) && !branchesList.includes(b)) {
          branchesList.push(b);
        }
      });
      branchesList = branchesList.filter(isRealBranch);
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

      const cPaths = new Set<string>();
      const conflictRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: path,
        args: ["diff", "--name-only", "--diff-filter=U"]
      });
      if (conflictRes.exit_code === 0 && conflictRes.stdout.trim()) {
        conflictRes.stdout.split("\n").forEach(p => p.trim() && cPaths.add(p.trim()));
      }

      const porcelainRes = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath: path,
        args: ["status", "--porcelain"]
      });
      if (porcelainRes.exit_code === 0 && porcelainRes.stdout.trim()) {
        porcelainRes.stdout.split("\n").forEach(line => {
          if (line.length >= 3 && (line.startsWith("UU") || line.startsWith("AA") || line.startsWith("DD") || line.startsWith("UD") || line.startsWith("DU") || line.startsWith("AU") || line.startsWith("UA") || line.startsWith("U "))) {
            const p = line.substring(3).trim();
            if (p) cPaths.add(p);
          }
        });
      }

      statusRes.files.forEach(f => {
        if (f.staged_status === "Conflict" || f.unstaged_status === "Conflict") {
          cPaths.add(f.path);
        }
      });

      setConflictedFiles(Array.from(cPaths));

      const logRes = await invoke<CommitInfo[]>("get_git_log", { repoPath: path, limit: 2000 });
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
    setDialogType("stash-inspector");
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
        // Auto-select first file to immediately show diff
        if (parsed.length > 0) {
          fetchStashFileDiff(index, parsed[0].path);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    }
  };

  const fetchStashFileDiff = async (index: number, filePath: string) => {
    setSelectedStashFile(filePath);
    setStashFileDiff(null);
    setStashDiffLoading(true);
    try {
      const res = await invoke<GitCliResult>("run_git_cli_cmd", {
        repoPath,
        args: ["stash", "show", "-p", "--stat", `stash@{${index}}`, "--", filePath]
      });
      if (res.exit_code === 0 && res.stdout.trim()) {
        setStashFileDiff(res.stdout);
      } else {
        // Fallback: try without --stat for added files
        const res2 = await invoke<GitCliResult>("run_git_cli_cmd", {
          repoPath,
          args: ["stash", "show", "-p", `stash@{${index}}`, "--", filePath]
        });
        if (res2.exit_code === 0) {
          setStashFileDiff(res2.stdout || "(no diff available for this file)");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.toString());
    } finally {
      setStashDiffLoading(false);
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

  const filteredCommits = React.useMemo(() => {
    if (!historySearchQuery.trim()) return commits;
    const q = historySearchQuery.toLowerCase();
    return commits.filter(commit =>
      commit.message.toLowerCase().includes(q) ||
      commit.author.toLowerCase().includes(q) ||
      commit.short_id.toLowerCase().includes(q) ||
      commit.id.toLowerCase().includes(q) ||
      commit.branches.some(b => b.toLowerCase().includes(q))
    );
  }, [commits, historySearchQuery]);

  const { paths: graphPaths, nodes: graphNodes } = calculateGraphPaths(filteredCommits);

  // Active workspace directory name
  const activeWorkspaceName = repoPath.split("/").pop() || repoPath;

  return (
    <div className="app-container">
      <Sidebar 
        sidebarCollapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        isWorkspaceDropdownOpen={isWorkspaceDropdownOpen}
        setIsWorkspaceDropdownOpen={setIsWorkspaceDropdownOpen}
        activeWorkspaceName={activeWorkspaceName}
        workspaces={workspaces}
        selectWorkspace={selectWorkspace}
        repoPath={repoPath}
        removeWorkspace={removeWorkspace}
        setDialogType={setDialogType}
        setDialogInput={setDialogInput}
        setSidebarCollapsed={setSidebarCollapsed}
        isBranchListExpanded={isBranchListExpanded}
        setIsBranchListExpanded={setIsBranchListExpanded}
        isBranchOpsDropdownOpen={isBranchOpsDropdownOpen}
        setIsBranchOpsDropdownOpen={setIsBranchOpsDropdownOpen}
        handleGitFetch={handleGitFetch}
        isPullingRemote={isPullingRemote}
        handleGitPull={handleGitPull}
        hasUpstream={hasUpstream}
        handleGitPush={handleGitPush}
        isPushingRemote={isPushingRemote}
        upstreamBranchName={upstreamBranchName}
        openMergeRebaseModal={openMergeRebaseModal}
        branchList={branchList}
        currentBranch={currentBranch}
        handleDragOverBranch={handleDragOverBranch}
        handleDropOnBranch={handleDropOnBranch}
        startCheckoutBranch={startCheckoutBranch}
        draggedCommitSha={draggedCommitSha}
        startDeleteBranch={startDeleteBranch}
        hasRepo={hasRepo}
        isRemoteBranchListExpanded={isRemoteBranchListExpanded}
        setIsRemoteBranchListExpanded={setIsRemoteBranchListExpanded}
        remoteBranches={remoteBranches}
        isFetchingRemote={isFetchingRemote}
        handleCheckoutRemoteBranch={handleCheckoutRemoteBranch}
        githubToken={githubToken}
        remoteUrl={remoteUrl}
        githubPRs={githubPRs}
        isStashListExpanded={isStashListExpanded}
        setIsStashListExpanded={setIsStashListExpanded}
        startPushStash={startPushStash}
        stashes={stashes}
        selectedStashIndex={selectedStashIndex}
        dialogType={dialogType}
        openStashInspector={openStashInspector}
        dropStash={dropStash}
        isCollabActive={isCollabActive}
        setIsCollabActive={setIsCollabActive}
        unpushedCount={unpushedCount}
      />

      {!sidebarCollapsed && (
        <div 
          className={`resize-handle ${activeResizer === 'sidebar' ? 'active' : ''}`}
          onMouseDown={() => setActiveResizer('sidebar')}
        />
      )}

      <div className="main-panel">
        {isCollabActive && (
          <div className="collab-overlay-banner">
            <div className="collab-user-badge">
              <div className="collab-user-dot" />
              <span>Multiplayer Session sharing active with: <strong>Alex (Lead Reviewer)</strong></span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-conflict)", cursor: "pointer" }} onClick={() => setIsCollabActive(false)}>Disconnect</span>
          </div>
        )}

        <Topbar 
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          githubToken={githubToken}
          remoteUrl={remoteUrl}
          setDialogType={setDialogType}
          setDialogInput={setDialogInput}
          setDialogInput2={setDialogInput2}
          githubUser={githubUser}
          handleGitHubSignout={handleGitHubSignout}
        />

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
            <div className="workspace-view">
              <FilePane 
                filePaneWidth={filePaneWidth}
                refreshRepository={refreshRepository}
                conflictedFiles={conflictedFiles}
                resolveConflict={resolveConflict}
                unstagedCollapsed={unstagedCollapsed}
                setUnstagedCollapsed={setUnstagedCollapsed}
                unstagedFiles={unstagedFiles}
                checkedUnstaged={checkedUnstaged}
                setCheckedUnstaged={setCheckedUnstaged}
                stageSelectedUnstaged={stageSelectedUnstaged}
                stageAllUnstaged={stageAllUnstaged}
                selectedFile={selectedFile}
                selectFileForStaging={selectFileForStaging}
                stageWholeFile={stageWholeFile}
                stagedCollapsed={stagedCollapsed}
                setStagedCollapsed={setStagedCollapsed}
                stagedFiles={stagedFiles}
                checkedStaged={checkedStaged}
                setCheckedStaged={setCheckedStaged}
                unstageSelectedStaged={unstageSelectedStaged}
                unstageAllStaged={unstageAllStaged}
                unstageWholeFile={unstageWholeFile}
                hasRepo={hasRepo}
                initializeGitRepo={initializeGitRepo}
              />

              <div 
                className={`resize-handle ${activeResizer === 'filepane' ? 'active' : ''}`}
                onMouseDown={() => setActiveResizer('filepane')}
              />

              <div className="staging-mesh-pane">
                {selectedFile && isConflictFile(selectedFile) ? (
                  <ConflictResolver 
                    selectedFile={selectedFile}
                    resolveConflict={resolveConflict}
                    currentBranch={currentBranch}
                    isLoadingConflict={isLoadingConflict}
                    conflictOursContent={conflictOursContent}
                    conflictTheirsContent={conflictTheirsContent}
                    conflictDiffInfo={conflictDiffInfo}
                  />
                ) : (
                  <StagingCanvas 
                    canvasRef={canvasRef}
                    handleCanvasMouseMove={handleCanvasMouseMove}
                    handleCanvasMouseUp={handleCanvasMouseUp}
                    canvasMinWidth={Math.max(...canvasNodes.map(n => n.x + 400), 750)}
                    canvasMinHeight={Math.max(...canvasNodes.map(n => n.y + 260), 600)}
                    collabPeers={collabPeers}
                    conflictedFiles={conflictedFiles}
                    selectedFile={selectedFile}
                    canvasNodes={canvasNodes}
                    draggingNodeId={draggingNodeId}
                    handleNodeMouseDown={handleNodeMouseDown}
                    stageSingleHunk={stageSingleHunk}
                    setActiveDetailHunk={setActiveDetailHunk}
                  />
                )}

                <CommitBuilder 
                  commitTitle={commitTitle}
                  setCommitTitle={setCommitTitle}
                  commitDesc={commitDesc}
                  setCommitDesc={setCommitDesc}
                  coAuthor={coAuthor}
                  setCoAuthor={setCoAuthor}
                  amendCommit={amendCommit}
                  setAmendCommit={setAmendCommit}
                  unstagedFiles={unstagedFiles}
                  stagedFiles={stagedFiles}
                  handleCommit={handleCommit}
                />
              </div>
            </div>
          ) : (
            <HistoryView 
              filteredCommits={filteredCommits}
              commits={commits}
              historySearchQuery={historySearchQuery}
              setHistorySearchQuery={setHistorySearchQuery}
              graphPaths={graphPaths}
              graphNodes={graphNodes}
              selectedCommit={selectedCommit}
              selectCommitDetails={selectCommitDetails}
              handleDragStartCommit={handleDragStartCommit}
              draggedCommitSha={draggedCommitSha}
              openStashInspector={openStashInspector}
              activeResizer={activeResizer}
              setActiveResizer={setActiveResizer}
              commitDetailsWidth={commitDetailsWidth}
              selectedCommitDiffFiles={selectedCommitDiffFiles}
              selectedCommitDiffFile={selectedCommitDiffFile}
              showCommitFileDiff={showCommitFileDiff}
              selectedCommitFileDiff={selectedCommitFileDiff}
            />
          )}
        </div>
      </div>

      <Dialogs 
        dialogType={dialogType}
        setDialogType={setDialogType}
        selectedStashIndex={selectedStashIndex}
        stashes={stashes}
        stashFiles={stashFiles}
        checkedStashFiles={checkedStashFiles}
        setCheckedStashFiles={setCheckedStashFiles}
        selectedStashFile={selectedStashFile}
        fetchStashFileDiff={fetchStashFileDiff}
        stashFileDiff={stashFileDiff}
        stashDiffLoading={stashDiffLoading}
        applyStash={applyStash}
        popStash={popStash}
        restoreSelectedStashFiles={restoreSelectedStashFiles}
        dropStash={dropStash}
        setSelectedStashIndex={setSelectedStashIndex}
        pendingDeleteBranch={pendingDeleteBranch}
        setPendingDeleteBranch={setPendingDeleteBranch}
        executeDeleteBranch={executeDeleteBranch}
        currentBranch={currentBranch}
        pendingCheckoutBranch={pendingCheckoutBranch}
        setPendingCheckoutBranch={setPendingCheckoutBranch}
        handleCheckoutBringChanges={handleCheckoutBringChanges}
        handleCheckoutStashChanges={handleCheckoutStashChanges}
        pendingWorkspacePath={pendingWorkspacePath}
        setPendingWorkspacePath={setPendingWorkspacePath}
        handleInitializeGitWorkspace={handleInitializeGitWorkspace}
        handleCloneOptionWorkspace={handleCloneOptionWorkspace}
        workspaces={workspaces}
        setWorkspaces={setWorkspaces}
        setRepoPath={setRepoPath}
        refreshRepository={refreshRepository}
        dialogInput={dialogInput}
        setDialogInput={setDialogInput}
        dialogInput2={dialogInput2}
        setDialogInput2={setDialogInput2}
        handleWorkspaceAddSubmit={handleWorkspaceAddSubmit}
        loginGitHubOAuth={loginGitHubOAuth}
        handlePATLogin={handlePATLogin}
        githubRepos={githubRepos}
        handleCloneRepo={handleCloneRepo}
        handleCreatePR={handleCreatePR}
        handleDialogSubmit={handleDialogSubmit}
        mergeRebaseMode={mergeRebaseMode}
        setMergeRebaseMode={setMergeRebaseMode}
        allBranches={allBranches}
        targetMergeBranch={targetMergeBranch}
        setTargetMergeBranch={setTargetMergeBranch}
        branchList={branchList}
        remoteBranches={remoteBranches}
        handleExecuteMergeOrRebase={handleExecuteMergeOrRebase}
        handleSetRemoteUrl={handleSetRemoteUrl}
        stashNameInput={stashNameInput}
        setStashNameInput={setStashNameInput}
        pushStash={pushStash}
      />

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
