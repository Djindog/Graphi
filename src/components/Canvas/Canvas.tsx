import { useState, useRef, useEffect } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useFoldStore } from '../../stores/foldStore';
import { TreeCanvas } from './TreeCanvas';
import { ForceCanvas } from './ForceCanvas';
import { NodeToolOverlay } from './NodeToolOverlay';
import type { Node, Project } from '../../types';

interface Props {
  nodes: Node[];
  rootNodeId: string | null;
  projects: Project[];
  onProjectCreated: (project: Project) => void;
}

interface RenameTarget {
  id: string;
  title: string;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

export function Canvas({ nodes, rootNodeId, projects, onProjectCreated }: Props) {
  const { graphMode, setGraphMode } = useGraphStore();
  const { activeContextNodeIds, deactivatedNodeIds, toggleNodeActive, setCurrentNode, clearContext, initContext } = useChatStore();
  const activeNodeId = useChatStore(s => s.currentNodeId);
  const { getAllAncestors, renameNode, getDescendants } = useDagStore();
  const { foldedNodeIds, fold, unfold } = useFoldStore();
  const [overlay, setOverlay] = useState<{ node: Node; x: number; y: number; nodeScreenX: number; nodeScreenY: number; nodeWidth: number; nodeHeight: number } | null>(null);
  const [dangerNodeIds, setDangerNodeIds] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const lineageNodeIds = activeNodeId ? getAllAncestors(activeNodeId).map(n => n.id) : [];

  // IDs that are hidden because an ancestor is folded
  const hiddenNodeIds = new Set<string>();
  foldedNodeIds.forEach(foldedId => {
    getDescendants(foldedId).forEach(n => hiddenNodeIds.add(n.id));
  });
  const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));

  // Map from folded node id → count of its entire subtree (descendants only)
  const foldedCountMap = new Map<string, number>();
  foldedNodeIds.forEach(id => {
    if (nodes.some(n => n.id === id)) {
      foldedCountMap.set(id, getDescendants(id).length);
    }
  });

  useEffect(() => {
    if (renameTarget) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renameTarget]);

  const commitRename = async () => {
    if (!renameTarget) return;
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== renameTarget.title) {
      await renameNode(renameTarget.id, trimmed);
    }
    setRenameTarget(null);
  };

  const cancelRename = () => setRenameTarget(null);

  const handleRenameRequest = (node: Node) => {
    if (!overlay) return;
    const { nodeScreenX, nodeScreenY, nodeWidth, nodeHeight } = overlay;
    setOverlay(null);
    setDangerNodeIds([]);
    setRenameTarget({ id: node.id, title: node.title || '', screenX: nodeScreenX, screenY: nodeScreenY, width: nodeWidth, height: nodeHeight });
    setRenameVal(node.title || '');
  };

  const handleNodeClick = (node: Node) => {
    if (renameTarget) { commitRename(); return; }
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
        initContext(lineageNodeIds);
      } else {
        setCurrentNode(node.id);
      }
    }
  };

  const handleNodeDoubleClick = async (nodeId: string) => {
    if (renameTarget) { commitRename(); return; }
    setOverlay(null);
    await setCurrentNode(nodeId);
  };

  const handleNodeMenuClick = (node: Node, screenX: number, screenY: number, nodeScreenX: number, nodeScreenY: number, nodeWidth: number, nodeHeight: number) => {
    if (renameTarget) { commitRename(); return; }
    if (overlay?.node.id === node.id) {
      setOverlay(null);
    } else {
      setOverlay({ node, x: screenX, y: screenY, nodeScreenX, nodeScreenY, nodeWidth, nodeHeight });
    }
  };

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F0F2F5', position: 'relative', overflow: 'hidden' }}
      onClick={() => { if (renameTarget) commitRename(); }}
    >
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
          nodes={visibleNodes}
          activeNodeId={activeNodeId}
          activeContextNodeIds={activeContextNodeIds}
          deactivatedNodeIds={deactivatedNodeIds}
          lineageNodeIds={lineageNodeIds}
          dangerNodeIds={dangerNodeIds}
          foldedCountMap={foldedCountMap}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMenuClick={handleNodeMenuClick}
        />
      ) : (
        <ForceCanvas
          nodes={visibleNodes}
          activeNodeId={activeNodeId}
          activeContextNodeIds={activeContextNodeIds}
          deactivatedNodeIds={deactivatedNodeIds}
          lineageNodeIds={lineageNodeIds}
          dangerNodeIds={dangerNodeIds}
          foldedCountMap={foldedCountMap}
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
          isFolded={foldedNodeIds.has(overlay.node.id)}
          onFold={() => { fold(overlay.node.id); setOverlay(null); setDangerNodeIds([]); }}
          onUnfold={() => { unfold(overlay.node.id); setOverlay(null); setDangerNodeIds([]); }}
          onClose={() => { setOverlay(null); setDangerNodeIds([]); }}
          onBranch={() => { setOverlay(null); setDangerNodeIds([]); }}
          onDangerHover={setDangerNodeIds}
          onRenameRequest={handleRenameRequest}
          onProjectCreated={onProjectCreated}
        />
      )}

      {/* Inline rename input — floats over the node */}
      {renameTarget && (
        <input
          ref={renameInputRef}
          value={renameVal}
          placeholder={renameTarget.title || 'Untitled'}
          onChange={e => setRenameVal(e.target.value)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            if (e.key === 'Escape') cancelRename();
          }}
          style={{
            position: 'fixed',
            left: renameTarget.screenX,
            top: renameTarget.screenY,
            width: renameTarget.width,
            height: renameTarget.height,
            boxSizing: 'border-box',
            padding: '0 10px',
            fontSize: 13,
            fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
            fontWeight: 500,
            color: '#1D4ED8',
            background: '#EFF6FF',
            border: '2px solid #2563EB',
            borderRadius: 10,
            outline: 'none',
            textAlign: 'center',
            zIndex: 200,
          }}
        />
      )}
    </div>
  );
}
