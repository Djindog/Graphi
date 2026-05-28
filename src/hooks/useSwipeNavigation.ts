import { useRef, useCallback, useEffect } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { useDagStore } from '../stores/dagStore';
import { useChatStore } from '../stores/chatStore';

// ── constants ────────────────────────────────────────────────────────
// Vertical overscroll: raw px before visual response starts
const V_DEAD_ZONE    = 70;
const V_THRESHOLD    = 300;   // raw px to commit (after dead zone)
const V_RESISTANCE   = 0.55;
const V_MAX_RAW      = 800;
const V_MAX_VISUAL   = 120;   // max px the message box lifts

// Horizontal: raw px accumulated before commit
const H_DEAD_ZONE    = 30;    // px of horizontal drift ignored (prevents accidental trigger during vertical scroll)
const H_THRESHOLD    = 180;
const H_MAX_VISUAL   = 110;   // max px the message box slides

export type SwipePhase = 'idle' | 'pulling' | 'sliding' | 'committed' | 'springing';

function vRawToVisual(raw: number): number {
  if (raw <= V_DEAD_ZONE) return 0;
  const excess    = raw - V_DEAD_ZONE;
  const maxExcess = V_MAX_RAW - V_DEAD_ZONE;
  return Math.min(
    Math.pow(excess, V_RESISTANCE) * (V_MAX_VISUAL / Math.pow(maxExcess, V_RESISTANCE)),
    V_MAX_VISUAL
  );
}

function hRawToVisual(raw: number): number {
  // Light resistance on horizontal too — same curve, different scale
  return Math.sign(raw) * Math.min(
    Math.pow(Math.abs(raw), 0.72) * (H_MAX_VISUAL / Math.pow(H_THRESHOLD, 0.72)),
    H_MAX_VISUAL
  );
}

export function useSwipeNavigation() {
  const { nodes, getPrevSibling, getNextSibling, addNode } = useDagStore();
  const { currentNodeId, isGenerating } = useChatStore();

  // ── motion values ─────────────────────────────────────────────────
  const pullY  = useMotionValue(0);
  const slideX = useMotionValue(0);

  const messageScale   = useTransform(pullY, [0, V_MAX_VISUAL], [1, 0.91]);
  const messageOpacity = useTransform(pullY, [0, V_MAX_VISUAL], [1, 0.6]);
  const msgRadius      = useTransform(pullY, [0, V_MAX_VISUAL], [0, 14]);
  // Preview only appears after message box has lifted past 35% of max travel
  const childRise      = useTransform(pullY, [V_MAX_VISUAL * 0.35, V_MAX_VISUAL], [0, 1], { clamp: true });

  // ── refs ──────────────────────────────────────────────────────────
  const phaseRef         = useRef<SwipePhase>('idle');
  const scrollElRef      = useRef<HTMLDivElement | null>(null);

  // vertical accumulator
  const vRawRef          = useRef(0);
  const lastScrollTopRef = useRef(0);

  // horizontal accumulator
  const hRawRef          = useRef(0);
  // direction locked for current gesture: null = not yet decided
  const axisRef          = useRef<'vertical' | 'horizontal' | null>(null);

  // end-of-gesture timers
  const gestureEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ───────────────────────────────────────────────────────
  const currentNode = nodes.find(n => n.id === currentNodeId) ?? null;

  const navigateTo = useCallback((nodeId: string) => {
    useChatStore.getState().setCurrentNode(nodeId);
  }, []);

  const resetAll = useCallback(() => {
    vRawRef.current = 0;
    hRawRef.current = 0;
    axisRef.current = null;
    phaseRef.current = 'springing';
    animate(pullY,  0, { type: 'spring', stiffness: 380, damping: 26 });
    animate(slideX, 0, { type: 'spring', stiffness: 380, damping: 26,
      onComplete: () => { phaseRef.current = 'idle'; } });
  }, [pullY, slideX]);

  const springNavigateVertical = useCallback(async (targetNodeId: string) => {
    phaseRef.current = 'springing';
    await animate(pullY, V_MAX_VISUAL * 1.15, { type: 'spring', stiffness: 700, damping: 32, duration: 0.07 });
    navigateTo(targetNodeId);
    pullY.set(0);
    vRawRef.current = 0;
    axisRef.current = null;
    phaseRef.current = 'idle';
  }, [pullY, navigateTo]);

  const springNavigateHorizontal = useCallback(async (targetNodeId: string, dir: 'left' | 'right') => {
    phaseRef.current = 'springing';
    const exit = dir === 'left' ? 90 : -90;
    await animate(slideX, exit, { type: 'spring', stiffness: 520, damping: 30, duration: 0.11 });
    navigateTo(targetNodeId);
    slideX.set(-exit);
    animate(slideX, 0, { type: 'spring', stiffness: 360, damping: 26,
      onComplete: () => { phaseRef.current = 'idle'; } });
    hRawRef.current = 0;
    axisRef.current = null;
  }, [slideX, navigateTo]);

  const rubberBumpH = useCallback((dir: 'left' | 'right') => {
    phaseRef.current = 'springing';
    const bump = dir === 'left' ? -22 : 22;
    animate(slideX, bump, { type: 'spring', stiffness: 800, damping: 18 });
    animate(slideX, 0,    { type: 'spring', stiffness: 500, damping: 24, delay: 0.07,
      onComplete: () => { phaseRef.current = 'idle'; } });
    hRawRef.current = 0;
    axisRef.current = null;
  }, [slideX]);

  // ── commit helpers (called on gesture end) ─────────────────────────
  const commitVertical = useCallback(() => {
    if (!currentNode) { resetAll(); return; }
    phaseRef.current = 'committed';
    addNode(null, currentNode.id, currentNode.projectId)
      .then(child => springNavigateVertical(child.id))
      .catch(() => resetAll());
  }, [currentNode, addNode, springNavigateVertical, resetAll]);

  const commitHorizontal = useCallback(async (goLeft: boolean) => {
    if (!currentNodeId) { resetAll(); return; }
    phaseRef.current = 'committed';
    const target = goLeft ? getPrevSibling(currentNodeId) : getNextSibling(currentNodeId);
    if (target) {
      await springNavigateHorizontal(target.id, goLeft ? 'left' : 'right');
    } else {
      if (!currentNode?.parentId) { rubberBumpH(goLeft ? 'left' : 'right'); return; }
      try {
        const sibling = await addNode(null, currentNode.parentId, currentNode.projectId);
        await springNavigateHorizontal(sibling.id, goLeft ? 'left' : 'right');
      } catch { rubberBumpH(goLeft ? 'left' : 'right'); }
    }
  }, [currentNodeId, currentNode, getPrevSibling, getNextSibling, addNode,
      springNavigateHorizontal, rubberBumpH, resetAll]);

  // ── gesture-end timer ─────────────────────────────────────────────
  // Fires ~200ms after the last wheel/key event — equivalent to "finger lift"
  const scheduleGestureEnd = useCallback(() => {
    if (gestureEndTimerRef.current) clearTimeout(gestureEndTimerRef.current);
    gestureEndTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'pulling') {
        if (vRawRef.current >= V_THRESHOLD) commitVertical();
        else resetAll();
      } else if (phaseRef.current === 'sliding') {
        const raw = hRawRef.current;
        const active = Math.abs(raw) > H_DEAD_ZONE ? raw - Math.sign(raw) * H_DEAD_ZONE : 0;
        if (Math.abs(active) >= H_THRESHOLD) commitHorizontal(raw > 0);
        else resetAll();
      }
    }, 100);
  }, [commitVertical, commitHorizontal, resetAll]);

  // ── wheel handler ─────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    // Always prevent horizontal wheel so browser never sees back/forward swipe
    if (Math.abs(e.deltaX) > 2) e.preventDefault();

    if (phaseRef.current === 'springing' || phaseRef.current === 'committed' || isGenerating) return;

    const el = scrollElRef.current;
    if (!el) return;

    const absDx = Math.abs(e.deltaX);
    const absDy = Math.abs(e.deltaY);

    // Lock axis for this gesture if not yet decided
    if (!axisRef.current) {
      if (absDx < 2 && absDy < 2) return;
      axisRef.current = absDx > absDy ? 'horizontal' : 'vertical';
    }

    if (axisRef.current === 'horizontal') {
      e.preventDefault();
      hRawRef.current += e.deltaX;
      // Don't move visually until past the dead zone — absorbs accidental horizontal drift
      const active = Math.abs(hRawRef.current) > H_DEAD_ZONE
        ? hRawRef.current - Math.sign(hRawRef.current) * H_DEAD_ZONE
        : 0;
      if (active !== 0) phaseRef.current = 'sliding';
      slideX.set(hRawToVisual(-active));
      scheduleGestureEnd();
      return;
    }

    // Vertical — only activate overscroll when at the bottom
    if (el.scrollHeight <= el.clientHeight) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;

    if (e.deltaY > 0 && atBottom) {
      phaseRef.current = 'pulling';
      vRawRef.current = Math.min(vRawRef.current + e.deltaY, V_MAX_RAW);
      pullY.set(vRawToVisual(vRawRef.current));
      scheduleGestureEnd();
    } else if (e.deltaY < 0 && vRawRef.current > 0) {
      vRawRef.current = Math.max(0, vRawRef.current + e.deltaY);
      if (vRawRef.current <= 0) { resetAll(); return; }
      pullY.set(vRawToVisual(vRawRef.current));
      scheduleGestureEnd();
    }
  }, [pullY, slideX, isGenerating, scheduleGestureEnd, resetAll]);

  // ── keyboard handler ──────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (phaseRef.current === 'springing' || phaseRef.current === 'committed' || isGenerating) return;
    const el = scrollElRef.current;
    if (!el) return;

    if (e.key === 'ArrowDown') {
      if (el.scrollHeight <= el.clientHeight) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2;
      if (!atBottom) return;
      // Each key press = one tick of overscroll
      if (!axisRef.current) axisRef.current = 'vertical';
      if (axisRef.current !== 'vertical') return;
      phaseRef.current = 'pulling';
      vRawRef.current = Math.min(vRawRef.current + 40, V_MAX_RAW);
      pullY.set(vRawToVisual(vRawRef.current));
      scheduleGestureEnd();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!axisRef.current) axisRef.current = 'horizontal';
      if (axisRef.current !== 'horizontal') return;
      phaseRef.current = 'sliding';
      const delta = e.key === 'ArrowLeft' ? -40 : 40;
      hRawRef.current += delta;
      slideX.set(hRawToVisual(-hRawRef.current));
      scheduleGestureEnd();
    }
  }, [pullY, slideX, isGenerating, scheduleGestureEnd]);

  // ── attach listeners ──────────────────────────────────────────────
  useEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;
    // non-passive: need preventDefault() for horizontal wheel
    el.addEventListener('wheel', handleWheel, { passive: false });
    // keydown on window so arrow keys work even without focus on the scroll el
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleWheel, handleKeyDown]);

  useEffect(() => {
    vRawRef.current = 0;
    hRawRef.current = 0;
    axisRef.current = null;
    lastScrollTopRef.current = 0;
    if (phaseRef.current !== 'idle') resetAll();
  }, [currentNodeId, resetAll]);

  return {
    pullY, childRise, slideX,
    messageScale, messageOpacity, msgRadius,
    scrollElRef,
  };
}
