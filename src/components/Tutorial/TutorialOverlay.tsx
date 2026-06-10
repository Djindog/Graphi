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
  body: string;
  hint?: string;
  manualNext?: boolean;
  targetAttr?: string;
  targetNodeKey?: keyof TutorialNodeIds;
  illustration?: React.ReactNode;
}

const STEP_CONFIGS: StepConfig[] = [
  /* 0 welcome */
  { title: 'Welcome to Graphi!', body: 'Graphi is a tree-based thinking tool. You explore ideas through branching conversations, building a navigable thought tree. This short tutorial walks you through all the core features.', manualNext: true, illustration: <IllustTree /> },
  /* 1 create-project */
  { title: 'Create your first project', body: 'Click the + New project button in the sidebar to get started.' , targetAttr: 'new-project-btn' },
  /* 2 type-question */
  { title: 'Ask your first question', body: 'Type the text below exactly in the chat input, then press Enter or click Send.', hint: '"What is Graphi?"', targetAttr: 'chat-input-area' },
  /* 3 wait-response */
  { title: 'Generating a response…', body: 'Graphi\'s AI is working on your answer. The response will stream in above.' },
  /* 4 branch-from-menu */
  { title: 'Create a branch', body: 'Hover the root node in the canvas to reveal its ··· menu button, then click it and select Branch. This creates a new conversation thread off the root.', targetNodeKey: 'rootNodeId' },
  /* 5 type-branch-question */
  { title: 'Ask in the branch', body: 'Type any question you want to explore in this branch, then send it.', targetAttr: 'chat-input-area' },
  /* 6 wait-branch-response */
  { title: 'Generating a response…', body: 'Graphi is responding to your branch question.' },
  /* 7 auto-create-tree */
  { title: 'Your tree is growing', body: "We've added a few more nodes to your tree to help you practice navigation and organization. Take a moment to look at the canvas.", manualNext: true, illustration: <IllustTree /> },
  /* 8 select-node-context */
  { title: 'Explore another node', body: 'Click on the "Context" node in the canvas to select it and open its thread.', targetNodeKey: 'autoSibling1Id' },
  /* 9 ctrl-click-add */
  { title: 'Add a node to context', body: 'Hold Ctrl and click the "Limitations" node in the canvas. This adds it to the active context so the AI can reference it.', targetNodeKey: 'autoLeafId', illustration: <IllustContext /> },
  /* 10 ctrl-click-remove */
  { title: 'Remove from context', body: 'Hold Ctrl and click the "Limitations" node again to deactivate it from the current context.', targetNodeKey: 'autoLeafId' },
  /* 11 deactivate-from-bar */
  { title: 'Deactivate via context bar', body: 'Click any blue chip in the Context bar above the chat input to temporarily deactivate that node.', targetAttr: 'context-bar' },
  /* 12 fold-node */
  { title: 'Fold a subtree', body: 'Hover the "Branch" node, open its ··· menu, and click Fold to collapse its children.', targetNodeKey: 'branch1NodeId' },
  /* 13 unfold-node */
  { title: 'Unfold it back', body: 'The "Branch" node is collapsed. Open its ··· menu and click Unfold to expand it again.', targetNodeKey: 'branch1NodeId' },
  /* 14 cut-node */
  { title: 'Remove a node (keep children)', body: 'Open the ··· menu on "Context control" and click Remove (Keep Children) to detach it while preserving its descendants.', targetNodeKey: 'autoSibling1ChildId' },
  /* 15 delete-subtree */
  { title: 'Delete a subtree', body: 'Open the ··· menu on "Limitations" and click Delete Subtree to remove it along with all its descendants.', targetNodeKey: 'autoLeafId' },
  /* 16 undo-delete */
  { title: 'Undo with Ctrl+Z', body: 'Press Ctrl+Z to undo the deletion and restore the node. Graphi supports multi-level undo for node operations.', illustration: <IllustKey keys={['Ctrl', 'Z']} /> },
  /* 17 ctrl-arrow-up */
  { title: 'Navigate up the tree', body: 'Press Ctrl+↑ to navigate to the parent node. Your current position is saved to a stack so you can return.', illustration: <IllustKey keys={['Ctrl', '↑']} /> },
  /* 18 ctrl-arrow-down */
  { title: 'Navigate back down', body: 'Press Ctrl+↓ to pop the stack and return to your previous node. If the stack is empty, it jumps to the first child.', illustration: <IllustKey keys={['Ctrl', '↓']} /> },
  /* 19 done */
  { title: "You're all set! 🎉", body: "You've learned the core features of Graphi: branching conversations, context management, tree navigation, and node operations. Start building your thought tree!", manualNext: true, illustration: <IllustTree /> },
];

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
  const { isActive, currentStepIndex, inputError, nodeIds, advance, back, skip, finish, setNodeIds, createAutoNodes } = useTutorialStore();
  const currentNodeId = useChatStore(s => s.currentNodeId);
  const activeContextNodeIds = useChatStore(s => s.activeContextNodeIds);
  const deactivatedNodeIds = useChatStore(s => s.deactivatedNodeIds);
  const isGenerating = useChatStore(s => s.isGenerating);
  const dagNodes = useDagStore(s => s.nodes);
  const foldedNodeIds = useFoldStore(s => s.foldedNodeIds);

  const step = TUTORIAL_STEPS[currentStepIndex];
  const config = STEP_CONFIGS[currentStepIndex];

  const cardRef = useRef<HTMLDivElement>(null);
  const [ringRect, setRingRect] = useState<DOMRect | null>(null);
  const hasSeenGeneratingRef = useRef(false);
  const hadAutoLeafActiveRef = useRef(false);
  const entryDeactivatedLenRef = useRef(0);
  const wasFoldedRef = useRef(false);

  // ── Ring positioning via RAF ──
  useEffect(() => {
    if (!isActive) { setRingRect(null); return; }
    let rafId: number;
    const update = () => {
      const el = getTargetElement(config, nodeIds);
      const r = el?.getBoundingClientRect() ?? null;
      setRingRect(prev => {
        if (!r && !prev) return prev;
        if (!r || !prev) return r;
        if (Math.abs(prev.left - r.left) < 1 && Math.abs(prev.top - r.top) < 1 &&
            Math.abs(prev.width - r.width) < 1 && Math.abs(prev.height - r.height) < 1) return prev;
        return r;
      });
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, currentStepIndex, nodeIds, config]);

  // ── Auto-create nodes on step 7 ──
  useEffect(() => {
    if (!isActive) return;
    if (step === 'auto-create-tree') {
      createAutoNodes();
    }
  }, [isActive, step, createAutoNodes]);

  // ── Track entry state for conditional detection ──
  useEffect(() => {
    if (!isActive) return;
    if (step === 'ctrl-click-remove') {
      hadAutoLeafActiveRef.current = nodeIds.autoLeafId ? activeContextNodeIds.includes(nodeIds.autoLeafId) : false;
    }
    if (step === 'deactivate-from-bar') {
      entryDeactivatedLenRef.current = deactivatedNodeIds.length;
    }
    if (step === 'unfold-node') {
      wasFoldedRef.current = nodeIds.branch1NodeId ? foldedNodeIds.has(nodeIds.branch1NodeId) : false;
    }
    hasSeenGeneratingRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStepIndex]);

  // ── Auto-advance: wait-response / wait-branch-response ──
  useEffect(() => {
    if (!isActive) return;
    if (step !== 'wait-response' && step !== 'wait-branch-response') return;
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
    const node = dagNodes.find(n => n.id === currentNodeId);
    if (node && node.parentId === nodeIds.rootNodeId && currentNodeId !== nodeIds.rootNodeId) {
      setNodeIds({ branch1NodeId: currentNodeId });
      advance();
    }
  }, [isActive, step, currentNodeId, dagNodes, nodeIds.rootNodeId, advance, setNodeIds]);

  // ── Auto-advance: select-node-context ──
  useEffect(() => {
    if (!isActive || step !== 'select-node-context') return;
    if (nodeIds.autoSibling1Id && currentNodeId === nodeIds.autoSibling1Id) {
      advance();
    }
  }, [isActive, step, currentNodeId, nodeIds.autoSibling1Id, advance]);

  // ── Auto-advance: ctrl-click-add ──
  useEffect(() => {
    if (!isActive || step !== 'ctrl-click-add') return;
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

  // ── Auto-advance: fold-node ──
  useEffect(() => {
    if (!isActive || step !== 'fold-node') return;
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
    if (nodeIds.autoSibling1ChildId && !dagNodes.find(n => n.id === nodeIds.autoSibling1ChildId)) {
      advance();
    }
  }, [isActive, step, dagNodes, nodeIds.autoSibling1ChildId, advance]);

  // ── Auto-advance: delete-subtree ──
  useEffect(() => {
    if (!isActive || step !== 'delete-subtree') return;
    if (nodeIds.autoLeafId && !dagNodes.find(n => n.id === nodeIds.autoLeafId)) {
      advance();
    }
  }, [isActive, step, dagNodes, nodeIds.autoLeafId, advance]);

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
      case 'type-question':
      case 'type-branch-question': {
        const area = document.querySelector('[data-tutorial="chat-input-area"]');
        if (area) els.push(area);
        break;
      }
      case 'branch-from-menu':
      case 'fold-node':
      case 'unfold-node':
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
      case 'select-node-context': {
        if (nodeIds.autoSibling1Id) {
          const nodeEl = document.querySelector(`[data-tutorial-node="${nodeIds.autoSibling1Id}"]`);
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
      case 'deactivate-from-bar': {
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
      if (allowed.some(el => el.contains(target))) return;
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
        if (step === 'undo-delete') {
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
    return () => {
      BLOCKED.forEach(ev => document.removeEventListener(ev, blockHandler as EventListener, { capture: true }));
      document.removeEventListener('keydown', keyHandler, { capture: true });
    };
  }, [isActive, step, getAllowedElements, advance]);

  // Blur focused element when step changes to a non-typing step, so input doesn't leak
  const TYPING_STEPS = new Set(['type-question', 'type-branch-question']);
  useEffect(() => {
    if (!isActive) return;
    if (!TYPING_STEPS.has(step)) {
      (document.activeElement as HTMLElement)?.blur();
    }
  }, [isActive, step]);

  if (!isActive) return null;

  const totalSteps = TUTORIAL_STEPS.length;
  const isFirst = currentStepIndex === 0;
  const isDone = step === 'done';
  const isWaiting = step === 'wait-response' || step === 'wait-branch-response';
  const showNext = !!config.manualNext;
  const ORANGE = '#F97316';

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
      `}</style>

      {/* Subtle backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(0,0,0,0.18)',
        pointerEvents: 'none',
      }} />

      {/* Pulsing ring around target element */}
      {ringRect && (
        <div
          className="tut-ring"
          style={{
            position: 'fixed',
            left: ringRect.left - 4,
            top: ringRect.top - 4,
            width: ringRect.width + 8,
            height: ringRect.height + 8,
            borderRadius: 14,
            border: `2.5px solid ${ORANGE}`,
            pointerEvents: 'none',
            zIndex: 9994,
          }}
        />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 360,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
          zIndex: 9996,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
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
            {!isFirst && !isDone && (
              <button
                onClick={back}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 9,
                  border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
              >
                ← Back
              </button>
            )}

            {showNext && !isDone && (
              <button
                onClick={advance}
                style={{
                  padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 9,
                  border: 'none', background: ORANGE, color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                Next →
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
