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
  isGenerating: boolean;
  contextDisplayMode: boolean;
  lastContextSnapshot: ContextSnapshot | null;
  branchReminderDismissed: boolean;
  driftDetected: boolean;
  suggestedNodeId: string | null;
  guidanceEnabled: boolean;
  devShowGuidancePill: boolean;

  setCurrentNode: (nodeId: string | null) => Promise<void>;
  addMessage: (msg: Message) => void;
  setCurrentInput: (text: string) => void;
  setReferenced: (ids: string[]) => void;
  setRecommended: (ids: string[]) => void;
  initContext: (lineageIds: string[]) => void;
  toggleNodeActive: (nodeId: string) => void;
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
  setDevShowGuidancePill: (show: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentNodeId: null,
  messages: [],
  currentInput: '',
  referencedNodeIds: [],
  recommendedNodeIds: [],
  activeContextNodeIds: [],
  deactivatedNodeIds: [],
  isGenerating: false,
  contextDisplayMode: false,
  lastContextSnapshot: null,
  branchReminderDismissed: false,
  driftDetected: false,
  suggestedNodeId: null,
  guidanceEnabled: true,
  devShowGuidancePill: false,

  setCurrentNode: async (nodeId) => {
    if (nodeId === null) {
      set({
        currentNodeId: null,
        messages: [],
        referencedNodeIds: [],
        recommendedNodeIds: [],
        activeContextNodeIds: [],
        deactivatedNodeIds: [],
        currentInput: '',
        contextDisplayMode: false,
        lastContextSnapshot: null,
        driftDetected: false,
        suggestedNodeId: null,
      });
      return;
    }
    set({
      currentNodeId: nodeId,
      messages: [],
      referencedNodeIds: [],
      recommendedNodeIds: [],
      activeContextNodeIds: [],
      deactivatedNodeIds: [],
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
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      lineageIds.forEach(id => { if (!deactivated.has(id)) active.add(id); });
      const activeArr = [...active];
      return {
        activeContextNodeIds: activeArr,
        lastContextSnapshot: { activeIds: activeArr, deactivatedIds: [...deactivated] },
      };
    });
  },

  setReferenced: (ids) => {
    set(s => {
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      ids.forEach(id => { if (!deactivated.has(id)) active.add(id); });
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
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      ids.forEach(id => { if (!deactivated.has(id)) active.add(id); });
      const activeArr = [...active];
      return {
        recommendedNodeIds: ids,
        activeContextNodeIds: activeArr,
        lastContextSnapshot: { activeIds: activeArr, deactivatedIds: [...deactivated] },
      };
    });
  },

  toggleNodeActive: (nodeId) => {
    const { activeContextNodeIds, deactivatedNodeIds } = get();
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

  setIsGenerating: (val) => set({ isGenerating: val }),

  clearContext: () =>
    set({ referencedNodeIds: [], recommendedNodeIds: [], activeContextNodeIds: [], deactivatedNodeIds: [] }),

  partialClearContext: () =>
    set(s => {
      const removable = new Set([...s.referencedNodeIds, ...s.recommendedNodeIds]);
      return {
        referencedNodeIds: [],
        recommendedNodeIds: [],
        activeContextNodeIds: s.activeContextNodeIds.filter(id => !removable.has(id)),
      };
    }),

  toggleContextDisplay: () => set(s => ({ contextDisplayMode: !s.contextDisplayMode })),

  setContextDisplay: (on) => set({ contextDisplayMode: on }),

  clearAllContext: () =>
    set(s => ({
      activeContextNodeIds: [],
      deactivatedNodeIds: [...new Set([...s.deactivatedNodeIds, ...s.activeContextNodeIds])],
    })),

  reinitContext: () => {
    const { lastContextSnapshot } = get();
    if (!lastContextSnapshot) return;
    set({
      activeContextNodeIds: lastContextSnapshot.activeIds,
      deactivatedNodeIds: lastContextSnapshot.deactivatedIds,
    });
  },

  setBranchReminderDismissed: (dismissed) => set({ branchReminderDismissed: dismissed }),

  setDriftDetected: (detected) => set({ driftDetected: detected }),

  setSuggestedNodeId: (id) => set({ suggestedNodeId: id }),

  setGuidanceEnabled: (enabled) => set({ guidanceEnabled: enabled }),

  setDevShowGuidancePill: (show) => set({ devShowGuidancePill: show }),
}));
