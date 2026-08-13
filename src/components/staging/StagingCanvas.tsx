import React from 'react';
import { UserCheck, AlertTriangle, Layers, GitPullRequest } from 'lucide-react';
import type { HunkNode, DiffHunk } from '../../types/git';

interface StagingCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  handleCanvasMouseMove: (e: React.MouseEvent) => void;
  handleCanvasMouseUp: () => void;
  canvasMinWidth: number;
  canvasMinHeight: number;
  collabPeers: { name: string; x: number; y: number }[];
  conflictedFiles: string[];
  selectedFile: string | null;
  canvasNodes: HunkNode[];
  draggingNodeId: string | null;
  handleNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  stageSingleHunk: (node: HunkNode) => void;
  setActiveDetailHunk: (hunk: DiffHunk) => void;
}

const StagingCanvas: React.FC<StagingCanvasProps> = ({
  canvasRef,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  canvasMinWidth,
  canvasMinHeight,
  collabPeers,
  conflictedFiles,
  selectedFile,
  canvasNodes,
  draggingNodeId,
  handleNodeMouseDown,
  stageSingleHunk,
  setActiveDetailHunk
}) => {
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
          {conflictedFiles.length > 0 ? (
            <div className="canvas-instruction" style={{ background: "rgba(244, 63, 94, 0.12)", color: "var(--color-conflict)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
              <AlertTriangle size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }} />
              {selectedFile ? `Merge Conflict Inspection: ${selectedFile}` : `Merge Conflict Active (${conflictedFiles.length} file${conflictedFiles.length === 1 ? '' : 's'}) — Select a file under 'Merge Conflicts' to compare Ours vs Theirs`}
            </div>
          ) : (
            <div className="canvas-instruction">
              {selectedFile ? `Staging Mesh for ${selectedFile} (${canvasNodes.length} hunk${canvasNodes.length === 1 ? '' : 's'})` : "Select a modified file on the left to see its hunks"}
            </div>
          )}
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

        {/* Staged Target Zone Zone Node */}
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
};

export default StagingCanvas;
