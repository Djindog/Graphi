import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

interface ContextSnapshot {
  activeIds: string[];
  deactivatedIds: string[];
}

interface ChatState {
  currentNodeId: string | null;
  messages: Message[];
  currentInput: string;
  referencedNodeIds: string[];
  recommendedNodeIds: string[];
  activeContextNodeIds: string[];
  deactivatedNodeIds: string[];
  lockedActiveIds: string[];
  lockedDeactivatedIds: string[];
  // Per-node lock persistence: lockedContextMap[nodeId] → { active, deactivated }
  lockedContextMap: Record<string, { active: string[]; deactivated: string[] }>;
  isGenerating: boolean;
  contextDisplayMode: boolean;
  lastContextSnapshot: ContextSnapshot | null;
  branchReminderDismissed: boolean;
  driftDetected: boolean;
  suggestedNodeId: string | null;
  guidanceEnabled: boolean;
  referenceDetectionEnabled: boolean;
  driftDetectionEnabled: boolean;
  devShowGuidancePill: boolean;
  hoveredSuggestedNodeId: string | null;

  setCurrentNode: (nodeId: string | null) => Promise<void>;
  addMessage: (msg: Message) => void;
  setCurrentInput: (text: string) => void;
  setReferenced: (ids: string[]) => void;
  setRecommended: (ids: string[]) => void;
  initContext: (lineageIds: string[]) => void;
  toggleNodeActive: (nodeId: string) => void;
  toggleLock: (nodeId: string) => void;
  lockAll: (allIds: string[]) => void;
  unlockAll: () => void;
  setIsGenerating: (val: boolean) => void;
  clearContext: () => void;
  partialClearContext: () => void;
  toggleContextDisplay: () => void;
  setContextDisplay: (on: boolean) => void;
  clearAllContext: () => void;
  reinitContext: () => void;
  setBranchReminderDismissed: (dismissed: boolean) => void;
  setDriftDetected: (detected: boolean) => void;
  setSuggestedNodeId: (id: string | null) => void;
  setGuidanceEnabled: (enabled: boolean) => void;
  setReferenceDetectionEnabled: (enabled: boolean) => void;
  setDriftDetectionEnabled: (enabled: boolean) => void;
  setDevShowGuidancePill: (show: boolean) => void;
  setHoveredSuggestedNodeId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentNodeId: null,
  messages: [],
  currentInput: '',
  referencedNodeIds: [],
  recommendedNodeIds: [],
  activeContextNodeIds: [],
  deactivatedNodeIds: [],
  lockedActiveIds: [],
  lockedDeactivatedIds: [],
  lockedContextMap: {},
  isGenerating: false,
  contextDisplayMode: false,
  lastContextSnapshot: null,
  branchReminderDismissed: false,
  driftDetected: false,
  suggestedNodeId: null,
  guidanceEnabled: true,
  referenceDetectionEnabled: true,
  driftDetectionEnabled: true,
  devShowGuidancePill: false,
  hoveredSuggestedNodeId: null,

  setCurrentNode: async (nodeId) => {
    if (nodeId === null) {
      set({
        currentNodeId: null,
        messages: [],
        referencedNodeIds: [],
        recommendedNodeIds: [],
        activeContextNodeIds: [],
        deactivatedNodeIds: [],
        lockedActiveIds: [],
        lockedDeactivatedIds: [],
        currentInput: '',
        contextDisplayMode: false,
        lastContextSnapshot: null,
        driftDetected: false,
        suggestedNodeId: null,
      });
      return;
    }
    // Load per-node lock state for the destination node
    const lockState = get().lockedContextMap[nodeId] ?? { active: [], deactivated: [] };
    set({
      currentNodeId: nodeId,
      messages: [],
      referencedNodeIds: [],
      recommendedNodeIds: [],
      activeContextNodeIds: [],
      deactivatedNodeIds: [],
      lockedActiveIds: lockState.active,
      lockedDeactivatedIds: lockState.deactivated,
      currentInput: '',
      contextDisplayMode: false,
      lastContextSnapshot: null,
      driftDetected: false,
      suggestedNodeId: null,
    });
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('nodeId', nodeId)
      .order('createdAt', { ascending: true });
    if (data) set({ messages: data as Message[] });
  },

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),

  setCurrentInput: (text) => set({ currentInput: text }),

  initContext: (lineageIds) => {
    set(s => {
      const lockedActive = new Set(s.lockedActiveIds);
      const lockedDeactivated = new Set(s.lockedDeactivatedIds);
      // Pre-seed with locked state; lineage fills the rest
      const active = new Set<string>(lockedActive);
      const deactivated = new Set<string>(lockedDeactivated);
      lineageIds.forEach(id => {
        if (lockedDeactivated.has(id)) return;
        active.add(id);
      });
      const activeArr = [...active];
      return {
        activeContextNodeIds: activeArr,
        deactivatedNodeIds: [...deactivated],
        lastContextSnapshot: { activeIds: activeArr, deactivatedIds: [...deactivated] },
      };
    });
  },

  setReferenced: (ids) => {
    set(s => {
      const lockedDeactivated = new Set(s.lockedDeactivatedIds);
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      ids.forEach(id => {
        if (lockedDeactivated.has(id)) return;
        if (!deactivated.has(id)) active.add(id);
      });
      const activeArr = [...active];
      return {
        referencedNodeIds: ids,
        activeContextNodeIds: activeArr,
        lastContextSnapshot: { activeIds: activeArr, deactivatedIds: [...deactivated] },
      };
    });
  },

  setRecommended: (ids) => {
    set(s => {
      const lockedDeactivated = new Set(s.lockedDeactivatedIds);
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      ids.forEach(id => {
        if (lockedDeactivated.has(id)) return;
        if (!deactivated.has(id)) active.add(id);
      });
      const activeArr = [...active];
      return {
        recommendedNodeIds: ids,
        activeContextNodeIds: activeArr,
        lastContextSnapshot: { activeIds: activeArr, deactivatedIds: [...deactivated] },
      };
    });
  },

  toggleNodeActive: (nodeId) => {
    const { activeContextNodeIds, deactivatedNodeIds, lockedActiveIds, lockedDeactivatedIds } = get();
    if (lockedActiveIds.includes(nodeId) || lockedDeactivatedIds.includes(nodeId)) return;
    if (activeContextNodeIds.includes(nodeId)) {
      set({
        activeContextNodeIds: activeContextNodeIds.filter(id => id !== nodeId),
        deactivatedNodeIds: [...deactivatedNodeIds, nodeId],
      });
    } else {
      set({
        activeContextNodeIds: [...activeContextNodeIds, nodeId],
        deactivatedNodeIds: deactivatedNodeIds.filter(id => id !== nodeId),
      });
    }
  },

  toggleLock: (nodeId) => {
    const { currentNodeId, activeContextNodeIds, lockedActiveIds, lockedDeactivatedIds, lockedContextMap } = get();
    let newActive = lockedActiveIds;
    let newDeactivated = lockedDeactivatedIds;
    if (lockedActiveIds.includes(nodeId)) {
      newActive = lockedActiveIds.filter(id => id !== nodeId);
    } else if (lockedDeactivatedIds.includes(nodeId)) {
      newDeactivated = lockedDeactivatedIds.filter(id => id !== nodeId);
    } else if (activeContextNodeIds.includes(nodeId)) {
      newActive = [...lockedActiveIds, nodeId];
    } else {
      newDeactivated = [...lockedDeactivatedIds, nodeId];
    }
    const mapUpdate = currentNodeId
      ? { lockedContextMap: { ...lockedContextMap, [currentNodeId]: { active: newActive, deactivated: newDeactivated } } }
      : {};
    set({ lockedActiveIds: newActive, lockedDeactivatedIds: newDeactivated, ...mapUpdate });
  },

  lockAll: (allIds) => {
    set(s => {
      const active = new Set(s.activeContextNodeIds);
      const newActive = allIds.filter(id => active.has(id));
      const newDeactivated = allIds.filter(id => !active.has(id));
      const mapUpdate = s.currentNodeId
        ? { lockedContextMap: { ...s.lockedContextMap, [s.currentNodeId]: { active: newActive, deactivated: newDeactivated } } }
        : {};
      return { lockedActiveIds: newActive, lockedDeactivatedIds: newDeactivated, ...mapUpdate };
    });
  },

  unlockAll: () => {
    set(s => {
      const mapUpdate = s.currentNodeId
        ? { lockedContextMap: { ...s.lockedContextMap, [s.currentNodeId]: { active: [], deactivated: [] } } }
        : {};
      return { lockedActiveIds: [], lockedDeactivatedIds: [], ...mapUpdate };
    });
  },

  setIsGenerating: (val) => set({ isGenerating: val }),

  clearContext: () =>
    set(s => ({
      referencedNodeIds: [],
      recommendedNodeIds: [],
      activeContextNodeIds: [...s.lockedActiveIds],
      deactivatedNodeIds: [...s.lockedDeactivatedIds],
    })),

  partialClearContext: () =>
    set(s => {
      const lockedActive = new Set(s.lockedActiveIds);
      const removable = new Set([...s.referencedNodeIds, ...s.recommendedNodeIds]);
      return {
        referencedNodeIds: [],
        recommendedNodeIds: [],
        activeContextNodeIds: s.activeContextNodeIds.filter(id => !removable.has(id) || lockedActive.has(id)),
      };
    }),

  toggleContextDisplay: () => set(s => ({ contextDisplayMode: !s.contextDisplayMode })),

  setContextDisplay: (on) => set({ contextDisplayMode: on }),

  clearAllContext: () =>
    set(s => {
      const lockedActive = new Set(s.lockedActiveIds);
      const toDeactivate = s.activeContextNodeIds.filter(id => !lockedActive.has(id));
      return {
        activeContextNodeIds: [...s.lockedActiveIds],
        deactivatedNodeIds: [...new Set([...s.deactivatedNodeIds, ...toDeactivate])],
      };
    }),

  reinitContext: () => {
    const { lastContextSnapshot, lockedActiveIds, lockedDeactivatedIds } = get();
    if (!lastContextSnapshot) return;
    const lockedActive = new Set(lockedActiveIds);
    const lockedDeactivated = new Set(lockedDeactivatedIds);
    const active = new Set([...lastContextSnapshot.activeIds, ...lockedActive]);
    lockedDeactivated.forEach(id => active.delete(id));
    const deactivated = new Set([...lastContextSnapshot.deactivatedIds, ...lockedDeactivated]);
    lockedActive.forEach(id => deactivated.delete(id));
    set({
      activeContextNodeIds: [...active],
      deactivatedNodeIds: [...deactivated],
    });
  },

  setBranchReminderDismissed: (dismissed) => set({ branchReminderDismissed: dismissed }),

  setDriftDetected: (detected) => set({ driftDetected: detected }),

  setSuggestedNodeId: (id) => set({ suggestedNodeId: id }),

  setGuidanceEnabled: (enabled) => set({ guidanceEnabled: enabled }),

  setReferenceDetectionEnabled: (enabled) => set({ referenceDetectionEnabled: enabled }),

  setDriftDetectionEnabled: (enabled) => set({ driftDetectionEnabled: enabled }),

  setDevShowGuidancePill: (show) => set({ devShowGuidancePill: show }),

  setHoveredSuggestedNodeId: (id) => set({ hoveredSuggestedNodeId: id }),
}));
