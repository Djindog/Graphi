import { useEffect, useRef, useState, useCallback } from 'react';
import { useTutorialStore, TUTORIAL_STEPS, type TutorialNodeIds } from '../../stores/tutorialStore';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useFoldStore } from '../../stores/foldStore';

// ── Illustrations ─────────────────────────────────────────────────────────────

function IllustTree() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, marginBottom: 4 }}>
      <NodeBox label="Root" active />
      <VLine />
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <NodeBox label="Branch A" />
          <VLine />
          <NodeBox label="Child" dim />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <NodeBox label="Branch B" />
        </div>
      </div>
    </div>
  );
}

function IllustContext() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip label="Root" active />
        <Chip label="Branch A" active />
        <Chip label="Extra" active={false} />
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Ctrl+click to toggle context nodes</p>
    </div>
  );
}

function IllustKey({ keys }: { keys: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      {keys.map((k, i) => (
        <span key={i}>
          <KeyBadge k={k} />
          {i < keys.length - 1 && <span style={{ color: '#9CA3AF', margin: '0 2px', fontSize: 12 }}>+</span>}
        </span>
      ))}
    </div>
  );
}

function NodeBox({ label, active = false, dim = false }: { label: string; active?: boolean; dim?: boolean }) {
  return (
    <div style={{
      padding: '5px 14px', borderRadius: 8,
      border: `1.5px solid ${active ? '#2563EB' : '#E5E7EB'}`,
      background: active ? '#EFF6FF' : dim ? '#F9FAFB' : '#fff',
      fontSize: 12, color: active ? '#1D4ED8' : dim ? '#9CA3AF' : '#374151',
      fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
    }}>{label}</div>
  );
}

function VLine() {
  return <div style={{ width: 1.5, height: 14, background: '#D1D5DB', margin: '0 auto' }} />;
}

function Chip({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999, fontSize: 11,
      border: `1px solid ${active ? '#2563EB' : '#E5E7EB'}`,
      background: active ? '#EFF6FF' : '#fff',
      color: active ? '#1D4ED8' : '#9CA3AF',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#2563EB' : '#D1D5DB', flexShrink: 0 }} />
      {label}
    </span>
  );
}

function KeyBadge({ k }: { k: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 28, height: 26, padding: '0 8px',
      background: '#F9FAFB', border: '1px solid #E5E7EB',
      borderBottom: '2.5px solid #D1D5DB',
      borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#374151',
      fontFamily: 'monospace',
    }}>{k}</span>
  );
}

// ── Step config ───────────────────────────────────────────────────────────────

interface StepConfig {
  title: string;
  body: React.ReactNode;
  hint?: string;
  manualNext?: boolean;
  targetAttr?: string;
  targetAttr2?: string;
  targetNodeKey?: keyof TutorialNodeIds;
  targetNodeKeys?: (keyof TutorialNodeIds)[]; // union bounding box of multiple nodes for ring1
  noRing1?: boolean;        // spotlight uses ring1 rect but no ring rendered
  separateSpotlights?: boolean; // two independent spotlights instead of one merged
  freezeCardPos?: boolean;      // keep ring rects when target disappears (prevents card jump on modal close)
  illustration?: React.ReactNode;
  bottomCenter?: boolean; // force card to bottom-center regardless of ring position
}

const STEP_CONFIGS: StepConfig[] = [
  /* 0 welcome */
  { title: 'Welcome to Graphi!', body: 'Graphi is a tree-based thinking tool. You explore ideas through branching conversations, building a navigable thought tree. This short tutorial walks you through all the core features.', manualNext: true, illustration: <IllustTree /> },
  /* 1 create-project */
  { title: 'Create your first project', body: 'Click the + New project button in the sidebar to open the project dialog.', targetAttr: 'new-project-btn' },
  /* 2 name-project */
  { title: 'Name your project', body: 'Give your project a name, then click Create project. The name is optional — leave it blank and it\'ll be called "Untitled".', targetAttr: 'project-name-input', targetAttr2: 'create-project-btn', freezeCardPos: true },
  /* 3 type-question */
  { title: 'Ask your first question', body: 'Type the text below exactly in the chat input, then press Enter or click Send.', hint: '"What is Graphi?"', targetAttr: 'chat-input-area' },
  /* 4 wait-response */
  { title: 'Generating a response…', body: 'Graphi\'s AI is working on your answer. The response will stream in above.' },
  /* 5 branch-from-menu */
  { title: 'Create a branch', body: 'Hover the root node in the canvas to reveal its ··· menu button, then click it and select Branch. This creates a new conversation thread off the root.', targetNodeKey: 'rootNodeId', targetAttr2: 'node-tool-overlay' },
  /* 6 auto-create-tree */
  { title: 'Branch created!', body: "Your branch is ready. Click Next and we'll automatically add a few more nodes to your tree so you can practice navigation and organization.", manualNext: true, illustration: <IllustTree /> },
  /* 7 select-node-context */
  { title: 'Explore another node', body: 'Click on the "Context control" node in the canvas to select it and open its thread.', targetNodeKey: 'autoSibling1ChildId', bottomCenter: true },
  /* 8 explain-context-bar */
  { title: 'This is the context chain', body: 'The bar above the chat shows every ancestor node in the current path — the AI sees all of them when you send a message. The deeper the node, the richer the context it carries.', targetNodeKeys: ['rootNodeId', 'autoSibling1Id', 'autoSibling1ChildId'], targetAttr2: 'context-bar', separateSpotlights: true, manualNext: true, illustration: <IllustContext /> },
  /* 9 ctrl-click-add */
  { title: 'Add a node to context', body: 'Hold Ctrl and click the "Limitations" node in the canvas. This adds it to the active context so the AI can reference it.', targetNodeKey: 'autoLeafId', illustration: <IllustContext />, bottomCenter: true },
  /* 9 ctrl-click-remove */
  { title: 'Remove from context', body: 'Hold Ctrl and click the "Limitations" node again to deactivate it from the current context.', targetNodeKey: 'autoLeafId', bottomCenter: true },
  /* 11 deactivate-from-bar */
  { title: 'Deactivate via context bar', body: 'Click any blue chip in the context bar above the chat input to temporarily remove that node from context.', targetAttr: 'context-bar' },
  /* 12 reactivate-from-bar */
  { title: 'Re-activate the node', body: 'Click the grayed-out chip in the context bar to bring the node back into the active context.', targetAttr: 'context-bar' },
  /* 13 fold-node */
  { title: 'Fold a subtree', body: 'Hover the "Branch" node, open its ··· menu, and click Fold to collapse its children.', targetNodeKey: 'branch1NodeId', targetAttr2: 'node-tool-overlay' },
  /* 12 unfold-node */
  { title: 'The fold badge', body: 'The blue badge on "Branch" shows how many nodes are hidden inside. Click it to unfold directly, or open its ··· menu and select Unfold.', targetNodeKey: 'branch1NodeId', targetAttr2: 'fold-badge', noRing1: true },
  /* 13 cut-node */
  { title: 'Remove a node (keep children)', body: <>Open the ··· menu on "Context" and click <span style={{color:'#EF4444',fontWeight:600}}>Remove (Keep Children)</span> to detach it while its child node moves up to take its place.</>, targetNodeKey: 'autoSibling1Id', targetAttr2: 'node-tool-overlay' },
  /* 14 undo-delete */
  { title: 'Undo with Ctrl+Z', body: 'Press Ctrl+Z to undo the removal and restore the "Context" node.', illustration: <IllustKey keys={['Ctrl', 'Z']} /> },
  /* 17 delete-subtree */
  { title: 'Delete a subtree', body: 'Now open the ··· menu on "Context" and click Delete Subtree to remove it along with all its descendants permanently.', targetNodeKey: 'autoSibling1Id', targetAttr2: 'node-tool-overlay' },
  /* 18 undo-subtree */
  { title: 'Undo the deletion', body: 'Press Ctrl+Z to restore the deleted subtree. We need the full tree intact to practice navigation.', illustration: <IllustKey keys={['Ctrl', 'Z']} /> },
  /* 19 ctrl-arrow-up */
  { title: 'Navigate up the tree', body: 'Press Ctrl+↑ to navigate to the parent node. Your current position is saved to a stack so you can return.', illustration: <IllustKey keys={['Ctrl', '↑']} /> },
  /* 17 ctrl-arrow-down */
  { title: 'Navigate back down', body: 'Press Ctrl+↓ to pop the stack and return to your previous node. If the stack is empty, it jumps to the first child.', illustration: <IllustKey keys={['Ctrl', '↓']} /> },
  /* 18 done */
  { title: "You're all set! 🎉", body: "You've learned the core features of Graphi: branching conversations, context management, tree navigation, and node operations. Start building your thought tree!", manualNext: true, illustration: <IllustTree /> },
];

// ── Helper: compute smart card position ──────────────────────────────────────

function computeCardPos(
  ring1: DOMRect | null,
  ring2: DOMRect | null,
  cardWidth: number,
  cardHeight: number,
): React.CSSProperties {
  const vwOuter = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 12;
  if (!ring1 && !ring2) return { position: 'fixed', top: Math.max(MARGIN, vh - 32 - cardHeight), left: (vwOuter - cardWidth) / 2 };

  // Unified bounding box across both rings
  const left   = Math.min(ring1?.left   ?? Infinity,  ring2?.left   ?? Infinity);
  const right  = Math.max(ring1?.right  ?? -Infinity, ring2?.right  ?? -Infinity);
  const top    = Math.min(ring1?.top    ?? Infinity,  ring2?.top    ?? Infinity);
  const bottom = Math.max(ring1?.bottom ?? -Infinity, ring2?.bottom ?? -Infinity);
  const cx = (left + right) / 2;
  const cy = (top  + bottom) / 2;

  const GAP    = 32;
  const vw = vwOuter;

  const spaceBelow = vh - bottom - GAP - MARGIN;
  const spaceAbove = top      - GAP - MARGIN;
  const spaceRight = vw - right  - GAP - MARGIN;
  const spaceLeft  = left        - GAP - MARGIN;

  const HORIZ_PENALTY = 0.2; // prefer above/below so card stays near target column
  const candidates = [
    { dir: 'below', key: spaceBelow,                     fits: spaceBelow >= cardHeight },
    { dir: 'above', key: spaceAbove,                     fits: spaceAbove >= cardHeight },
    { dir: 'right', key: spaceRight * (1-HORIZ_PENALTY), fits: spaceRight >= cardWidth  },
    { dir: 'left',  key: spaceLeft  * (1-HORIZ_PENALTY), fits: spaceLeft  >= cardWidth  },
  ].filter(c => c.fits).sort((a, b) => b.key - a.key);

  const best = candidates[0];
  if (!best) return { position: 'fixed', top: Math.max(MARGIN, vh - 32 - cardHeight), left: (vw - cardWidth) / 2 };

  const clampX = (l: number) => Math.max(MARGIN, Math.min(vw - cardWidth  - MARGIN, l));
  const clampY = (t: number) => Math.max(MARGIN, Math.min(vh - cardHeight - MARGIN, t));

  if (best.dir === 'below') return { position: 'fixed', top: bottom + GAP,          left: clampX(cx - cardWidth / 2) };
  if (best.dir === 'above') return { position: 'fixed', top: top - GAP - cardHeight, left: clampX(cx - cardWidth / 2) };
  if (best.dir === 'right') return { position: 'fixed', top: clampY(cy - cardHeight / 2), left: right + GAP };
  /* left */                return { position: 'fixed', top: clampY(cy - cardHeight / 2), left: left - GAP - cardWidth };
}

// ── Helper: resolve target element from step config ───────────────────────────

function getTargetElement(config: StepConfig, nodeIds: TutorialNodeIds): Element | null {
  if (config.targetAttr) {
    return document.querySelector(`[data-tutorial="${config.targetAttr}"]`);
  }
  if (config.targetNodeKey) {
    const id = nodeIds[config.targetNodeKey] as string | null;
    if (!id) return null;
    const el = document.querySelector(`[data-tutorial-node="${id}"]`);
    if (!el) return null;
    return el.querySelector('rect.node-bg') ?? el;
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function TutorialOverlay() {
  const { isActive, currentStepIndex, inputError, nodeIds, advance, skip, finish, setNodeIds, createAutoNodes } = useTutorialStore();
  const currentNodeId = useChatStore(s => s.currentNodeId);
  const activeContextNodeIds = useChatStore(s => s.activeContextNodeIds);
  const deactivatedNodeIds = useChatStore(s => s.deactivatedNodeIds);
  const isGenerating = useChatStore(s => s.isGenerating);
  const dagNodes = useDagStore(s => s.nodes);
  const renameNode = useDagStore(s => s.renameNode);
  const foldedNodeIds = useFoldStore(s => s.foldedNodeIds);

  const step = TUTORIAL_STEPS[currentStepIndex];
  const config = STEP_CONFIGS[currentStepIndex];

  const cardRef = useRef<HTMLDivElement>(null);
  const [ringRect, setRingRect] = useState<DOMRect | null>(null);
  const [ringRect2, setRingRect2] = useState<DOMRect | null>(null);
  const [cardHeight, setCardHeight] = useState(300);
  const [isCreatingNodes, setIsCreatingNodes] = useState(false);
  const hasSeenGeneratingRef = useRef(false);
  const hadAutoLeafActiveRef = useRef(false);
  const entryDeactivatedLenRef = useRef(0);
  const wasFoldedRef = useRef(false);
  const entryHadLeafInContextRef = useRef(false);
  const entryFoldedRef = useRef(false);
  const entryHadCutNodeRef = useRef(false);
  const entryHadLeafNodeRef = useRef(false);
  const prevStepIndexRef = useRef(0);
  const entryCurrentNodeRef = useRef<string | null>(null);

  // ── Ring positioning via RAF ──
  useEffect(() => {
    if (!isActive) { setRingRect(null); setRingRect2(null); return; }
    let rafId: number;
    const update = () => {
      let r: DOMRect | null = null;
      if (config.targetNodeKeys?.length) {
        let l = Infinity, t = Infinity, ri = -Infinity, b = -Infinity, found = false;
        for (const key of config.targetNodeKeys) {
          const id = nodeIds[key] as string | null;
          if (!id) continue;
          const nodeEl = document.querySelector(`[data-tutorial-node="${id}"]`);
          if (!nodeEl) continue;
          const target = nodeEl.querySelector('rect.node-bg') ?? nodeEl;
          const rect = target.getBoundingClientRect();
          l = Math.min(l, rect.left); t = Math.min(t, rect.top);
          ri = Math.max(ri, rect.right); b = Math.max(b, rect.bottom);
          found = true;
        }
        if (found) r = new DOMRect(l, t, ri - l, b - t);
      } else {
        const el = getTargetElement(config, nodeIds);
        r = el?.getBoundingClientRect() ?? null;
      }
      setRingRect(prev => {
        if (!r && !prev) return prev;
        if (!r) return (config.freezeCardPos && prev) ? prev : r;
        if (!prev) return r;
        if (Math.abs(prev.left - r.left) < 1 && Math.abs(prev.top - r.top) < 1 &&
            Math.abs(prev.width - r.width) < 1 && Math.abs(prev.height - r.height) < 1) return prev;
        return r;
      });

      const el2 = config.targetAttr2
        ? document.querySelector(`[data-tutorial="${config.targetAttr2}"]`) : null;
      const r2 = el2?.getBoundingClientRect() ?? null;
      setRingRect2(prev => {
        if (!r2 && !prev) return prev;
        if (!r2) return (config.freezeCardPos && prev) ? prev : r2;
        if (!prev) return r2;
        if (Math.abs(prev.left - r2.left) < 1 && Math.abs(prev.top - r2.top) < 1 &&
            Math.abs(prev.width - r2.width) < 1 && Math.abs(prev.height - r2.height) < 1) return prev;
        return r2;
      });

      if (cardRef.current) {
        const h = cardRef.current.getBoundingClientRect().height;
        if (h > 0) setCardHeight(prev => Math.abs(prev - h) > 1 ? h : prev);
      }

      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, currentStepIndex, nodeIds, config]);


  // ── Track entry state for conditional detection ──
  useEffect(() => {
    const goingBack = currentStepIndex < prevStepIndexRef.current;
    prevStepIndexRef.current = currentStepIndex;

    if (!isActive) return;

    // Back-navigation: reset reversible state so the user can redo the action
    if (goingBack) {
      const { branch1NodeId, autoLeafId } = nodeIds;
      if (step === 'fold-node' && branch1NodeId && useFoldStore.getState().foldedNodeIds.has(branch1NodeId)) {
        useFoldStore.getState().unfold(branch1NodeId);
      }
      if (step === 'unfold-node' && branch1NodeId && !useFoldStore.getState().foldedNodeIds.has(branch1NodeId)) {
        useFoldStore.getState().fold(branch1NodeId);
      }
      if (step === 'ctrl-click-add' && autoLeafId && useChatStore.getState().activeContextNodeIds.includes(autoLeafId)) {
        useChatStore.getState().toggleNodeActive(autoLeafId);
      }
      if (step === 'ctrl-click-remove' && autoLeafId && !useChatStore.getState().activeContextNodeIds.includes(autoLeafId)) {
        useChatStore.getState().toggleNodeActive(autoLeafId);
      }
    }

    // Record entry state (read fresh after potential resets above)
    if (step === 'select-node-context' || step === 'branch-from-menu') {
      entryCurrentNodeRef.current = useChatStore.getState().currentNodeId;
    }
    if (step === 'ctrl-click-add') {
      entryHadLeafInContextRef.current = nodeIds.autoLeafId ? useChatStore.getState().activeContextNodeIds.includes(nodeIds.autoLeafId) : false;
    }
    if (step === 'ctrl-click-remove') {
      hadAutoLeafActiveRef.current = nodeIds.autoLeafId ? useChatStore.getState().activeContextNodeIds.includes(nodeIds.autoLeafId) : false;
    }
    if (step === 'deactivate-from-bar' || step === 'reactivate-from-bar') {
      entryDeactivatedLenRef.current = useChatStore.getState().deactivatedNodeIds.length;
    }
    if (step === 'ctrl-arrow-up' && nodeIds.autoSibling1ChildId) {
      void useChatStore.getState().setCurrentNode(nodeIds.autoSibling1ChildId);
    }
    if (step === 'fold-node') {
      entryFoldedRef.current = nodeIds.branch1NodeId ? useFoldStore.getState().foldedNodeIds.has(nodeIds.branch1NodeId) : false;
    }
    if (step === 'unfold-node') {
      wasFoldedRef.current = nodeIds.branch1NodeId ? useFoldStore.getState().foldedNodeIds.has(nodeIds.branch1NodeId) : false;
    }
    if (step === 'cut-node') {
      entryHadCutNodeRef.current = !!useDagStore.getState().nodes.find(n => n.id === nodeIds.autoSibling1Id);
    }
    if (step === 'delete-subtree') {
      entryHadLeafNodeRef.current = !!useDagStore.getState().nodes.find(n => n.id === nodeIds.autoSibling1Id);
    }
    hasSeenGeneratingRef.current = useChatStore.getState().isGenerating;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStepIndex]);

  // ── Auto-advance: wait-response ──
  useEffect(() => {
    if (!isActive) return;
    if (step !== 'wait-response') return;
    if (isGenerating) {
      hasSeenGeneratingRef.current = true;
    } else if (hasSeenGeneratingRef.current) {
      hasSeenGeneratingRef.current = false;
      const t = setTimeout(() => advance(), 600);
      return () => clearTimeout(t);
    }
  }, [isActive, step, isGenerating, advance]);

  // ── Auto-advance: branch detected ──
  useEffect(() => {
    if (!isActive || step !== 'branch-from-menu') return;
    if (!nodeIds.rootNodeId || !currentNodeId) return;
    if (currentNodeId === entryCurrentNodeRef.current) return; // don't advance if we went back and node didn't change
    const node = dagNodes.find(n => n.id === currentNodeId);
    if (node && node.parentId === nodeIds.rootNodeId && currentNodeId !== nodeIds.rootNodeId) {
      setNodeIds({ branch1NodeId: currentNodeId });
      void renameNode(currentNodeId, 'Branch');
      advance();
    }
  }, [isActive, step, currentNodeId, dagNodes, nodeIds.rootNodeId, advance, setNodeIds, renameNode]);

  // ── Auto-advance: select-node-context ──
  useEffect(() => {
    if (!isActive || step !== 'select-node-context') return;
    if (currentNodeId === entryCurrentNodeRef.current) return; // don't advance if node didn't change
    if (nodeIds.autoSibling1ChildId && currentNodeId === nodeIds.autoSibling1ChildId) {
      advance();
    }
  }, [isActive, step, currentNodeId, nodeIds.autoSibling1ChildId, advance]);

  // ── Auto-advance: ctrl-click-add ──
  useEffect(() => {
    if (!isActive || step !== 'ctrl-click-add') return;
    if (entryHadLeafInContextRef.current) return;
    if (nodeIds.autoLeafId && activeContextNodeIds.includes(nodeIds.autoLeafId)) {
      advance();
    }
  }, [isActive, step, activeContextNodeIds, nodeIds.autoLeafId, advance]);

  // ── Auto-advance: ctrl-click-remove ──
  useEffect(() => {
    if (!isActive || step !== 'ctrl-click-remove') return;
    if (!hadAutoLeafActiveRef.current) return;
    if (nodeIds.autoLeafId && !activeContextNodeIds.includes(nodeIds.autoLeafId)) {
      advance();
    }
  }, [isActive, step, activeContextNodeIds, nodeIds.autoLeafId, advance]);

  // ── Auto-advance: deactivate-from-bar ──
  useEffect(() => {
    if (!isActive || step !== 'deactivate-from-bar') return;
    if (deactivatedNodeIds.length > entryDeactivatedLenRef.current) {
      advance();
    }
  }, [isActive, step, deactivatedNodeIds, advance]);

  // ── Auto-advance: reactivate-from-bar ──
  useEffect(() => {
    if (!isActive || step !== 'reactivate-from-bar') return;
    if (deactivatedNodeIds.length < entryDeactivatedLenRef.current) {
      advance();
    }
  }, [isActive, step, deactivatedNodeIds, advance]);

  // ── Auto-advance: fold-node ──
  useEffect(() => {
    if (!isActive || step !== 'fold-node') return;
    if (entryFoldedRef.current) return;
    if (nodeIds.branch1NodeId && foldedNodeIds.has(nodeIds.branch1NodeId)) {
      advance();
    }
  }, [isActive, step, foldedNodeIds, nodeIds.branch1NodeId, advance]);

  // ── Auto-advance: unfold-node ──
  useEffect(() => {
    if (!isActive || step !== 'unfold-node') return;
    if (!wasFoldedRef.current) return;
    if (nodeIds.branch1NodeId && !foldedNodeIds.has(nodeIds.branch1NodeId)) {
      advance();
    }
  }, [isActive, step, foldedNodeIds, nodeIds.branch1NodeId, advance]);

  // ── Auto-advance: cut-node ──
  useEffect(() => {
    if (!isActive || step !== 'cut-node') return;
    if (!entryHadCutNodeRef.current) return;
    if (nodeIds.autoSibling1Id && !dagNodes.find(n => n.id === nodeIds.autoSibling1Id)) {
      advance();
    }
  }, [isActive, step, dagNodes, nodeIds.autoSibling1Id, advance]);

  // ── Auto-advance: delete-subtree ──
  useEffect(() => {
    if (!isActive || step !== 'delete-subtree') return;
    if (!entryHadLeafNodeRef.current) return;
    if (nodeIds.autoSibling1Id && !dagNodes.find(n => n.id === nodeIds.autoSibling1Id)) {
      advance();
    }
  }, [isActive, step, dagNodes, nodeIds.autoSibling1Id, advance]);

  // ── Interaction blocking ──
  const getAllowedElements = useCallback((): Element[] => {
    const els: Element[] = [];
    if (cardRef.current) els.push(cardRef.current);

    // Always allow NodeToolOverlay and ConfirmDialog when visible
    const overlay = document.querySelector('[data-tutorial="node-tool-overlay"]');
    if (overlay) els.push(overlay);
    const confirm = document.querySelector('[data-tutorial="confirm-dialog"]');
    if (confirm) els.push(confirm);
    const modal = document.querySelector('[data-tutorial="new-project-modal"]');
    if (modal) els.push(modal);

    switch (step) {
      case 'create-project': {
        const btn = document.querySelector('[data-tutorial="new-project-btn"]');
        if (btn) els.push(btn);
        break;
      }
      case 'name-project': {
        const modal = document.querySelector('[data-tutorial="new-project-modal"]');
        if (modal) els.push(modal);
        break;
      }
      case 'type-question': {
        const area = document.querySelector('[data-tutorial="chat-input-area"]');
        if (area) els.push(area);
        break;
      }
      case 'branch-from-menu':
      case 'fold-node':
      case 'cut-node':
      case 'delete-subtree': {
        const key = config.targetNodeKey;
        if (key) {
          const id = nodeIds[key] as string | null;
          if (id) {
            const nodeEl = document.querySelector(`[data-tutorial-node="${id}"]`);
            if (nodeEl) els.push(nodeEl);
          }
        }
        break;
      }
      case 'unfold-node': {
        const id = nodeIds.branch1NodeId;
        if (id) {
          const nodeEl = document.querySelector(`[data-tutorial-node="${id}"]`);
          if (nodeEl) els.push(nodeEl);
        }
        const badge = document.querySelector('[data-tutorial="fold-badge"]');
        if (badge) els.push(badge);
        break;
      }
      case 'select-node-context': {
        if (nodeIds.autoSibling1ChildId) {
          const nodeEl = document.querySelector(`[data-tutorial-node="${nodeIds.autoSibling1ChildId}"]`);
          if (nodeEl) els.push(nodeEl);
        }
        break;
      }
      case 'ctrl-click-add':
      case 'ctrl-click-remove': {
        if (nodeIds.autoLeafId) {
          const nodeEl = document.querySelector(`[data-tutorial-node="${nodeIds.autoLeafId}"]`);
          if (nodeEl) els.push(nodeEl);
        }
        break;
      }
      case 'explain-context-bar':
      case 'deactivate-from-bar':
      case 'reactivate-from-bar': {
        const bar = document.querySelector('[data-tutorial="context-bar"]');
        if (bar) els.push(bar);
        break;
      }
    }
    return els;
  }, [step, config, nodeIds]);

  useEffect(() => {
    if (!isActive) return;

    const BLOCKED = ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'] as const;

    const blockHandler = (e: MouseEvent) => {
      const target = e.target as Element;
      const allowed = getAllowedElements();
      if (allowed.some(el => el.contains(target))) {
        // For menu-action steps, only the specific action button is allowed inside the overlay
        const OVERLAY_STEP_ALLOWED: Partial<Record<string, string>> = {
          'branch-from-menu': 'branch-btn',
          'fold-node': 'fold-btn',
          'unfold-node': 'unfold-btn',
          'cut-node': 'cut-btn',
          'delete-subtree': 'delete-subtree-btn',
        };
        const allowedBtnAttr = OVERLAY_STEP_ALLOWED[step];
        if (allowedBtnAttr) {
          const overlay = document.querySelector('[data-tutorial="node-tool-overlay"]');
          if (overlay?.contains(target)) {
            const allowedBtn = document.querySelector(`[data-tutorial="${allowedBtnAttr}"]`);
            if (!allowedBtn?.contains(target)) {
              e.stopPropagation();
              e.preventDefault();
              return;
            }
          }
        }
        // ctrl-click steps: block non-ctrl clicks on the leaf node
        if (step === 'ctrl-click-add' || step === 'ctrl-click-remove') {
          if (!e.ctrlKey && !e.metaKey) {
            const leafEl = nodeIds.autoLeafId
              ? document.querySelector(`[data-tutorial-node="${nodeIds.autoLeafId}"]`)
              : null;
            if (leafEl?.contains(target)) {
              e.stopPropagation();
              e.preventDefault();
              return;
            }
          }
        }
        return;
      }
      e.stopPropagation();
      e.preventDefault();
    };

    const wheelHandler = (e: WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    const keyHandler = (e: KeyboardEvent) => {
      // Always block Tab to prevent focus escaping to elements outside allowed area
      if (e.key === 'Tab') {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'z') {
        if (step === 'undo-delete' || step === 'undo-subtree') {
          setTimeout(() => advance(), 700);
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowUp') {
        if (step === 'ctrl-arrow-up') {
          setTimeout(() => advance(), 500);
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowDown' && !e.shiftKey) {
        if (step === 'ctrl-arrow-down') {
          setTimeout(() => advance(), 500);
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      // Allow Ctrl+A/C/V/X for text editing
      if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    };

    BLOCKED.forEach(ev => document.addEventListener(ev, blockHandler as EventListener, { capture: true }));
    document.addEventListener('keydown', keyHandler, { capture: true });
    document.addEventListener('wheel', wheelHandler, { capture: true, passive: false });
    return () => {
      BLOCKED.forEach(ev => document.removeEventListener(ev, blockHandler as EventListener, { capture: true }));
      document.removeEventListener('keydown', keyHandler, { capture: true });
      document.removeEventListener('wheel', wheelHandler, { capture: true });
    };
  }, [isActive, step, getAllowedElements, advance]);

  // Blur focused element when step changes to a non-typing step, so input doesn't leak
  const TYPING_STEPS = new Set(['name-project', 'type-question']);
  useEffect(() => {
    if (!isActive) return;
    if (!TYPING_STEPS.has(step)) {
      (document.activeElement as HTMLElement)?.blur();
    }
  }, [isActive, step]);

  if (!isActive) return null;

  const totalSteps = TUTORIAL_STEPS.length;
  const isDone = step === 'done';
  const isWaiting = step === 'wait-response';
  const showNext = !!config.manualNext;
  const ORANGE = '#F97316';

  const handleNext = async () => {
    if (step === 'auto-create-tree') {
      setIsCreatingNodes(true);
      await createAutoNodes();
      setIsCreatingNodes(false);
    }
    advance();
  };

  const OVERLAY_STEP_ALLOWED: Partial<Record<string, string>> = {
    'branch-from-menu': 'branch-btn',
    'fold-node': 'fold-btn',
    'unfold-node': 'unfold-btn',
    'cut-node': 'cut-btn',
    'delete-subtree': 'delete-subtree-btn',
  };
  const overlayAllowedAttr = OVERLAY_STEP_ALLOWED[step];
  const overlayDimCSS = overlayAllowedAttr ? `
    [data-tutorial="node-tool-overlay"] button:not([data-tutorial="${overlayAllowedAttr}"]) {
      opacity: 0.2 !important;
      cursor: not-allowed !important;
    }
  ` : '';

  const CARD_WIDTH = 360;
  const cardStylePos: React.CSSProperties = config.bottomCenter
    ? { position: 'fixed', top: Math.max(12, window.innerHeight - 550 - cardHeight), left: (window.innerWidth - CARD_WIDTH) / 2 }
    : computeCardPos(ringRect, ringRect2, CARD_WIDTH, cardHeight);

  return (
    <>
      {/* Global pulse animation style */}
      <style>{`
        @keyframes tut-ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.55); }
          60%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        .tut-ring { animation: tut-ring-pulse 1.6s ease-in-out infinite; }
        ${overlayDimCSS}
      `}</style>

      {/* Spotlight backdrop */}
      {(() => {
        const SHADOW = '0 0 0 9999px rgba(0,0,0,0.22)';
        const SHADOW_HALF = '0 0 0 9999px rgba(0,0,0,0.15)';
        const PAD = 8;
        const hasRing = ringRect || ringRect2;
        if (!hasRing) {
          return <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.22)', pointerEvents: 'none' }} />;
        }
        const makeSpot = (r: DOMRect, shadow: string) => ({
          position: 'fixed' as const,
          left: Math.max(0, r.left - PAD),
          top: Math.max(0, r.top - PAD),
          width: Math.min(r.right + PAD, window.innerWidth) - Math.max(0, r.left - PAD),
          height: Math.min(r.bottom + PAD, window.innerHeight) - Math.max(0, r.top - PAD),
          boxShadow: shadow, borderRadius: 14, pointerEvents: 'none' as const, zIndex: 9990,
        });
        if (config.separateSpotlights && ringRect && ringRect2) {
          return <>
            <div style={makeSpot(ringRect, SHADOW_HALF)} />
            <div style={makeSpot(ringRect2, SHADOW_HALF)} />
          </>;
        }
        const sl = Math.min(ringRect?.left ?? Infinity, ringRect2?.left ?? Infinity) - PAD;
        const st = Math.min(ringRect?.top ?? Infinity, ringRect2?.top ?? Infinity) - PAD;
        const sr = Math.max(ringRect?.right ?? -Infinity, ringRect2?.right ?? -Infinity) + PAD;
        const sb = Math.max(ringRect?.bottom ?? -Infinity, ringRect2?.bottom ?? -Infinity) + PAD;
        return <div style={makeSpot(new DOMRect(sl, st, sr - sl, sb - st), SHADOW)} />;
      })()}

      {/* Pulsing ring around target element (ring1) */}
      {!config.noRing1 && ringRect && (() => {
        const rl = ringRect.left - 4;
        const rt = ringRect.top - 4;
        const rw = Math.min(ringRect.right + 4, window.innerWidth) - rl;
        const rh = Math.min(ringRect.bottom + 4, window.innerHeight) - rt;
        return (
          <div
            className="tut-ring"
            style={{ position: 'fixed', left: rl, top: rt, width: rw, height: rh, borderRadius: 14, border: `2.5px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 9994 }}
          />
        );
      })()}
      {/* Second pulsing ring (targetAttr2) */}
      {ringRect2 && (() => {
        const rl = ringRect2.left - 4;
        const rt = ringRect2.top - 4;
        const rw = Math.min(ringRect2.right + 4, window.innerWidth) - rl;
        const rh = Math.min(ringRect2.bottom + 4, window.innerHeight) - rt;
        return (
          <div
            className="tut-ring"
            style={{ position: 'fixed', left: rl, top: rt, width: rw, height: rh, borderRadius: 14, border: `2.5px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 9994 }}
          />
        );
      })()}

      {/* Step card — positioned to not overlap the highlighted target */}
      <div
        ref={cardRef}
        style={{
          ...cardStylePos,
          width: CARD_WIDTH,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
          zIndex: 9996,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
          transition: 'top 0.25s ease, left 0.25s ease',
        }}
      >
        {/* Orange top bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${ORANGE}, #FB923C)` }} />

        <div style={{ padding: '16px 20px 20px' }}>
          {/* Header row: step counter + skip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            {!isDone && (
              <button
                onClick={skip}
                style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit', transition: 'color 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
              >
                Skip tutorial
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: '#F3F4F6', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
              background: `linear-gradient(90deg, ${ORANGE}, #FB923C)`,
              borderRadius: 99, transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Illustration */}
          {config.illustration && (
            <div style={{ marginBottom: 14 }}>
              {config.illustration}
            </div>
          )}

          {/* Title */}
          <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.3 }}>
            {config.title}
          </p>

          {/* Body */}
          <p style={{ fontSize: 13.5, color: '#374151', margin: 0, lineHeight: 1.6 }}>
            {config.body}
          </p>

          {/* Hint (exact text required) */}
          {config.hint && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              borderRadius: 8,
              fontSize: 13.5, fontWeight: 600, color: '#C2410C',
              fontFamily: 'monospace',
            }}>
              {config.hint}
            </div>
          )}

          {/* Error message */}
          {inputError && (
            <div style={{
              marginTop: 8, padding: '7px 12px',
              background: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: 8, fontSize: 12.5, color: '#DC2626',
            }}>
              {inputError}
            </div>
          )}

          {/* Waiting spinner */}
          {isWaiting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: 'gspin 0.75s linear infinite', flexShrink: 0 }}>
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Waiting for response…</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>

            {showNext && !isDone && (
              <button
                onClick={handleNext}
                disabled={isCreatingNodes}
                style={{
                  padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 9,
                  border: 'none', background: ORANGE, color: '#fff',
                  cursor: isCreatingNodes ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.12s',
                  opacity: isCreatingNodes ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!isCreatingNodes) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={e => { if (!isCreatingNodes) (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                {isCreatingNodes ? 'Building tree…' : 'Next →'}
              </button>
            )}

            {isDone && (
              <button
                onClick={finish}
                style={{
                  padding: '8px 22px', fontSize: 13, fontWeight: 600, borderRadius: 9,
                  border: 'none', background: ORANGE, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                Start Graphi
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
