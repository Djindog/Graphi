import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

interface ContextSnapshot {
  activeIds: string[];
  deactivatedIds: string[];
}

const TEMPORARY_MODE_KEY = 'graphi_temporary_mode';
const TEMPORARY_MESSAGE_TTL_MS = 12 * 60 * 60 * 1000;
const temporaryMessagesKey = (nodeId: string) => `graphi_temporary_messages:${nodeId}`;

function loadTemporaryMessages(nodeId: string): Message[] {
  try {
    const raw = sessionStorage.getItem(temporaryMessagesKey(nodeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[] | { savedAt?: number; messages?: Message[] };
    if (Array.isArray(parsed)) return parsed;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > TEMPORARY_MESSAGE_TTL_MS) {
      sessionStorage.removeItem(temporaryMessagesKey(nodeId));
      return [];
    }
    return parsed.messages ?? [];
  } catch {
    return [];
  }
}

function saveTemporaryMessages(nodeId: string, messages: Message[]) {
  sessionStorage.setItem(temporaryMessagesKey(nodeId), JSON.stringify({
    savedAt: Date.now(),
    messages,
  }));
}

interface ChatState {
  currentNodeId: string | null;
  messages: Message[];
  currentInput: string;
  temporaryMode: boolean;
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
  hoveredSuggestedNodeId: string | null;

  setCurrentNode: (nodeId: string | null) => Promise<void>;
  addMessage: (msg: Message) => void;
  setTemporaryMode: (enabled: boolean) => Promise<void>;
  persistTemporaryMessages: () => void;
  clearTemporaryMessages: (nodeId?: string) => void;
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
  setHoveredSuggestedNodeId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentNodeId: null,
  messages: [],
  currentInput: '',
  temporaryMode: sessionStorage.getItem(TEMPORARY_MODE_KEY) === 'true',
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
    if (get().temporaryMode) {
      set({ messages: loadTemporaryMessages(nodeId) });
      return;
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('nodeId', nodeId)
      .order('createdAt', { ascending: true });
    if (data) set({ messages: data as Message[] });
  },

  addMessage: (msg) => set(s => {
    const messages = [...s.messages, msg];
    if (s.temporaryMode && s.currentNodeId) saveTemporaryMessages(s.currentNodeId, messages);
    return { messages };
  }),

  setTemporaryMode: async (enabled) => {
    const { currentNodeId, messages, temporaryMode } = get();
    if (temporaryMode && currentNodeId) saveTemporaryMessages(currentNodeId, messages);
    sessionStorage.setItem(TEMPORARY_MODE_KEY, enabled ? 'true' : 'false');
    set({ temporaryMode: enabled });

    if (!currentNodeId) return;
    if (enabled) {
      set({ messages: loadTemporaryMessages(currentNodeId) });
      return;
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('nodeId', currentNodeId)
      .order('createdAt', { ascending: true });
    set({ messages: data as Message[] ?? [] });
  },

  persistTemporaryMessages: () => {
    const { currentNodeId, messages, temporaryMode } = get();
    if (temporaryMode && currentNodeId) saveTemporaryMessages(currentNodeId, messages);
  },

  clearTemporaryMessages: (nodeId) => {
    const targetNodeId = nodeId ?? get().currentNodeId;
    if (targetNodeId) sessionStorage.removeItem(temporaryMessagesKey(targetNodeId));
    if (!nodeId || nodeId === get().currentNodeId) set({ messages: [] });
  },

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

  setHoveredSuggestedNodeId: (id) => set({ hoveredSuggestedNodeId: id }),
}));
