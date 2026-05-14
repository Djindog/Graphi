import { useState } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { TreeCanvas } from './TreeCanvas';
import { ForceCanvas } from './ForceCanvas';
import { NodeToolOverlay } from './NodeToolOverlay';
import type { Node, Project } from '../../types';

interface Props {
  nodes: Node[];
  rootNodeId: string | null;
  projects: Project[];
}

export function Canvas({ nodes, rootNodeId, projects }: Props) {
  const { graphMode, setGraphMode } = useGraphStore();
  const { activeContextNodeIds, deactivatedNodeIds, toggleNodeActive, setCurrentNode, clearContext, initContext } = useChatStore();
  const activeNodeId = useChatStore(s => s.currentNodeId);
  const getAllAncestors = useDagStore(s => s.getAllAncestors);
  const [overlay, setOverlay] = useState<{ node: Node; x: number; y: number } | null>(null);

  // IDs of nodes in the direct lineage (ancestors) of the current node
  const lineageNodeIds = activeNodeId ? getAllAncestors(activeNodeId).map(n => n.id) : [];

  // Single click: toggle context if any context exists, otherwise set as current node.
  // Clicking the current node while in context mode exits context mode entirely.
  const handleNodeClick = (node: Node) => {
    setOverlay(null);
    const hasContext = activeContextNodeIds.length > 0 || deactivatedNodeIds.length > 0;
    if (hasContext) {
      if (node.id === activeNodeId) {
        clearContext();
      } else {
        toggleNodeActive(node.id);
      }
    } else {
      if (node.id === activeNodeId) {
        // Re-show lineage — toggle context back on without changing the current node
        initContext(lineageNodeIds);
      } else {
        setCurrentNode(node.id);
      }
    }
  };

  // Double click: open the chat for this node
  const handleNodeDoubleClick = async (nodeId: string) => {
    setOverlay(null);
    await setCurrentNode(nodeId);
  };

  // "···" button click: toggle tool overlay (re-click closes it)
  const handleNodeMenuClick = (node: Node, screenX: number, screenY: number) => {
    if (overlay?.node.id === node.id) {
      setOverlay(null);
    } else {
      setOverlay({ node, x: screenX, y: screenY });
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F0F2F5', position: 'relative', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, display: 'flex', gap: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '3px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {(['tree', 'force'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setGraphMode(mode)}
            style={{
              padding: '4px 12px', fontSize: 13, borderRadius: 7, border: 'none', cursor: 'pointer',
              background: graphMode === mode ? '#111827' : 'transparent',
              color: graphMode === mode ? '#fff' : '#6B7280',
              fontWeight: graphMode === mode ? 500 : 400,
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {nodes.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: 14 }}>
          Select or create a project
        </div>
      ) : graphMode === 'tree' ? (
        <TreeCanvas
          nodes={nodes}
          activeNodeId={activeNodeId}
          activeContextNodeIds={activeContextNodeIds}
          deactivatedNodeIds={deactivatedNodeIds}
          lineageNodeIds={lineageNodeIds}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMenuClick={handleNodeMenuClick}
        />
      ) : (
        <ForceCanvas
          nodes={nodes}
          activeNodeId={activeNodeId}
          activeContextNodeIds={activeContextNodeIds}
          deactivatedNodeIds={deactivatedNodeIds}
          lineageNodeIds={lineageNodeIds}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMenuClick={handleNodeMenuClick}
        />
      )}

      {overlay && (
        <NodeToolOverlay
          node={overlay.node}
          position={{ x: overlay.x, y: overlay.y }}
          rootNodeId={rootNodeId}
          projects={projects}
          onClose={() => setOverlay(null)}
          onFork={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
