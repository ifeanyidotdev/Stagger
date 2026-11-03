import type { CommitInfo } from "../types/git";

export const isRealBranch = (name: string): boolean => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed === "HEAD" || trimmed.startsWith("HEAD ") || trimmed.includes("detached")) return false;
  return true;
};

export interface GraphPath {
  id: string;
  d: string;
  color: string;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  col: number;
}

export const calculateGraphPaths = (commitsList: CommitInfo[]): { paths: GraphPath[]; nodes: GraphNode[] } => {
  if (!commitsList || commitsList.length === 0) {
    return { paths: [], nodes: [] };
  }

  const paths: GraphPath[] = [];
  const nodes: GraphNode[] = [];
  const activeColumns: (string | null)[] = [];

  // O(1) index lookup map replacing O(N) findIndex on every parent for massive speedup
  const commitIndexMap = new Map<string, number>();
  for (let i = 0; i < commitsList.length; i++) {
    commitIndexMap.set(commitsList[i].id, i);
  }

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

    (commit.parents || []).forEach((parentId) => {
      const parentIdx = commitIndexMap.get(parentId);
      if (parentIdx !== undefined) {
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
