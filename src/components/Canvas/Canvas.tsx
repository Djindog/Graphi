import { useState, useRef, useEffect, useCallback } from 'react';
import { GitFork, Share2, Eye, EyeOff } from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useFoldStore } from '../../stores/foldStore';
import { supabase } from '../../lib/supabase';
import { TreeCanvas } from './TreeCanvas';
import { ForceCanvas } from './ForceCanvas';
import { NodeToolOverlay } from './NodeToolOverlay';
import { Tooltip } from '../Tooltip';
import type { Node, Project } from '../../types';
import type Groq from 'groq-sdk';

type GroqClient = InstanceType<typeof Groq>;

interface Props {
  nodes: Node[];
  rootNodeId: string | null;
  projects: Project[];
  onProjectCreated: (project: Project) => void;
  groqClient: GroqClient | null;
}

interface RenameTarget {
  id: string;
  title: string;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

export function Canvas({ nodes, rootNodeId, projects, onProjectCreated, groqClient }: Props) {
  const { graphMode, setGraphMode } = useGraphStore();
  const { activeContextNodeIds, deactivatedNodeIds, toggleNodeActive, setCurrentNode, setContextDisplay, toggleContextDisplay, contextDisplayMode, recommendedNodeIds, driftDetected, suggestedNodeId, messages, hoveredSuggestedNodeId } = useChatStore();
  const activeNodeId = useChatStore(s => s.currentNodeId);
  const [devMode, setDevMode] = useState(() => localStorage.getItem('graphi_dev_mode') === 'true');
  const [showStage0Result, setShowStage0Result] = useState(false);
  const [refreshedSummary, setRefreshedSummary] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { getAllAncestors, renameNode, getDescendants } = useDagStore();

  const refreshNodeSummary = useCallback(async () => {
    if (!activeNodeId) return;
    setRefreshing(true);
    try {
      const { data } = await supabase
        .from('nodes')
        .select('summary')
        .eq('id', activeNodeId)
        .single();
      if (data) {
        setRefreshedSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to refresh summary:', err);
    } finally {
      setRefreshing(false);
    }
  }, [activeNodeId]);
  const { foldedNodeIds, fold, unfold } = useFoldStore();
  const [overlay, setOverlay] = useState<{ node: Node; x: number; y: number; nodeScreenX: number; nodeScreenY: number; nodeWidth: number; nodeHeight: number } | null>(null);
  const [dangerNodeIds, setDangerNodeIds] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [ctrlToast, setCtrlToast] = useState(false);
  const ctrlToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDisplayMode = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const lineageNodeIds = activeNodeId ? getAllAncestors(activeNodeId).map(n => n.id) : [];
  const currentNode = nodes.find(n => n.id === activeNodeId);

  // Dev testing: detect if thread is getting long
  const REMINDER_THRESHOLD = devMode
    ? parseInt(import.meta.env.VITE_REMINDER_THRESHOLD || '2', 10)
    : 15;
  const threadGettingLong = messages.length >= REMINDER_THRESHOLD;

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

  // Listen for dev mode changes across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setDevMode(localStorage.getItem('graphi_dev_mode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reset refreshed summary when node changes
  useEffect(() => {
    setRefreshedSummary(null);
  }, [activeNodeId]);

  // Ctrl held → temporarily show context display
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        prevDisplayMode.current = contextDisplayMode;
        setContextDisplay(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setContextDisplay(prevDisplayMode.current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [contextDisplayMode, setContextDisplay]);

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

  const showCtrlToast = useCallback(() => {
    setCtrlToast(true);
    if (ctrlToastTimer.current) clearTimeout(ctrlToastTimer.current);
    ctrlToastTimer.current = setTimeout(() => setCtrlToast(false), 1800);
  }, []);

  // Plain click → if current node, toggle display; otherwise navigate + enable display
  const handleNodeClick = (node: Node) => {
    if (renameTarget) { commitRename(); return; }
    setOverlay(null);
    if (node.id === activeNodeId) {
      toggleContextDisplay();
    } else {
      setCurrentNode(node.id);
      setContextDisplay(true);
    }
  };

  // Ctrl+click → toggle context membership, no navigation
  const handleNodeCtrlClick = (node: Node) => {
    if (renameTarget) { commitRename(); return; }
    setOverlay(null);
    if (node.id === activeNodeId) {
      showCtrlToast();
      return;
    }
    toggleNodeActive(node.id);
  };

  const handleNodeDoubleClick = async (nodeId: string) => {
    if (renameTarget) { commitRename(); return; }
    setOverlay(null);
    if (nodeId === activeNodeId) return;
    await setCurrentNode(nodeId);
    setContextDisplay(true);
  };

  // Background click → deselect node
  const handleCanvasClick = () => {
    if (renameTarget) { commitRename(); return; }
    setCurrentNode(null);
  };

  const handleNodeBadgeClick = (nodeId: string) => {
    if (foldedNodeIds.has(nodeId)) {
      unfold(nodeId);
    } else {
      fold(nodeId);
    }
    setOverlay(null);
    setDangerNodeIds([]);
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
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#F0F2F5', position: 'relative', overflow: 'hidden' }}
      onClick={handleCanvasClick}
    >
      {/* Dot-grid backdrop — zIndex 0 so SVG nodes render above it */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(#D1D5DB 1.1px, transparent 1.1px)',
        backgroundSize: '22px 22px', opacity: 0.5,
      }} />

      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
        {/* Eye toggle — just icon, no box */}
        <Tooltip
          placement="bottom"
          width={200}
          content={
            contextDisplayMode
              ? 'Hide context highlighting on the canvas. The selected context remains saved for the next send.'
              : 'Show which nodes will be used as context: ancestors, explicitly referenced nodes, and related recommendations.'
          }
        >
          <button
            onClick={toggleContextDisplay}
            style={{
              width: 30, height: 30, border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: contextDisplayMode ? '#2563EB' : '#6B7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s', borderRadius: 8,
            }}
          >
            {contextDisplayMode ? <Eye size={15} strokeWidth={2} /> : <EyeOff size={15} strokeWidth={2} />}
          </button>
        </Tooltip>

        {/* Tree / Force selector pill */}
        <div style={{
          display: 'flex', gap: 3,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 11,
          padding: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {([
            ['tree', <GitFork key="tf" size={14} strokeWidth={2} />, 'Tree view arranges nodes by parent and child relationships so the branch structure is easy to scan.'],
            ['force', <Share2 key="ff" size={14} strokeWidth={2} />, 'Force view lays nodes out as a physics map for exploring clusters and spatial relationships.'],
          ] as [string, React.ReactNode, string][]).map(([mode, icon, tooltip]) => (
            <Tooltip key={mode as string} placement="bottom" width={190} content={tooltip}>
              <button
                onClick={() => setGraphMode(mode as 'tree' | 'force')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: graphMode === mode ? '#111827' : 'transparent',
                  color: graphMode === mode ? '#fff' : '#6B7280',
                  fontWeight: graphMode === mode ? 500 : 400,
                  transition: 'all 0.15s', textTransform: 'capitalize', fontFamily: 'inherit',
                }}
              >
                {icon}
                {mode as string}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Ctrl+current-node toast */}
      {ctrlToast && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#111827', color: '#fff',
          padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          pointerEvents: 'none', whiteSpace: 'nowrap',
          animation: 'gtoast 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          Can't deselect the current node
        </div>
      )}

      {/* Dev mode: Summary & Stage 0 testing panel */}
      {devMode && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 8,
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
        }}>
          {/* Summary display card */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #0EA5E9',
            borderRadius: 8, padding: '12px 14px',
            fontSize: 11, color: '#0369A1', minWidth: 500,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>📝 Summary Debug</div>

            {/* Node info */}
            <div style={{ fontSize: 9, color: '#0369A1', marginBottom: 8, padding: '6px', background: 'rgba(3, 105, 161, 0.05)', borderRadius: 4 }}>
              <div><strong>Node ID:</strong> <code style={{ fontSize: 8 }}>{activeNodeId || '(none)'}</code></div>
              <div><strong>Messages:</strong> {messages.length}</div>
            </div>

            {/* Summary content */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Summary Content:</span>
                <span style={{ fontSize: 8, color: '#6B7280' }}>
                  {refreshing ? 'Loading...' : refreshedSummary !== null ? '(from DB)' : '(local)'}
                </span>
              </div>
              <div style={{
                background: '#fff', border: '2px solid #BAE6FD',
                borderRadius: 4, padding: '8px 10px', fontSize: 10,
                lineHeight: 1.5, maxHeight: 200, minHeight: 80, overflowY: 'auto',
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {refreshedSummary !== null ? refreshedSummary : (currentNode?.summary ? currentNode.summary : '(empty)')}
              </div>
            </div>

            {/* Test buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => setShowStage0Result(!showStage0Result)}
                style={{
                  flex: 1, padding: '6px 10px', fontSize: 10,
                  background: driftDetected ? '#FCA5A5' : '#A7F3D0',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                  fontWeight: 600, color: '#1F2937',
                }}
              >
                {showStage0Result ? 'Hide' : 'Show'} Stage 0
              </button>
              <button
                onClick={refreshNodeSummary}
                disabled={refreshing}
                style={{
                  flex: 1, padding: '6px 10px', fontSize: 10,
                  background: '#BFDBFE', border: 'none', borderRadius: 4,
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  fontWeight: 600, color: '#1F2937',
                  opacity: refreshing ? 0.6 : 1,
                }}
              >
                {refreshing ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {showStage0Result && (
              <div style={{
                fontSize: 10, fontFamily: 'monospace',
                background: '#1F2937', color: '#10B981', padding: '10px',
                borderRadius: 4, lineHeight: 1.6, marginBottom: 8,
              }}>
                <div>driftDetected: <span style={{ color: driftDetected ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>{String(driftDetected)}</span></div>
                <div>suggestedNodeId: <span style={{ color: '#60A5FA' }}>{suggestedNodeId || 'null'}</span></div>
                {threadGettingLong && <div style={{ color: '#FCD34D', fontWeight: 'bold' }}>⚠️ THREAD GETTING LONG</div>}
              </div>
            )}
          </div>

          {/* Recommended nodes counter */}
          <div style={{
            background: '#FEF3C7', border: '1px solid #D97706',
            borderRadius: 8, padding: '6px 12px',
            fontSize: 12, fontWeight: 500, color: '#78350F',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>Recommended:</span>
            <span style={{ background: '#D97706', color: '#fff', borderRadius: 4, padding: '2px 6px', minWidth: 20, textAlign: 'center' }}>
              {recommendedNodeIds?.length || 0}
            </span>
          </div>
        </div>
      )}

      {nodes.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#D1D5DB' }}><GitFork size={36} strokeWidth={1.5} /></div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Start your first thread</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Every project begins as one node. Type below to grow the tree.</p>
          </div>
        </div>
      ) : graphMode === 'tree' ? (
        <TreeCanvas
          nodes={visibleNodes}
          activeNodeId={activeNodeId}
          activeContextNodeIds={contextDisplayMode ? activeContextNodeIds : []}
          deactivatedNodeIds={contextDisplayMode ? deactivatedNodeIds : []}
          lineageNodeIds={contextDisplayMode ? lineageNodeIds : []}
          dangerNodeIds={dangerNodeIds}
          foldedCountMap={foldedCountMap}
          hoveredNodeId={hoveredSuggestedNodeId}
          onNodeClick={handleNodeClick}
          onNodeCtrlClick={handleNodeCtrlClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMenuClick={handleNodeMenuClick}
          onNodeBadgeClick={handleNodeBadgeClick}
        />
      ) : (
        <ForceCanvas
          nodes={visibleNodes}
          activeNodeId={activeNodeId}
          activeContextNodeIds={contextDisplayMode ? activeContextNodeIds : []}
          deactivatedNodeIds={contextDisplayMode ? deactivatedNodeIds : []}
          hoveredNodeId={hoveredSuggestedNodeId}
          lineageNodeIds={contextDisplayMode ? lineageNodeIds : []}
          dangerNodeIds={dangerNodeIds}
          foldedCountMap={foldedCountMap}
          onNodeClick={handleNodeClick}
          onNodeCtrlClick={handleNodeCtrlClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMenuClick={handleNodeMenuClick}
          onNodeBadgeClick={handleNodeBadgeClick}
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
          groqClient={groqClient}
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
