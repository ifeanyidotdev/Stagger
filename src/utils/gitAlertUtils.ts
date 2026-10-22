/**
 * Utility to parse raw Git output into concise, human-friendly titles and messages
 * designed for compact alert boxes / snack bars.
 */

export function formatGitAlertMessage(
  raw: string,
  type: "success" | "error"
): { title: string; message: string } {
  const clean = (raw || "").trim();

  if (type === "success") {
    if (clean.includes("Changes to be committed:") || clean.includes("new file:") || clean.includes("modified:")) {
      const lineCount = clean.split("\n").filter(l => l.includes(":")).length || 1;
      return { title: "Files Staged", message: `${lineCount} file(s) staged.` };
    }
    if (clean.includes("Switched to branch")) {
      const match = clean.match(/Switched to branch ['"](.+?)['"]/);
      const branch = match ? match[1] : "target";
      return { title: "Branch Switched", message: `Active: ${branch}` };
    }
    if (clean.includes("Switched to a new branch")) {
      const match = clean.match(/Switched to a new branch ['"](.+?)['"]/);
      const branch = match ? match[1] : "new branch";
      return { title: "Branch Created", message: `Checked out: ${branch}` };
    }
    if (clean.includes("Already on")) {
      return { title: "Already Active", message: "Already on this branch." };
    }
    if (clean.includes("Saved working directory")) {
      return { title: "Stash Saved", message: "Working changes stashed." };
    }
    if (clean.includes("Applied stash") || clean.includes("Restored")) {
      return { title: "Stash Restored", message: "Restored to working tree." };
    }
    if (clean.includes("Dropped stash")) {
      return { title: "Stash Dropped", message: "Stash entry removed." };
    }
    if (clean.includes("Deleted branch")) {
      return { title: "Branch Deleted", message: "Branch deleted." };
    }
    const firstLine = clean.split("\n")[0] || "Done";
    return {
      title: "Action Succeeded",
      message: firstLine.length > 50 ? firstLine.substring(0, 50) + "…" : firstLine
    };
  }

  // --- ERROR PARSING (CONCISE & COMPACT) ---
  if (clean.includes("Your local changes to the following files would be overwritten")) {
    return {
      title: "Uncommitted Changes",
      message: "Stash or commit changes first."
    };
  }
  if (clean.includes("already exists")) {
    return {
      title: "Already Exists",
      message: "A branch or reference with this name exists."
    };
  }
  if (clean.includes("pathspec") && clean.includes("did not match")) {
    return {
      title: "Target Not Found",
      message: "Specified branch or file does not exist."
    };
  }
  if (clean.includes("Permission denied") || clean.includes("Authentication failed") || clean.includes("could not read Username")) {
    return {
      title: "Auth Failed",
      message: "Check SSH key or GitHub credentials."
    };
  }
  if (clean.includes("merge conflict") || clean.includes("CONFLICT")) {
    return {
      title: "Merge Conflict",
      message: "Resolve conflicts to proceed."
    };
  }
  if (clean.includes("refusing to merge unrelated histories")) {
    return {
      title: "Unrelated Histories",
      message: "Cannot merge without common history."
    };
  }
  if (clean.includes("Updates were rejected because the remote contains work")) {
    return {
      title: "Push Rejected",
      message: "Remote has changes. Pull/rebase first."
    };
  }
  if (clean.includes("Updates were rejected because a pushed branch tip is behind")) {
    return {
      title: "Branch Behind",
      message: "Branch is behind remote. Pull first."
    };
  }
  if (clean.includes("Another git process seems to be running") || clean.includes("index.lock")) {
    return {
      title: "Index Locked",
      message: "Another Git process is running."
    };
  }
  if (clean.includes("patch does not apply")) {
    return {
      title: "Patch Failed",
      message: "Hunk could not be applied cleanly."
    };
  }
  if (clean.includes("not a git repository")) {
    return {
      title: "Not a Git Repo",
      message: "Directory is not a Git repository."
    };
  }

  // Clean fallback: remove leading prefixes like "fatal: ", "error: "
  const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "Git operation failed";
  const stripped = firstLine.replace(/^(?:fatal|error):\s*/i, "").trim();

  // If there's a colon like "Failed to switch branch: ...", split into title & message
  if (stripped.includes(":\n") || (stripped.includes(":") && stripped.length > 30)) {
    const parts = stripped.split(/:\s*/);
    const t = parts[0].trim();
    const m = parts.slice(1).join(": ").trim();
    return {
      title: t.length > 30 ? t.substring(0, 30) + "…" : t,
      message: m.length > 55 ? m.substring(0, 55) + "…" : (m || t)
    };
  }

  return {
    title: "Action Failed",
    message: stripped.length > 60 ? stripped.substring(0, 60) + "…" : stripped
  };
}
