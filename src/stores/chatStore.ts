import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

interface ChatState {
  currentNodeId: string | null;
  messages: Message[];
  currentInput: string;
  referencedNodeIds: string[];
  recommendedNodeIds: string[];
  activeContextNodeIds: string[];
  deactivatedNodeIds: string[];
  isGenerating: boolean;

  setCurrentNode: (nodeId: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  setCurrentInput: (text: string) => void;
  setReferenced: (ids: string[]) => void;
  setRecommended: (ids: string[]) => void;
  initContext: (lineageIds: string[]) => void;
  toggleNodeActive: (nodeId: string) => void;
  setIsGenerating: (val: boolean) => void;
  clearContext: () => void;
  partialClearContext: () => void;
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

  setCurrentNode: async (nodeId) => {
    set({
      currentNodeId: nodeId,
      messages: [],
      referencedNodeIds: [],
      recommendedNodeIds: [],
      activeContextNodeIds: [],
      deactivatedNodeIds: [],
      currentInput: '',
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
      return { activeContextNodeIds: [...active] };
    });
  },

  setReferenced: (ids) => {
    set(s => {
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      ids.forEach(id => { if (!deactivated.has(id)) active.add(id); });
      return { referencedNodeIds: ids, activeContextNodeIds: [...active] };
    });
  },

  setRecommended: (ids) => {
    set(s => {
      const deactivated = new Set(s.deactivatedNodeIds);
      const active = new Set(s.activeContextNodeIds);
      ids.forEach(id => { if (!deactivated.has(id)) active.add(id); });
      return { recommendedNodeIds: ids, activeContextNodeIds: [...active] };
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
        // deactivatedNodeIds and lineage nodes untouched
      };
    }),
}));
