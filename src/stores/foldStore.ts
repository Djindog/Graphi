import { create } from 'zustand';

interface FoldState {
  foldedNodeIds: Set<string>;
  fold: (nodeId: string) => void;
  unfold: (nodeId: string) => void;
  isFolded: (nodeId: string) => boolean;
}

export const useFoldStore = create<FoldState>((set, get) => ({
  foldedNodeIds: new Set(),

  fold: (nodeId) =>
    set(s => ({ foldedNodeIds: new Set([...s.foldedNodeIds, nodeId]) })),

  unfold: (nodeId) =>
    set(s => {
      const next = new Set(s.foldedNodeIds);
      next.delete(nodeId);
      return { foldedNodeIds: next };
    }),

  isFolded: (nodeId) => get().foldedNodeIds.has(nodeId),
}));
